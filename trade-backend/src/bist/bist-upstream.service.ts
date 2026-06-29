import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import WebSocket from 'ws';
import type { TickPayload } from '../biquote/biquote-upstream.service';

const BORSA_PY_WS =
  process.env.BORSA_PY_WS_URL ?? 'ws://127.0.0.1:8000/ws/ticks';

@Injectable()
export class BistUpstreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BistUpstreamService.name);
  private readonly refCounts = new Map<string, number>();
  private readonly tickListeners = new Set<(tick: TickPayload) => void>();
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  onTick(listener: (tick: TickPayload) => void) {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  private emit(tick: TickPayload) {
    for (const listener of this.tickListeners) {
      listener(tick);
    }
  }

  acquireSymbol(symbol: string) {
    const sym = symbol.toUpperCase();
    const count = this.refCounts.get(sym) ?? 0;
    this.refCounts.set(sym, count + 1);
    if (count === 0) {
      this.logger.debug(`BIST stream subscribe: ${sym}`);
      this.sendSubscribe(sym);
    }
  }

  releaseSymbol(symbol: string) {
    const sym = symbol.toUpperCase();
    const count = (this.refCounts.get(sym) ?? 1) - 1;
    if (count > 0) {
      this.refCounts.set(sym, count);
      return;
    }
    this.refCounts.delete(sym);
    this.logger.debug(`BIST stream unsubscribe: ${sym}`);
  }

  isActive() {
    return (
      this.ws?.readyState === WebSocket.OPEN && this.refCounts.size > 0
    );
  }

  private connect() {
    if (this.stopped) return;

    const ws = new WebSocket(BORSA_PY_WS);
    this.ws = ws;

    ws.on('open', () => {
      this.logger.log('Borsapy WebSocket bağlandı');
      const symbols = [...this.refCounts.keys()];
      if (symbols.length > 0) {
        ws.send(
          JSON.stringify({ action: 'subscribe_many', symbols }),
        );
      }
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          data?: TickPayload;
        };
        if (msg.type === 'tick' && msg.data) {
          this.emit(msg.data);
        }
      } catch {
        /* ignore */
      }
    });

    ws.on('close', () => {
      this.ws = null;
      if (!this.stopped) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2000);
      }
    });

    ws.on('error', (err) => {
      this.logger.debug(`Borsapy WS hata: ${err.message}`);
    });
  }

  private sendSubscribe(symbol: string) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ action: 'subscribe', symbol }));
  }
}
