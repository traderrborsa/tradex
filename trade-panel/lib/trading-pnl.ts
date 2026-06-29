import type { PanelTransactionRow } from '@/lib/panel/types';

export function unrealizedPnl(
  side: string,
  quantity: number,
  avgEntry: number,
  bid: number,
  ask: number,
): number {
  if (side === 'long' || side === 'buy') {
    return (bid - avgEntry) * quantity;
  }
  return (avgEntry - ask) * quantity;
}

export function netPnlFromRow(
  grossPnl: number,
  swap: number,
  commission: number,
): number {
  return grossPnl + swap - commission;
}

export function currentMarkPrice(side: string, bid: number, ask: number) {
  return side === 'long' || side === 'buy' ? bid : ask;
}

export function enrichRowWithLiveQuote(
  row: PanelTransactionRow,
  bid: number,
  ask: number,
  status: 'open' | 'pending' | 'closed',
): PanelTransactionRow & { currentPrice: number | null } {
  const currentPrice = currentMarkPrice(row.side, bid, ask);

  if (status === 'open') {
    const gross = unrealizedPnl(
      row.side,
      row.quantity,
      row.openPrice,
      bid,
      ask,
    );
    const net = netPnlFromRow(gross, row.swap, row.commission);
    return {
      ...row,
      currentPrice,
      grossPnl: gross,
      netPnl: net,
      profit: gross,
    };
  }

  if (status === 'pending') {
    return { ...row, currentPrice, profit: null };
  }

  return { ...row, currentPrice: null };
}
