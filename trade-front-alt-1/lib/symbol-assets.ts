import { isBistIndex, isBistSymbol } from './bist-symbols';

/** ISO 3166-1 alpha-2 for flagcdn.com */
const FLAG: Record<string, string> = {
  EUR: 'eu',
  USD: 'us',
  GBP: 'gb',
  JPY: 'jp',
  CHF: 'ch',
  AUD: 'au',
  CAD: 'ca',
  NZD: 'nz',
  TRY: 'tr',
  SEK: 'se',
  NOK: 'no',
  DKK: 'dk',
  PLN: 'pl',
  ZAR: 'za',
  MXN: 'mx',
  SGD: 'sg',
  HKD: 'hk',
  CNY: 'cn',
  CNH: 'cn',
};

const CRYPTO: Record<string, string> = {
  BTC: 'btc',
  ETH: 'eth',
  LTC: 'ltc',
  XRP: 'xrp',
  SOL: 'sol',
  ADA: 'ada',
  DOGE: 'doge',
  BNB: 'bnb',
};

const US_STOCK_TICKERS = new Set([
  'AAPL',
  'MSFT',
  'NVDA',
  'TSLA',
  'GOOGL',
  'GOOG',
  'AMZN',
  'META',
  'NFLX',
  'AMD',
  'INTC',
  'JPM',
  'V',
  'MA',
  'DIS',
  'BA',
  'COIN',
]);

export interface SymbolVisual {
  type: 'forex' | 'crypto' | 'commodity' | 'stock' | 'bist' | 'bist-index';
  primary: string;
  secondary?: string;
  label: string;
}

function isForexPair(s: string): boolean {
  if (s.length !== 6) return false;
  const base = s.slice(0, 3);
  const quote = s.slice(3, 6);
  return Boolean(FLAG[base] && FLAG[quote]);
}

export function isUsStock(symbol: string): boolean {
  const s = symbol.toUpperCase();
  if (isBistSymbol(s)) return false;
  if (US_STOCK_TICKERS.has(s)) return true;
  if (s.length >= 6 || s.startsWith('XAU') || s.startsWith('XAG')) return false;
  if (Object.keys(CRYPTO).some((c) => s.startsWith(c) && s.length > c.length)) {
    return false;
  }
  if (isForexPair(s)) return false;
  return s.length >= 1 && s.length <= 5 && /^[A-Z]+$/.test(s);
}

export function stockLogoUrl(symbol: string): string {
  return `https://financialmodelingprep.com/image-stock/${symbol.toUpperCase()}.png`;
}

/** BIST hisse logoları (GitHub CDN — sembol başına PNG) */
export function bistLogoUrl(symbol: string): string {
  return `https://cdn.jsdelivr.net/gh/ahmeterenodaci/Istanbul-Stock-Exchange--BIST--including-symbols-and-logos/logos/${symbol.toUpperCase()}.png`;
}

export function parseSymbolVisual(symbol: string): SymbolVisual {
  const s = symbol.toUpperCase();

  if (isBistIndex(s)) {
    return { type: 'bist-index', primary: s, label: s };
  }

  if (isBistSymbol(s)) {
    return { type: 'bist', primary: s, label: s };
  }

  if (isUsStock(s)) {
    return { type: 'stock', primary: s, label: s };
  }

  if (s.startsWith('XAU') || s.startsWith('XAG')) {
    return {
      type: 'commodity',
      primary: s.startsWith('XAU') ? 'gold' : 'silver',
      label: s.startsWith('XAU') ? 'Altın' : 'Gümüş',
    };
  }

  const cryptoKey = Object.keys(CRYPTO).find((c) => s.startsWith(c));
  if (cryptoKey && s.length > cryptoKey.length) {
    const quote = s.slice(cryptoKey.length);
    return {
      type: 'crypto',
      primary: CRYPTO[cryptoKey],
      secondary: FLAG[quote] ? quote : undefined,
      label: cryptoKey,
    };
  }

  if (s.length >= 6) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    return {
      type: 'forex',
      primary: base,
      secondary: quote,
      label: base,
    };
  }

  return { type: 'forex', primary: s.slice(0, 3), label: s };
}

