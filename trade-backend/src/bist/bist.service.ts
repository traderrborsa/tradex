import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

const BORSA_PY_URL =
  process.env.BORSA_PY_URL ?? 'http://localhost:8000';

export interface BistTick {
  symbol: string;
  description?: string;
  bid: number;
  ask: number;
  last: number;
  volume?: number;
  high?: number;
  low?: number;
  dayDiffPercent?: number;
  spread?: number;
  mid?: number;
  source?: string;
  type?: string;
  exchange?: string;
  currency?: string;
}

export interface BistOhlcBar {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickVolume: number;
  isOpen: boolean;
}

export interface BistOhlcResponse {
  symbol: string;
  interval: string;
  bars: BistOhlcBar[];
}

export interface BistSymbolInfo {
  name: string;
  description: string;
  type: string;
  exchange: string;
  source?: string;
}

export interface BistSearchPage {
  items: BistSymbolInfo[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

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

@Injectable()
export class BistService implements OnModuleInit {
  private readonly logger = new Logger(BistService.name);
  private readonly tickers = new Set<string>(BIST_WATCHLIST);
  private readonly companyNames = new Map<string, string>();

  async onModuleInit() {
    try {
      await this.loadCompanies();
    } catch (err) {
      this.logger.warn(`BIST şirket listesi yüklenemedi: ${err}`);
    }
  }

  isBistSymbol(symbol: string): boolean {
    const sym = symbol.toUpperCase();
    if (BIST_INDICES.has(sym) || sym.startsWith('XU')) return true;
    return this.tickers.has(sym);
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(`${BORSA_PY_URL}${path}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        detail?: string;
      };
      throw new Error(body.detail ?? `Borsapy service error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async loadCompanies() {
    const data = await this.fetchJson<{
      companies: { ticker: string; name?: string }[];
    }>('/companies');
    for (const c of data.companies) {
      if (!c.ticker) continue;
      const ticker = c.ticker.toUpperCase();
      this.tickers.add(ticker);
      this.companyNames.set(ticker, c.name?.trim() || ticker);
    }
    this.logger.log(`BIST sembol havuzu: ${this.tickers.size} sembol`);
  }

  private buildSymbolCatalog(): BistSymbolInfo[] {
    const items: BistSymbolInfo[] = [];
    const seen = new Set<string>();

    for (const ticker of [...BIST_INDICES].sort()) {
      seen.add(ticker);
      items.push({
        name: ticker,
        description: 'BIST Endeks',
        type: 'Index',
        exchange: 'BIST',
        source: 'borsapy',
      });
    }

    for (const ticker of [...this.tickers].sort()) {
      if (seen.has(ticker) || BIST_INDICES.has(ticker)) continue;
      seen.add(ticker);
      items.push({
        name: ticker,
        description: this.companyNames.get(ticker) ?? ticker,
        type: 'Stock',
        exchange: 'BIST',
        source: 'borsapy',
      });
    }

    return items;
  }

  getTick(symbol: string) {
    return this.fetchJson<BistTick>(
      `/quote/${encodeURIComponent(symbol.toUpperCase())}`,
    );
  }

  getOhlc(symbol: string, interval = '1h', limit = 300) {
    const params = new URLSearchParams({
      interval,
      limit: String(limit),
    });
    return this.fetchJson<BistOhlcResponse>(
      `/ohlc/${encodeURIComponent(symbol.toUpperCase())}?${params}`,
    );
  }

  searchSymbols(q: string, page = 1, limit = 20) {
    const params = new URLSearchParams({
      q,
      page: String(page),
      limit: String(limit),
    });
    return this.fetchJson<BistSearchPage>(`/search?${params}`);
  }

  async listSymbols(page = 1, limit = 20): Promise<BistSearchPage> {
    if (this.companyNames.size === 0) {
      try {
        await this.loadCompanies();
      } catch (err) {
        this.logger.warn(`BIST listesi için şirketler yüklenemedi: ${err}`);
      }
    }

    const catalog = this.buildSymbolCatalog();
    const total = catalog.length;
    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    const safePage = Math.min(Math.max(page, 1), Math.max(pages, 1));
    const start = (safePage - 1) * limit;

    return {
      items: catalog.slice(start, start + limit),
      total,
      page: safePage,
      limit,
      pages,
    };
  }

  getLatest(symbols: string[]) {
    if (symbols.length === 0) return Promise.resolve({});
    const list = symbols.map((s) => s.toUpperCase()).join(',');
    return this.fetchJson<Record<string, BistTick>>(
      `/latest?symbols=${encodeURIComponent(list)}`,
    );
  }

  getIndices() {
    return this.fetchJson<{ indices: string[] }>('/indices');
  }

  getCompanies() {
    return this.fetchJson<{
      count: number;
      companies: { ticker: string; name: string; city?: string }[];
    }>('/companies');
  }
}
