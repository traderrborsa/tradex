export function formatMoney(
  value: number,
  opts?: { fractionDigits?: number; dynamic?: boolean },
): string {
  let fractionDigits = opts?.fractionDigits;
  if (fractionDigits == null) {
    if (opts?.dynamic) {
      const abs = Math.abs(value);
      if (!Number.isFinite(value) || value === 0) fractionDigits = 2;
      else if (abs >= 1) fractionDigits = 2;
      else if (abs >= 0.01) fractionDigits = 4;
      else if (abs >= 0.0001) fractionDigits = 6;
      else fractionDigits = 8;
    } else {
      fractionDigits = 2;
    }
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
