import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { MemberNotificationsService } from '../../member-notifications/member-notifications.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';

@Injectable()
export class PanelMemberNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly memberNotifications: MemberNotificationsService,
  ) {}

  async send(
    operatorId: string,
    operatorIsAdmin: boolean,
    body: {
      title: string;
      message: string;
      businessId: string;
      userIds?: string[];
      href?: string;
    },
  ) {
    const title = body.title?.trim();
    const message = body.message?.trim();
    const businessId = body.businessId?.trim();

    if (!title) throw new BadRequestException('Başlık gerekli');
    if (!message) throw new BadRequestException('Mesaj gerekli');
    if (!businessId) throw new BadRequestException('İşletme gerekli');

    const allowedBusinessIds = await resolvePanelBusinessIds(
      this.rbac,
      operatorId,
      operatorIsAdmin,
      businessId,
    );
    if (!allowedBusinessIds.includes(businessId)) {
      throw new NotFoundException('İşletme bulunamadı');
    }

    let userIds: string[];

    if (body.userIds?.length) {
      const memberships = await this.prisma.businessMembership.findMany({
        where: {
          businessId,
          userId: { in: body.userIds },
        },
        select: { userId: true },
      });
      userIds = memberships.map((m) => m.userId);
      if (userIds.length === 0) {
        throw new BadRequestException('Geçerli müşteri bulunamadı');
      }
    } else {
      const memberships = await this.prisma.businessMembership.findMany({
        where: { businessId },
        select: { userId: true },
      });
      userIds = memberships.map((m) => m.userId);
    }

    const count = await this.memberNotifications.createMany(userIds, {
      type: 'system',
      title,
      message,
      href: body.href?.trim() || undefined,
      businessId,
      data: { sentBy: operatorId },
    });

    return { ok: true, count };
  }
}
