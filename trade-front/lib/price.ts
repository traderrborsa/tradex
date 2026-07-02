import { isBistSymbol } from './bist-symbols';
import { isMarketOpen } from './market-hours';
import { isUsStock } from './symbol-assets';
import type { Tick } from './types';

export function hasLiveQuote(tick: Tick, at = new Date()): boolean {
  if (!isMarketOpen(tick.symbol, at)) return false;
  if (tick.stale || tick.source === 'ohlc-snapshot') return false;
  return tick.bid > 0 && tick.ask > 0;
}

export function resolvePrice(tick: Tick, at = new Date()): number {
  if (hasLiveQuote(tick, at)) {
    if (tick.mid != null && tick.mid > 0) return tick.mid;
    const mid = (tick.bid + tick.ask) / 2;
    if (mid > 0) return mid;
  }
  if (tick.last > 0) return tick.last;
  if (tick.bid > 0) return tick.bid;
  return tick.ask;
}

export function getMarketPriceFractionDigits(
  value: number,
  symbol: string,
): number {
  if (isBistSymbol(symbol)) return 2;
  if (isUsStock(symbol) || value >= 1000) return 2;
  if (value >= 100) return 2;
  return 5;
}

export function formatMarketPrice(value: number, symbol: string): string {
  const fractionDigits = getMarketPriceFractionDigits(value, symbol);
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Input alanları için noktalı ondalık (düzenlenebilir) */
export function formatEditableMarketPrice(value: number, symbol: string): string {
  return value.toFixed(getMarketPriceFractionDigits(value, symbol));
}

export function formatMarketChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSpread(tick: Tick): string {
  if (!hasLiveQuote(tick)) return '—';
  const spread = tick.spread ?? tick.ask - tick.bid;
  return formatMarketPrice(spread, tick.symbol);
}
