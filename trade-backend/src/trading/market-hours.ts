const IST = 'Europe/Istanbul';
const NY = 'America/New_York';

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

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '';
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

function isForexWeekend(at: Date) {
  const { weekday } = zonedParts(at, 'UTC');
  return weekday === 6 || weekday === 0;
}

function isBistOpen(at: Date) {
  const p = zonedParts(at, IST);
  if (p.weekday === 0 || p.weekday === 6) return false;
  if (BIST_HOLIDAYS.has(p.dateKey)) return false;
  const mins = minutesSinceMidnight(p.hour, p.minute);
  return mins >= 10 * 60 && mins < 18 * 60;
}

function isUsOpen(at: Date) {
  const p = zonedParts(at, NY);
  if (p.weekday === 0 || p.weekday === 6) return false;
  const mins = minutesSinceMidnight(p.hour, p.minute);
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

export function getTradingBlockReason(
  symbol: string,
  isBistSymbol: (s: string) => boolean,
): string | null {
  const sym = symbol.toUpperCase();
  const now = new Date();

  if (isBistSymbol(sym)) {
    if (!isBistOpen(now)) return 'BIST şu an kapalı (10:00–18:00 İstanbul)';
    return null;
  }

  if (
    /^(BTC|ETH|XRP|SOL|DOGE|ADA|BNB|LTC|DOT|AVAX|LINK|MATIC|SHIB|UNI|ATOM)/.test(
      sym,
    )
  ) {
    return null;
  }

  if (/^[A-Z]{6}$/.test(sym) || sym === 'XAUUSD' || sym === 'XAGUSD') {
    if (isForexWeekend(now)) return 'Forex hafta sonu kapalı';
    return null;
  }

  if (!isUsOpen(now)) return 'ABD piyasası şu an kapalı';
  return null;
}
