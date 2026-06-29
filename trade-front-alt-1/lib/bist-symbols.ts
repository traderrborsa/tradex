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

const BIST_WATCHLIST = new Set([
  'THYAO',
  'GARAN',
  'AKBNK',
  'ASELS',
  'EREGL',
  'KCHOL',
  'SAHOL',
  'BIMAS',
  'XU100',
  'XU030',
]);

let bistTickers = new Set<string>([...BIST_WATCHLIST, ...BIST_INDICES]);
let loadPromise: Promise<void> | null = null;

export function isBistIndex(symbol: string): boolean {
  const sym = symbol.toUpperCase();
  return BIST_INDICES.has(sym) || sym.startsWith('XU');
}

export function isBistSymbol(symbol: string): boolean {
  const sym = symbol.toUpperCase();
  if (isBistIndex(sym)) return true;
  return bistTickers.has(sym);
}

/** Arama sonuçları — sadece bilinen BIST hisse/endeks listesi */
export function isKnownBistTicker(symbol: string): boolean {
  const sym = symbol.toUpperCase();
  if (BIST_INDICES.has(sym)) return true;
  return bistTickers.has(sym);
}

export async function ensureBistSymbolsLoaded(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
    try {
      const res = await fetch(`${base}/bist/companies`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        companies?: { ticker: string }[];
      };
      const next = new Set(bistTickers);
      for (const c of data.companies ?? []) {
        if (c.ticker) next.add(c.ticker.toUpperCase());
      }
      bistTickers = next;
    } catch {
      /* keep defaults */
    }
  })();

  return loadPromise;
}

export function registerBistSymbol(symbol: string) {
  bistTickers.add(symbol.toUpperCase());
}
