import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_ROLE_NAME, MEMBER_ROLE_NAME, PERMISSIONS } from './permissions.constants';

export interface UserAuthProfile {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;
  roles: { name: string; displayName: string }[];
  permissions: string[];
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserAuthProfile(userId: string): Promise<UserAuthProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                displayName: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!user) return null;

    const roles = user.roles.map((r) => ({
      name: r.role.name,
      displayName: r.role.displayName,
    }));

    const permissionSet = new Set<string>();
    for (const assignment of user.roles) {
      for (const rp of assignment.role.permissions) {
        permissionSet.add(rp.permission.key);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      roles,
      permissions: [...permissionSet].sort(),
    };
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const profile = await this.getUserAuthProfile(userId);
    return profile?.permissions.includes(permission) ?? false;
  }

  async hasAnyPermission(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    const profile = await this.getUserAuthProfile(userId);
    if (!profile) return false;
    return permissions.some((p) => profile.permissions.includes(p));
  }

  async canBypassMarketHours(userId: string): Promise<boolean> {
    return this.hasPermission(userId, PERMISSIONS.TRADING_BYPASS_MARKET_HOURS);
  }

  async isReferralOnlyMemberScope(
    userId: string,
    viewerIsAdmin: boolean,
  ): Promise<boolean> {
    if (viewerIsAdmin) return false;
    return this.hasPermission(userId, PERMISSIONS.PANEL_MEMBERS_REFERRAL_ONLY);
  }

  async getUserReferenceNumber(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referenceNumber: true },
    });
    return user?.referenceNumber?.trim() || null;
  }

  /** Referans kapsamı: panel kullanıcısının referans numarasıyla eşleşen müşteriler. */
  memberReferralScopeFilter(referenceNumber: string | null) {
    if (!referenceNumber) {
      return { id: { in: [] as string[] } };
    }
    return { referenceNumber };
  }

  /** İşlem/finans: personelin erişebildiği müşteri hesapları (referans kısıtı dahil). */
  async scopedMemberUserWhere(
    viewerId: string,
    viewerIsAdmin: boolean,
  ): Promise<Prisma.UserWhereInput> {
    if (viewerIsAdmin) return {};
    const referralOnly = await this.isReferralOnlyMemberScope(
      viewerId,
      viewerIsAdmin,
    );
    const base = this.userScopeFilter(viewerId, false) as Prisma.UserWhereInput;
    if (!referralOnly) return base;
    const referenceNumber = await this.getUserReferenceNumber(viewerId);
    return { AND: [base, this.memberReferralScopeFilter(referenceNumber)] };
  }

  /** Müşteri listesi/detay: web üyeleri + işletme + isteğe bağlı referans kısıtı. */
  async customerScopedUserWhere(
    viewerId: string,
    viewerIsAdmin: boolean,
    businessIds?: string[],
  ): Promise<Prisma.UserWhereInput> {
    const parts: Prisma.UserWhereInput[] = [this.customerFilter()];

    if (!viewerIsAdmin) {
      const staffed = await this.getStaffBusinessIds(viewerId);
      const ids = businessIds?.length
        ? businessIds.filter((id) => staffed.includes(id))
        : staffed;
      if (!ids.length) {
        return { id: { in: [] as string[] } };
      }
      parts.push({
        memberships: { some: { businessId: { in: ids } } },
      });
    } else if (businessIds?.length) {
      parts.push({
        memberships: { some: { businessId: { in: businessIds } } },
      });
    }

    const referralOnly = await this.isReferralOnlyMemberScope(
      viewerId,
      viewerIsAdmin,
    );
    if (referralOnly) {
      const referenceNumber = await this.getUserReferenceNumber(viewerId);
      parts.push(this.memberReferralScopeFilter(referenceNumber));
    }

    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async assertCustomerAccess(
    memberUserId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: memberUserId,
        ...(await this.customerScopedUserWhere(viewerId, viewerIsAdmin)),
      },
      select: { id: true },
    });
    if (!user) {
      throw new ForbiddenException('Bu müşteriye erişim yok');
    }
  }

  async hasAdminRole(userId: string): Promise<boolean> {
    const count = await this.prisma.userRoleAssignment.count({
      where: { userId, role: { name: ADMIN_ROLE_NAME } },
    });
    return count > 0;
  }

  async getStaffBusinessIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.businessStaff.findMany({
      where: { userId },
      select: { businessId: true },
    });
    return rows.map((r) => r.businessId);
  }

  async getAccessibleBusinessesForPanel(userId: string) {
    const isAdmin = await this.hasAdminRole(userId);
    if (isAdmin) {
      return this.prisma.business.findMany({
        where: { isActive: true },
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          name: true,
          displayName: true,
          slug: true,
        },
      });
    }
    const rows = await this.prisma.businessStaff.findMany({
      where: { userId, business: { isActive: true } },
      orderBy: { business: { displayName: 'asc' } },
      select: {
        business: {
          select: {
            id: true,
            name: true,
            displayName: true,
            slug: true,
          },
        },
      },
    });
    return rows.map((r) => r.business);
  }

  async canAccessBusiness(
    userId: string,
    businessId: string,
    isAdmin: boolean,
  ): Promise<boolean> {
    if (isAdmin) return true;
    const count = await this.prisma.businessStaff.count({
      where: { userId, businessId },
    });
    return count > 0;
  }

  userScopeFilter(viewerId: string, viewerIsAdmin: boolean) {
    if (viewerIsAdmin) return {};
    return {
      memberships: {
        some: {
          business: {
            staff: { some: { userId: viewerId } },
          },
        },
      },
    };
  }

  /** Yönetim paneli personeli — işletme staff veya üye dışı rol. */
  panelUserFilter() {
    return {
      OR: [
        { businessStaff: { some: {} } },
        {
          roles: {
            some: { role: { name: { not: MEMBER_ROLE_NAME } } },
          },
        },
      ],
    };
  }

  /** Panel kullanıcı listesi: web müşterilerini (yalnızca üye) hariç tut. */
  excludeCustomersFilter() {
    return this.panelUserFilter();
  }

  /**
   * Web müşterisi: üye rolü var, panel personeli değil, başka rolü yok.
   * Panel kullanıcıları müşteri listesinde görünmez.
   */
  customerFilter() {
    return {
      AND: [
        { roles: { some: { role: { name: MEMBER_ROLE_NAME } } } },
        { businessStaff: { none: {} } },
        {
          roles: {
            none: { role: { name: { not: MEMBER_ROLE_NAME } } },
          },
        },
      ],
    };
  }

  async isPanelUser(userId: string): Promise<boolean> {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, ...this.panelUserFilter() },
      select: { id: true },
    });
    return row != null;
  }

  /** Panel personelini müşteri kayıtlarından ayırır (üye rolü + üyelik). */
  async stripCustomerIdentity(userId: string) {
    const memberRole = await this.prisma.role.findFirst({
      where: { name: MEMBER_ROLE_NAME, businessId: null },
      select: { id: true },
    });
    if (memberRole) {
      await this.prisma.userRoleAssignment.deleteMany({
        where: { userId, roleId: memberRole.id },
      });
    }
    await this.prisma.businessMembership.deleteMany({ where: { userId } });
  }

  /** Panel user list scope for non-admin staff. */
  panelUserScopeFilter(viewerId: string, viewerIsAdmin: boolean) {
    if (viewerIsAdmin) return {};
    return {
      businessStaff: {
        some: {
          business: {
            staff: { some: { userId: viewerId } },
          },
        },
      },
    };
  }

  businessScopeFilter(viewerId: string, viewerIsAdmin: boolean) {
    if (viewerIsAdmin) return {};
    return {
      staff: { some: { userId: viewerId } },
    };
  }

  /** İşletme listesi: admin tümü, personel atandığı işletmeler. */
  async resolveAccessibleBusinessIds(
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ): Promise<string[]> {
    if (businessId) {
      const canAccess = await this.canAccessBusiness(
        viewerId,
        businessId,
        viewerIsAdmin,
      );
      if (!canAccess) return [];
      return [businessId];
    }
    if (viewerIsAdmin) {
      const rows = await this.prisma.business.findMany({
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }
    return this.getStaffBusinessIds(viewerId);
  }

  businessIdInFilter(businessIds: string[]) {
    if (businessIds.length === 0) return { id: { in: [] as string[] } };
    return { id: { in: businessIds } };
  }

  roleScopeFilter(viewerId: string, viewerIsAdmin: boolean, businessIds: string[]) {
    if (viewerIsAdmin) {
      if (businessIds.length === 0) return { id: { in: [] as string[] } };
      return {
        OR: [{ businessId: null }, { businessId: { in: businessIds } }],
      };
    }
    if (businessIds.length === 0) return { id: { in: [] as string[] } };
    return { businessId: { in: businessIds } };
  }

  notificationScopeFilter(businessIds: string[]) {
    if (businessIds.length === 0) {
      return { businessId: { in: [] as string[] } };
    }
    return { businessId: { in: businessIds } };
  }

  async listRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          select: { permission: { select: { key: true, displayName: true } } },
        },
        _count: { select: { users: true } },
      },
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }
}
