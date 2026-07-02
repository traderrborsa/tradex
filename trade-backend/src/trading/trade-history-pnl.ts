import type { EffectiveTradingSettings } from './trading-config.types';
import {
  accrueSwap,
  estimateCommissionFee,
  isCloseTradeNote,
  netPnl,
  roundTradingAmount,
} from './trading-fees';
import type { Trade } from './trading.types';

type TradeRow = {
  id: string;
  symbol: string;
  side: string;
  quantity: unknown;
  price: unknown;
  realizedPnl: unknown;
  note: string | null;
  executedAt: Date;
};

export type TradeOpenEvent = {
  executedAt: Date;
  note: string;
  price: number;
};

export type ClosedTradeLegs = {
  buyPrice: number;
  sellPrice: number;
  buyAt: string;
  sellAt: string;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function positionSideFromNote(note: string | null | undefined): string {
  if (note?.includes('Short')) return 'short';
  if (note?.includes('Long')) return 'long';
  return 'long';
}

export function buildTradeOpenIndex(
  rows: {
    accountId: string;
    symbol: string;
    executedAt: Date;
    note: string | null;
    price?: unknown;
  }[],
) {
  const index = new Map<string, TradeOpenEvent[]>();
  for (const row of rows) {
    const key = `${row.accountId}:${row.symbol.toUpperCase()}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key)!.push({
      executedAt: row.executedAt,
      note: row.note ?? '',
      price: toNum(row.price),
    });
  }
  for (const events of index.values()) {
    events.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
  }
  return index;
}

export function openTradeForClose(
  index: Map<string, TradeOpenEvent[]>,
  accountId: string,
  symbol: string,
  closeAt: Date,
  note: string | null,
): TradeOpenEvent | null {
  if (!note?.includes('kapat')) return null;
  const key = `${accountId}:${symbol.toUpperCase()}`;
  const events = index.get(key) ?? [];
  let lastOpen: TradeOpenEvent | null = null;
  for (const event of events) {
    if (event.executedAt.getTime() >= closeAt.getTime()) break;
    if (event.note.includes('aç')) lastOpen = event;
  }
  return lastOpen;
}

export function resolveClosedTradeLegs(
  closePrice: number,
  closeAt: Date,
  note: string | null,
  open: TradeOpenEvent | null,
): ClosedTradeLegs | null {
  if (!note?.includes('kapat') || !open) return null;
  const isLong = note.includes('Long');
  if (isLong) {
    return {
      buyPrice: open.price,
      sellPrice: closePrice,
      buyAt: open.executedAt.toISOString(),
      sellAt: closeAt.toISOString(),
    };
  }
  return {
    buyPrice: closePrice,
    sellPrice: open.price,
    buyAt: closeAt.toISOString(),
    sellAt: open.executedAt.toISOString(),
  };
}

export function enrichTradeForMember(
  row: TradeRow,
  accountId: string,
  settings: EffectiveTradingSettings,
  openIndex: Map<string, TradeOpenEvent[]>,
): Trade {
  const quantity = toNum(row.quantity);
  const price = toNum(row.price);
  const gross = toNum(row.realizedPnl);
  const openTrade = openTradeForClose(
    openIndex,
    accountId,
    row.symbol,
    row.executedAt,
    row.note,
  );
  const legs = resolveClosedTradeLegs(
    price,
    row.executedAt,
    row.note,
    openTrade,
  );
  const base: Trade = {
    id: row.id,
    symbol: row.symbol,
    side: row.side as Trade['side'],
    quantity,
    price,
    realizedPnl: gross,
    at: row.executedAt.toISOString(),
    note: row.note ?? undefined,
    ...(legs ?? {}),
  };

  if (!isCloseTradeNote(row.note)) {
    return base;
  }

  const commission = estimateCommissionFee(quantity, price, settings);
  const swap =
    openTrade != null
      ? accrueSwap(
          row.symbol,
          positionSideFromNote(row.note),
          quantity,
          openTrade.executedAt,
          settings,
          undefined,
          row.executedAt,
        )
      : 0;
  const net = netPnl(gross, swap, commission);
  const balancePnl = roundTradingAmount(gross - commission);

  return {
    ...base,
    grossPnl: gross,
    commission,
    swap,
    netPnl: net,
    balancePnl,
  };
}
