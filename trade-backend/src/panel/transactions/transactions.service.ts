import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { TradingConfigService } from '../../trading/trading-config.service';
import type { EffectiveTradingSettings } from '../../trading/trading-config.types';
import { TradingService } from '../../trading/trading.service';
import {
  accrueSwap,
  dailySwapForPosition,
  estimateCommissionFee,
  netPnl,
} from '../../trading/trading-fees';
import { TransactionsEventsService } from './transactions-events.service';
import { PortfolioEventsService } from '../../trading/portfolio-events.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';
import type {
  OpenPanelTransactionDto,
  UpdatePanelPendingOrderDto,
  UpdatePanelPositionDto,
  UpdatePanelTradeDto,
} from './dto/transaction.dto';

export type TransactionStatus = 'open' | 'pending' | 'closed';

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

@Injectable()
export class PanelTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly trading: TradingService,
    private readonly tradingConfig: TradingConfigService,
    private readonly events: TransactionsEventsService,
    private readonly portfolioEvents: PortfolioEventsService,
  ) {}

  private async loadSettings(
    cache: Map<string, EffectiveTradingSettings>,
    userId: string,
    businessId: string,
  ): Promise<EffectiveTradingSettings> {
    const key = `${userId}:${businessId}`;
    let settings = cache.get(key);
    if (!settings) {
      settings = await this.tradingConfig.getEffectiveSettings(
        userId,
        businessId,
      );
      cache.set(key, settings);
    }
    return settings;
  }

  private positionSideFromNote(note: string | null | undefined): string {
    if (note?.includes('Short')) return 'short';
    if (note?.includes('Long')) return 'long';
    return 'long';
  }

  private buildTradeOpenIndex(
    rows: {
      accountId: string;
      symbol: string;
      executedAt: Date;
      note: string | null;
    }[],
  ) {
    const index = new Map<
      string,
      { executedAt: Date; note: string }[]
    >();
    for (const row of rows) {
      const key = `${row.accountId}:${row.symbol.toUpperCase()}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push({
        executedAt: row.executedAt,
        note: row.note ?? '',
      });
    }
    for (const events of index.values()) {
      events.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
    }
    return index;
  }

  private openTimeForCloseTrade(
    index: Map<string, { executedAt: Date; note: string }[]>,
    accountId: string,
    symbol: string,
    closeAt: Date,
    note: string | null,
  ): Date | null {
    if (!note?.includes('kapat')) return null;
    const key = `${accountId}:${symbol.toUpperCase()}`;
    const events = index.get(key) ?? [];
    let lastOpen: Date | null = null;
    for (const event of events) {
      if (event.executedAt.getTime() >= closeAt.getTime()) break;
      if (event.note.includes('aç')) lastOpen = event.executedAt;
    }
    return lastOpen;
  }

  private async userScopeWhere(
    viewerId: string,
    viewerIsAdmin: boolean,
  ): Promise<Prisma.UserWhereInput> {
    return this.rbac.scopedMemberUserWhere(viewerId, viewerIsAdmin);
  }

  private async assertAccountAccess(
    accountId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const account = await this.prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        user: await this.userScopeWhere(viewerId, viewerIsAdmin),
      },
      select: { id: true },
    });
    if (!account) throw new ForbiddenException('Bu işleme erişim yetkiniz yok');
  }

  private async notifyPortfolioBalance(accountId: string, balance: number) {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, businessId: true },
    });
    if (!account) return;
    this.portfolioEvents.notifyUser(
      account.userId,
      account.businessId,
      balance,
    );
  }

  private async notifyPortfolioRefresh(accountId: string) {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, businessId: true },
    });
    if (!account) return;
    this.portfolioEvents.notifyPortfolioRefresh(
      account.userId,
      account.businessId,
    );
  }

  private serializeUserRef(user: {
    id: string;
    email: string;
    fullName: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      label: `${user.id.slice(-8)} ${user.fullName}`,
    };
  }

  private serializeAccount(
    account: { id: string; balance: unknown },
    marginUsed = 0,
  ) {
    const balance = toNum(account.balance);
    return { id: account.id, balance, equity: balance + marginUsed };
  }

  private serializeOpenedBy(
    user: { id: string; fullName: string; email: string } | null | undefined,
  ) {
    if (!user) return null;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    };
  }

  private serializeRowBase(row: {
    id: string;
    displayId: number | null;
    openedBy?: { id: string; fullName: string; email: string } | null;
  }) {
    return {
      id: row.id,
      displayId: row.displayId,
      openedBy: this.serializeOpenedBy(row.openedBy),
    };
  }

  private async accountScopeWhere(
    viewerId: string,
    viewerIsAdmin: boolean,
    businessIds: string[],
    userId?: string,
  ): Promise<Prisma.TradingAccountWhereInput> {
    const userScope = await this.userScopeWhere(viewerId, viewerIsAdmin);
    return {
      user: {
        ...userScope,
        ...(userId ? { id: userId } : {}),
      },
      ...(businessIds.length ? { businessId: { in: businessIds } } : {}),
    };
  }

  async openForUser(
    operatorUserId: string,
    dto: OpenPanelTransactionDto,
    viewerIsAdmin: boolean,
  ) {
    if (!dto.businessId) {
      throw new BadRequestException('İşletme seçimi gerekli');
    }

    const target = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        ...(await this.userScopeWhere(operatorUserId, viewerIsAdmin)),
      },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const account = await this.prisma.tradingAccount.findUnique({
      where: {
        userId_businessId: {
          userId: dto.userId,
          businessId: dto.businessId,
        },
      },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException('Bu işletme için trading hesabı bulunamadı');
    }

    await this.trading.openForUser(dto.userId, operatorUserId, {
      orderType: dto.orderType,
      symbol: dto.symbol,
      side: dto.side,
      quantity: dto.quantity,
      bid: dto.bid,
      ask: dto.ask,
      limitPrice: dto.limitPrice,
      stopLoss: dto.stopLoss,
      takeProfit: dto.takeProfit,
      businessId: dto.businessId,
    });

    this.events.notifyTransactionsChanged();
    return { ok: true };
  }

  async list(
    status: TransactionStatus,
    viewerId: string,
    viewerIsAdmin: boolean,
    panelOnly = false,
    businessId?: string,
    userId?: string,
  ) {
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      viewerId,
      viewerIsAdmin,
      businessId,
    );
    const accountWhere = await this.accountScopeWhere(
      viewerId,
      viewerIsAdmin,
      businessIds,
      userId?.trim() || undefined,
    );
    const panelFilter = panelOnly ? { openedByUserId: { not: null } } : {};

    if (status === 'open') {
      const rows = await this.prisma.position.findMany({
        where: { account: accountWhere, ...panelFilter },
        include: {
          openedBy: { select: { id: true, fullName: true, email: true } },
          account: {
            include: {
              user: { select: { id: true, email: true, fullName: true } },
            },
          },
        },
        orderBy: { openedAt: 'desc' },
      });

      const settingsCache = new Map<string, EffectiveTradingSettings>();
      return Promise.all(
        rows.map(async (row) => {
          const settings = await this.loadSettings(
            settingsCache,
            row.account.userId,
            row.account.businessId,
          );
          const quantity = toNum(row.quantity);
          const openPrice = toNum(row.avgEntry);
          const commission = estimateCommissionFee(
            quantity,
            openPrice,
            settings,
          );
          const swap = dailySwapForPosition(
            row.symbol,
            row.side,
            quantity,
            settings,
          );

          return {
            ...this.serializeRowBase(row),
            kind: 'position' as const,
            user: this.serializeUserRef(row.account.user),
            account: this.serializeAccount(row.account),
            symbol: row.symbol,
            side: row.side,
            quantity,
            openPrice,
            stopLoss: row.stopLoss != null ? toNum(row.stopLoss) : null,
            takeProfit: row.takeProfit != null ? toNum(row.takeProfit) : null,
            swap,
            commission,
            profit: null,
            openedAt: row.openedAt.toISOString(),
          };
        }),
      );
    }

    if (status === 'pending') {
      const rows = await this.prisma.pendingOrder.findMany({
        where: { account: accountWhere, ...panelFilter },
        include: {
          openedBy: { select: { id: true, fullName: true, email: true } },
          account: {
            include: {
              user: { select: { id: true, email: true, fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const settingsCache = new Map<string, EffectiveTradingSettings>();
      return Promise.all(
        rows.map(async (row) => {
          const settings = await this.loadSettings(
            settingsCache,
            row.account.userId,
            row.account.businessId,
          );
          const quantity = toNum(row.quantity);
          const openPrice = toNum(row.limitPrice);
          const commission = estimateCommissionFee(
            quantity,
            openPrice,
            settings,
          );

          const swap = dailySwapForPosition(
            row.symbol,
            row.side,
            quantity,
            settings,
          );

          return {
            ...this.serializeRowBase(row),
            kind: 'pending' as const,
            user: this.serializeUserRef(row.account.user),
            account: this.serializeAccount(row.account),
            symbol: row.symbol,
            side: row.side,
            quantity,
            openPrice,
            stopLoss: row.stopLoss != null ? toNum(row.stopLoss) : null,
            takeProfit: row.takeProfit != null ? toNum(row.takeProfit) : null,
            swap,
            commission,
            profit: null,
            openedAt: row.createdAt.toISOString(),
          };
        }),
      );
    }

    const rows = await this.prisma.trade.findMany({
      where: {
        account: accountWhere,
        ...panelFilter,
        note: { contains: 'kapat' },
      },
      include: {
        openedBy: { select: { id: true, fullName: true, email: true } },
        account: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: 500,
    });

    const settingsCache = new Map<string, EffectiveTradingSettings>();
    const openIndex = this.buildTradeOpenIndex(rows);

    return Promise.all(
      rows.map(async (row) => {
        const settings = await this.loadSettings(
          settingsCache,
          row.account.userId,
          row.account.businessId,
        );
        const quantity = toNum(row.quantity);
        const openPrice = toNum(row.price);
        const commission = estimateCommissionFee(
          quantity,
          openPrice,
          settings,
        );
        const note = row.note ?? null;
        const openTime = this.openTimeForCloseTrade(
          openIndex,
          row.accountId,
          row.symbol,
          row.executedAt,
          note,
        );
        const swap =
          openTime != null
            ? accrueSwap(
                row.symbol,
                this.positionSideFromNote(note),
                quantity,
                openTime,
                settings,
                undefined,
                row.executedAt,
              )
            : 0;
        const gross = toNum(row.realizedPnl);

        return {
          ...this.serializeRowBase(row),
          kind: 'trade' as const,
          user: this.serializeUserRef(row.account.user),
          account: this.serializeAccount(row.account),
          symbol: row.symbol,
          side: row.side,
          quantity,
          openPrice,
          stopLoss: null,
          takeProfit: null,
          swap,
          commission,
          profit: netPnl(gross, swap, commission),
          openedAt: row.executedAt.toISOString(),
          note,
        };
      }),
    );
  }

  async getPosition(id: string, viewerId: string, viewerIsAdmin: boolean) {
    const row = await this.prisma.position.findFirst({
      where: {
        id,
        account: { user: await this.userScopeWhere(viewerId, viewerIsAdmin) },
      },
      include: {
        openedBy: { select: { id: true, fullName: true, email: true } },
        account: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Pozisyon bulunamadı');

    const settings = await this.tradingConfig.getEffectiveSettings(
      row.account.userId,
      row.account.businessId,
    );
    const quantity = toNum(row.quantity);
    const avgEntry = toNum(row.avgEntry);
    const commission = estimateCommissionFee(quantity, avgEntry, settings);
    const swap = dailySwapForPosition(
      row.symbol,
      row.side,
      quantity,
      settings,
    );

    return {
      ...this.serializeRowBase(row),
      kind: 'position' as const,
      user: this.serializeUserRef(row.account.user),
      account: this.serializeAccount(row.account),
      symbol: row.symbol,
      side: row.side,
      quantity,
      avgEntry,
      stopLoss: row.stopLoss != null ? toNum(row.stopLoss) : null,
      takeProfit: row.takeProfit != null ? toNum(row.takeProfit) : null,
      openedAt: row.openedAt.toISOString(),
      swap,
      commission,
    };
  }

  async getPendingOrder(id: string, viewerId: string, viewerIsAdmin: boolean) {
    const row = await this.prisma.pendingOrder.findFirst({
      where: {
        id,
        account: { user: await this.userScopeWhere(viewerId, viewerIsAdmin) },
      },
      include: {
        openedBy: { select: { id: true, fullName: true, email: true } },
        account: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Bekleyen emir bulunamadı');

    const settings = await this.tradingConfig.getEffectiveSettings(
      row.account.userId,
      row.account.businessId,
    );
    const quantity = toNum(row.quantity);
    const limitPrice = toNum(row.limitPrice);
    const commission = estimateCommissionFee(quantity, limitPrice, settings);

    return {
      ...this.serializeRowBase(row),
      kind: 'pending' as const,
      user: this.serializeUserRef(row.account.user),
      account: this.serializeAccount(row.account),
      symbol: row.symbol,
      side: row.side,
      quantity,
      limitPrice,
      stopLoss: row.stopLoss != null ? toNum(row.stopLoss) : null,
      takeProfit: row.takeProfit != null ? toNum(row.takeProfit) : null,
      createdAt: row.createdAt.toISOString(),
      swap: 0,
      commission,
    };
  }

  async getTrade(id: string, viewerId: string, viewerIsAdmin: boolean) {
    const row = await this.prisma.trade.findFirst({
      where: {
        id,
        account: { user: await this.userScopeWhere(viewerId, viewerIsAdmin) },
      },
      include: {
        openedBy: { select: { id: true, fullName: true, email: true } },
        account: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Kapanan işlem bulunamadı');

    const settings = await this.tradingConfig.getEffectiveSettings(
      row.account.userId,
      row.account.businessId,
    );
    const quantity = toNum(row.quantity);
    const price = toNum(row.price);
    const commission = estimateCommissionFee(quantity, price, settings);
    const note = row.note ?? null;
    let swap = 0;
    if (note?.includes('kapat')) {
      const openTrade = await this.prisma.trade.findFirst({
        where: {
          accountId: row.accountId,
          symbol: row.symbol,
          executedAt: { lt: row.executedAt },
          note: { contains: 'aç' },
        },
        orderBy: { executedAt: 'desc' },
        select: { executedAt: true },
      });
      if (openTrade) {
        swap = accrueSwap(
          row.symbol,
          this.positionSideFromNote(note),
          quantity,
          openTrade.executedAt,
          settings,
          undefined,
          row.executedAt,
        );
      }
    }
    const gross = toNum(row.realizedPnl);

    return {
      ...this.serializeRowBase(row),
      kind: 'trade' as const,
      user: this.serializeUserRef(row.account.user),
      account: this.serializeAccount(row.account),
      symbol: row.symbol,
      side: row.side,
      quantity,
      price,
      realizedPnl: gross,
      note,
      executedAt: row.executedAt.toISOString(),
      swap,
      commission,
      netPnl: netPnl(gross, swap, commission),
    };
  }

  async updatePosition(
    id: string,
    dto: UpdatePanelPositionDto,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const existing = await this.prisma.position.findUnique({
      where: { id },
      select: { accountId: true },
    });
    if (!existing) throw new NotFoundException('Pozisyon bulunamadı');
    await this.assertAccountAccess(
      existing.accountId,
      viewerId,
      viewerIsAdmin,
    );

    if (dto.balance != null) {
      await this.prisma.tradingAccount.update({
        where: { id: existing.accountId },
        data: { balance: dto.balance },
      });
      await this.notifyPortfolioBalance(existing.accountId, dto.balance);
    }

    await this.prisma.position.update({
      where: { id },
      data: {
        ...(dto.symbol != null
          ? { symbol: dto.symbol.trim().toUpperCase() }
          : {}),
        ...(dto.side != null ? { side: dto.side } : {}),
        ...(dto.quantity != null ? { quantity: dto.quantity } : {}),
        ...(dto.avgEntry != null ? { avgEntry: dto.avgEntry } : {}),
        ...(dto.stopLoss !== undefined ? { stopLoss: dto.stopLoss } : {}),
        ...(dto.takeProfit !== undefined ? { takeProfit: dto.takeProfit } : {}),
        ...(dto.openedAt != null ? { openedAt: new Date(dto.openedAt) } : {}),
      },
    });

    if (dto.stopLoss !== undefined || dto.takeProfit !== undefined) {
      await this.notifyPortfolioRefresh(existing.accountId);
    }

    this.events.notifyTransactionsChanged();
    return this.getPosition(id, viewerId, viewerIsAdmin);
  }

  async updatePendingOrder(
    id: string,
    dto: UpdatePanelPendingOrderDto,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const existing = await this.prisma.pendingOrder.findUnique({
      where: { id },
      select: { accountId: true },
    });
    if (!existing) throw new NotFoundException('Bekleyen emir bulunamadı');
    await this.assertAccountAccess(
      existing.accountId,
      viewerId,
      viewerIsAdmin,
    );

    if (dto.balance != null) {
      await this.prisma.tradingAccount.update({
        where: { id: existing.accountId },
        data: { balance: dto.balance },
      });
      await this.notifyPortfolioBalance(existing.accountId, dto.balance);
    }

    await this.prisma.pendingOrder.update({
      where: { id },
      data: {
        ...(dto.symbol != null
          ? { symbol: dto.symbol.trim().toUpperCase() }
          : {}),
        ...(dto.side != null ? { side: dto.side } : {}),
        ...(dto.quantity != null ? { quantity: dto.quantity } : {}),
        ...(dto.limitPrice != null ? { limitPrice: dto.limitPrice } : {}),
        ...(dto.stopLoss !== undefined ? { stopLoss: dto.stopLoss } : {}),
        ...(dto.takeProfit !== undefined ? { takeProfit: dto.takeProfit } : {}),
        ...(dto.createdAt != null ? { createdAt: new Date(dto.createdAt) } : {}),
      },
    });

    if (dto.stopLoss !== undefined || dto.takeProfit !== undefined) {
      await this.notifyPortfolioRefresh(existing.accountId);
    }

    this.events.notifyTransactionsChanged();
    return this.getPendingOrder(id, viewerId, viewerIsAdmin);
  }

  async updateTrade(
    id: string,
    dto: UpdatePanelTradeDto,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const existing = await this.prisma.trade.findUnique({
      where: { id },
      select: { accountId: true },
    });
    if (!existing) throw new NotFoundException('Kapanan işlem bulunamadı');
    await this.assertAccountAccess(
      existing.accountId,
      viewerId,
      viewerIsAdmin,
    );

    if (dto.balance != null) {
      await this.prisma.tradingAccount.update({
        where: { id: existing.accountId },
        data: { balance: dto.balance },
      });
      await this.notifyPortfolioBalance(existing.accountId, dto.balance);
    }

    await this.prisma.trade.update({
      where: { id },
      data: {
        ...(dto.symbol != null
          ? { symbol: dto.symbol.trim().toUpperCase() }
          : {}),
        ...(dto.side != null ? { side: dto.side } : {}),
        ...(dto.quantity != null ? { quantity: dto.quantity } : {}),
        ...(dto.price != null ? { price: dto.price } : {}),
        ...(dto.realizedPnl != null ? { realizedPnl: dto.realizedPnl } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.executedAt != null
          ? { executedAt: new Date(dto.executedAt) }
          : {}),
      },
    });

    this.events.notifyTransactionsChanged();
    return this.getTrade(id, viewerId, viewerIsAdmin);
  }

  async deletePosition(id: string, viewerId: string, viewerIsAdmin: boolean) {
    const existing = await this.prisma.position.findUnique({
      where: { id },
      select: { accountId: true },
    });
    if (!existing) throw new NotFoundException('Pozisyon bulunamadı');
    await this.assertAccountAccess(
      existing.accountId,
      viewerId,
      viewerIsAdmin,
    );
    await this.prisma.position.delete({ where: { id } });
    this.events.notifyTransactionsChanged();
    return { ok: true };
  }

  async deletePendingOrder(
    id: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const existing = await this.prisma.pendingOrder.findUnique({
      where: { id },
      select: { accountId: true },
    });
    if (!existing) throw new NotFoundException('Bekleyen emir bulunamadı');
    await this.assertAccountAccess(
      existing.accountId,
      viewerId,
      viewerIsAdmin,
    );
    await this.prisma.pendingOrder.delete({ where: { id } });
    this.events.notifyTransactionsChanged();
    return { ok: true };
  }

  async closePosition(
    id: string,
    dto: { bid: number; ask: number; takeProfit?: number },
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const row = await this.prisma.position.findFirst({
      where: {
        id,
        account: { user: await this.userScopeWhere(viewerId, viewerIsAdmin) },
      },
      include: {
        account: { select: { userId: true, businessId: true } },
      },
    });
    if (!row) throw new NotFoundException('Pozisyon bulunamadı');

    if (!Number.isFinite(dto.bid) || !Number.isFinite(dto.ask) || dto.bid <= 0 || dto.ask <= 0) {
      throw new BadRequestException('Geçerli fiyat gerekli');
    }

    await this.trading.closeForUser(row.account.userId, {
      positionId: row.id,
      businessId: row.account.businessId,
      bid: dto.bid,
      ask: dto.ask,
      takeProfit:
        dto.takeProfit != null && dto.takeProfit > 0
          ? dto.takeProfit
          : undefined,
    });

    this.events.notifyTransactionsChanged();
    return { ok: true };
  }
}
