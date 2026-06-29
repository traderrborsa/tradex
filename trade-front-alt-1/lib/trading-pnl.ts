import type { Trade } from '@/lib/trading/types';

export function isCloseTrade(trade: Trade): boolean {
  return trade.note?.includes('kapat') ?? false;
}

/** Müşteriye gösterilecek net K/Z — komisyon düşülmüş, bakiyeye yansıyan. */
export function tradeNetPnl(trade: Trade): number | null {
  if (!isCloseTrade(trade)) return null;
  if (trade.balancePnl != null) return trade.balancePnl;
  if (trade.netPnl != null) return trade.netPnl;
  if (trade.realizedPnl !== 0) return trade.realizedPnl;
  return null;
}

export function tradeGrossPnl(trade: Trade): number | null {
  if (!isCloseTrade(trade)) return null;
  return trade.grossPnl ?? trade.realizedPnl;
}
