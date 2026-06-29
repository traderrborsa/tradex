export function formatMoney(
  value: number,
  opts?: { fractionDigits?: number },
): string {
  const fractionDigits = opts?.fractionDigits ?? 2;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
