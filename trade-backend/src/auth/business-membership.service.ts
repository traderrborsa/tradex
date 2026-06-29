import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { MEMBER_ROLE_NAME } from '../rbac/permissions.constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActiveBusiness(idOrSlug: string) {
    const key = idOrSlug?.trim();
    if (!key) {
      throw new BadRequestException('İşletme bilgisi gerekli');
    }

    const business = await this.prisma.business.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: key },
          { slug: key.toLowerCase() },
          { name: key.toLowerCase() },
        ],
      },
    });
    if (!business) {
      throw new BadRequestException('Geçersiz veya pasif işletme');
    }

    return business;
  }

  async validateActiveBusiness(businessId: string) {
    return this.resolveActiveBusiness(businessId);
  }

  async getPublicConfig(idOrSlug: string) {
    const business = await this.resolveActiveBusiness(idOrSlug);
    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      displayName: business.displayName,
      isActive: business.isActive,
    };
  }

  async ensureMemberRole(userId: string) {
    const memberRole = await this.prisma.role.findFirst({
      where: { name: MEMBER_ROLE_NAME, businessId: null },
    });
    if (!memberRole) return;

    await this.prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: { userId, roleId: memberRole.id },
      },
      create: { userId, roleId: memberRole.id },
      update: {},
    });
  }

  async ensureMembership(
    userId: string,
    businessId: string,
    registeredViaApp?: string | null,
  ) {
    const app = registeredViaApp?.trim() || null;

    await this.prisma.businessMembership.upsert({
      where: {
        userId_businessId: { userId, businessId },
      },
      create: {
        userId,
        businessId,
        registeredViaBusinessId: businessId,
        registeredViaApp: app,
      },
      update: {},
    });
  }

  async findMemberInBusiness(
    businessId: string,
    filter: { email?: string; tcKimlikNo?: string; phone?: string },
  ) {
    return this.prisma.user.findFirst({
      where: {
        ...(filter.email ? { email: filter.email } : {}),
        ...(filter.tcKimlikNo ? { tcKimlikNo: filter.tcKimlikNo } : {}),
        ...(filter.phone ? { phone: filter.phone } : {}),
        memberships: { some: { businessId } },
      },
      select: { id: true, email: true, tcKimlikNo: true, phone: true },
    });
  }

  async assertNewMemberRegistration(
    businessId: string,
    identity: { email: string; tcKimlikNo: string; phone: string },
  ) {
    const byEmail = await this.findMemberInBusiness(businessId, {
      email: identity.email,
    });
    if (byEmail) {
      throw new ConflictException(
        'Bu e-posta bu işletmede zaten kayıtlı. Giriş yapın.',
      );
    }

    const byTc = await this.findMemberInBusiness(businessId, {
      tcKimlikNo: identity.tcKimlikNo,
    });
    if (byTc) {
      throw new ConflictException(
        'Bu T.C. kimlik numarası bu işletmede zaten kayıtlı',
      );
    }

    const byPhone = await this.findMemberInBusiness(businessId, {
      phone: identity.phone,
    });
    if (byPhone) {
      throw new ConflictException(
        'Bu telefon numarası bu işletmede zaten kayıtlı',
      );
    }
  }

  async assertExistingUserJoiningBusiness(
    businessId: string,
    user: { id: string; email: string; tcKimlikNo: string; phone: string },
    identity: { tcKimlikNo: string; phone: string },
  ) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: {
        userId_businessId: { userId: user.id, businessId },
      },
    });
    if (membership) {
      throw new ConflictException(
        'Bu e-posta bu işletmede zaten kayıtlı. Giriş yapın.',
      );
    }

    if (user.tcKimlikNo !== identity.tcKimlikNo) {
      throw new ConflictException(
        'T.C. kimlik numarası bu e-posta ile eşleşmiyor',
      );
    }

    if (user.phone !== identity.phone) {
      throw new ConflictException(
        'Telefon numarası bu e-posta ile eşleşmiyor',
      );
    }

    const byTc = await this.findMemberInBusiness(businessId, {
      tcKimlikNo: identity.tcKimlikNo,
    });
    if (byTc && byTc.id !== user.id) {
      throw new ConflictException(
        'Bu T.C. kimlik numarası bu işletmede zaten kayıtlı',
      );
    }

    const byPhone = await this.findMemberInBusiness(businessId, {
      phone: identity.phone,
    });
    if (byPhone && byPhone.id !== user.id) {
      throw new ConflictException(
        'Bu telefon numarası bu işletmede zaten kayıtlı',
      );
    }
  }
}
