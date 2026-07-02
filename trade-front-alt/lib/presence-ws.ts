import { getToken } from './auth-storage';
import { resolveWsUrlWithToken } from './ws-url';

type ServerMessage = { type: 'connected' } | { type: 'pong' };

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

function getWsUrl(token: string) {
  return resolveWsUrlWithToken(
    '/ws/presence',
    token,
    process.env.NEXT_PUBLIC_PRESENCE_WS_URL,
  );
}

function scheduleReconnect(token: string) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (refCount > 0) void ensureSocket(token).catch(() => scheduleReconnect(token));
  }, 2000);
}

function startPing() {
  stopPing();
  pingTimer = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'ping' }));
    }
  }, 30_000);
}

function stopPing() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function ensureSocket(token: string): Promise<WebSocket> {
  if (socket?.readyState === WebSocket.OPEN) {
    return Promise.resolve(socket);
  }
  if (connectPromise) return connectPromise;

  connectPromise = new Promise((resolve, reject) => {
    const ws = new WebSocket(getWsUrl(token));
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      connectPromise = null;
      fn();
    };

    ws.onopen = () => {
      socket = ws;
      startPing();
      finish(() => resolve(ws));
    };

    ws.onmessage = (event) => {
      try {
        JSON.parse(event.data as string) as ServerMessage;
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      stopPing();
      if (socket === ws) socket = null;
      if (!settled) finish(() => reject(new Error('Presence WS bağlantı hatası')));
      if (refCount > 0) scheduleReconnect(token);
    };

    ws.onerror = () => {
      if (!settled) finish(() => reject(new Error('Presence WS bağlantı hatası')));
    };
  });

  return connectPromise;
}

export function connectPresence(token: string): () => void {
  refCount += 1;
  void ensureSocket(token).catch(() => scheduleReconnect(token));

  return () => {
    refCount -= 1;
    if (refCount <= 0) {
      refCount = 0;
      stopPing();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
      connectPromise = null;
    }
  };
}
