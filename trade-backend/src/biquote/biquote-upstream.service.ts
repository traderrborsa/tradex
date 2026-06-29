import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as signalR from '@microsoft/signalr';

export interface TickPayload {
  symbol: string;
  description?: string;
  bid: number;
  ask: number;
  last: number;
  volume?: number;
  time?: string;
  timestamp?: string;
  source?: string;
  type?: string;
  high?: number;
  low?: number;
  direction?: string;
  dayDiffPercent?: number;
  spread?: number;
  mid?: number;
}

const HUB_URL =
  process.env.BIQUOTE_HUB_URL ?? 'https://biquote.io/hubs/tick';

@Injectable()
export class BiquoteUpstreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BiquoteUpstreamService.name);
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private readonly refCounts = new Map<string, number>();
  private readonly tickListeners = new Set<(tick: TickPayload) => void>();

  onModuleInit() {
    void this.ensureConnected().catch((err) => {
      this.logger.warn(`Upstream bağlantısı ertelendi: ${err}`);
    });
  }

  onModuleDestroy() {
    void this.connection?.stop();
    this.connection = null;
    this.startPromise = null;
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

  private buildConnection() {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on('ReceiveTick', (tick: TickPayload) => this.emit(tick));

    conn.onreconnected(async () => {
      const symbols = [...this.refCounts.keys()];
      if (symbols.length > 0) {
        await conn.invoke('Subscribe', symbols);
        this.logger.log(`Yeniden abone: ${symbols.join(', ')}`);
      }
    });

    return conn;
  }

  async ensureConnected() {
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    const conn = this.connection;

    if (conn.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (
      conn.state === signalR.HubConnectionState.Connecting &&
      this.startPromise
    ) {
      await this.startPromise;
      return;
    }

    if (conn.state === signalR.HubConnectionState.Disconnected) {
      this.startPromise = conn.start().finally(() => {
        this.startPromise = null;
      });
      await this.startPromise;
      this.logger.log('BiQuote upstream bağlandı');
    }
  }

  async acquireSymbol(symbol: string) {
    const sym = symbol.toUpperCase();
    const count = this.refCounts.get(sym) ?? 0;
    this.refCounts.set(sym, count + 1);

    if (count > 0) return;

    await this.ensureConnected();
    await this.connection!.invoke('Subscribe', [sym]);
    this.logger.debug(`Upstream subscribe: ${sym}`);
  }

  async releaseSymbol(symbol: string) {
    const sym = symbol.toUpperCase();
    const count = (this.refCounts.get(sym) ?? 1) - 1;

    if (count > 0) {
      this.refCounts.set(sym, count);
      return;
    }

    this.refCounts.delete(sym);

    if (
      this.connection?.state === signalR.HubConnectionState.Connected &&
      this.refCounts.size >= 0
    ) {
      try {
        await this.connection.invoke('Unsubscribe', [sym]);
        this.logger.debug(`Upstream unsubscribe: ${sym}`);
      } catch {
        /* reconnecting */
      }
    }
  }

  isConnected() {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}
