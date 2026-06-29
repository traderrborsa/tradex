export function normalizeTcKimlikNo(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidTcKimlikNo(value: string): boolean {
  const tc = normalizeTcKimlikNo(value);
  if (!/^[1-9]\d{10}$/.test(tc)) return false;

  const digits = [...tc].map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
  if (digit10 !== digits[9]) return false;

  const digit11 =
    digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;
  return digit11 === digits[10];
}
