import {
  ensureBistSymbolsLoaded,
  isBistSymbol,
} from './bist-symbols';
import { searchTradableSymbols } from './search-index';
import { translateApiError } from './errors';
import type {
  OhlcResponse,
  SearchPageResult,
  SymbolInfo,
  Tick,
} from './types';
import type { WatchlistCategory } from './symbol-assets';

export const SEARCH_PAGE_SIZE = 20;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    throw new Error(translateApiError(msg));
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
      detail?: string;
    };
    const raw = err.message ?? err.detail ?? `API error ${res.status}`;
    throw new Error(translateApiError(raw, res.status));
  }
  return res.json() as Promise<T>;
}

function fetchBistTick(symbol: string) {
  return get<Tick>(`/bist/${encodeURIComponent(symbol.toUpperCase())}`);
}

function fetchBiquoteTick(symbol: string) {
  return get<Tick>(`/market/${encodeURIComponent(symbol.toUpperCase())}`);
}

async function resolveMarketRoute(
  symbol: string,
): Promise<'bist' | 'biquote'> {
  if (isBistSymbol(symbol)) return 'bist';
  await ensureBistSymbolsLoaded();
  return isBistSymbol(symbol) ? 'bist' : 'biquote';
}

export async function fetchTick(symbol: string) {
  const route = await resolveMarketRoute(symbol);
  return route === 'bist'
    ? fetchBistTick(symbol)
    : fetchBiquoteTick(symbol);
}

function fetchBistOhlc(symbol: string, interval: string, limit = 300) {
  const params = new URLSearchParams({ interval, limit: String(limit) });
  return get<OhlcResponse>(
    `/bist/${encodeURIComponent(symbol.toUpperCase())}/ohlc?${params}`,
  );
}

function fetchBiquoteOhlc(symbol: string, interval: string, limit = 300) {
  const params = new URLSearchParams({ interval, limit: String(limit) });
  return get<OhlcResponse>(
    `/market/${encodeURIComponent(symbol.toUpperCase())}/ohlc?${params}`,
  );
}

export async function fetchOhlc(
  symbol: string,
  interval: string,
  limit = 300,
) {
  const route = await resolveMarketRoute(symbol);
  return route === 'bist'
    ? fetchBistOhlc(symbol, interval, limit)
    : fetchBiquoteOhlc(symbol, interval, limit);
}

/** Dropdown / hızlı arama */
export async function searchSymbolsQuick(q: string) {
  const results = await searchTradableSymbols(q);
  return results.slice(0, 12);
}

export async function searchSymbols(q: string) {
  return searchTradableSymbols(q);
}

export async function searchSymbolsPage(
  q: string,
  page = 1,
  limit = SEARCH_PAGE_SIZE,
): Promise<SearchPageResult> {
  const merged = await searchSymbols(q);
  const total = merged.length;
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  const safePage = Math.min(Math.max(page, 1), Math.max(pages, 1));
  const start = (safePage - 1) * limit;

  return {
    items: merged.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    pages,
  };
}

export async function browseSymbolsPage(
  category: WatchlistCategory,
  page = 1,
  limit = SEARCH_PAGE_SIZE,
): Promise<SearchPageResult> {
  if (category === 'bist') {
    return get<SearchPageResult>(
      `/bist/symbols?page=${page}&limit=${limit}`,
    );
  }

  return get<SearchPageResult>(
    `/market/symbols/browse?category=${encodeURIComponent(category)}&page=${page}&limit=${limit}`,
  );
}

async function fetchBistLatest(
  symbols: string[],
): Promise<Record<string, Tick>> {
  if (symbols.length === 0) return {};
  const params = symbols
    .map((s) => `symbols=${encodeURIComponent(s.toUpperCase())}`)
    .join('&');
  const raw = await get<Record<string, Tick>>(`/bist/latest?${params}`);
  const out: Record<string, Tick> = {};
  for (const sym of symbols) {
    const key = sym.toUpperCase();
    const t = raw[key] ?? raw[sym];
    if (t) out[key] = { ...t, symbol: key };
  }
  return out;
}

async function fetchBiquoteLatest(
  symbols: string[],
): Promise<Record<string, Tick>> {
  if (symbols.length === 0) return {};
  const params = symbols
    .map((s) => `symbols=${encodeURIComponent(s.toUpperCase())}`)
    .join('&');
  const raw = await get<Record<string, Tick>>(`/market/latest?${params}`);
  const out: Record<string, Tick> = {};
  for (const sym of symbols) {
    const key = sym.toUpperCase();
    const t = raw[key] ?? raw[sym];
    if (t) out[key] = { ...t, symbol: key };
  }
  return out;
}

export async function fetchLatest(
  symbols: string[],
): Promise<Record<string, Tick>> {
  const knownBist = symbols.filter((s) => isBistSymbol(s));
  const unknown = symbols.filter((s) => !isBistSymbol(s));

  if (unknown.length > 0) {
    await ensureBistSymbolsLoaded();
  }

  const bistSyms = [
    ...knownBist,
    ...unknown.filter((s) => isBistSymbol(s)),
  ];
  const otherSyms = symbols.filter((s) => !isBistSymbol(s));

  const [bist, other] = await Promise.all([
    fetchBistLatest(bistSyms),
    fetchBiquoteLatest(otherSyms),
  ]);

  return { ...bist, ...other };
}
