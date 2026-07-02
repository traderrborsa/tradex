/** Production front + panel origin'leri */
export const PRODUCTION_CORS_ORIGINS = [
  'https://tradex.traderborsa.com',
  'https://tradexpro.traderborsa.com',
  'https://primefx.traderborsa.com',
  'https://panel.traderborsa.com',
] as const;

/** Local geliştirme */
const LOCAL_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:4001',
  'http://localhost:4002',
] as const;

const DEFAULT_CORS_ORIGIN = [
  ...PRODUCTION_CORS_ORIGINS,
  ...LOCAL_CORS_ORIGINS,
].join(',');

/** Comma-separated CORS_ORIGIN env → trimmed origin list (HTTP + WebSocket). */
export function parseCorsOrigins(
  raw = process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
): string[] {
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export const CORS_ORIGINS = parseCorsOrigins();
