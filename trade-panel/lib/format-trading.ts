import { isBistSymbol } from './bist-symbols';

const CRYPTO_PREFIX =
  /^(BTC|ETH|XRP|SOL|DOGE|ADA|BNB|LTC|DOT|AVAX|LINK|MATIC|SHIB|UNI|ATOM)/;

function isForexLikeSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  if (CRYPTO_PREFIX.test(s)) return false;
  if (isBistSymbol(s)) return false;
  return /^[A-Z]{6}$/.test(s) || s === 'XAUUSD' || s === 'XAGUSD';
}

/** Sembol tipine göre fiyat ondalığı — forex 5, BIST/hisse 2. */
export function tradingPriceFractionDigits(
  value: number,
  symbol: string,
): number {
  if (isBistSymbol(symbol)) return 2;
  if (isForexLikeSymbol(symbol)) {
    if (value >= 100) return 3;
    return 5;
  }
  if (CRYPTO_PREFIX.test(symbol.toUpperCase())) {
    if (value >= 1000) return 2;
    if (value >= 1) return 4;
    return 6;
  }
  if (value >= 1000) return 2;
  if (value >= 100) return 2;
  return 5;
}

export function formatTradingPrice(
  value: number | null | undefined,
  symbol: string,
): string {
  if (value == null) return '—';
  const digits = tradingPriceFractionDigits(value, symbol);
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Küçük TRY tutarları sıfıra yuvarlanmasın diye dinamik ondalık. */
export function tradingMoneyFractionDigits(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 2;
  const abs = Math.abs(value);
  if (abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  if (abs >= 0.0001) return 6;
  return 8;
}

export function formatTradingMoney(
  value: number | null | undefined,
  opts?: { withCurrency?: boolean },
): string {
  if (value == null) return '—';
  const digits = tradingMoneyFractionDigits(value);
  const formatted = value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return opts?.withCurrency === false ? formatted : `${formatted} ₺`;
}

export function formatTradingFee(value: number | null | undefined): string {
  return formatTradingMoney(value, { withCurrency: false });
}

export function formatTradingLot(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
