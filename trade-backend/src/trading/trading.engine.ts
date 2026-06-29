import {
  DEFAULT_TRADING_SETTINGS,
  validateLot,
  type EffectiveTradingSettings,
  requiredMargin,
} from './trading-config.types';
import {
  INITIAL_BALANCE,
  type PendingOrder,
  type Portfolio,
  type Position,
  type Trade,
} from './trading.types';

type TradeOpts = {
  stopLoss?: number;
  takeProfit?: number;
  fillPrice?: number;
  marketClosed?: string;
  config?: EffectiveTradingSettings;
  /**
   * true  → Borsa (BIST) davranışı: aynı sembolde tek pozisyon, ortalama maliyet
   *          (average down) ve ters yönde netleşme.
   * false → FX davranışı: her emir bağımsız yeni bir pozisyon açar; aynı fiyattan
   *          birden fazla pozisyon ve aynı anda long/short (hedge) mümkündür.
   */
  merge?: boolean;
};

/** TP fiyatından kâr hesaplanıp piyasa fiyatından kaydedilen kapanış logu. */
export interface TpAdjustedCloseEvent {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  /** Kayda geçen gerçek piyasa kapanış fiyatı (müşteriye görünen). */
  marketPrice: number;
  /** Kâr hesabında kullanılan TP fiyatı. */
  tpPrice: number;
  /** Gerçek piyasa fiyatına göre (gizli) kâr/zarar. */
  marketPnl: number;
  /** TP fiyatına göre hesaplanan, gösterilen ve bakiyeye yansıyan kâr/zarar. */
  tpPnl: number;
}

function resolveConfig(opts?: TradeOpts): EffectiveTradingSettings {
  return opts?.config ?? DEFAULT_TRADING_SETTINGS;
}

