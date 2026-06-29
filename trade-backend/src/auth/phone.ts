export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return /^5\d{9}$/.test(digits);
}
