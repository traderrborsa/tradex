import { getToken } from './auth-storage';
import { resolveActiveBusinessId } from './business';

export type VerificationUpdatedMessage = {
  type: 'verification_updated';
  businessId: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  identityVerified?: boolean;
};

type ServerMessage =
  | { type: 'connected' }
  | { type: 'pong' }
  | VerificationUpdatedMessage;

const WS_URL =
  process.env.NEXT_PUBLIC_VERIFICATION_WS_URL ??
  'ws://localhost:3001/ws/verification';

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;
const listeners = new Set<(msg: VerificationUpdatedMessage) => void>();

function getWsUrl(token: string) {
  if (typeof window === 'undefined') return WS_URL;
  const env = process.env.NEXT_PUBLIC_VERIFICATION_WS_URL;
  const base =
    env ??
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws/verification`;
  const url = new URL(base);
  url.searchParams.set('token', token);
  return url.toString();
}

function dispatchVerification(msg: VerificationUpdatedMessage) {
  const activeBusinessId = resolveActiveBusinessId();
  if (msg.businessId !== activeBusinessId) return;
  for (const listener of listeners) listener(msg);
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
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === 'verification_updated') {
          dispatchVerification(msg);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      stopPing();
      if (socket === ws) socket = null;
      if (!settled) finish(() => reject(new Error('Verification WS bağlantı hatası')));
      if (refCount > 0) scheduleReconnect(token);
    };

    ws.onerror = () => {
      if (!settled) finish(() => reject(new Error('Verification WS bağlantı hatası')));
    };
  });

  return connectPromise;
}

export function subscribeVerificationUpdates(
  listener: (msg: VerificationUpdatedMessage) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function connectVerification(token: string): () => void {
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
