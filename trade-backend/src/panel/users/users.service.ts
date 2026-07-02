import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ADMIN_ROLE_NAME, MEMBER_ROLE_NAME } from '../../rbac/permissions.constants';
import { RbacService } from '../../rbac/rbac.service';
import { isValidPhone, normalizePhone } from '../../auth/phone';
import {
  isValidFullName,
  normalizeFullName,
} from '../../auth/register.dto';
import { isValidTcKimlikNo, normalizeTcKimlikNo } from '../../auth/tc-kimlik';

import type {
  CreatePanelUserDto,
  UpdatePanelUserDto,
} from './dto/user.dto';

export type { CreatePanelUserDto, UpdatePanelUserDto };

export interface ReferredMemberRow {
  membershipId: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
  };
}

export interface ReferredMembersByBusinessRow {
  business: { id: string; displayName: string; name: string };
  members: ReferredMemberRow[];
}

const membershipSelect = {
  id: true,
  joinedAt: true,
  registeredViaApp: true,
  business: { select: { id: true, displayName: true, name: true } },
  registeredViaBusiness: { select: { id: true, displayName: true } },
} as const;

const staffSelect = {
  assignedAt: true,
  business: { select: { id: true, displayName: true, name: true } },
} as const;

@Injectable()
export class PanelUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  private serializeUser(user: {
    id: string;
    email: string;
    fullName: string;
    tcKimlikNo: string;
    phone: string;
    referenceNumber: string | null;
    createdAt: Date;
    roles: {
      role: { id: string; name: string; displayName: string };
    }[];
    memberships: {
      id: string;
      joinedAt: Date;
      registeredViaApp: string | null;
      business: { id: string; displayName: string; name: string };
      registeredViaBusiness: { id: string; displayName: string } | null;
    }[];
    businessStaff: {
      assignedAt: Date;
      business: { id: string; displayName: string; name: string };
    }[];
  }, referredMembersByBusiness: ReferredMembersByBusinessRow[] = []) {
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
      staffBusinesses: user.businessStaff.map((s) => ({
        assignedAt: s.assignedAt.toISOString(),
        business: s.business,
      })),
      memberships: user.memberships.map((m) => ({
        id: m.id,
        joinedAt: m.joinedAt.toISOString(),
        registeredViaApp: m.registeredViaApp,
        business: m.business,
        registeredViaBusiness: m.registeredViaBusiness,
      })),
      referredMembersByBusiness,
    };
  }

  private async fetchReferredMembersByBusiness(
    referenceNumber: string | null,
    staffBusinessIds: string[],
  ): Promise<ReferredMembersByBusinessRow[]> {
    if (!referenceNumber?.trim() || !staffBusinessIds.length) return [];

    const memberships = await this.prisma.businessMembership.findMany({
      where: {
        businessId: { in: staffBusinessIds },
        user: {
          AND: [
            this.rbac.customerFilter(),
            { referenceNumber: referenceNumber.trim() },
          ],
        },
      },
      orderBy: [{ business: { displayName: 'asc' } }, { joinedAt: 'desc' }],
      select: {
        id: true,
        joinedAt: true,
        business: { select: { id: true, displayName: true, name: true } },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    const grouped = new Map<string, ReferredMembersByBusinessRow>();
    for (const m of memberships) {
      let row = grouped.get(m.business.id);
      if (!row) {
        row = {
          business: m.business,
          members: [],
        };
        grouped.set(m.business.id, row);
      }
      row.members.push({
        membershipId: m.id,
        joinedAt: m.joinedAt.toISOString(),
        user: m.user,
      });
    }

    return [...grouped.values()];
  }

  private userSelect = {
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
    memberships: { select: membershipSelect },
    businessStaff: { select: staffSelect },
  };

  async list(
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ) {
    const staffBusinessFilter =
      businessId && businessId.trim()
        ? { businessStaff: { some: { businessId: businessId.trim() } } }
        : {};

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          this.rbac.panelUserScopeFilter(viewerId, viewerIsAdmin),
          this.rbac.excludeCustomersFilter(),
          staffBusinessFilter,
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: this.userSelect,
    });
    return users.map((u) => this.serializeUser(u));
  }

  async getById(id: string, viewerId: string, viewerIsAdmin: boolean) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        AND: [
          this.rbac.panelUserScopeFilter(viewerId, viewerIsAdmin),
          this.rbac.excludeCustomersFilter(),
        ],
      },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const staffBusinessIds = user.businessStaff.map((s) => s.business.id);
    const referredMembersByBusiness = await this.fetchReferredMembersByBusiness(
      user.referenceNumber,
      staffBusinessIds,
    );
    return this.serializeUser(user, referredMembersByBusiness);
  }

  async create(
    dto: CreatePanelUserDto,
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

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) throw new ConflictException('Bu e-posta zaten kayıtlı');

    const existingTc = await this.prisma.user.findUnique({
      where: { tcKimlikNo },
    });
    if (existingTc) {
      throw new ConflictException('Bu T.C. kimlik numarası zaten kayıtlı');
    }

    const roleIds = dto.roleIds ?? [];
    await this.validateRoleAssignment(roleIds, viewerId, viewerIsAdmin);

    let businessIds = dto.businessIds ?? [];
    if (!viewerIsAdmin && !businessIds.length) {
      const staffed = await this.rbac.getStaffBusinessIds(viewerId);
      if (staffed.length === 1) businessIds = staffed;
    }
    await this.validateBusinessAssignment(
      businessIds,
      viewerId,
      viewerIsAdmin,
    );

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        fullName,
        tcKimlikNo,
        phone,
        referenceNumber,
        roles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
        businessStaff: {
          create: businessIds.map((businessId) => ({ businessId })),
        },
      },
      select: this.userSelect,
    });

    if (businessIds.length) {
      await this.rbac.stripCustomerIdentity(user.id);
    }

    const refreshed = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: this.userSelect,
    });

    return this.serializeUser(refreshed ?? user);
  }

  private async validateRoleAssignment(
    roleIds: string[],
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    if (!roleIds.length) return;
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
    });
    if (roles.length !== roleIds.length) {
      throw new ConflictException('Geçersiz rol seçimi');
    }
    const staffed = viewerIsAdmin
      ? null
      : await this.rbac.getStaffBusinessIds(viewerId);
    for (const role of roles) {
      if (role.name === ADMIN_ROLE_NAME && !viewerIsAdmin) {
        throw new ForbiddenException('Admin rolü atama yetkiniz yok');
      }
      if (role.isSystem && !viewerIsAdmin) {
        throw new ForbiddenException('Sistem rolü atama yetkiniz yok');
      }
      if (role.name === MEMBER_ROLE_NAME) {
        throw new ConflictException(
          'Üye rolü yalnızca web kaydı ile oluşturulur; panelden atanamaz',
        );
      }
      if (!role.isActive) {
        throw new ConflictException(`"${role.displayName}" pasif, atanamaz`);
      }
      if (role.isHidden && !viewerIsAdmin) {
        throw new ConflictException('Gizli rol atama yetkiniz yok');
      }
      if (!viewerIsAdmin) {
        if (!role.businessId || !staffed!.includes(role.businessId)) {
          throw new ForbiddenException('Bu rolü atama yetkiniz yok');
        }
      }
    }
  }

  private async validateBusinessAssignment(
    businessIds: string[],
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    if (!businessIds.length) return;
    const businesses = await this.prisma.business.findMany({
      where: { id: { in: businessIds }, isActive: true },
      select: { id: true },
    });
    if (businesses.length !== businessIds.length) {
      throw new ConflictException('Geçersiz işletme seçimi');
    }
    if (viewerIsAdmin) return;

    const staffed = await this.rbac.getStaffBusinessIds(viewerId);
    for (const id of businessIds) {
      if (!staffed.includes(id)) {
        throw new ForbiddenException('Bu işletmeye üye atama yetkiniz yok');
      }
    }
  }

  async update(
    id: string,
    dto: UpdatePanelUserDto,
    viewerId: string,
    viewerIsAdmin = false,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        AND: [
          this.rbac.panelUserScopeFilter(viewerId, viewerIsAdmin),
          this.rbac.excludeCustomersFilter(),
        ],
      },
    });
    if (!existing) throw new NotFoundException('Kullanıcı bulunamadı');

    const data: {
      email?: string;
      password?: string;
      fullName?: string;
      tcKimlikNo?: string;
      phone?: string;
      referenceNumber?: string | null;
    } = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (!email) throw new ConflictException('E-posta gerekli');
      const clash = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (clash) throw new ConflictException('Bu e-posta zaten kayıtlı');
      data.email = email;
    }

    if (dto.fullName !== undefined) {
      const fullName = normalizeFullName(dto.fullName);
      if (!isValidFullName(fullName)) {
        throw new ConflictException('Ad ve soyad girin');
      }
      data.fullName = fullName;
    }

    if (dto.tcKimlikNo !== undefined) {
      const tcKimlikNo = normalizeTcKimlikNo(dto.tcKimlikNo);
      if (!isValidTcKimlikNo(tcKimlikNo)) {
        throw new ConflictException('Geçerli bir T.C. kimlik numarası girin');
      }
      const clash = await this.prisma.user.findFirst({
        where: { tcKimlikNo, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('Bu T.C. kimlik numarası zaten kayıtlı');
      }
      data.tcKimlikNo = tcKimlikNo;
    }

    if (dto.phone !== undefined) {
      const phone = normalizePhone(dto.phone);
      if (!isValidPhone(phone)) {
        throw new ConflictException('Geçerli bir cep telefonu numarası girin');
      }
      data.phone = phone;
    }

    if (dto.referenceNumber !== undefined) {
      data.referenceNumber = dto.referenceNumber?.trim() || null;
    }

    if (dto.password !== undefined && dto.password.length > 0) {
      if (dto.password.length < 6) {
        throw new ConflictException('Şifre en az 6 karakter olmalı');
      }
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.roleIds !== undefined) {
      const roleIds = dto.roleIds;
      await this.validateRoleAssignment(roleIds, viewerId, viewerIsAdmin);
      await this.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
      if (roleIds.length) {
        await this.prisma.userRoleAssignment.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
        await this.rbac.stripCustomerIdentity(id);
      }
    }

    if (dto.businessIds !== undefined) {
      await this.validateBusinessAssignment(
        dto.businessIds,
        viewerId,
        viewerIsAdmin,
      );

      if (viewerIsAdmin) {
        await this.prisma.businessStaff.deleteMany({ where: { userId: id } });
        if (dto.businessIds.length) {
          await this.prisma.businessStaff.createMany({
            data: dto.businessIds.map((businessId) => ({ userId: id, businessId })),
          });
        }
        await this.rbac.stripCustomerIdentity(id);
      } else {
        const staffed = await this.rbac.getStaffBusinessIds(viewerId);
        const toAdd = dto.businessIds.filter((bid) => staffed.includes(bid));
        const toRemove = staffed.filter((bid) => !dto.businessIds!.includes(bid));

        if (toRemove.length) {
          await this.prisma.businessStaff.deleteMany({
            where: {
              userId: id,
              businessId: { in: toRemove },
            },
          });
        }
        for (const businessId of toAdd) {
          await this.prisma.businessStaff.upsert({
            where: {
              userId_businessId: { userId: id, businessId },
            },
            create: { userId: id, businessId },
            update: {},
          });
        }
      }

      await this.rbac.stripCustomerIdentity(id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect,
    });

    return this.serializeUser(user);
  }

  async remove(id: string, viewerId: string, viewerIsAdmin: boolean) {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        AND: [
          this.rbac.panelUserScopeFilter(viewerId, viewerIsAdmin),
          this.rbac.excludeCustomersFilter(),
        ],
      },
    });
    if (!existing) throw new NotFoundException('Kullanıcı bulunamadı');
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
