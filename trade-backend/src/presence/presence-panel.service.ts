import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MEMBER_ROLE_NAME } from '../rbac/permissions.constants';
import { RbacService } from '../rbac/rbac.service';
import { PresenceService } from './presence.service';

export interface OnlineMemberRow {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  balance: number;
  businesses: { id: string; displayName: string }[];
  joinedAt: string;
  connectedAt: string;
}

@Injectable()
export class PresencePanelService {
  constructor(
    private readonly presence: PresenceService,
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async listOnlineMembers(viewerId: string, viewerIsAdmin: boolean) {
    const onlineIds = this.presence.getOnlineUserIds();
    if (onlineIds.length === 0) return [];

    let businessFilter: { businessId?: { in: string[] } } = {};
    if (!viewerIsAdmin) {
      const staffed = await this.rbac.getStaffBusinessIds(viewerId);
      if (!staffed.length) return [];
      businessFilter = { businessId: { in: staffed } };
    }

    const memberships = await this.prisma.businessMembership.findMany({
      where: {
        ...businessFilter,
        userId: { in: onlineIds },
        user: await this.rbac.customerScopedUserWhere(
          viewerId,
          viewerIsAdmin,
        ),
      },
      orderBy: { user: { fullName: 'asc' } },
      select: {
        userId: true,
        business: { select: { id: true, displayName: true } },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            accounts: {
              select: { businessId: true, balance: true },
            },
            roles: { select: { role: { select: { name: true } } } },
          },
        },
        joinedAt: true,
      },
    });

    const byUser = new Map<string, OnlineMemberRow>();
    for (const m of memberships) {
      const isMember = m.user.roles.some((r) => r.role.name === MEMBER_ROLE_NAME);
      if (!isMember) continue;

      const account = m.user.accounts.find(
        (a) => a.businessId === m.business.id,
      );
      const balance =
        typeof account?.balance === 'number'
          ? account.balance
          : Number(account?.balance ?? 0);

      const existing = byUser.get(m.userId);
      if (existing) {
        if (!existing.businesses.some((b) => b.id === m.business.id)) {
          existing.businesses.push(m.business);
        }
        if (m.joinedAt.toISOString() < existing.joinedAt) {
          existing.joinedAt = m.joinedAt.toISOString();
        }
        continue;
      }
      byUser.set(m.userId, {
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        phone: m.user.phone,
        balance: Math.round(balance * 100) / 100,
        businesses: [m.business],
        joinedAt: m.joinedAt.toISOString(),
        connectedAt: new Date().toISOString(),
      });
    }

    return [...byUser.values()];
  }

  getOnlineUserIdSet(): Set<string> {
    return new Set(this.presence.getOnlineUserIds());
  }
}
