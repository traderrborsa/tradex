export const TURKISH_BANKS = [
  { code: 'akbank', name: 'Akbank' },
  { code: 'garanti', name: 'Garanti BBVA' },
  { code: 'isbank', name: 'Türkiye İş Bankası' },
  { code: 'ziraat', name: 'Ziraat Bankası' },
  { code: 'yapikredi', name: 'Yapı Kredi' },
  { code: 'halkbank', name: 'Halkbank' },
  { code: 'vakifbank', name: 'VakıfBank' },
  { code: 'qnb', name: 'QNB Finansbank' },
  { code: 'denizbank', name: 'DenizBank' },
  { code: 'teb', name: 'TEB' },
  { code: 'ing', name: 'ING' },
  { code: 'hsbc', name: 'HSBC' },
  { code: 'kuveytturk', name: 'Kuveyt Türk' },
  { code: 'albaraka', name: 'Albaraka Türk' },
  { code: 'odeabank', name: 'Odeabank' },
  { code: 'enpara', name: 'Enpara' },
  { code: 'fibabanka', name: 'Fibabanka' },
  { code: 'sekerbank', name: 'Şekerbank' },
] as const;

export type TurkishBankCode = (typeof TURKISH_BANKS)[number]['code'];

export const TURKISH_BANK_NAMES = TURKISH_BANKS.map((b) => b.name);

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('tr-TR').trim();
}

export function searchTurkishBankNames(query: string, limit = 8): string[] {
  const q = normalizeSearch(query);
  if (!q) return [];

  const scored = TURKISH_BANK_NAMES.map((name) => {
    const normalized = normalizeSearch(name);
    if (normalized === q) return { name, score: 0 };
    if (normalized.startsWith(q)) return { name, score: 1 };
    if (normalized.includes(q)) return { name, score: 2 };
    const words = normalized.split(/\s+/);
    if (words.some((w) => w.startsWith(q))) return { name, score: 3 };
    return null;
  }).filter((x): x is { name: (typeof TURKISH_BANKS)[number]['name']; score: number } => x != null);

  scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'tr'));
  return scored.slice(0, limit).map((x) => x.name);
}
