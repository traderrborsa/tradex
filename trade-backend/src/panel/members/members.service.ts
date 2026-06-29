import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  isValidFullName,
  normalizeFullName,
} from '../../auth/register.dto';
import { isValidPhone, normalizePhone } from '../../auth/phone';
import { isValidTcKimlikNo, normalizeTcKimlikNo } from '../../auth/tc-kimlik';
import { BusinessMembershipService } from '../../auth/business-membership.service';
import { PresenceService } from '../../presence/presence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MEMBER_ROLE_NAME } from '../../rbac/permissions.constants';
import { RbacService } from '../../rbac/rbac.service';
import { TradingConfigService } from '../../trading/trading-config.service';
import { requiredMargin } from '../../trading/trading-config.types';
import { VerificationService } from '../../verification/verification.service';
import type { CreatePanelMemberDto } from './dto/member.dto';

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

@Injectable()
export class PanelMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly tradingConfig: TradingConfigService,
    private readonly presence: PresenceService,
    private readonly verification: VerificationService,
    private readonly businessMembership: BusinessMembershipService,
  ) {}

  async create(
    dto: CreatePanelMemberDto,
    viewerId: string,
    viewerIsAdmin = false,
  ) {
    const email = dto.email.trim().toLowerCase();
    const fullName = normalizeFullName(dto.fullName);
    const tcKimlikNo = normalizeTcKimlikNo(dto.tcKimlikNo);
    const phone = normalizePhone(dto.phone);
    const referenceNumber = dto.referenceNumber?.trim() || null;

    if (!isValidFullName(fullName)) {
      throw new ConflictException('Ad ve soyad girin');
    }
    if (!isValidTcKimlikNo(tcKimlikNo)) {
      throw new ConflictException('Geçerli bir T.C. kimlik numarası girin');
    }
    if (!email || dto.password.length < 6) {
      throw new ConflictException(
        'Geçerli e-posta ve en az 6 karakterli şifre gerekli',
      );
    }
    if (!isValidPhone(phone)) {
      throw new ConflictException('Geçerli bir cep telefonu numarası girin');
    }

    let businessId = dto.businessId?.trim() ?? '';
    if (!businessId && !viewerIsAdmin) {
      const staffed = await this.rbac.getStaffBusinessIds(viewerId);
      if (staffed.length === 1) businessId = staffed[0]!;
    }
    if (!businessId) {
      throw new ConflictException('İşletme seçimi gerekli');
    }

    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      businessId,
      viewerIsAdmin,
    );
    if (!canAccess) {
      throw new ForbiddenException('Bu işletmeye müşteri ekleme yetkiniz yok');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business || !business.isActive) {
      throw new ConflictException('Geçersiz veya pasif işletme');
    }

    await this.businessMembership.assertNewMemberRegistration(businessId, {
      email,
      tcKimlikNo,
      phone,
    });

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }

    const existingTc = await this.prisma.user.findUnique({
      where: { tcKimlikNo },
      select: { id: true },
    });
    if (existingTc) {
      throw new ConflictException('Bu T.C. kimlik numarası zaten kayıtlı');
    }

    const memberRole = await this.prisma.role.findFirst({
      where: { name: MEMBER_ROLE_NAME, businessId: null },
    });
    if (!memberRole) {
      throw new ConflictException('Üye rolü yapılandırılmamış');
    }

    const businessSettings =
      await this.tradingConfig.getBusinessEffectiveSettings(business.id);
    const initialBalance = businessSettings.initialBalance;
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: hash,
          fullName,
          tcKimlikNo,
          phone,
          referenceNumber,
          accounts: {
            create: { businessId: business.id, balance: initialBalance },
          },
          roles: { create: { roleId: memberRole.id } },
          memberships: {
            create: {
              businessId: business.id,
              registeredViaBusinessId: business.id,
              registeredViaApp: 'panel',
            },
          },
        },
        select: { id: true },
      });
      return created;
    });

    await this.verification.applyRegistrationDefaults(user.id, business.id);

    return this.getByUserId(user.id, viewerId, viewerIsAdmin);
  }

  async list(
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ) {
    if (businessId) {
      const canAccess = await this.rbac.canAccessBusiness(
        viewerId,
        businessId,
        viewerIsAdmin,
      );
      if (!canAccess) {
        throw new ForbiddenException('Bu işletmeye erişim yok');
      }
    }

    let businessFilter: { businessId?: string | { in: string[] } } = {};
    if (businessId) {
      businessFilter = { businessId };
    } else if (!viewerIsAdmin) {
      const staffed = await this.rbac.getStaffBusinessIds(viewerId);
      if (!staffed.length) return [];
      businessFilter = { businessId: { in: staffed } };
    }

    const userWhere = await this.rbac.customerScopedUserWhere(
      viewerId,
      viewerIsAdmin,
      businessId?.trim() ? [businessId.trim()] : undefined,
    );

    const memberships = await this.prisma.businessMembership.findMany({
      where: {
        ...businessFilter,
        user: userWhere,
      },
      orderBy: { joinedAt: 'desc' },
      include: {
        business: { select: { id: true, displayName: true, name: true } },
        registeredViaBusiness: {
          select: { id: true, displayName: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            createdAt: true,
            accounts: {
              select: {
                businessId: true,
                balance: true,
                positions: {
                  select: { side: true, quantity: true, avgEntry: true },
                },
              },
            },
            roles: {
              select: {
                role: { select: { name: true, displayName: true } },
              },
            },
          },
        },
      },
    });

    return Promise.all(
      memberships.map(async (m) => {
        const account = m.user.accounts.find(
          (a) => a.businessId === m.businessId,
        );
        const balance = toNum(account?.balance);
        const leverageBusinessId = businessId ?? m.businessId;
        const settings = await this.tradingConfig.getEffectiveSettings(
          m.user.id,
          leverageBusinessId,
        );
        let marginUsed = 0;
        for (const p of account?.positions ?? []) {
          marginUsed += requiredMargin(
            toNum(p.quantity),
            toNum(p.avgEntry),
            settings.leverage,
          );
        }
        marginUsed = Math.round(marginUsed * 100) / 100;

        return {
          membershipId: m.id,
          joinedAt: m.joinedAt.toISOString(),
          registeredViaApp: m.registeredViaApp,
          registeredViaBusiness: m.registeredViaBusiness
            ? {
                id: m.registeredViaBusiness.id,
                displayName: m.registeredViaBusiness.displayName,
              }
            : null,
          business: m.business,
          wallet: {
            balance,
            marginUsed,
            freeBalance: Math.max(0, Math.round(balance * 100) / 100),
            openPositions: account?.positions.length ?? 0,
          },
          user: {
            id: m.user.id,
            email: m.user.email,
            fullName: m.user.fullName,
            phone: m.user.phone,
            createdAt: m.user.createdAt.toISOString(),
            roles: m.user.roles.map((r) => ({
              name: r.role.name,
              displayName: r.role.displayName,
            })),
          },
          isOnline: this.presence.isOnline(m.user.id),
        };
      }),
    );
  }

  async getByUserId(
    userId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const userWhere = await this.rbac.customerScopedUserWhere(
      viewerId,
      viewerIsAdmin,
    );

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...userWhere,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        tcKimlikNo: true,
        phone: true,
        referenceNumber: true,
        createdAt: true,
        roles: {
          select: {
            role: { select: { id: true, name: true, displayName: true } },
          },
        },
        memberships: {
          orderBy: { joinedAt: 'desc' },
          select: {
            id: true,
            joinedAt: true,
            registeredViaApp: true,
            business: { select: { id: true, displayName: true, name: true } },
            registeredViaBusiness: {
              select: { id: true, displayName: true },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Müşteri bulunamadı');

    let visibleMemberships = user.memberships;
    if (!viewerIsAdmin) {
      const staffed = await this.rbac.getStaffBusinessIds(viewerId);
      visibleMemberships = user.memberships.filter((m) =>
        staffed.includes(m.business.id),
      );
      if (!visibleMemberships.length) {
        throw new ForbiddenException('Bu müşteriye erişim yok');
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tcKimlikNo: user.tcKimlikNo,
      phone: user.phone,
      referenceNumber: user.referenceNumber,
      createdAt: user.createdAt.toISOString(),
      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
        displayName: r.role.displayName,
      })),
      memberships: visibleMemberships.map((m) => ({
        id: m.id,
        joinedAt: m.joinedAt.toISOString(),
        registeredViaApp: m.registeredViaApp,
        business: m.business,
        registeredViaBusiness: m.registeredViaBusiness,
      })),
    };
  }

  async remove(
    userId: string,
    businessId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const id = businessId?.trim();
    if (!id) {
      throw new ConflictException('İşletme seçimi gerekli');
    }

    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      id,
      viewerIsAdmin,
    );
    if (!canAccess) {
      throw new ForbiddenException('Bu işletmeden müşteri silme yetkiniz yok');
    }

    const userWhere = await this.rbac.customerScopedUserWhere(
      viewerId,
      viewerIsAdmin,
      [id],
    );

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...userWhere,
      },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Müşteri bulunamadı');

    const membership = await this.prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId: id } },
    });
    if (!membership) {
      throw new NotFoundException('Müşteri bu işletmede kayıtlı değil');
    }

    const totalMemberships = await this.prisma.businessMembership.count({
      where: { userId },
    });
    const deletedUser = totalMemberships <= 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.tradingAccount.deleteMany({ where: { userId, businessId: id } });
      await tx.memberTradingSettings.deleteMany({
        where: { userId, businessId: id },
      });
      await tx.memberVerificationPolicy.deleteMany({
        where: { userId, businessId: id },
      });
      await tx.memberTwoFactorSettings.deleteMany({
        where: { userId, businessId: id },
      });
      await tx.memberVerificationStatus.deleteMany({
        where: { userId, businessId: id },
      });
      await tx.businessMembership.delete({
        where: { userId_businessId: { userId, businessId: id } },
      });

      const remaining = await tx.businessMembership.count({ where: { userId } });
      if (remaining === 0) {
        await tx.user.delete({ where: { id: userId } });
      }
    });

    return {
      ok: true,
      deletedUser,
      removedBusinessId: id,
    };
  }
}
