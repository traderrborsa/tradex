import type { EffectiveTradingSettings } from './trading-config.types';

const BIST_INDICES = new Set([
  'XU100',
  'XU050',
  'XU030',
  'XUTUM',
  'XKTUM',
  'XBANK',
  'XUSIN',
  'XUHIZ',
  'XGMYO',
  'XUTEK',
  'XELKT',
  'XMANA',
  'XTRZM',
  'XSGRT',
  'XFINK',
  'XHOLD',
  'XSPOR',
  'XYORT',
  'XULAS',
  'XTAST',
  'XINSA',
  'XMADN',
  'XKMYA',
  'XGIDA',
  'XTEKS',
  'XKAGT',
  'XBLSM',
  'XILTM',
  'XUMAL',
]);

export function isBistLikeSymbol(symbol: string): boolean {
  const sym = symbol.toUpperCase();
  if (BIST_INDICES.has(sym) || sym.startsWith('XU')) return true;
  // BIST hisse: 4–6 harf, forex çifti değil
  return /^[A-Z]{4,6}$/.test(sym) && !/^[A-Z]{6}$/.test(sym);
}

const CRYPTO_PREFIX =
  /^(BTC|ETH|XRP|SOL|DOGE|ADA|BNB|LTC|DOT|AVAX|LINK|MATIC|SHIB|UNI|ATOM)/;

export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_PREFIX.test(symbol.toUpperCase());
}

export function isForexSymbol(
  symbol: string,
  isBist?: (s: string) => boolean,
): boolean {
  const sym = symbol.toUpperCase();
  if (isCryptoSymbol(sym)) return false;
  if (isBist?.(sym) ?? isBistLikeSymbol(sym)) return false;
  return /^[A-Z]{6}$/.test(sym) || sym === 'XAUUSD' || sym === 'XAGUSD';
}

export function isCloseTradeNote(note: string | null | undefined): boolean {
  return note?.includes('kapat') ?? false;
}

/** Hesap motoru — küçük lotlarda kayıp olmaması için 6 ondalık. */
export function roundTradingAmount(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function estimateCommissionFee(
  quantity: number,
  price: number,
  settings: EffectiveTradingSettings,
): number {
  return roundTradingAmount(
    quantity * price * settings.commissionRate,
  );
}

export function getSwapRates(
  symbol: string,
  settings: EffectiveTradingSettings,
  isBist?: (s: string) => boolean,
): { long: number; short: number } {
  if (isForexSymbol(symbol, isBist)) {
    return { long: settings.swapForexLong, short: settings.swapForexShort };
  }
  return { long: settings.swapOtherLong, short: settings.swapOtherShort };
}

export function dailySwapForPosition(
  symbol: string,
  side: string,
  quantity: number,
  settings: EffectiveTradingSettings,
  isBist?: (s: string) => boolean,
): number {
  const rates = getSwapRates(symbol, settings, isBist);
  const rate =
    side === 'long' || side === 'buy' ? rates.long : rates.short;
  return roundTradingAmount(rate * quantity);
}

export function swapDaysHeld(openedAt: Date, until: Date = new Date()): number {
  const ms = until.getTime() - openedAt.getTime();
  if (ms <= 0) return 0;
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/** Birikmiş swap — açık pozisyon en az 1 gün, kapalıda açılış–kapanış arası. */
export function accrueSwap(
  symbol: string,
  side: string,
  quantity: number,
  openedAt: Date,
  settings: EffectiveTradingSettings,
  isBist?: (s: string) => boolean,
  until: Date = new Date(),
): number {
  const daily = dailySwapForPosition(
    symbol,
    side,
    quantity,
    settings,
    isBist,
  );
  const days = Math.max(1, swapDaysHeld(openedAt, until));
  return roundTradingAmount(daily * days);
}

export function netPnl(
  grossPnl: number,
  swap: number,
  commission: number,
): number {
  return roundTradingAmount(grossPnl + swap - commission);
}

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
