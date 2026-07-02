const LOCAL_WS_BASE = 'ws://localhost:3001';

/** Derive wss/ws base from NEXT_PUBLIC_API_URL (strips trailing /api). */
function apiWsBase(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const u = new URL(apiUrl);
    const wsProtocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    const path = u.pathname.replace(/\/api\/?$/, '');
    return `${wsProtocol}//${u.host}${path}`;
  } catch {
    return null;
  }
}

/** Resolve a WebSocket URL for the given path (e.g. `/ws/ticks`). */
export function resolveWsUrl(path: string, envOverride?: string): string {
  if (envOverride) return envOverride;

  const fromApi = apiWsBase();
  if (fromApi) return `${fromApi}${path}`;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:3001${path}`;
  }

  return `${LOCAL_WS_BASE}${path}`;
}

export function resolveWsUrlWithToken(
  path: string,
  token: string,
  envOverride?: string,
): string {
  const url = new URL(resolveWsUrl(path, envOverride));
  url.searchParams.set('token', token);
  return url.toString();
}
