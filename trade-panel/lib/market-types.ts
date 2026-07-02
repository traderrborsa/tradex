export interface Tick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  dayDiffPercent?: number;
  stale?: boolean;
}
