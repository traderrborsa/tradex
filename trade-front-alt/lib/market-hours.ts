import { parseSymbolVisual } from './symbol-assets';

export type MarketKind = 'bist' | 'forex' | 'crypto' | 'commodity' | 'us';

export interface MarketStatus {
  open: boolean;
  kind: MarketKind;
  label: string;
  reason?: string;
}

const IST = 'Europe/Istanbul';
const NY = 'America/New_York';

/** BIST’in kapalı olduğu resmi tatiller (YYYY-MM-DD, İstanbul) */
const BIST_HOLIDAYS = new Set([
  '2026-01-01',
  '2026-04-23',
  '2026-05-01',
  '2026-05-19',
  '2026-07-15',
  '2026-08-30',
  '2026-10-29',
  '2026-03-30',
  '2026-03-31',
  '2026-04-01',
  '2026-06-06',
  '2026-06-07',
  '2026-06-08',
  '2026-06-09',
]);

function zonedParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[get('weekday')] ?? 0,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function minutesSinceMidnight(hour: number, minute: number) {
  return hour * 60 + minute;
}

export function getMarketKind(symbol: string): MarketKind {
  const visual = parseSymbolVisual(symbol);
  switch (visual.type) {
    case 'bist':
    case 'bist-index':
      return 'bist';
    case 'crypto':
      return 'crypto';
    case 'commodity':
      return 'commodity';
    case 'stock':
      return 'us';
    default:
      return 'forex';
  }
}

function bistStatus(at: Date): MarketStatus {
  const { weekday, hour, minute, dateKey } = zonedParts(at, IST);

  if (BIST_HOLIDAYS.has(dateKey)) {
    return {
      open: false,
      kind: 'bist',
      label: 'BIST kapalı',
      reason: 'Resmi tatil',
    };
  }

  if (weekday === 0 || weekday === 6) {
    return {
      open: false,
      kind: 'bist',
      label: 'BIST kapalı',
      reason: 'Hafta sonu',
    };
  }

  const now = minutesSinceMidnight(hour, minute);
  const openAt = 10 * 60;
  const closeAt = 18 * 60;

  if (now < openAt) {
    return {
      open: false,
      kind: 'bist',
      label: 'BIST kapalı',
      reason: 'Seans 10:00’da açılır',
    };
  }

  if (now >= closeAt) {
    return {
      open: false,
      kind: 'bist',
      label: 'BIST kapalı',
      reason: 'Seans 18:00’da kapandı',
    };
  }

  return { open: true, kind: 'bist', label: 'BIST açık' };
}

function forexLikeStatus(at: Date, kind: 'forex' | 'commodity'): MarketStatus {
  const { weekday } = zonedParts(at, IST);
  const label = kind === 'commodity' ? 'Emtia' : 'Forex';

  if (weekday === 6) {
    return {
      open: false,
      kind,
      label: `${label} kapalı`,
      reason: 'Cumartesi',
    };
  }

  if (weekday === 0) {
    return {
      open: false,
      kind,
      label: `${label} kapalı`,
      reason: 'Pazar',
    };
  }

  return { open: true, kind, label: `${label} açık` };
}

function usStatus(at: Date): MarketStatus {
  const { weekday, hour, minute } = zonedParts(at, NY);

  if (weekday === 0 || weekday === 6) {
    return {
      open: false,
      kind: 'us',
      label: 'ABD kapalı',
      reason: 'Hafta sonu',
    };
  }

  const now = minutesSinceMidnight(hour, minute);
  const openAt = 9 * 60 + 30;
  const closeAt = 16 * 60;

  if (now < openAt) {
    return {
      open: false,
      kind: 'us',
      label: 'ABD kapalı',
      reason: 'Seans 09:30 ET’de açılır',
    };
  }

  if (now >= closeAt) {
    return {
      open: false,
      kind: 'us',
      label: 'ABD kapalı',
      reason: 'Seans 16:00 ET’de kapandı',
    };
  }

  return { open: true, kind: 'us', label: 'ABD açık' };
}

export function getMarketStatus(symbol: string, at = new Date()): MarketStatus {
  const kind = getMarketKind(symbol);

  switch (kind) {
    case 'bist':
      return bistStatus(at);
    case 'crypto':
      return { open: true, kind, label: 'Kripto — 7/24' };
    case 'forex':
      return forexLikeStatus(at, 'forex');
    case 'commodity':
      return forexLikeStatus(at, 'commodity');
    case 'us':
      return usStatus(at);
  }
}

export function isMarketOpen(symbol: string, at = new Date()): boolean {
  return getMarketStatus(symbol, at).open;
}

export function getTradingBlockReason(symbol: string, at = new Date()): string | null {
  const status = getMarketStatus(symbol, at);
  if (status.open) return null;
  return status.reason ?? 'Piyasa kapalı';
}
