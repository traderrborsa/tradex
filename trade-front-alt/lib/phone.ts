export interface CountryDial {
  iso: string;
  name: string;
  /** Ülke kodu, başında + olmadan (ör. "90"). */
  dial: string;
  flag: string;
}

/** Kayıt formunda gösterilen ülke alan kodları. */
export const COUNTRY_DIALS: CountryDial[] = [
  { iso: 'TR', name: 'Türkiye', dial: '90', flag: '🇹🇷' },
  { iso: 'DE', name: 'Almanya', dial: '49', flag: '🇩🇪' },
  { iso: 'GB', name: 'Birleşik Krallık', dial: '44', flag: '🇬🇧' },
  { iso: 'US', name: 'ABD / Kanada', dial: '1', flag: '🇺🇸' },
  { iso: 'NL', name: 'Hollanda', dial: '31', flag: '🇳🇱' },
  { iso: 'FR', name: 'Fransa', dial: '33', flag: '🇫🇷' },
  { iso: 'AT', name: 'Avusturya', dial: '43', flag: '🇦🇹' },
  { iso: 'BE', name: 'Belçika', dial: '32', flag: '🇧🇪' },
  { iso: 'CH', name: 'İsviçre', dial: '41', flag: '🇨🇭' },
  { iso: 'AZ', name: 'Azerbaycan', dial: '994', flag: '🇦🇿' },
  { iso: 'RU', name: 'Rusya', dial: '7', flag: '🇷🇺' },
  { iso: 'AE', name: 'B.A.E.', dial: '971', flag: '🇦🇪' },
  { iso: 'SA', name: 'Suudi Arabistan', dial: '966', flag: '🇸🇦' },
];

export const DEFAULT_DIAL = '90';

export function findCountryByDial(dial: string): CountryDial | undefined {
  return COUNTRY_DIALS.find((c) => c.dial === dial);
}

/** Girişten yalnızca rakamları alır, baştaki sıfırları atar. */
export function nationalDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

/** Ülke kodu + ulusal numaradan E.164 üretir (ör. +905551234567). */
export function toE164(dial: string, national: string): string {
  const digits = nationalDigits(national);
  if (!digits) return '';
  return `+${dial}${digits}`;
}

/** Ulusal numara seçili ülke için geçerli mi? */
export function isValidNationalNumber(dial: string, national: string): boolean {
  const digits = nationalDigits(national);
  if (!digits) return false;
  if (dial === DEFAULT_DIAL) return /^5\d{9}$/.test(digits);
  return digits.length >= 6 && digits.length <= 14;
}

/** Herhangi bir telefon girdisini E.164'e normalleştirir. */
export function normalizePhone(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (!hasPlus) {
    digits = digits.replace(/^0+/, '');
    if (/^5\d{9}$/.test(digits)) digits = `${DEFAULT_DIAL}${digits}`;
  }
  return digits ? `+${digits}` : '';
}

/** Tam E.164 numarası geçerli mi? */
export function isValidPhone(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(normalizePhone(value));
}

/** Ulusal numarayı okunaklı gruplara böler. */
export function formatNationalInput(dial: string, value: string): string {
  const digits = nationalDigits(value).slice(0, 14);
  if (dial === DEFAULT_DIAL) {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 8);
    const d = digits.slice(8, 10);
    let out = a;
    if (b) out += ` ${b}`;
    if (c) out += ` ${c}`;
    if (d) out += ` ${d}`;
    return out;
  }
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

/** Geriye dönük uyumluluk için korunuyor (TR maskesi). */
export function formatPhoneInput(value: string): string {
  return formatNationalInput(DEFAULT_DIAL, value);
}

export const PHONE_MASK_HINT = '5XX XXX XX XX';
