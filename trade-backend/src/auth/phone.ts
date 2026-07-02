const DEFAULT_COUNTRY_DIAL = '90';

/**
 * Telefon numarasını E.164 biçimine getirir (ör. +905551234567).
 * - `+` ile başlıyorsa uluslararası kabul edilir.
 * - `+` yoksa eski TR davranışı: 10 haneli `5XXXXXXXXX` numarasının başına +90 eklenir.
 */
export function normalizePhone(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (!hasPlus) {
    // Eski TR numaraları için geriye dönük uyumluluk.
    digits = digits.replace(/^0+/, '');
    if (digits.startsWith(DEFAULT_COUNTRY_DIAL) && digits.length >= 12) {
      // zaten ülke kodu içeriyor
    } else if (/^5\d{9}$/.test(digits)) {
      digits = `${DEFAULT_COUNTRY_DIAL}${digits}`;
    }
  }

  if (!digits) return '';
  return `+${digits}`;
}

export function isValidPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  // E.164: + ve ardından 7-15 hane (ülke kodu dahil).
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}
