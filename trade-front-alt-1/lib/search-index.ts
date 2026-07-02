import type { SymbolInfo } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const BIST_INDICES = [
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
] as const;

let loadPromise: Promise<void> | null = null;
let biquoteEntries: SymbolInfo[] = [];
let bistEntries: SymbolInfo[] = [];

function toSymbolInfo(item: {
  name: string;
  description?: string;
  type?: string;
  exchange?: string;
}): SymbolInfo {
  return {
    name: item.name.toUpperCase(),
    description: item.description ?? item.name,
    type: item.type ?? 'Forex',
    exchange: item.exchange ?? 'FOREX',
    source: 'biquote',
  };
}

function searchResultScore(query: string, name: string): number {
  const q = query.trim().toUpperCase();
  const sym = name.toUpperCase();
  if (sym === q) return 0;
  if (sym.startsWith(q)) return 1;
  return 2;
}

function mergeResults(
  query: string,
  items: SymbolInfo[],
): SymbolInfo[] {
  const seen = new Set<string>();
  const merged: SymbolInfo[] = [];

  for (const item of items) {
    const key = item.name.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...item, name: key });
  }

  return merged.sort(
    (a, b) =>
      searchResultScore(query, a.name) - searchResultScore(query, b.name),
  );
}

function searchBistLocal(query: string): SymbolInfo[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return bistEntries.filter((item) => item.name.startsWith(q));
}

function searchBiquoteLocal(query: string): SymbolInfo[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const prefix: SymbolInfo[] = [];
  const contains: SymbolInfo[] = [];

  for (const item of biquoteEntries) {
    const name = item.name.toUpperCase();
    if (name.startsWith(q)) prefix.push(item);
    else if (name.includes(q)) contains.push(item);
  }

  return [...prefix, ...contains];
}

async function searchBiquoteRemote(query: string): Promise<SymbolInfo[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `${API_BASE}/market/symbols/search?q=${encodeURIComponent(q)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as Array<{
      name: string;
      description?: string;
      type?: string;
      exchange?: string;
    }>;

    return data.map(toSymbolInfo);
  } catch {
    return [];
  }
}

export async function ensureSearchIndexLoaded(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const [symbolsRes, companiesRes] = await Promise.all([
        fetch(`${API_BASE}/market/symbols`, { cache: 'no-store' }),
        fetch(`${API_BASE}/bist/companies`, { cache: 'no-store' }),
      ]);

      if (symbolsRes.ok) {
        const symbols = (await symbolsRes.json()) as Array<{
          name: string;
          description?: string;
          type?: string;
          exchange?: string;
        }>;
        biquoteEntries = symbols.map(toSymbolInfo);
      } else {
        biquoteEntries = [];
      }

      const indices: SymbolInfo[] = BIST_INDICES.map((ticker) => ({
        name: ticker,
        description: 'BIST Endeks',
        type: 'Index',
        exchange: 'BIST',
        source: 'borsapy',
      }));

      let companies: SymbolInfo[] = [];
      if (companiesRes.ok) {
        const data = (await companiesRes.json()) as {
          companies?: { ticker: string; name?: string }[];
        };
        companies = (data.companies ?? []).map((row) => ({
          name: row.ticker.toUpperCase(),
          description: row.name ?? row.ticker,
          type: 'Stock',
          exchange: 'BIST',
          source: 'borsapy',
        }));
      }

      const seen = new Set<string>();
      bistEntries = [];
      for (const entry of [...indices, ...companies]) {
        if (seen.has(entry.name)) continue;
        seen.add(entry.name);
        bistEntries.push(entry);
      }
    } catch {
      biquoteEntries = [];
      bistEntries = BIST_INDICES.map((ticker) => ({
        name: ticker,
        description: 'BIST Endeks',
        type: 'Index',
        exchange: 'BIST',
        source: 'borsapy',
      }));
    }
  })();

  return loadPromise;
}

export async function searchTradableSymbols(q: string): Promise<SymbolInfo[]> {
  const query = q.trim();
  if (!query) return [];

  await ensureSearchIndexLoaded();

  const local = mergeResults(query, [
    ...searchBiquoteLocal(query),
    ...searchBistLocal(query),
  ]);

  if (local.length >= 12) return local;

  const remote = await searchBiquoteRemote(query);
  return mergeResults(query, [...local, ...remote, ...searchBistLocal(query)]);
}
