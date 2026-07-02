import type { Tick } from './types';
import { resolveWsUrl } from './ws-url';

type TickHandler = (tick: Tick) => void;

type ServerMessage =
  | { type: 'connected'; upstream?: boolean }
  | { type: 'subscribed'; symbol: string }
  | { type: 'subscribed_many'; symbols: string[] }
  | { type: 'tick'; data: Tick }
  | { type: 'error'; message: string };

let socket: WebSocket | null = null;
let connectPromise: Promise<WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/** symbol → handler set */
const handlersBySymbol = new Map<string, Set<TickHandler>>();
/** symbol → ref count (kaç bileşen dinliyor) */
const refCounts = new Map<string, number>();

function getWsUrl() {
  return resolveWsUrl('/ws/ticks', process.env.NEXT_PUBLIC_WS_URL);
}

function activeSymbols(): string[] {
  return [...refCounts.entries()]
    .filter(([, n]) => n > 0)
    .map(([s]) => s);
}

function dispatchTick(tick: Tick) {
  const sym = tick.symbol?.toUpperCase();
  if (!sym) return;
  handlersBySymbol.get(sym)?.forEach((h) => h(tick));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const symbols = activeSymbols();
    if (symbols.length === 0) return;
    sendWhenReady({ action: 'subscribe_many', symbols });
  }, 2000);
}

function sendWhenReady(payload: object) {
  void ensureSocket()
    .then((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    })
    .catch(() => {
      scheduleReconnect();
    });
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
      const symbols = activeSymbols();
      if (symbols.length > 0) {
        ws.send(JSON.stringify({ action: 'subscribe_many', symbols }));
      }
      finish(() => resolve(ws));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === 'tick') dispatchTick(msg.data);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (socket === ws) socket = null;
      if (!settled) {
        finish(() => reject(new Error('WebSocket bağlantı hatası')));
      }
      if (activeSymbols().length > 0) scheduleReconnect();
    };

    ws.onerror = () => {
      if (!settled) {
        finish(() => reject(new Error('WebSocket bağlantı hatası')));
      }
    };
  });

  return connectPromise;
}

function acquireSymbol(sym: string) {
  const count = refCounts.get(sym) ?? 0;
  refCounts.set(sym, count + 1);

  if (count === 0) {
    sendWhenReady({ action: 'subscribe', symbol: sym });
  }
}

function releaseSymbol(sym: string) {
  const count = (refCounts.get(sym) ?? 1) - 1;
  if (count <= 0) {
    refCounts.delete(sym);
    handlersBySymbol.delete(sym);
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'unsubscribe', symbol: sym }));
    }
  } else {
    refCounts.set(sym, count);
  }

  if (refCounts.size === 0) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
    connectPromise = null;
  }
}

export function subscribeMarketTicks(
  symbol: string,
  onTick: TickHandler,
): () => void {
  const sym = symbol.toUpperCase();

  if (!handlersBySymbol.has(sym)) {
    handlersBySymbol.set(sym, new Set());
  }
  handlersBySymbol.get(sym)!.add(onTick);
  acquireSymbol(sym);

  return () => {
    handlersBySymbol.get(sym)?.delete(onTick);
    if (handlersBySymbol.get(sym)?.size === 0) {
      releaseSymbol(sym);
    }
  };
}

export function subscribeManySymbols(
  symbols: string[],
  onTick: TickHandler,
): () => void {
  const unsubs = symbols.map((s) => subscribeMarketTicks(s, onTick));
  return () => unsubs.forEach((u) => u());
}

export function isMarketWsOpen() {
  return socket?.readyState === WebSocket.OPEN;
}
