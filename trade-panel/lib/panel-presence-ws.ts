type PresenceHandler = () => void;

type ServerMessage = { type: 'connected' } | { type: 'presence_changed' };

const WS_URL =
  process.env.NEXT_PUBLIC_PANEL_PRESENCE_WS_URL ??
  'ws://localhost:3001/ws/panel/presence';

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<PresenceHandler>();
let refCount = 0;

function getWsUrl() {
  if (typeof window === 'undefined') return WS_URL;
  const env = process.env.NEXT_PUBLIC_PANEL_PRESENCE_WS_URL;
  if (env) return env;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001/ws/panel/presence`;
}

function dispatchPresenceChanged() {
  handlers.forEach((h) => h());
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (refCount > 0) void ensureSocket().catch(() => scheduleReconnect());
  }, 2000);
}

function ensureSocket(): Promise<WebSocket> {
  if (socket?.readyState === WebSocket.OPEN) {
    return Promise.resolve(socket);
  }
  if (connectPromise) return connectPromise;

  connectPromise = new Promise((resolve, reject) => {
    const ws = new WebSocket(getWsUrl());
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      connectPromise = null;
      fn();
    };

    ws.onopen = () => {
      socket = ws;
      finish(() => resolve(ws));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === 'presence_changed') dispatchPresenceChanged();
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (socket === ws) socket = null;
      if (!settled) finish(() => reject(new Error('Presence WS bağlantı hatası')));
      if (refCount > 0) scheduleReconnect();
    };

    ws.onerror = () => {
      if (!settled) finish(() => reject(new Error('Presence WS bağlantı hatası')));
    };
  });

  return connectPromise;
}

export function subscribePanelPresence(onChange: PresenceHandler): () => void {
  handlers.add(onChange);
  refCount += 1;
  void ensureSocket().catch(() => scheduleReconnect());

  return () => {
    handlers.delete(onChange);
    refCount -= 1;
    if (refCount <= 0) {
      refCount = 0;
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
