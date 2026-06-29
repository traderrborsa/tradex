import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BistService } from '../bist/bist.service';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { TransactionsEventsService } from '../panel/transactions/transactions-events.service';
import { PanelNotificationsService } from '../panel/notifications/notifications.service';
import { getTradingBlockReason } from './market-hours';
import { TradingAccountService } from './trading-account.service';
import { TradingConfigService } from './trading-config.service';
import { VerificationService } from '../verification/verification.service';
import type { EffectiveTradingSettings } from './trading-config.types';
import { PortfolioEventsService } from './portfolio-events.service';
import { enrichTradeForMember, buildTradeOpenIndex } from './trade-history-pnl';
import {
  cancelPendingOrder,
  closePositionById,
  createPortfolio,
  executeBuy,
  executeSell,
  placeLimitOrder,
  processSymbolTick,
  type TpAdjustedCloseEvent,
} from './trading.engine';
import type { Portfolio } from './trading.types';
import { isCloseTradeNote } from './trading-fees';
import { allocateDisplayId } from './transaction-display-id';

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function sideLabelTr(side: string) {
  if (side === 'long' || side === 'buy') return 'Alış';
  if (side === 'short' || side === 'sell') return 'Satış';
  return side;
}

@Injectable()
export class TradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bistService: BistService,
    private readonly rbac: RbacService,
    private readonly events: TransactionsEventsService,
    private readonly notifications: PanelNotificationsService,
    private readonly tradingConfig: TradingConfigService,
    private readonly verification: VerificationService,
    private readonly accounts: TradingAccountService,
    private readonly portfolioEvents: PortfolioEventsService,
  ) {}

  async resolveBusinessId(
    userId: string,
    businessId?: string,
  ): Promise<string> {
    return this.accounts.resolveBusinessId(userId, businessId);
  }

  private async loadEffectiveConfig(
    userId: string,
    businessId?: string,
  ): Promise<EffectiveTradingSettings> {
    const resolved = await this.resolveBusinessId(userId, businessId);
    return this.tradingConfig.getEffectiveSettings(userId, resolved);
  }

  /**
   * BIST sembolleri ortalama maliyetle tek pozisyonda birleşir (merge=true);
   * FX sembolleri her emirde bağımsız pozisyon açar (merge=false).
   */
  private shouldMerge(symbol: string): boolean {
    return this.bistService.isBistSymbol(symbol);
  }

  private marketClosed(symbol: string, isAdmin: boolean): string | undefined {
    if (isAdmin) return undefined;
    return (
      getTradingBlockReason(symbol, (s) =>
        this.bistService.isBistSymbol(s),
      ) ?? undefined
    );
  }

  private async getUserContext(userId: string, businessId?: string) {
    const account = await this.accounts.getAccount(userId, businessId);
    const isAdmin = await this.rbac.canBypassMarketHours(userId);
    return {
      accountId: account.id,
      businessId: account.businessId,
      isAdmin,
    };
  }

  async loadPortfolio(accountId: string): Promise<Portfolio> {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      include: {
        positions: true,
        pendingOrders: { orderBy: { createdAt: 'desc' } },
        trades: { orderBy: { executedAt: 'desc' }, take: 100 },
      },
    });
    if (!account) throw new NotFoundException('Trading hesabı bulunamadı');

    const settings = await this.tradingConfig.getEffectiveSettings(
      account.userId,
      account.businessId,
    );
    const openIndex = buildTradeOpenIndex(
      account.trades.map((t) => ({
        accountId,
        symbol: t.symbol,
        executedAt: t.executedAt,
        note: t.note,
      })),
    );

    return {
      balance: toNum(account.balance),
      positions: account.positions.map((p) => ({
        id: p.id,
        symbol: p.symbol,
        side: p.side as Portfolio['positions'][0]['side'],
        quantity: toNum(p.quantity),
        avgEntry: toNum(p.avgEntry),
        openedAt: p.openedAt.toISOString(),
        stopLoss: p.stopLoss != null ? toNum(p.stopLoss) : undefined,
        takeProfit: p.takeProfit != null ? toNum(p.takeProfit) : undefined,
      })),
      pendingOrders: account.pendingOrders.map((o) => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side as 'buy' | 'sell',
        quantity: toNum(o.quantity),
        limitPrice: toNum(o.limitPrice),
        stopLoss: o.stopLoss != null ? toNum(o.stopLoss) : undefined,
        takeProfit: o.takeProfit != null ? toNum(o.takeProfit) : undefined,
        createdAt: o.createdAt.toISOString(),
      })),
      history: account.trades.map((t) =>
        enrichTradeForMember(t, accountId, settings, openIndex),
      ),
    };
  }

  private async persistPortfolio(
    accountId: string,
    before: Portfolio,
    after: Portfolio,
    options?: { openedByUserId?: string; businessId?: string },
  ) {
    const beforeIds = new Set(before.history.map((t) => t.id));
    const beforeOrderIds = new Set(before.pendingOrders.map((o) => o.id));
    const beforePosIds = new Set(before.positions.map((p) => p.id));
    const newTrades = after.history.filter((t) => !beforeIds.has(t.id));

    await this.prisma.$transaction(async (tx) => {
      await tx.tradingAccount.update({
        where: { id: accountId },
        data: { balance: after.balance },
      });

      const existingPositions = await tx.position.findMany({
        where: { accountId },
        select: { id: true, displayId: true, openedByUserId: true },
      });
      const posMeta = new Map(existingPositions.map((p) => [p.id, p]));

      await tx.position.deleteMany({ where: { accountId } });
      for (const p of after.positions) {
        const prev = posMeta.get(p.id);
        const isNew = !beforePosIds.has(p.id);
        const displayId = prev?.displayId ?? (await allocateDisplayId(tx));
        const openedByUserId =
          prev?.openedByUserId ??
          (isNew && options?.openedByUserId ? options.openedByUserId : null);

        await tx.position.create({
          data: {
            id: p.id,
            accountId,
            symbol: p.symbol,
            side: p.side,
            quantity: p.quantity,
            avgEntry: p.avgEntry,
            stopLoss: p.stopLoss ?? null,
            takeProfit: p.takeProfit ?? null,
            openedAt: new Date(p.openedAt),
            displayId,
            openedByUserId,
          },
        });
      }

      const existingOrders = await tx.pendingOrder.findMany({
        where: { accountId },
        select: { id: true, displayId: true, openedByUserId: true },
      });
      const orderMeta = new Map(existingOrders.map((o) => [o.id, o]));

      await tx.pendingOrder.deleteMany({ where: { accountId } });
      for (const o of after.pendingOrders) {
        const prev = orderMeta.get(o.id);
        const isNew = !beforeOrderIds.has(o.id);
        const displayId = prev?.displayId ?? (await allocateDisplayId(tx));
        const openedByUserId =
          prev?.openedByUserId ??
          (isNew && options?.openedByUserId ? options.openedByUserId : null);

        await tx.pendingOrder.create({
          data: {
            id: o.id,
            accountId,
            symbol: o.symbol,
            side: o.side,
            quantity: o.quantity,
            limitPrice: o.limitPrice,
            stopLoss: o.stopLoss ?? null,
            takeProfit: o.takeProfit ?? null,
            createdAt: new Date(o.createdAt),
            displayId,
            openedByUserId,
          },
        });
      }

      for (const t of newTrades) {
        await tx.trade.create({
          data: {
            id: t.id,
            accountId,
            symbol: t.symbol,
            side: t.side,
            quantity: t.quantity,
            price: t.price,
            realizedPnl: t.realizedPnl,
            note: t.note ?? null,
            executedAt: new Date(t.at),
            displayId: await allocateDisplayId(tx),
            openedByUserId: null,
          },
        });
      }
    });

    await this.emitPortfolioNotifications(accountId, before, after, options);
    this.events.notifyTransactionsChanged();
    await this.emitPortfolioBalanceIfChanged(accountId, before, after, options);
  }

  private async emitPortfolioBalanceIfChanged(
    accountId: string,
    before: Portfolio,
    after: Portfolio,
    options?: { businessId?: string },
  ) {
    if (before.balance === after.balance) return;
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, businessId: true },
    });
    if (!account) return;
    this.portfolioEvents.notifyUser(
      account.userId,
      options?.businessId ?? account.businessId,
      after.balance,
    );
  }

  private async emitPortfolioNotifications(
    accountId: string,
    before: Portfolio,
    after: Portfolio,
    options?: { openedByUserId?: string; businessId?: string },
  ) {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!account) return;

    const notificationBusinessId = options?.businessId ?? account.businessId;

    const customer = account.user;
    let openerSuffix = '';
    if (options?.openedByUserId) {
      const opener = await this.prisma.user.findUnique({
        where: { id: options.openedByUserId },
        select: { fullName: true },
      });
      if (opener) openerSuffix = ` · Panel: ${opener.fullName}`;
    }

    const beforePosIds = new Set(before.positions.map((p) => p.id));
    const beforeOrderIds = new Set(before.pendingOrders.map((o) => o.id));
    const beforeTradeIds = new Set(before.history.map((t) => t.id));

    for (const p of after.positions) {
      if (!beforePosIds.has(p.id)) {
        await this.notifications.create({
          type: 'position_opened',
          title: 'Yeni pozisyon açıldı',
          message: `${customer.fullName} — ${sideLabelTr(p.side)} ${p.quantity} lot ${p.symbol}${openerSuffix}`,
          href: '/panel/positions/open',
          data: {
            userId: customer.id,
            symbol: p.symbol,
            side: p.side,
            quantity: p.quantity,
          },
          businessId: notificationBusinessId,
        });
      }
    }

    for (const o of after.pendingOrders) {
      if (!beforeOrderIds.has(o.id)) {
        await this.notifications.create({
          type: 'order_placed',
          title: 'Yeni limit emir',
          message: `${customer.fullName} — ${sideLabelTr(o.side)} ${o.quantity} lot ${o.symbol} @ ${o.limitPrice}${openerSuffix}`,
          href: '/panel/positions/pending',
          data: {
            userId: customer.id,
            symbol: o.symbol,
            orderId: o.id,
          },
          businessId: notificationBusinessId,
        });
      }
    }

    for (const t of after.history) {
      if (!beforeTradeIds.has(t.id) && isCloseTradeNote(t.note)) {
        const pnl =
          t.realizedPnl >= 0
            ? `+${t.realizedPnl.toFixed(2)}`
            : t.realizedPnl.toFixed(2);
        await this.notifications.create({
          type: 'trade_closed',
          title: 'Pozisyon kapandı',
          message: `${customer.fullName} — ${sideLabelTr(t.side)} ${t.quantity} lot ${t.symbol} · K/Z: ${pnl} ₺`,
          href: '/panel/positions/closed',
          data: {
            userId: customer.id,
            symbol: t.symbol,
            tradeId: t.id,
          },
          businessId: notificationBusinessId,
        });
      }
    }
  }

  private async apply(
    userId: string,
    fn: (portfolio: Portfolio) => { portfolio: Portfolio; error?: string },
    options?: { openedByUserId?: string; businessId?: string },
  ): Promise<Portfolio> {
    const { accountId } = await this.getUserContext(
      userId,
      options?.businessId,
    );
    const config = await this.loadEffectiveConfig(userId, options?.businessId);
    const before = await this.loadPortfolio(accountId);
    const result = fn(before);
    if (result.error) throw new BadRequestException(result.error);
    await this.persistPortfolio(accountId, before, result.portfolio, options);
    return result.portfolio;
  }

  async openForUser(
    targetUserId: string,
    operatorUserId: string,
    body: {
      orderType: 'market' | 'limit';
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      bid: number;
      ask: number;
      limitPrice?: number;
      stopLoss?: number;
      takeProfit?: number;
      businessId?: string;
    },
  ) {
    const opts = {
      openedByUserId: operatorUserId,
      businessId: body.businessId,
    };

    const config = await this.loadEffectiveConfig(
      targetUserId,
      body.businessId,
    );

    if (body.orderType === 'limit') {
      if (body.limitPrice == null || body.limitPrice <= 0) {
        throw new BadRequestException('Limit fiyat gerekli');
      }
      return this.apply(
        targetUserId,
        (portfolio) =>
          placeLimitOrder(
            portfolio,
            body.symbol,
            body.side,
            body.quantity,
            body.limitPrice!,
            {
              stopLoss: body.stopLoss,
              takeProfit: body.takeProfit,
              marketClosed: undefined,
              config,
            },
          ),
        opts,
      );
    }

    const tradeOpts = {
      stopLoss: body.stopLoss,
      takeProfit: body.takeProfit,
      marketClosed: undefined as string | undefined,
      config,
      merge: this.shouldMerge(body.symbol),
    };

    return this.apply(
      targetUserId,
      (portfolio) =>
        body.side === 'buy'
          ? executeBuy(
              portfolio,
              body.symbol,
              body.quantity,
              body.bid,
              body.ask,
              tradeOpts,
            )
          : executeSell(
              portfolio,
              body.symbol,
              body.quantity,
              body.bid,
              body.ask,
              tradeOpts,
            ),
      opts,
    );
  }

  async closeForUser(
    targetUserId: string,
    body: {
      positionId: string;
      bid: number;
      ask: number;
      /**
       * Pozisyonun ait olduğu işletme. Müşteri birden fazla işletmeye üyeyse
       * doğru trading hesabının yüklenmesi için gereklidir; verilmezse varsayılan
       * hesap yüklenir ve pozisyon bulunamayabilir ("Açık pozisyon yok").
       */
      businessId?: string;
      /**
       * Panelden manuel kapatırken belirlenen TP fiyatı. Verilirse kâr/zarar
       * (ve bakiye) bu fiyattan hesaplanır; işlem yine gerçek piyasa fiyatından
       * kaydedilir ve panele log düşülür.
       */
      takeProfit?: number;
    },
  ) {
    const config = await this.loadEffectiveConfig(targetUserId, body.businessId);
    const tp =
      body.takeProfit != null && body.takeProfit > 0
        ? body.takeProfit
        : undefined;

    // Log için pozisyon bilgisini kapanıştan önce al.
    let logBase:
      | { side: 'long' | 'short'; quantity: number; avgEntry: number; symbol: string; accountId: string }
      | null = null;
    if (tp != null) {
      const pos = await this.prisma.position.findUnique({
        where: { id: body.positionId },
        select: {
          side: true,
          quantity: true,
          avgEntry: true,
          symbol: true,
          accountId: true,
        },
      });
      if (pos) {
        logBase = {
          side: pos.side === 'short' ? 'short' : 'long',
          quantity: toNum(pos.quantity),
          avgEntry: toNum(pos.avgEntry),
          symbol: pos.symbol,
          accountId: pos.accountId,
        };
      }
    }

    const result = await this.apply(
      targetUserId,
      (portfolio) =>
        closePositionById(
          portfolio,
          body.positionId,
          body.bid,
          body.ask,
          undefined,
          config,
          tp,
        ),
      { businessId: body.businessId },
    );

    if (tp != null && logBase) {
      const isLong = logBase.side === 'long';
      const marketPrice = isLong ? body.bid : body.ask;
      const marketPnl = isLong
        ? (body.bid - logBase.avgEntry) * logBase.quantity
        : (logBase.avgEntry - body.ask) * logBase.quantity;
      const tpPnl = isLong
        ? (tp - logBase.avgEntry) * logBase.quantity
        : (logBase.avgEntry - tp) * logBase.quantity;
      await this.emitTpAdjustedLog(logBase.accountId, {
        symbol: logBase.symbol,
        side: logBase.side,
        quantity: logBase.quantity,
        marketPrice,
        tpPrice: tp,
        marketPnl,
        tpPnl,
      });
    }

    return result;
  }

  /** TP'ye göre kâr hesaplanan kapanışı panel bildirim akışına log olarak düşer. */
  private async emitTpAdjustedLog(
    accountId: string,
    ev: TpAdjustedCloseEvent,
    businessId?: string,
  ) {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!account) return;

    const fmt = (n: number) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
    const diff = ev.tpPnl - ev.marketPnl;

    await this.notifications.create({
      type: 'trade_tp_adjusted',
      title: 'TP düzeltmeli kapanış',
      message:
        `${account.user.fullName} — ${sideLabelTr(ev.side)} ${ev.quantity} lot ${ev.symbol}` +
        ` · Gerçek fiyat ${ev.marketPrice} (kayıt), TP ${ev.tpPrice} (kâr)` +
        ` · Gösterilen K/Z ${fmt(ev.tpPnl)} ₺, gerçek ${fmt(ev.marketPnl)} ₺, fark ${fmt(diff)} ₺`,
      href: '/panel/positions/closed',
      data: {
        userId: account.user.id,
        symbol: ev.symbol,
        side: ev.side,
        quantity: ev.quantity,
        marketPrice: ev.marketPrice,
        tpPrice: ev.tpPrice,
        marketPnl: ev.marketPnl,
        tpPnl: ev.tpPnl,
      },
      businessId: businessId ?? account.businessId,
    });
  }

  async getPortfolio(userId: string, businessId?: string) {
    const { accountId } = await this.getUserContext(userId, businessId);
    return this.loadPortfolio(accountId);
  }

  async marketOrder(
    userId: string,
    body: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      bid: number;
      ask: number;
      stopLoss?: number;
      takeProfit?: number;
      businessId?: string;
    },
  ) {
    await this.verification.assertCanTrade(userId, body.businessId);
    const config = await this.loadEffectiveConfig(userId, body.businessId);
    const { isAdmin } = await this.getUserContext(userId, body.businessId);
    const closed = this.marketClosed(body.symbol, isAdmin);
    const opts = {
      stopLoss: body.stopLoss,
      takeProfit: body.takeProfit,
      marketClosed: closed,
      config,
      merge: this.shouldMerge(body.symbol),
    };
    return this.apply(
      userId,
      (portfolio) =>
        body.side === 'buy'
          ? executeBuy(
              portfolio,
              body.symbol,
              body.quantity,
              body.bid,
              body.ask,
              opts,
            )
          : executeSell(
              portfolio,
              body.symbol,
              body.quantity,
              body.bid,
              body.ask,
              opts,
            ),
      { businessId: body.businessId },
    );
  }

  async limitOrder(
    userId: string,
    body: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      limitPrice: number;
      stopLoss?: number;
      takeProfit?: number;
      businessId?: string;
    },
  ) {
    await this.verification.assertCanTrade(userId, body.businessId);
    const config = await this.loadEffectiveConfig(userId, body.businessId);
    const { isAdmin } = await this.getUserContext(userId, body.businessId);
    const closed = this.marketClosed(body.symbol, isAdmin);
    return this.apply(
      userId,
      (portfolio) =>
        placeLimitOrder(
          portfolio,
          body.symbol,
          body.side,
          body.quantity,
          body.limitPrice,
          {
            stopLoss: body.stopLoss,
            takeProfit: body.takeProfit,
            marketClosed: closed,
            config,
          },
        ),
      { businessId: body.businessId },
    );
  }

  async close(
    userId: string,
    body: {
      positionId: string;
      bid: number;
      ask: number;
      businessId?: string;
    },
  ) {
    await this.verification.assertCanTrade(userId, body.businessId);
    const config = await this.loadEffectiveConfig(userId, body.businessId);
    const { accountId, isAdmin } = await this.getUserContext(
      userId,
      body.businessId,
    );
    const portfolio = await this.loadPortfolio(accountId);
    const position = portfolio.positions.find(
      (p) => p.id === body.positionId,
    );
    if (!position) throw new NotFoundException('Açık pozisyon bulunamadı');
    const closed = this.marketClosed(position.symbol, isAdmin);
    return this.apply(
      userId,
      (p) =>
        closePositionById(
          p,
          body.positionId,
          body.bid,
          body.ask,
          closed,
          config,
        ),
      { businessId: body.businessId },
    );
  }

  async updatePositionStops(
    userId: string,
    positionId: string,
    body: {
      stopLoss?: number | null;
      takeProfit?: number | null;
      businessId?: string;
    },
  ) {
    const { accountId, businessId } = await this.getUserContext(
      userId,
      body.businessId,
    );
    const position = await this.prisma.position.findFirst({
      where: { accountId, id: positionId },
    });
    if (!position) throw new NotFoundException('Açık pozisyon bulunamadı');

    if (body.stopLoss != null && body.stopLoss <= 0) {
      throw new BadRequestException('Geçerli bir zarar durdur fiyatı girin');
    }
    if (body.takeProfit != null && body.takeProfit <= 0) {
      throw new BadRequestException('Geçerli bir kar al fiyatı girin');
    }

    await this.prisma.position.update({
      where: { id: position.id },
      data: {
        ...(body.stopLoss !== undefined ? { stopLoss: body.stopLoss } : {}),
        ...(body.takeProfit !== undefined ? { takeProfit: body.takeProfit } : {}),
      },
    });

    this.portfolioEvents.notifyPortfolioRefresh(userId, businessId);
    this.events.notifyTransactionsChanged();
    return this.loadPortfolio(accountId);
  }

  async cancelOrder(
    userId: string,
    orderId: string,
    businessId?: string,
  ) {
    await this.verification.assertCanTrade(userId, businessId);
    const { accountId } = await this.getUserContext(userId, businessId);
    const before = await this.loadPortfolio(accountId);
    const order = before.pendingOrders.find((o) => o.id === orderId);
    if (!order) throw new NotFoundException('Emir bulunamadı');
    const after = cancelPendingOrder(before, orderId);
    await this.persistPortfolio(accountId, before, after);
    return after;
  }

  async processTick(
    userId: string,
    body: { symbol: string; bid: number; ask: number; businessId?: string },
  ) {
    const config = await this.loadEffectiveConfig(userId, body.businessId);
    const { accountId } = await this.getUserContext(userId, body.businessId);
    const before = await this.loadPortfolio(accountId);
    const { portfolio: after, messages, tpAdjustedCloses } = processSymbolTick(
      before,
      body.symbol,
      body.bid,
      body.ask,
      config,
      this.shouldMerge(body.symbol),
    );

    const changed =
      before.balance !== after.balance ||
      before.positions.length !== after.positions.length ||
      before.pendingOrders.length !== after.pendingOrders.length ||
      after.history.length !== before.history.length;

    if (changed) {
      await this.persistPortfolio(accountId, before, after, {
        businessId: body.businessId,
      });
      for (const ev of tpAdjustedCloses) {
        await this.emitTpAdjustedLog(accountId, ev, body.businessId);
      }
    }

    return { portfolio: after, messages };
  }

  async resetAccount(userId: string, businessId?: string): Promise<Portfolio> {
    const resolved = await this.resolveBusinessId(userId, businessId);
    const initialBalance =
      await this.tradingConfig.getBusinessInitialBalance(resolved);
    const { accountId } = await this.getUserContext(userId, businessId);
    await this.prisma.$transaction(async (tx) => {
      await tx.trade.deleteMany({ where: { accountId } });
      await tx.pendingOrder.deleteMany({ where: { accountId } });
      await tx.position.deleteMany({ where: { accountId } });
      await tx.tradingAccount.update({
        where: { id: accountId },
        data: { balance: initialBalance },
      });
    });
    return createPortfolio(initialBalance);
  }
}