function shouldMerge(opts?: TradeOpts): boolean {
  return opts?.merge ?? true;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function estimateCommission(
  quantity: number,
  price: number,
  rate: number,
) {
  return quantity * price * rate;
}

export function createPortfolio(initialBalance = INITIAL_BALANCE): Portfolio {
  return {
    balance: initialBalance,
    positions: [],
    pendingOrders: [],
    history: [],
  };
}

export function getPosition(portfolio: Portfolio, symbol: string) {
  return portfolio.positions.find(
    (p) => p.symbol.toUpperCase() === symbol.toUpperCase(),
  );
}

export function getPositionById(portfolio: Portfolio, positionId: string) {
  return portfolio.positions.find((p) => p.id === positionId);
}

function makePosition(
  symbol: string,
  side: Position['side'],
  quantity: number,
  avgEntry: number,
): Position {
  return {
    id: uid(),
    symbol: symbol.toUpperCase(),
    side,
    quantity,
    avgEntry,
    openedAt: new Date().toISOString(),
  };
}

/** Pozisyonu id'sine göre günceller; quantity<=0 ise listeden çıkarır. */
function putPosition(positions: Position[], position: Position): Position[] {
  if (position.quantity <= 0) {
    return positions.filter((p) => p.id !== position.id);
  }
  const idx = positions.findIndex((p) => p.id === position.id);
  if (idx === -1) return [...positions, position];
  const copy = [...positions];
  copy[idx] = position;
  return copy;
}

function removePosition(positions: Position[], positionId: string): Position[] {
  return positions.filter((p) => p.id !== positionId);
}

function applyStops(
  position: Position,
  stopLoss?: number,
  takeProfit?: number,
): Position {
  const next = { ...position };
  if (stopLoss != null && stopLoss > 0) next.stopLoss = stopLoss;
  if (takeProfit != null && takeProfit > 0) next.takeProfit = takeProfit;
  return next;
}

function chargeCommission(
  balance: number,
  quantity: number,
  price: number,
  rate: number,
) {
  return balance - estimateCommission(quantity, price, rate);
}

export function executeBuy(
  portfolio: Portfolio,
  symbol: string,
  quantity: number,
  bid: number,
  ask: number,
  opts?: TradeOpts,
): { portfolio: Portfolio; error?: string } {
  const cfg = resolveConfig(opts);
  const lotErr = validateLot(quantity, cfg);
  if (lotErr) return { portfolio, error: lotErr };
  if (opts?.marketClosed) return { portfolio, error: opts.marketClosed };

  const sym = symbol.toUpperCase();
  const fillAsk = opts?.fillPrice ?? ask;
  let balance = portfolio.balance;
  let positions = [...portfolio.positions];
  let history = portfolio.history;

  // FX: netleşme/birleştirme yok — her zaman bağımsız yeni long pozisyon aç.
  if (!shouldMerge(opts)) {
    const margin = requiredMargin(quantity, fillAsk, cfg.leverage);
    const commission = estimateCommission(quantity, fillAsk, cfg.commissionRate);
    if (balance < margin + commission) {
      return { portfolio, error: 'Yetersiz bakiye' };
    }
    balance -= margin + commission;
    positions = [
      ...positions,
      applyStops(
        makePosition(sym, 'long', quantity, fillAsk),
        opts?.stopLoss,
        opts?.takeProfit,
      ),
    ];
    history = [
      {
        id: uid(),
        symbol: sym,
        side: 'buy',
        quantity,
        price: fillAsk,
        realizedPnl: 0,
        at: new Date().toISOString(),
        note: 'Long aç',
      },
      ...history,
    ];
    return {
      portfolio: { ...portfolio, balance, positions, history },
    };
  }

  // BIST: ters yönde (short) netleşme + aynı yönde ortalama maliyet.
  let remaining = quantity;
  const existing = positions.find((p) => p.symbol === sym);

  if (existing?.side === 'short') {
    const closeQty = Math.min(remaining, existing.quantity);
    const realized = (existing.avgEntry - fillAsk) * closeQty;
    const marginRelease = requiredMargin(
      closeQty,
      existing.avgEntry,
      cfg.leverage,
    );
    balance += marginRelease + realized;
    balance = chargeCommission(balance, closeQty, fillAsk, cfg.commissionRate);
    remaining -= closeQty;
    const left = existing.quantity - closeQty;
    positions =
      left > 0
        ? putPosition(positions, { ...existing, quantity: left })
        : removePosition(positions, existing.id);
    history = [
      {
        id: uid(),
        symbol: sym,
        side: 'buy',
        quantity: closeQty,
        price: fillAsk,
        realizedPnl: realized,
        at: new Date().toISOString(),
        note: 'Short kapat',
      },
      ...history,
    ];
  }

  if (remaining > 0) {
    const margin = requiredMargin(remaining, fillAsk, cfg.leverage);
    const commission = estimateCommission(
      remaining,
      fillAsk,
      cfg.commissionRate,
    );
    if (balance < margin + commission) {
      return {
        portfolio: { ...portfolio, positions, history },
        error: 'Yetersiz bakiye',
      };
    }
    balance -= margin + commission;
    const long = positions.find((p) => p.symbol === sym && p.side === 'long');
    if (long) {
      const totalQty = long.quantity + remaining;
      const avgEntry =
        (long.avgEntry * long.quantity + fillAsk * remaining) / totalQty;
      positions = putPosition(
        positions,
        applyStops(
          { ...long, quantity: totalQty, avgEntry },
          opts?.stopLoss,
          opts?.takeProfit,
        ),
      );
    } else {
      positions = putPosition(
        positions,
        applyStops(
          makePosition(sym, 'long', remaining, fillAsk),
          opts?.stopLoss,
          opts?.takeProfit,
        ),
      );
    }
    history = [
      {
        id: uid(),
        symbol: sym,
        side: 'buy',
        quantity: remaining,
        price: fillAsk,
        realizedPnl: 0,
        at: new Date().toISOString(),
        note: 'Long aç',
      },
      ...history,
    ];
  }

  return {
    portfolio: {
      ...portfolio,
      balance,
      positions,
      history,
      pendingOrders: portfolio.pendingOrders,
    },
  };
}

export function executeSell(
  portfolio: Portfolio,
  symbol: string,
  quantity: number,
  bid: number,
  ask: number,
  opts?: TradeOpts,
): { portfolio: Portfolio; error?: string } {
  const cfg = resolveConfig(opts);
  const lotErr = validateLot(quantity, cfg);
  if (lotErr) return { portfolio, error: lotErr };
  if (opts?.marketClosed) return { portfolio, error: opts.marketClosed };

  const sym = symbol.toUpperCase();
  const fillBid = opts?.fillPrice ?? bid;
  let balance = portfolio.balance;
  let positions = [...portfolio.positions];
  let history = portfolio.history;

  // FX: netleşme/birleştirme yok — her zaman bağımsız yeni short pozisyon aç.
  if (!shouldMerge(opts)) {
    const margin = requiredMargin(quantity, fillBid, cfg.leverage);
    const commission = estimateCommission(quantity, fillBid, cfg.commissionRate);
    if (balance < margin + commission) {
      return { portfolio, error: 'Yetersiz bakiye' };
    }
    balance -= margin + commission;
    positions = [
      ...positions,
      applyStops(
        makePosition(sym, 'short', quantity, fillBid),
        opts?.stopLoss,
        opts?.takeProfit,
      ),
    ];
    history = [
      {
        id: uid(),
        symbol: sym,
        side: 'sell',
        quantity,
        price: fillBid,
        realizedPnl: 0,
        at: new Date().toISOString(),
        note: 'Short aç',
      },
      ...history,
    ];
    return {
      portfolio: { ...portfolio, balance, positions, history },
    };
  }

  // BIST: ters yönde (long) netleşme + aynı yönde ortalama maliyet.
  let remaining = quantity;
  const existing = positions.find((p) => p.symbol === sym);

  if (existing?.side === 'long') {
    const closeQty = Math.min(remaining, existing.quantity);
    const realized = (fillBid - existing.avgEntry) * closeQty;
    const marginRelease = requiredMargin(
      closeQty,
      existing.avgEntry,
      cfg.leverage,
    );
    balance += marginRelease + realized;
    balance = chargeCommission(balance, closeQty, fillBid, cfg.commissionRate);
    remaining -= closeQty;
    const left = existing.quantity - closeQty;
    positions =
      left > 0
        ? putPosition(positions, { ...existing, quantity: left })
        : removePosition(positions, existing.id);
    history = [
      {
        id: uid(),
        symbol: sym,
        side: 'sell',
        quantity: closeQty,
        price: fillBid,
        realizedPnl: realized,
        at: new Date().toISOString(),
        note: 'Long kapat',
      },
      ...history,
    ];
  }

  if (remaining > 0) {
    const margin = requiredMargin(remaining, fillBid, cfg.leverage);
    const commission = estimateCommission(
      remaining,
      fillBid,
      cfg.commissionRate,
    );
    if (balance < margin + commission) {
      return {
        portfolio: { ...portfolio, positions, history },
        error: 'Yetersiz bakiye',
      };
    }
    balance -= margin + commission;
    const short = positions.find((p) => p.symbol === sym && p.side === 'short');
    if (short) {
      const totalQty = short.quantity + remaining;
      const avgEntry =
        (short.avgEntry * short.quantity + fillBid * remaining) / totalQty;
      positions = putPosition(
        positions,
        applyStops(
          { ...short, quantity: totalQty, avgEntry },
          opts?.stopLoss,
          opts?.takeProfit,
        ),
      );
    } else {
      positions = putPosition(
        positions,
        applyStops(
          makePosition(sym, 'short', remaining, fillBid),
          opts?.stopLoss,
          opts?.takeProfit,
        ),
      );
    }
    history = [
      {
        id: uid(),
        symbol: sym,
        side: 'sell',
        quantity: remaining,
        price: fillBid,
        realizedPnl: 0,
        at: new Date().toISOString(),
        note: 'Short aç',
      },
      ...history,
    ];
  }

  return {
    portfolio: {
      ...portfolio,
      balance,
      positions,
      history,
      pendingOrders: portfolio.pendingOrders,
    },
  };
}

/** Belirli bir pozisyonu (id ile) tamamen kapatır. FX ve BIST için ortak. */
export function closePositionById(
  portfolio: Portfolio,
  positionId: string,
  bid: number,
  ask: number,
  marketClosed?: string,
  config?: EffectiveTradingSettings,
  pnlPrice?: number,
): { portfolio: Portfolio; error?: string } {
  const cfg = config ?? DEFAULT_TRADING_SETTINGS;
  const pos = portfolio.positions.find((p) => p.id === positionId);
  if (!pos) return { portfolio, error: 'Açık pozisyon yok' };
  if (marketClosed) return { portfolio, error: marketClosed };

  const isLong = pos.side === 'long';
  // Kayda geçen/komisyona esas gerçek piyasa fiyatı.
  const fill = isLong ? bid : ask;
  // Kâr/zarar (ve bakiye) hesabı: TP fiyatı verildiyse onun üzerinden.
  const pnlSource = pnlPrice != null && pnlPrice > 0 ? pnlPrice : fill;
  const realized = isLong
    ? (pnlSource - pos.avgEntry) * pos.quantity
    : (pos.avgEntry - pnlSource) * pos.quantity;
  const marginRelease = requiredMargin(pos.quantity, pos.avgEntry, cfg.leverage);

  let balance = portfolio.balance + marginRelease + realized;
  balance = chargeCommission(balance, pos.quantity, fill, cfg.commissionRate);

  const positions = removePosition(portfolio.positions, positionId);
  const history: Trade[] = [
    {
      id: uid(),
      symbol: pos.symbol,
      side: isLong ? 'sell' : 'buy',
      quantity: pos.quantity,
      price: fill,
      realizedPnl: realized,
      at: new Date().toISOString(),
      note: isLong ? 'Long kapat' : 'Short kapat',
    },
    ...portfolio.history,
  ];

  return {
    portfolio: { ...portfolio, balance, positions, history },
  };
}

export function closePosition(
  portfolio: Portfolio,
  symbol: string,
  bid: number,
  ask: number,
  marketClosed?: string,
  config?: EffectiveTradingSettings,
  pnlPrice?: number,
): { portfolio: Portfolio; error?: string } {
  const pos = getPosition(portfolio, symbol);
  if (!pos) return { portfolio, error: 'Açık pozisyon yok' };
  return closePositionById(
    portfolio,
    pos.id,
    bid,
    ask,
    marketClosed,
    config,
    pnlPrice,
  );
}

export function placeLimitOrder(
  portfolio: Portfolio,
  symbol: string,
  side: 'buy' | 'sell',
  quantity: number,
  limitPrice: number,
  opts?: {
    stopLoss?: number;
    takeProfit?: number;
    marketClosed?: string;
    config?: EffectiveTradingSettings;
  },
): { portfolio: Portfolio; error?: string } {
  const cfg = opts?.config ?? DEFAULT_TRADING_SETTINGS;
  const lotErr = validateLot(quantity, cfg);
  if (lotErr) return { portfolio, error: lotErr };
  if (limitPrice <= 0) return { portfolio, error: 'Geçerli bir fiyat girin' };
  if (opts?.marketClosed) return { portfolio, error: opts.marketClosed };

  const order: PendingOrder = {
    id: uid(),
    symbol: symbol.toUpperCase(),
    side,
    quantity,
    limitPrice,
    stopLoss: opts?.stopLoss,
    takeProfit: opts?.takeProfit,
    createdAt: new Date().toISOString(),
  };

  return {
    portfolio: {
      ...portfolio,
      pendingOrders: [...portfolio.pendingOrders, order],
    },
  };
}

export function cancelPendingOrder(
  portfolio: Portfolio,
  orderId: string,
): Portfolio {
  return {
    ...portfolio,
    pendingOrders: portfolio.pendingOrders.filter((o) => o.id !== orderId),
  };
}

function shouldFillBuyLimit(ask: number, limitPrice: number) {
  return ask > 0 && ask <= limitPrice;
}

function shouldFillSellLimit(bid: number, limitPrice: number) {
  return bid > 0 && bid >= limitPrice;
}

function checkStopTake(
  portfolio: Portfolio,
  symbol: string,
  bid: number,
  ask: number,
  config?: EffectiveTradingSettings,
): {
  portfolio: Portfolio;
  messages: string[];
  events: TpAdjustedCloseEvent[];
} {
  if (bid <= 0 || ask <= 0) return { portfolio, messages: [], events: [] };

  const sym = symbol.toUpperCase();
  let next = portfolio;
  const messages: string[] = [];
  const events: TpAdjustedCloseEvent[] = [];

  // Her pozisyonun kendi SL/TP'si vardır; tek tek değerlendir.
  const candidates = portfolio.positions.filter((p) => p.symbol === sym);
  for (const pos of candidates) {
    let trigger: string | null = null;
    let tpHit = false;
    if (pos.side === 'long') {
      if (pos.stopLoss != null && bid <= pos.stopLoss) {
        trigger = 'Zarar durdur tetiklendi';
      } else if (pos.takeProfit != null && bid >= pos.takeProfit) {
        trigger = 'Kar al tetiklendi';
        tpHit = true;
      }
    } else {
      if (pos.stopLoss != null && ask >= pos.stopLoss) {
        trigger = 'Zarar durdur tetiklendi';
      } else if (pos.takeProfit != null && ask <= pos.takeProfit) {
        trigger = 'Kar al tetiklendi';
        tpHit = true;
      }
    }
    if (!trigger) continue;

    // TP ile kapanışta kâr, tanımlı TP fiyatından hesaplanır; kayda geçen
    // işlem fiyatı yine gerçek piyasa fiyatı olur.
    const tpPrice = tpHit ? pos.takeProfit! : undefined;
    const res = closePositionById(
      next,
      pos.id,
      bid,
      ask,
      undefined,
      config,
      tpPrice,
    );
    if (!res.error) {
      next = res.portfolio;
      messages.push(trigger);
      if (tpHit && tpPrice != null) {
        const isLong = pos.side === 'long';
        const marketPrice = isLong ? bid : ask;
        const marketPnl = isLong
          ? (bid - pos.avgEntry) * pos.quantity
          : (pos.avgEntry - ask) * pos.quantity;
        const tpPnl = isLong
          ? (tpPrice - pos.avgEntry) * pos.quantity
          : (pos.avgEntry - tpPrice) * pos.quantity;
        events.push({
          symbol: pos.symbol,
          side: pos.side,
          quantity: pos.quantity,
          marketPrice,
          tpPrice,
          marketPnl,
          tpPnl,
        });
      }
    }
  }

  return { portfolio: next, messages, events };
}

function processPendingOrders(
  portfolio: Portfolio,
  symbol: string,
  bid: number,
  ask: number,
  merge: boolean,
  config?: EffectiveTradingSettings,
): { portfolio: Portfolio; messages: string[] } {
  const sym = symbol.toUpperCase();
  const messages: string[] = [];
  let next = portfolio;
  const remaining: PendingOrder[] = [];

  for (const order of portfolio.pendingOrders) {
    if (order.symbol !== sym) {
      remaining.push(order);
      continue;
    }

    const hitBuy =
      order.side === 'buy' && shouldFillBuyLimit(ask, order.limitPrice);
    const hitSell =
      order.side === 'sell' && shouldFillSellLimit(bid, order.limitPrice);

    if (!hitBuy && !hitSell) {
      remaining.push(order);
      continue;
    }

    const fillPrice = order.limitPrice;
    const result =
      order.side === 'buy'
        ? executeBuy(next, sym, order.quantity, bid, ask, {
            fillPrice,
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
            config,
            merge,
          })
        : executeSell(next, sym, order.quantity, bid, ask, {
            fillPrice,
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
            config,
            merge,
          });

    if (result.error) {
      remaining.push(order);
      continue;
    }

    next = result.portfolio;
    messages.push(
      order.side === 'buy'
        ? 'Alış limit emri gerçekleşti'
        : 'Satış limit emri gerçekleşti',
    );
  }

  const otherSymbols = portfolio.pendingOrders.filter((o) => o.symbol !== sym);
  return {
    portfolio: { ...next, pendingOrders: [...otherSymbols, ...remaining] },
    messages,
  };
}

export function processSymbolTick(
  portfolio: Portfolio,
  symbol: string,
  bid: number,
  ask: number,
  config?: EffectiveTradingSettings,
  merge = true,
): {
  portfolio: Portfolio;
  messages: string[];
  tpAdjustedCloses: TpAdjustedCloseEvent[];
} {
  if (bid <= 0 && ask <= 0) {
    return { portfolio, messages: [], tpAdjustedCloses: [] };
  }

  let next = portfolio;
  const allMessages: string[] = [];

  const stops = checkStopTake(next, symbol, bid, ask, config);
  next = stops.portfolio;
  allMessages.push(...stops.messages);

  const limits = processPendingOrders(next, symbol, bid, ask, merge, config);
  next = limits.portfolio;
  allMessages.push(...limits.messages);

  return {
    portfolio: next,
    messages: allMessages,
    tpAdjustedCloses: stops.events,
  };
}
