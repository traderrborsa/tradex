import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import type {
  CreatePanelBusinessDto,
  UpdatePanelBusinessDto,
} from './dto/business.dto';

@Injectable()
export class PanelBusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  private serializeBusiness(business: {
    id: string;
    name: string;
    displayName: string;
    slug: string | null;
    isActive: boolean;
    createdAt: Date;
    _count: { memberships: number; staff: number };
    staff?: {
      user: {
        id: string;
        fullName: string;
        email: string;
      };
    }[];
  }) {
    return {
      id: business.id,
      name: business.name,
      displayName: business.displayName,
      slug: business.slug,
      isActive: business.isActive,
      createdAt: business.createdAt.toISOString(),
      memberCount: business._count.memberships,
      staffCount: business._count.staff,
      staff: business.staff?.map((s) => ({
        id: s.user.id,
        fullName: s.user.fullName,
        email: s.user.email,
      })),
    };
  }

  async list(viewerId: string, viewerIsAdmin: boolean) {
    const businesses = await this.prisma.business.findMany({
      where: this.rbac.businessScopeFilter(viewerId, viewerIsAdmin),
      orderBy: { displayName: 'asc' },
      include: {
        _count: { select: { memberships: true, staff: true } },
      },
    });
    return businesses.map((b) => this.serializeBusiness(b));
  }

  async getById(id: string, viewerId: string, viewerIsAdmin: boolean) {
    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      id,
      viewerIsAdmin,
    );
    if (!canAccess) throw new ForbiddenException('Bu işletmeye erişim yok');

    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, staff: true } },
        staff: {
          select: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı');
    return this.serializeBusiness(business);
  }

  async create(dto: CreatePanelBusinessDto) {
    const name = dto.name.trim().toLowerCase();
    const displayName = dto.displayName.trim();
    const slug = dto.slug?.trim().toLowerCase() || null;

    if (!name || !displayName) {
      throw new ConflictException('İşletme adı gerekli');
    }

    const existing = await this.prisma.business.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Bu işletme adı zaten kayıtlı');

    if (slug) {
      const slugClash = await this.prisma.business.findUnique({
        where: { slug },
      });
      if (slugClash) throw new ConflictException('Bu slug zaten kullanılıyor');
    }

    const staffUserIds = dto.staffUserIds ?? [];
    await this.validateStaffUsers(staffUserIds);

    const business = await this.prisma.business.create({
      data: {
        name,
        displayName,
        slug,
        isActive: dto.isActive !== false,
        staff: {
          create: staffUserIds.map((userId) => ({ userId })),
        },
      },
      include: {
        _count: { select: { memberships: true, staff: true } },
        staff: {
          select: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    return this.serializeBusiness(business);
  }

  async update(
    id: string,
    dto: UpdatePanelBusinessDto,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    if (!viewerIsAdmin) {
      throw new ForbiddenException('İşletme düzenleme yetkisi yok');
    }

    const existing = await this.prisma.business.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('İşletme bulunamadı');

    const data: {
      name?: string;
      displayName?: string;
      slug?: string | null;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim().toLowerCase();
      if (!name) throw new ConflictException('İşletme adı gerekli');
      const clash = await this.prisma.business.findFirst({
        where: { name, NOT: { id } },
      });
      if (clash) throw new ConflictException('Bu işletme adı zaten kayıtlı');
      data.name = name;
    }

    if (dto.displayName !== undefined) {
      const displayName = dto.displayName.trim();
      if (!displayName) throw new ConflictException('Görünen ad gerekli');
      data.displayName = displayName;
    }

    if (dto.slug !== undefined) {
      const slug = dto.slug?.trim().toLowerCase() || null;
      if (slug) {
        const clash = await this.prisma.business.findFirst({
          where: { slug, NOT: { id } },
        });
        if (clash) throw new ConflictException('Bu slug zaten kullanılıyor');
      }
      data.slug = slug;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.staffUserIds !== undefined) {
      await this.validateStaffUsers(dto.staffUserIds);
      await this.prisma.businessStaff.deleteMany({ where: { businessId: id } });
      if (dto.staffUserIds.length) {
        await this.prisma.businessStaff.createMany({
          data: dto.staffUserIds.map((userId) => ({
            userId,
            businessId: id,
          })),
        });
        for (const userId of dto.staffUserIds) {
          await this.rbac.stripCustomerIdentity(userId);
        }
      }
    }

    const business = await this.prisma.business.update({
      where: { id },
      data,
      include: {
        _count: { select: { memberships: true, staff: true } },
        staff: {
          select: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    return this.serializeBusiness(business);
  }

  async remove(id: string) {
    const existing = await this.prisma.business.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('İşletme bulunamadı');
    await this.prisma.business.delete({ where: { id } });
    return { ok: true };
  }

  async listMembers(
    businessId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      businessId,
      viewerIsAdmin,
    );
    if (!canAccess) throw new ForbiddenException('Bu işletmeye erişim yok');

    const memberships = await this.prisma.businessMembership.findMany({
      where: {
        businessId,
        user: await this.rbac.customerScopedUserWhere(
          viewerId,
          viewerIsAdmin,
          [businessId],
        ),
      },
      orderBy: { joinedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            createdAt: true,
          },
        },
        registeredViaBusiness: {
          select: { id: true, displayName: true },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.id,
      joinedAt: m.joinedAt.toISOString(),
      registeredViaApp: m.registeredViaApp,
      registeredViaBusiness: m.registeredViaBusiness
        ? {
            id: m.registeredViaBusiness.id,
            displayName: m.registeredViaBusiness.displayName,
          }
        : null,
      user: {
        id: m.user.id,
        email: m.user.email,
        fullName: m.user.fullName,
        createdAt: m.user.createdAt.toISOString(),
      },
    }));
  }

  private async validateStaffUsers(userIds: string[]) {
    if (!userIds.length) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    if (users.length !== userIds.length) {
      throw new ConflictException('Geçersiz personel kullanıcısı');
    }
  }
}
