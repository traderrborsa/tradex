import { Injectable, Logger, NotFoundException } from '@nestjs/common';

const BIQUOTE_BASE = 'https://biquote.io/api';

interface OhlcBar {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  isOpen?: boolean;
}

interface OhlcResponse {
  symbol: string;
  bars: OhlcBar[];
}

type TickRecord = Record<string, unknown>;

interface SymbolRecord {
  name: string;
  description?: string;
  type?: string;
  exchange?: string;
  source?: string;
}

interface BrowsePage {
  items: SymbolRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type { BrowsePage, SymbolRecord };

const FOREX_BROWSE_TYPES = new Set(['forex', 'crypto', 'commodity', 'cfd']);

@Injectable()
export class BiquoteService {
  private readonly logger = new Logger(BiquoteService.name);
  private symbolCatalog: SymbolRecord[] | null = null;
  private symbolCatalogLoadedAt = 0;
  private readonly symbolCatalogTtlMs = 60 * 60 * 1000;

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(`${BIQUOTE_BASE}${path}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.status === 404) {
        throw new NotFoundException(
          body.message ?? `Resource not found: ${path}`,
        );
      }
      throw new Error(body.message ?? `BiQuote API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private calcDayChangePercent(bars: OhlcBar[]): number {
    if (bars.length < 2) return 0;
    const current = bars[0];
    const previous = bars[1];
    if (!current || !previous || previous.close <= 0) return 0;
    return ((current.close - previous.close) / previous.close) * 100;
  }

  private async tickFromOhlc(symbol: string): Promise<TickRecord> {
    const sym = symbol.toUpperCase();
    const [hourly, daily] = await Promise.all([
      this.fetchJson<OhlcResponse>(
        `/${encodeURIComponent(sym)}/ohlc?interval=1h&limit=2`,
      ),
      this.fetchJson<OhlcResponse>(
        `/${encodeURIComponent(sym)}/ohlc?interval=1d&limit=3`,
      ),
    ]);

    const priceBar =
      hourly.bars?.find((b) => !b.isOpen) ?? hourly.bars?.[0] ?? daily.bars?.[0];
    if (!priceBar) {
      throw new NotFoundException(`No tick data available for '${sym}'`);
    }

    const dayDiffPercent = this.calcDayChangePercent(daily.bars ?? []);

    this.logger.debug(`${sym}: canlı tick yok, OHLC snapshot kullanılıyor`);

    return {
      symbol: sym,
      bid: 0,
      ask: 0,
      last: priceBar.close,
      high: priceBar.high,
      low: priceBar.low,
      timestamp: priceBar.openTime,
      source: 'ohlc-snapshot',
      dayDiffPercent,
      stale: true,
    };
  }

  async getTick(symbol: string): Promise<TickRecord> {
    const sym = symbol.toUpperCase();

    try {
      return await this.fetchJson<TickRecord>(`/${encodeURIComponent(sym)}`);
    } catch (err) {
      if (!(err instanceof NotFoundException)) throw err;
    }

    try {
      const latest = await this.fetchJson<Record<string, TickRecord>>(
        `/latest?symbols=${encodeURIComponent(sym)}`,
      );
      const tick = latest[sym];
      if (tick) return tick;
    } catch {
      /* latest boş veya hata — OHLC'ye düş */
    }

    return this.tickFromOhlc(sym);
  }

  getOhlc(
    symbol: string,
    interval = '1h',
    limit = 200,
    from?: string,
    to?: string,
  ) {
    const params = new URLSearchParams({ interval, limit: String(limit) });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.fetchJson(
      `/${encodeURIComponent(symbol.toUpperCase())}/ohlc?${params}`,
    );
  }

  searchSymbols(q: string) {
    return this.fetchJson(
      `/symbols/search?q=${encodeURIComponent(q)}`,
    );
  }

  getSymbols(type?: string, exchange?: string) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (exchange) params.set('exchange', exchange);
    const qs = params.toString();
    return this.fetchJson(`/symbols${qs ? `?${qs}` : ''}`);
  }

  getActiveSymbols() {
    return this.fetchJson('/active');
  }

  private async getSymbolCatalog(): Promise<SymbolRecord[]> {
    const now = Date.now();
    if (
      this.symbolCatalog &&
      now - this.symbolCatalogLoadedAt < this.symbolCatalogTtlMs
    ) {
      return this.symbolCatalog;
    }

    const raw = await this.fetchJson<SymbolRecord[]>('/symbols');
    this.symbolCatalog = raw.map((item) => ({
      ...item,
      name: item.name.toUpperCase(),
      description: item.description ?? item.name,
      type: item.type ?? 'Forex',
      exchange: item.exchange ?? 'FOREX',
    }));
    this.symbolCatalogLoadedAt = now;
    return this.symbolCatalog;
  }

  private filterByCategory(
    category: 'forex' | 'us',
    items: SymbolRecord[],
  ): SymbolRecord[] {
    if (category === 'forex') {
      return items.filter((item) =>
        FOREX_BROWSE_TYPES.has((item.type ?? '').toLowerCase()),
      );
    }

    return items.filter(
      (item) => (item.type ?? '').toLowerCase() === 'stock',
    );
  }

  async browseSymbols(
    category: 'forex' | 'us',
    page = 1,
    limit = 20,
  ): Promise<BrowsePage> {
    const catalog = await this.getSymbolCatalog();
    const filtered = this.filterByCategory(category, catalog);
    const total = filtered.length;
    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    const safePage = Math.min(Math.max(page, 1), Math.max(pages, 1));
    const start = (safePage - 1) * limit;

    return {
      items: filtered.slice(start, start + limit),
      total,
      page: safePage,
      limit,
      pages,
    };
  }

  async getLatest(symbols: string[]): Promise<Record<string, TickRecord>> {
    const normalized = symbols.map((s) => s.toUpperCase());
    if (normalized.length === 0) return {};

    const params = normalized
      .map((s) => `symbols=${encodeURIComponent(s)}`)
      .join('&');

    let out: Record<string, TickRecord> = {};
    try {
      out = await this.fetchJson<Record<string, TickRecord>>(`/latest?${params}`);
    } catch {
      out = {};
    }

    const missing = normalized.filter((sym) => !out[sym]);
    if (missing.length === 0) return out;

    const filled = await Promise.all(
      missing.map(async (sym) => {
        try {
          const tick = await this.getTick(sym);
          return [sym, tick] as const;
        } catch {
          return null;
        }
      }),
    );

    for (const entry of filled) {
      if (entry) out[entry[0]] = entry[1];
    }

    return out;
  }
}
