import { getToken } from './auth-storage';
import { resolveWsUrlWithToken } from './ws-url';

export interface MemberNotificationMessage {
  id: string;
  userId: string;
  businessId: string | null;
  type: string;
  title: string;
  message: string;
  href: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}

type ServerMessage =
  | { type: 'connected' }
  | { type: 'pong' }
  | { type: 'notification'; notification: MemberNotificationMessage };

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;
const listeners = new Set<(notification: MemberNotificationMessage) => void>();

function getWsUrl(token: string) {
  return resolveWsUrlWithToken(
    '/ws/notifications',
    token,
    process.env.NEXT_PUBLIC_NOTIFICATIONS_WS_URL,
  );
}

function dispatch(notification: MemberNotificationMessage) {
  for (const listener of listeners) listener(notification);
}

function scheduleReconnect(token: string) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (refCount > 0) void ensureSocket(token).catch(() => scheduleReconnect(token));
  }, 2000);
}

function startPing() {
  if (pingTimer) clearInterval(pingTimer);
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
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === 'notification') {
          dispatch(msg.notification);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      stopPing();
      if (socket === ws) socket = null;
      if (!settled) finish(() => reject(new Error('Notifications WS bağlantı hatası')));
      if (refCount > 0) scheduleReconnect(token);
    };

    ws.onerror = () => {
      if (!settled) finish(() => reject(new Error('Notifications WS bağlantı hatası')));
    };
  });

  return connectPromise;
}

export function subscribeNotifications(
  listener: (notification: MemberNotificationMessage) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function connectNotifications(token: string): () => void {
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

export function getNotificationsToken() {
  return getToken();
}
