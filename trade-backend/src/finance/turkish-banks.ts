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

const byCode = new Map<string, string>(
  TURKISH_BANKS.map((b) => [b.code, b.name]),
);

export function isValidBankCode(code: string): code is TurkishBankCode {
  return byCode.has(code);
}

export function getBankName(code: string | null | undefined): string | null {
  if (!code) return null;
  return byCode.get(code) ?? null;
}
