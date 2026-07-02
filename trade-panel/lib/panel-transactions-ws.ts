import { resolveWsUrl } from './ws-url';

type RefreshHandler = () => void;

type ServerMessage =
  | { type: 'connected' }
  | { type: 'transactions_changed' };

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<RefreshHandler>();
let refCount = 0;

function getWsUrl() {
  return resolveWsUrl(
    '/ws/panel/transactions',
    process.env.NEXT_PUBLIC_PANEL_WS_URL,
  );
}

function dispatchRefresh() {
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
        if (msg.type === 'transactions_changed') dispatchRefresh();
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (socket === ws) socket = null;
      if (!settled) finish(() => reject(new Error('Panel WS bağlantı hatası')));
      if (refCount > 0) scheduleReconnect();
    };

    ws.onerror = () => {
      if (!settled) finish(() => reject(new Error('Panel WS bağlantı hatası')));
    };
  });

  return connectPromise;
}

export function subscribePanelTransactionsRefresh(
  onRefresh: RefreshHandler,
): () => void {
  handlers.add(onRefresh);
  refCount += 1;
  void ensureSocket().catch(() => scheduleReconnect());

  return () => {
    handlers.delete(onRefresh);
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
