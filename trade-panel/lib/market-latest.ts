import { ensureBistSymbolsLoaded, isBistSymbol } from './bist-symbols';
import type { Tick } from './market-types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function normalizeTick(sym: string, raw: Record<string, unknown>): Tick | null {
  const bid = Number(raw.bid ?? raw.last);
  const ask = Number(raw.ask ?? raw.last);
  const last = Number(raw.last ?? bid);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0) return null;
  return {
    symbol: sym,
    bid,
    ask: Number.isFinite(ask) && ask > 0 ? ask : bid,
    last: Number.isFinite(last) ? last : bid,
    dayDiffPercent:
      raw.dayDiffPercent != null ? Number(raw.dayDiffPercent) : undefined,
  };
}

async function fetchBistLatest(
  symbols: string[],
): Promise<Record<string, Tick>> {
  if (symbols.length === 0) return {};
  const params = symbols
    .map((s) => `symbols=${encodeURIComponent(s.toUpperCase())}`)
    .join('&');
  const res = await fetch(`${API_BASE}/bist/latest?${params}`, {
    cache: 'no-store',
  });
  if (!res.ok) return {};
  const raw = (await res.json()) as Record<string, Record<string, unknown>>;
  const out: Record<string, Tick> = {};
  for (const sym of symbols) {
    const key = sym.toUpperCase();
    const t = normalizeTick(key, raw[key] ?? raw[sym] ?? {});
    if (t) out[key] = t;
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
  const res = await fetch(`${API_BASE}/market/latest?${params}`, {
    cache: 'no-store',
  });
  if (!res.ok) return {};
  const raw = (await res.json()) as Record<string, Record<string, unknown>>;
  const out: Record<string, Tick> = {};
  for (const sym of symbols) {
    const key = sym.toUpperCase();
    const t = normalizeTick(key, raw[key] ?? raw[sym] ?? {});
    if (t) out[key] = t;
  }
  return out;
}

export async function fetchMarketLatest(
  symbols: string[],
): Promise<Record<string, Tick>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter(
    Boolean,
  );
  if (unique.length === 0) return {};

  const knownBist = unique.filter((s) => isBistSymbol(s));
  const unknown = unique.filter((s) => !isBistSymbol(s));

  if (unknown.length > 0) {
    await ensureBistSymbolsLoaded();
  }

  const bistSyms = [
    ...knownBist,
    ...unknown.filter((s) => isBistSymbol(s)),
  ];
  const otherSyms = unique.filter((s) => !isBistSymbol(s));

  const [bist, other] = await Promise.all([
    fetchBistLatest(bistSyms),
    fetchBiquoteLatest(otherSyms),
  ]);

  return { ...bist, ...other };
}
