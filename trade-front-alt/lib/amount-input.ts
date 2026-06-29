export function sanitizeIntegerAmountInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function parseIntegerAmount(value: string): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
