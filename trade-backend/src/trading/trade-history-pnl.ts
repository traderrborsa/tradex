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
  }[],
) {
  const index = new Map<string, { executedAt: Date; note: string }[]>();
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

function openTimeForCloseTrade(
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

export function enrichTradeForMember(
  row: TradeRow,
  accountId: string,
  settings: EffectiveTradingSettings,
  openIndex: Map<string, { executedAt: Date; note: string }[]>,
): Trade {
  const quantity = toNum(row.quantity);
  const price = toNum(row.price);
  const gross = toNum(row.realizedPnl);
  const base: Trade = {
    id: row.id,
    symbol: row.symbol,
    side: row.side as Trade['side'],
    quantity,
    price,
    realizedPnl: gross,
    at: row.executedAt.toISOString(),
    note: row.note ?? undefined,
  };

  if (!isCloseTradeNote(row.note) || gross === 0) {
    return base;
  }

  const commission = estimateCommissionFee(quantity, price, settings);
  const openTime = openTimeForCloseTrade(
    openIndex,
    accountId,
    row.symbol,
    row.executedAt,
    row.note,
  );
  const swap =
    openTime != null
      ? accrueSwap(
          row.symbol,
          positionSideFromNote(row.note),
          quantity,
          openTime,
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
