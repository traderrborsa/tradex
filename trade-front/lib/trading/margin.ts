import { isBistSymbol } from '../bist-symbols';
import type { EffectiveTradingSettings } from '../trading-config';
import { DEFAULT_TRADING_SETTINGS } from '../trading-config';

export const MIN_LOT = DEFAULT_TRADING_SETTINGS.minLot;
export const LOT_STEP = DEFAULT_TRADING_SETTINGS.lotStep;
export const COMMISSION_RATE = DEFAULT_TRADING_SETTINGS.commissionRate;

export function requiredMargin(
  quantity: number,
  price: number,
  settings: EffectiveTradingSettings = DEFAULT_TRADING_SETTINGS,
): number {
  const lev = Math.max(1, settings.leverage);
  return (quantity * price) / lev;
}

export function estimateCommission(
  quantity: number,
  price: number,
  settings: EffectiveTradingSettings = DEFAULT_TRADING_SETTINGS,
): number {
  return quantity * price * settings.commissionRate;
}

export function clampLot(
  value: number,
  settings: EffectiveTradingSettings = DEFAULT_TRADING_SETTINGS,
): number {
  const minLot = settings.minLot;
  const lotStep = settings.lotStep;
  if (!Number.isFinite(value) || value < minLot) return minLot;
  const stepped = Math.round(value / lotStep) * lotStep;
  const clamped = Math.round(stepped * 100) / 100;
  if (settings.maxLot != null && clamped > settings.maxLot) {
    return settings.maxLot;
  }
  return clamped;
}

/** Günlük swap (1 lot, TL) — panel efektif ayarları kullanılır. */
const CRYPTO_PREFIX =
  /^(BTC|ETH|XRP|SOL|DOGE|ADA|BNB|LTC|DOT|AVAX|LINK|MATIC|SHIB|UNI|ATOM)/;

function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_PREFIX.test(symbol.toUpperCase());
}

function isForexSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  if (isCryptoSymbol(s)) return false;
  if (isBistSymbol(s)) return false;
  return /^[A-Z]{6}$/.test(s) || s === 'XAUUSD' || s === 'XAGUSD';
}

export function getSwapRates(
  symbol: string,
  settings: EffectiveTradingSettings = DEFAULT_TRADING_SETTINGS,
): { long: number; short: number } {
  if (isForexSymbol(symbol)) {
    return { long: settings.swapForexLong, short: settings.swapForexShort };
  }
  return { long: settings.swapOtherLong, short: settings.swapOtherShort };
}

export function swapForVolume(
  ratePerLot: number,
  quantity: number,
): number {
  return Math.round(ratePerLot * quantity * 1_000_000) / 1_000_000;
}

export function formatSwap(value: number): string {
  const sign = value > 0 ? '+' : '';
  const abs = Math.abs(value);
  let decimals = 2;
  if (abs > 0 && abs < 0.01) decimals = 4;
  if (abs > 0 && abs < 0.0001) decimals = 6;
  return `${sign}${value.toFixed(decimals)}`;
}
