export interface Tick {
  symbol: string;
  description?: string;
  bid: number;
  ask: number;
  last: number;
  volume?: number;
  time?: string;
  timestamp?: string;
  source?: string;
  type?: string;
  high?: number;
  low?: number;
  direction?: string;
  dayDiffPercent?: number;
  spread?: number;
  mid?: number;
  stale?: boolean;
}

export interface OhlcBar {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickVolume: number;
  isOpen: boolean;
}

export interface OhlcResponse {
  symbol: string;
  interval: string;
  bars: OhlcBar[];
}

export interface SymbolInfo {
  name: string;
  description: string;
  type: string;
  exchange: string;
  source?: string;
}

export interface SearchPageResult {
  items: SymbolInfo[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type ChartInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export const CHART_INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];
