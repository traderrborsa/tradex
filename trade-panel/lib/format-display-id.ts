export function formatDisplayId(displayId: number | null | undefined, fallbackId: string) {
  if (displayId != null) return String(displayId);
  return fallbackId.slice(-9);
}