export function flagUrl(currencyCode: string): string | null {
  const code = FLAG[currencyCode.toUpperCase()];
  if (!code) return null;
  return `https://flagcdn.com/w40/${code}.png`;
}

export function cryptoIconUrl(assetId: string): string {
  return `https://assets.coincap.io/assets/icons/${assetId}@2x.png`;
}

export const HOME_WATCHLIST: {
  symbol: string;
  description: string;
}[] = [
  { symbol: 'EURUSD', description: 'Euro / Dolar' },
  { symbol: 'GBPUSD', description: 'Sterlin / Dolar' },
  { symbol: 'USDJPY', description: 'Dolar / Yen' },
  { symbol: 'AUDUSD', description: 'Avustralya / Dolar' },
  { symbol: 'USDCAD', description: 'Dolar / Kanada' },
  { symbol: 'USDCHF', description: 'Dolar / Frank' },
  { symbol: 'BTCUSD', description: 'Bitcoin' },
  { symbol: 'ETHUSD', description: 'Ethereum' },
  { symbol: 'XAUUSD', description: 'Altın' },
  { symbol: 'XAGUSD', description: 'Gümüş' },
];

export const US_STOCKS_WATCHLIST: {
  symbol: string;
  description: string;
}[] = [
  { symbol: 'AAPL', description: 'Apple' },
  { symbol: 'MSFT', description: 'Microsoft' },
  { symbol: 'NVDA', description: 'NVIDIA' },
  { symbol: 'TSLA', description: 'Tesla' },
  { symbol: 'GOOGL', description: 'Alphabet' },
  { symbol: 'AMZN', description: 'Amazon' },
  { symbol: 'META', description: 'Meta' },
  { symbol: 'AMD', description: 'AMD' },
];

export const BIST_WATCHLIST: {
  symbol: string;
  description: string;
}[] = [
  { symbol: 'XU100', description: 'BIST 100' },
  { symbol: 'XU030', description: 'BIST 30' },
  { symbol: 'THYAO', description: 'Türk Hava Yolları' },
  { symbol: 'GARAN', description: 'Garanti BBVA' },
  { symbol: 'AKBNK', description: 'Akbank' },
  { symbol: 'ASELS', description: 'Aselsan' },
  { symbol: 'EREGL', description: 'Erdemir' },
  { symbol: 'KCHOL', description: 'Koç Holding' },
  { symbol: 'BIMAS', description: 'BİM' },
];

export const HOME_MARKET_SECTIONS = [
  { id: 'markets', title: 'Forex & kripto', items: HOME_WATCHLIST },
  { id: 'bist', title: 'BIST', items: BIST_WATCHLIST },
  { id: 'us-stocks', title: 'ABD hisseleri', items: US_STOCKS_WATCHLIST },
] as const;

export const WATCHLIST_BY_CATEGORY = {
  bist: BIST_WATCHLIST,
  forex: HOME_WATCHLIST,
  us: US_STOCKS_WATCHLIST,
} as const;

export type WatchlistCategory = keyof typeof WATCHLIST_BY_CATEGORY;

export const WATCHLIST_CATEGORY_LABELS: Record<WatchlistCategory, string> = {
  bist: 'BIST',
  forex: 'Forex & Kripto',
  us: 'ABD',
};

export function isWatchlistCategory(value: string): value is WatchlistCategory {
  return value in WATCHLIST_BY_CATEGORY;
}

export const ALL_HOME_SYMBOLS = [
  ...HOME_WATCHLIST,
  ...BIST_WATCHLIST,
  ...US_STOCKS_WATCHLIST,
].map((w) => w.symbol);
