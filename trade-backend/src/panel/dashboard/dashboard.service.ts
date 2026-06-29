import { Injectable } from '@nestjs/common';
import { PresencePanelService } from '../../presence/presence-panel.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { PanelWalletService } from '../wallet/wallet.service';

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class PanelDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly wallet: PanelWalletService,
    private readonly presence: PresencePanelService,
  ) {}

  async getOverview(viewerId: string, viewerIsAdmin: boolean) {
    const businesses = await this.prisma.business.findMany({
      where: this.rbac.businessScopeFilter(viewerId, viewerIsAdmin),
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, isActive: true },
    });

    const businessIds = businesses.map((b) => b.id);

    const walletSummaries = await Promise.all(
      businesses.map((b) =>
        this.wallet.getBusinessWalletSummary(b.id, viewerId, viewerIsAdmin),
      ),
    );

    const businessRows = businesses.map((b, i) => {
      const wallet = walletSummaries[i];
      const openPositions = wallet.members.reduce(
        (sum, m) => sum + m.openPositions,
        0,
      );
      return {
        businessId: b.id,
        displayName: b.displayName,
        isActive: b.isActive,
        memberCount: wallet.memberCount,
        totalBalance: wallet.totalBalance,
        totalMarginUsed: wallet.totalMarginUsed,
        totalFreeBalance: wallet.totalFreeBalance,
        openPositions,
      };
    });

    const userWallet = new Map<
      string,
      {
        balance: number;
        marginUsed: number;
        freeBalance: number;
        openPositions: number;
      }
    >();
    for (const wallet of walletSummaries) {
      for (const m of wallet.members) {
        if (!userWallet.has(m.userId)) {
          userWallet.set(m.userId, {
            balance: m.balance,
            marginUsed: m.marginUsed,
            freeBalance: m.freeBalance,
            openPositions: m.openPositions,
          });
        }
      }
    }

    let totalBalance = 0;
    let totalMarginUsed = 0;
    let totalFreeBalance = 0;
    let openPositions = 0;
    for (const w of userWallet.values()) {
      totalBalance += w.balance;
      totalMarginUsed += w.marginUsed;
      totalFreeBalance += w.freeBalance;
      openPositions += w.openPositions;
    }

    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const recentMemberships =
      businessIds.length === 0
        ? []
        : await this.prisma.businessMembership.findMany({
            where: {
              businessId: { in: businessIds },
              joinedAt: { gte: since },
              user: await this.rbac.customerScopedUserWhere(
                viewerId,
                viewerIsAdmin,
                businessIds,
              ),
            },
            select: {
              joinedAt: true,
              businessId: true,
              business: { select: { displayName: true } },
            },
          });

    const trendMap = new Map<string, Map<string, { name: string; count: number }>>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      trendMap.set(dateKey(d), new Map());
    }

    for (const m of recentMemberships) {
      const key = dateKey(m.joinedAt);
      const day = trendMap.get(key);
      if (!day) continue;
      const existing = day.get(m.businessId);
      if (existing) {
        existing.count += 1;
      } else {
        day.set(m.businessId, {
          name: m.business.displayName,
          count: 1,
        });
      }
    }

    const memberTrend = [...trendMap.entries()].map(([date, byBusiness]) => {
      const businessesOnDay = [...byBusiness.entries()].map(
        ([businessId, { name, count }]) => ({
          businessId,
          businessName: name,
          count,
        }),
      );
      const total = businessesOnDay.reduce((sum, b) => sum + b.count, 0);
      return { date, total, businesses: businessesOnDay };
    });

    const memberScope = await this.rbac.customerScopedUserWhere(
      viewerId,
      viewerIsAdmin,
      businessIds,
    );

    const onlineMembers = await this.presence.listOnlineMembers(
      viewerId,
      viewerIsAdmin,
    );

    const [pendingDeposits, pendingWithdrawals] =
      businessIds.length === 0
        ? [0, 0]
        : await Promise.all([
            this.prisma.financeRequest.count({
              where: {
                status: 'pending',
                type: 'deposit',
                user: memberScope,
              },
            }),
            this.prisma.financeRequest.count({
              where: {
                status: 'pending',
                type: 'withdraw',
                user: memberScope,
              },
            }),
          ]);

    return {
      totals: {
        businessCount: businesses.length,
        activeBusinessCount: businesses.filter((b) => b.isActive).length,
        memberCount: userWallet.size,
        totalBalance: roundMoney(totalBalance),
        totalMarginUsed: roundMoney(totalMarginUsed),
        totalFreeBalance: roundMoney(totalFreeBalance),
        openPositions,
        pendingDeposits,
        pendingWithdrawals,
        onlineCount: onlineMembers.length,
      },
      businesses: businessRows,
      memberTrend,
      onlineMembers,
    };
  }
}
