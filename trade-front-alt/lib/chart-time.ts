import type { Time, UTCTimestamp } from 'lightweight-charts';
import type { ChartInterval, OhlcBar } from './types';

const INTERVAL_SEC: Record<ChartInterval, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

const SYNTHETIC_BASE = 1_700_000_000;

function istanbulDateParts(iso: string): { year: number; month: number; day: number } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return { year: get('year'), month: get('month'), day: get('day') };
}

function istanbulHour(iso: string): number {
  const d = new Date(iso);
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul',
      hour: 'numeric',
      hour12: false,
    }).format(d),
  );
}

function formatIstanbulLabel(iso: string, interval: ChartInterval): string {
  const d = new Date(iso);
  if (interval === '1d') {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: 'short',
    }).format(d);
  }
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function filterBistIntradayBars(
  bars: OhlcBar[],
  interval: ChartInterval,
): OhlcBar[] {
  if (interval === '1d') return bars;
  return bars.filter((bar) => {
    const h = istanbulHour(bar.openTime);
    return h >= 10 && h <= 17;
  });
}

export interface ChartTimeContext {
  useSyntheticTime: boolean;
  timeForIndex: (index: number) => Time;
  tickLabelForTime: (time: Time) => string;
}

export function createChartTimeContext(
  bars: OhlcBar[],
  interval: ChartInterval,
  compactGaps: boolean,
): ChartTimeContext {
  const labels = new Map<number, string>();
  const step = INTERVAL_SEC[interval];

  if (!compactGaps || interval === '1d') {
    bars.forEach((bar) => {
      const t = barChartTime(bar, interval);
      if (typeof t === 'number') {
        labels.set(t, formatIstanbulLabel(bar.openTime, interval));
      }
    });
    return {
      useSyntheticTime: false,
      timeForIndex: (index) => barChartTime(bars[index], interval),
      tickLabelForTime: (time) =>
        typeof time === 'number' ? (labels.get(time) ?? '') : '',
    };
  }

  bars.forEach((bar, index) => {
    const synthetic = SYNTHETIC_BASE + index * step;
    labels.set(synthetic, formatIstanbulLabel(bar.openTime, interval));
  });

  return {
    useSyntheticTime: true,
    timeForIndex: (index) =>
      (SYNTHETIC_BASE + index * step) as UTCTimestamp,
    tickLabelForTime: (time) =>
      typeof time === 'number' ? (labels.get(time) ?? '') : '',
  };
}

export function barIndexForIso(bars: OhlcBar[], iso: string): number {
  if (bars.length === 0) return 0;
  const ts = new Date(iso).getTime();
  let idx = 0;
  for (let i = 0; i < bars.length; i++) {
    if (new Date(bars[i].openTime).getTime() <= ts) idx = i;
    else break;
  }
  return idx;
}

export function isoToChartTime(
  bars: OhlcBar[],
  iso: string,
  timeCtx: ChartTimeContext,
): Time {
  const idx = barIndexForIso(bars, iso);
  return timeCtx.timeForIndex(idx);
}

export function barChartTime(bar: OhlcBar, interval: ChartInterval): Time {
  if (interval === '1d') {
    const { year, month, day } = istanbulDateParts(bar.openTime);
    return { year, month, day };
  }
  return Math.floor(new Date(bar.openTime).getTime() / 1000) as UTCTimestamp;
}

export function sanitizeOhlcBar(bar: OhlcBar): OhlcBar {
  const open = Number.isFinite(bar.open) ? bar.open : 0;
  const close = Number.isFinite(bar.close) ? bar.close : open;
  const high = Math.max(open, close, bar.high, bar.low);
  const low = Math.min(open, close, bar.high, bar.low);
  return { ...bar, open, close, high, low };
}
