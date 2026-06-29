import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { TradingConfigService } from '../../trading/trading-config.service';
import { PortfolioEventsService } from '../../trading/portfolio-events.service';
import { requiredMargin } from '../../trading/trading-config.types';

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class PanelWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly tradingConfig: TradingConfigService,
    private readonly portfolioEvents: PortfolioEventsService,
  ) {}

  private async assertMemberAccess(
    userId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    await this.rbac.assertCustomerAccess(userId, viewerId, viewerIsAdmin);
  }

  private async assertBusinessAccess(
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
  }

  private calcPositionsMargin(
    positions: {
      id: string;
      symbol: string;
      side: string;
      quantity: unknown;
      avgEntry: unknown;
    }[],
    leverage: number,
  ) {
    return positions.map((p) => {
      const quantity = toNum(p.quantity);
      const avgEntry = toNum(p.avgEntry);
      const marginUsed = roundMoney(
        requiredMargin(quantity, avgEntry, leverage),
      );
      return {
        id: p.id,
        symbol: p.symbol,
        side: p.side,
        quantity,
        avgEntry,
        marginUsed,
      };
    });
  }

  private async resolveBusinessIdForUser(
    userId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ): Promise<string | null> {
    const allowed = viewerIsAdmin
      ? null
      : new Set(await this.rbac.getStaffBusinessIds(viewerId));
    const isAllowed = (bid: string) => !allowed || allowed.has(bid);

    if (businessId) {
      const m = await this.prisma.businessMembership.findUnique({
        where: { userId_businessId: { userId, businessId } },
      });
      if (m && isAllowed(businessId)) return businessId;
    }
    const memberships = await this.prisma.businessMembership.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { businessId: true },
    });
    const first = memberships.find((m) => isAllowed(m.businessId));
    return first?.businessId ?? null;
  }

  async getMemberWallet(
    userId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ) {
    await this.assertMemberAccess(userId, viewerId, viewerIsAdmin);
    const resolvedBusinessId = await this.resolveBusinessIdForUser(
      userId,
      viewerId,
      viewerIsAdmin,
      businessId,
    );

    const account = resolvedBusinessId
      ? await this.prisma.tradingAccount.findUnique({
          where: {
            userId_businessId: {
              userId,
              businessId: resolvedBusinessId,
            },
          },
          select: {
            id: true,
            balance: true,
            positions: {
              select: {
                id: true,
                symbol: true,
                side: true,
                quantity: true,
                avgEntry: true,
              },
            },
          },
        })
      : null;

    const settings = await this.tradingConfig.getEffectiveSettings(
      userId,
      resolvedBusinessId,
    );
    const balance = account ? toNum(account.balance) : 0;
    const positions = account
      ? this.calcPositionsMargin(account.positions, settings.leverage)
      : [];
    const marginUsed = roundMoney(
      positions.reduce((sum, p) => sum + p.marginUsed, 0),
    );
    // Bakiye açılışta teminat düşülmüş serbest nakit; tekrar marginUsed çıkarılmaz.
    const freeBalance = roundMoney(Math.max(0, balance));

    const [pendingDeposits, pendingWithdrawals, approvedDeposits, approvedWithdrawals] =
      account
        ? await Promise.all([
            this.prisma.financeRequest.aggregate({
              where: {
                userId,
                accountId: account.id,
                type: 'deposit',
                status: 'pending',
              },
              _sum: { amount: true },
              _count: true,
            }),
            this.prisma.financeRequest.aggregate({
              where: {
                userId,
                accountId: account.id,
                type: 'withdraw',
                status: 'pending',
              },
              _sum: { amount: true },
              _count: true,
            }),
            this.prisma.financeRequest.aggregate({
              where: {
                userId,
                accountId: account.id,
                type: 'deposit',
                status: 'approved',
              },
              _sum: { amount: true },
            }),
            this.prisma.financeRequest.aggregate({
              where: {
                userId,
                accountId: account.id,
                type: 'withdraw',
                status: 'approved',
              },
              _sum: { amount: true },
            }),
          ])
        : [
            { _sum: { amount: null }, _count: 0 },
            { _sum: { amount: null }, _count: 0 },
            { _sum: { amount: null } },
            { _sum: { amount: null } },
          ];

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });
    if (!user) throw new NotFoundException('Müşteri bulunamadı');

    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      businessId: resolvedBusinessId,
      accountId: account?.id ?? null,
      balance,
      marginUsed,
      freeBalance,
      leverage: settings.leverage,
      openPositions: positions.length,
      positions,
      finance: {
        pendingDepositTotal: toNum(pendingDeposits._sum.amount),
        pendingDepositCount: pendingDeposits._count,
        pendingWithdrawTotal: toNum(pendingWithdrawals._sum.amount),
        pendingWithdrawCount: pendingWithdrawals._count,
        totalDeposited: toNum(approvedDeposits._sum.amount),
        totalWithdrawn: toNum(approvedWithdrawals._sum.amount),
      },
    };
  }

  async adjustMemberBalance(
    userId: string,
    body: {
      type: 'deposit' | 'withdraw';
      amount: number;
      note?: string;
      businessId?: string;
    },
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    await this.assertMemberAccess(userId, viewerId, viewerIsAdmin);

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Geçerli bir tutar girin');
    }

    const resolvedBusinessId = await this.resolveBusinessIdForUser(
      userId,
      viewerId,
      viewerIsAdmin,
      body.businessId,
    );
    if (!resolvedBusinessId) {
      throw new NotFoundException('İşletme üyeliği bulunamadı');
    }

    const account = await this.prisma.tradingAccount.findUnique({
      where: {
        userId_businessId: { userId, businessId: resolvedBusinessId },
      },
      select: { id: true, balance: true },
    });
    if (!account) {
      throw new NotFoundException('Trading hesabı bulunamadı');
    }

    const balance = toNum(account.balance);
    if (body.type === 'withdraw' && amount > balance) {
      throw new BadRequestException('Bakiye yetersiz');
    }

    const delta = body.type === 'deposit' ? amount : -amount;
    const updated = await this.prisma.tradingAccount.update({
      where: { id: account.id },
      data: { balance: { increment: delta } },
      select: { balance: true },
    });

    this.portfolioEvents.notifyUser(
      userId,
      resolvedBusinessId,
      toNum(updated.balance),
    );

    return {
      ok: true,
      balance: toNum(updated.balance),
      adjustment: { type: body.type, amount, note: body.note?.trim() || null },
    };
  }

  async getBusinessWalletSummary(
    businessId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    await this.assertBusinessAccess(businessId, viewerId, viewerIsAdmin);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, displayName: true },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı');

    const memberships = await this.prisma.businessMembership.findMany({
      where: {
        businessId,
        user: await this.rbac.customerScopedUserWhere(
          viewerId,
          viewerIsAdmin,
          [businessId],
        ),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            accounts: {
              where: { businessId },
              select: {
                id: true,
                balance: true,
                positions: {
                  select: {
                    id: true,
                    symbol: true,
                    side: true,
                    quantity: true,
                    avgEntry: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const seen = new Set<string>();
    let totalBalance = 0;
    let totalMarginUsed = 0;
    let membersWithAccount = 0;
    const memberRows: {
      userId: string;
      fullName: string;
      email: string;
      balance: number;
      marginUsed: number;
      freeBalance: number;
      openPositions: number;
    }[] = [];

    for (const m of memberships) {
      if (seen.has(m.userId)) continue;
      seen.add(m.userId);

      const account = m.user.accounts[0];
      if (!account) {
        memberRows.push({
          userId: m.user.id,
          fullName: m.user.fullName,
          email: m.user.email,
          balance: 0,
          marginUsed: 0,
          freeBalance: 0,
          openPositions: 0,
        });
        continue;
      }

      const settings = await this.tradingConfig.getEffectiveSettings(
        m.userId,
        businessId,
      );
      const balance = toNum(account.balance);
      const positions = this.calcPositionsMargin(
        account.positions,
        settings.leverage,
      );
      const marginUsed = roundMoney(
        positions.reduce((sum, p) => sum + p.marginUsed, 0),
      );
      // Bakiye açılışta teminat düşülmüş serbest nakit; tekrar marginUsed çıkarılmaz.
      const freeBalance = roundMoney(Math.max(0, balance));

      totalBalance += balance;
      totalMarginUsed += marginUsed;
      membersWithAccount += 1;

      memberRows.push({
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        balance: roundMoney(balance),
        marginUsed,
        freeBalance,
        openPositions: positions.length,
      });
    }

    return {
      businessId: business.id,
      businessName: business.displayName,
      memberCount: seen.size,
      membersWithAccount,
      totalBalance: roundMoney(totalBalance),
      totalMarginUsed: roundMoney(totalMarginUsed),
      totalFreeBalance: roundMoney(totalBalance),
      members: memberRows,
    };
  }
}
