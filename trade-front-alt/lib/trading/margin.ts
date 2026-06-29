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

export function getSwapCategory(symbol: string): 'forex' | 'other' {
  return isForexSymbol(symbol) ? 'forex' : 'other';
}

export function swapCategoryLabel(symbol: string): string {
  const cat = getSwapCategory(symbol);
  if (cat === 'forex') return 'Forex';
  if (isCryptoSymbol(symbol)) return 'Kripto';
  if (isBistSymbol(symbol)) return 'BIST';
  return 'Diğer';
}

/** Günlük swap oranı (1 lot, ₺) — sembol tipine göre işletme ayarları. */
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
  return Math.round(ratePerLot * quantity * 10000) / 10000;
}

/** Pozisyon yönüne göre günlük swap (lot × oran). */
export function dailySwapForPosition(
  symbol: string,
  side: string,
  quantity: number,
  settings: EffectiveTradingSettings = DEFAULT_TRADING_SETTINGS,
): number {
  const rates = getSwapRates(symbol, settings);
  const rate =
    side === 'long' || side === 'buy' ? rates.long : rates.short;
  return swapForVolume(rate, quantity);
}

export function formatSwap(value: number): string {
  const sign = value > 0 ? '+' : '';
  const abs = Math.abs(value);
  const decimals = abs > 0 && abs < 0.01 ? 4 : 2;
  return `${sign}${value.toFixed(decimals)}`;
}
