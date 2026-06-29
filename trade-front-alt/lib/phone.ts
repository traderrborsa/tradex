function stripPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  digits = digits.replace(/^0+/, '');

  const fiveIndex = digits.indexOf('5');
  if (fiveIndex === -1) return '';

  return digits.slice(fiveIndex, fiveIndex + 10);
}

export function normalizePhone(value: string): string {
  return stripPhoneDigits(value);
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return /^5\d{9}$/.test(digits);
}

export function formatPhoneInput(value: string): string {
  const digits = stripPhoneDigits(value);
  if (!digits) return '';

  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const part1 = digits.slice(6, 8);
  const part2 = digits.slice(8, 10);

  if (area.length < 3) return `(${area}`;
  if (!mid) return `(${area})`;
  if (!part1) return `(${area}) ${mid}`;
  if (!part2) return `(${area}) ${mid} ${part1}`;
  return `(${area}) ${mid} ${part1} ${part2}`;
}

export const PHONE_MASK_HINT = '(___) ___ __ __';
