import { getToken } from './auth-storage';
import { resolveActiveBusinessId } from './business';
import { resolveWsUrlWithToken } from './ws-url';

export type PortfolioUpdatedMessage = {
  type: 'portfolio_updated';
  businessId: string;
  balance?: number;
};

export type TradingConfigUpdatedMessage = {
  type: 'trading_config_updated';
  businessId: string;
  effective: unknown;
  hasMemberOverrides?: boolean;
};

type ServerMessage =
  | { type: 'connected' }
  | { type: 'pong' }
  | PortfolioUpdatedMessage
  | TradingConfigUpdatedMessage;

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;
const listeners = new Set<(msg: PortfolioUpdatedMessage) => void>();
const configListeners = new Set<(msg: TradingConfigUpdatedMessage) => void>();

function getWsUrl(token: string) {
  return resolveWsUrlWithToken(
    '/ws/portfolio',
    token,
    process.env.NEXT_PUBLIC_PORTFOLIO_WS_URL,
  );
}

function dispatchPortfolio(msg: PortfolioUpdatedMessage) {
  const activeBusinessId = resolveActiveBusinessId();
  if (msg.businessId !== activeBusinessId) return;
  for (const listener of listeners) listener(msg);
}

function dispatchConfig(msg: TradingConfigUpdatedMessage) {
  const activeBusinessId = resolveActiveBusinessId();
  if (msg.businessId !== activeBusinessId) return;
  for (const listener of configListeners) listener(msg);
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
        if (msg.type === 'portfolio_updated') {
          dispatchPortfolio(msg);
        }
        if (msg.type === 'trading_config_updated') {
          dispatchConfig(msg);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      stopPing();
      if (socket === ws) socket = null;
      if (!settled) finish(() => reject(new Error('Portfolio WS bağlantı hatası')));
      if (refCount > 0) scheduleReconnect(token);
    };

    ws.onerror = () => {
      if (!settled) finish(() => reject(new Error('Portfolio WS bağlantı hatası')));
    };
  });

  return connectPromise;
}

export function subscribePortfolioUpdates(
  listener: (msg: PortfolioUpdatedMessage) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeTradingConfigUpdates(
  listener: (msg: TradingConfigUpdatedMessage) => void,
): () => void {
  configListeners.add(listener);
  return () => configListeners.delete(listener);
}

export function connectPortfolio(token: string): () => void {
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

export function getPortfolioToken() {
  return getToken();
}
