import { resolveWsUrl } from './ws-url';

export type PanelVerificationChange = 'documents' | 'email' | 'phone' | 'identity';

export type PanelVerificationChangedMessage = {
  type: 'member_verification_changed';
  userId: string;
  businessId: string;
  change?: PanelVerificationChange;
};

type RefreshHandler = (msg: PanelVerificationChangedMessage) => void;

type ServerMessage =
  | { type: 'connected' }
  | PanelVerificationChangedMessage;

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<RefreshHandler>();
let refCount = 0;

function getWsUrl() {
  return resolveWsUrl(
    '/ws/panel/verification',
    process.env.NEXT_PUBLIC_PANEL_VERIFICATION_WS_URL,
  );
}

function dispatch(msg: PanelVerificationChangedMessage) {
  handlers.forEach((h) => h(msg));
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
        if (msg.type === 'member_verification_changed') dispatch(msg);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (socket === ws) socket = null;
      if (!settled) finish(() => reject(new Error('Panel doğrulama WS hatası')));
      if (refCount > 0) scheduleReconnect();
    };

    ws.onerror = () => {
      if (!settled) finish(() => reject(new Error('Panel doğrulama WS hatası')));
    };
  });

  return connectPromise;
}

export function subscribePanelVerificationRefresh(
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
