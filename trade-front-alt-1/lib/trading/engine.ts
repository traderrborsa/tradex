import { getTradingBlockReason } from '@/lib/market-hours';
import type { EffectiveTradingSettings } from '@/lib/trading-config';
import { DEFAULT_TRADING_SETTINGS } from '@/lib/trading-config';
import { estimateCommission, positionLeverage, requiredMargin } from './margin';
import type { PendingOrder, Portfolio, Position, Trade } from './types';
import { INITIAL_BALANCE } from './types';

function marketClosedError(symbol: string): string | undefined {
  const reason = getTradingBlockReason(symbol);
  return reason ?? undefined;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPortfolio(): Portfolio {
  return {
    balance: INITIAL_BALANCE,
    bonusIncome: 0,
    creditIncome: 0,
    cashBalance: INITIAL_BALANCE,
    totalBalance: INITIAL_BALANCE,
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

export function getPendingOrders(portfolio: Portfolio, symbol: string) {
  const sym = symbol.toUpperCase();
  return portfolio.pendingOrders.filter((o) => o.symbol === sym);
}

export function unrealizedPnl(
  position: Position,
  bid: number,
  ask: number,
): number {
  if (position.side === 'long') {
    return (bid - position.avgEntry) * position.quantity;
  }
  return (position.avgEntry - ask) * position.quantity;
}

/** TP/SL fiyatında gerçekleşmesi muhtemel K/Z (komisyon hariç). */
export function potentialPnlForOrder(
  side: Position['side'],
  quantity: number,
  entryPrice: number,
  exitPrice: number,
): number {
  if (exitPrice <= 0 || quantity <= 0 || entryPrice <= 0) return 0;
  if (side === 'long') {
    return (exitPrice - entryPrice) * quantity;
  }
  return (entryPrice - exitPrice) * quantity;
}

export function potentialPnlAtPrice(
  position: Position,
  exitPrice: number,
): number {
  return potentialPnlForOrder(
    position.side,
    position.quantity,
    position.avgEntry,
    exitPrice,
  );
}

export function computeEquity(
  portfolio: Portfolio,
  quotes: Record<string, { bid: number; ask: number }>,
  settings: EffectiveTradingSettings = DEFAULT_TRADING_SETTINGS,
): number {
  let equity = portfolio.balance;
  for (const pos of portfolio.positions) {
    const sym = pos.symbol.toUpperCase();
    equity += requiredMargin(
      pos.quantity,
      pos.avgEntry,
      positionLeverage(pos),
    );
    const q = quotes[sym];
    if (q) {
      equity += unrealizedPnl(pos, q.bid, q.ask);
    }
  }
  return equity;
}

function upsertPosition(
  positions: Position[],
  position: Position | null,
  symbol: string,
) {
  const sym = symbol.toUpperCase();
  const rest = positions.filter((p) => p.symbol !== sym);
  if (!position || position.quantity <= 0) return rest;
  return [...rest, position];
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

function chargeCommission(balance: number, quantity: number, price: number) {
  return balance - estimateCommission(quantity, price);
}

/** Al: ask — long aç / short kapat */
export function executeBuy(
  portfolio: Portfolio,
  symbol: string,
  quantity: number,
  bid: number,
  ask: number,
  opts?: { stopLoss?: number; takeProfit?: number; fillPrice?: number },
): { portfolio: Portfolio; error?: string } {
  if (quantity <= 0) return { portfolio, error: 'Miktar 0 olamaz' };

  const sym = symbol.toUpperCase();
  const closed = marketClosedError(sym);
  if (closed) return { portfolio, error: closed };

  const fillAsk = opts?.fillPrice ?? ask;
  let balance = portfolio.balance;
  let remaining = quantity;
  let positions = [...portfolio.positions];
  let history = portfolio.history;
  const existing = positions.find((p) => p.symbol === sym);

  if (existing?.side === 'short') {
    const closeQty = Math.min(remaining, existing.quantity);
    const realized = (existing.avgEntry - fillAsk) * closeQty;
    balance -= fillAsk * closeQty;
    balance = chargeCommission(balance, closeQty, fillAsk);
    remaining -= closeQty;
    const left = existing.quantity - closeQty;
    positions = upsertPosition(
      positions,
      left > 0 ? { ...existing, quantity: left } : null,
      sym,
    );
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
    const cost = fillAsk * remaining;
    if (balance < cost) {
      return { portfolio: { ...portfolio, positions, history }, error: 'Yetersiz bakiye' };
    }
    balance -= cost;
    balance = chargeCommission(balance, remaining, fillAsk);
    const long = positions.find((p) => p.symbol === sym && p.side === 'long');
    if (long) {
      const totalQty = long.quantity + remaining;
      const avgEntry =
        (long.avgEntry * long.quantity + fillAsk * remaining) / totalQty;
      positions = upsertPosition(
        positions,
        applyStops(
          { ...long, quantity: totalQty, avgEntry },
          opts?.stopLoss,
          opts?.takeProfit,
        ),
        sym,
      );
    } else {
      positions = upsertPosition(
        positions,
        applyStops(
          {
            id: uid(),
            symbol: sym,
            side: 'long',
            quantity: remaining,
            avgEntry: fillAsk,
            openedAt: new Date().toISOString(),
          },
          opts?.stopLoss,
          opts?.takeProfit,
        ),
        sym,
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

  return { portfolio: { ...portfolio, balance, positions, history } };
}

/** Sat: bid — short aç / long kapat */
export function executeSell(
  portfolio: Portfolio,
  symbol: string,
  quantity: number,
  bid: number,
  ask: number,
  opts?: { stopLoss?: number; takeProfit?: number; fillPrice?: number },
): { portfolio: Portfolio; error?: string } {
  if (quantity <= 0) return { portfolio, error: 'Miktar 0 olamaz' };

  const sym = symbol.toUpperCase();
  const closed = marketClosedError(sym);
  if (closed) return { portfolio, error: closed };

  const fillBid = opts?.fillPrice ?? bid;
  let balance = portfolio.balance;
  let remaining = quantity;
  let positions = [...portfolio.positions];
  let history = portfolio.history;
  const existing = positions.find((p) => p.symbol === sym);

  if (existing?.side === 'long') {
    const closeQty = Math.min(remaining, existing.quantity);
    const realized = (fillBid - existing.avgEntry) * closeQty;
    balance += fillBid * closeQty;
    balance = chargeCommission(balance, closeQty, fillBid);
    remaining -= closeQty;
    const left = existing.quantity - closeQty;
    positions = upsertPosition(
      positions,
      left > 0 ? { ...existing, quantity: left } : null,
      sym,
    );
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
    const proceeds = fillBid * remaining;
    balance += proceeds;
    balance = chargeCommission(balance, remaining, fillBid);
    const short = positions.find((p) => p.symbol === sym && p.side === 'short');
    if (short) {
      const totalQty = short.quantity + remaining;
      const avgEntry =
        (short.avgEntry * short.quantity + fillBid * remaining) / totalQty;
      positions = upsertPosition(
        positions,
        applyStops(
          { ...short, quantity: totalQty, avgEntry },
          opts?.stopLoss,
          opts?.takeProfit,
        ),
        sym,
      );
    } else {
      positions = upsertPosition(
        positions,
        applyStops(
          {
            id: uid(),
            symbol: sym,
            side: 'short',
            quantity: remaining,
            avgEntry: fillBid,
            openedAt: new Date().toISOString(),
          },
          opts?.stopLoss,
          opts?.takeProfit,
        ),
        sym,
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

  return { portfolio: { ...portfolio, balance, positions, history } };
}

export function closePosition(
  portfolio: Portfolio,
  symbol: string,
  bid: number,
  ask: number,
): { portfolio: Portfolio; error?: string } {
  const pos = getPosition(portfolio, symbol);
  if (!pos) return { portfolio, error: 'Açık pozisyon yok' };
  if (pos.side === 'long') {
    return executeSell(portfolio, symbol, pos.quantity, bid, ask);
  }
  return executeBuy(portfolio, symbol, pos.quantity, bid, ask);
}

export function placeLimitOrder(
  portfolio: Portfolio,
  symbol: string,
  side: 'buy' | 'sell',
  quantity: number,
  limitPrice: number,
  opts?: { stopLoss?: number; takeProfit?: number },
): { portfolio: Portfolio; error?: string } {
  if (quantity <= 0) return { portfolio, error: 'Miktar 0 olamaz' };
  if (limitPrice <= 0) return { portfolio, error: 'Geçerli bir fiyat girin' };

  const sym = symbol.toUpperCase();
  const closed = marketClosedError(sym);
  if (closed) return { portfolio, error: closed };

  const order: PendingOrder = {
    id: uid(),
    symbol: sym,
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
): { portfolio: Portfolio; messages: string[] } {
  const pos = getPosition(portfolio, symbol);
  if (!pos || bid <= 0 || ask <= 0) {
    return { portfolio, messages: [] };
  }

  let messages: string[] = [];
  let next = portfolio;

  if (pos.side === 'long') {
    if (pos.stopLoss != null && bid <= pos.stopLoss) {
      const res = executeSell(next, symbol, pos.quantity, bid, ask);
      if (!res.error) {
        next = res.portfolio;
        messages = [...messages, 'Zarar durdur tetiklendi'];
      }
    } else if (pos.takeProfit != null && bid >= pos.takeProfit) {
      const res = executeSell(next, symbol, pos.quantity, bid, ask);
      if (!res.error) {
        next = res.portfolio;
        messages = [...messages, 'Kar al tetiklendi'];
      }
    }
  } else {
    if (pos.stopLoss != null && ask >= pos.stopLoss) {
      const res = executeBuy(next, symbol, pos.quantity, bid, ask);
      if (!res.error) {
        next = res.portfolio;
        messages = [...messages, 'Zarar durdur tetiklendi'];
      }
    } else if (pos.takeProfit != null && ask <= pos.takeProfit) {
      const res = executeBuy(next, symbol, pos.quantity, bid, ask);
      if (!res.error) {
        next = res.portfolio;
        messages = [...messages, 'Kar al tetiklendi'];
      }
    }
  }

  return { portfolio: next, messages };
}

function processPendingOrders(
  portfolio: Portfolio,
  symbol: string,
  bid: number,
  ask: number,
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

    const hitBuy = order.side === 'buy' && shouldFillBuyLimit(ask, order.limitPrice);
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
          })
        : executeSell(next, sym, order.quantity, bid, ask, {
            fillPrice,
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
          });

    if (result.error) {
      remaining.push(order);
      continue;
    }

    next = result.portfolio;
    messages.push(
      order.side === 'buy' ? 'Alış limit emri gerçekleşti' : 'Satış limit emri gerçekleşti',
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
): { portfolio: Portfolio; messages: string[] } {
  if (bid <= 0 && ask <= 0) return { portfolio, messages: [] };

  let next = portfolio;
  const allMessages: string[] = [];

  const stops = checkStopTake(next, symbol, bid, ask);
  next = stops.portfolio;
  allMessages.push(...stops.messages);

  const limits = processPendingOrders(next, symbol, bid, ask);
  next = limits.portfolio;
  allMessages.push(...limits.messages);

  return { portfolio: next, messages: allMessages };
}
