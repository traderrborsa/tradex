import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import { BistService } from '../bist/bist.service';
import { BistUpstreamService } from '../bist/bist-upstream.service';
import { BiquoteUpstreamService } from './biquote-upstream.service';
import { CORS_ORIGINS } from '../cors-origins';

type ClientMessage =
  | { action: 'subscribe'; symbol: string }
  | { action: 'subscribe_many'; symbols: string[] }
  | { action: 'unsubscribe'; symbol?: string };

@WebSocketGateway({
  path: '/ws/ticks',
  cors: { origin: CORS_ORIGINS },
})
export class TicksGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(TicksGateway.name);
  private readonly clientSymbols = new WeakMap<WebSocket, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly upstream: BiquoteUpstreamService,
    private readonly bistUpstream: BistUpstreamService,
    private readonly bistService: BistService,
  ) {}

  afterInit() {
    this.upstream.onTick((tick) => {
      const sym = tick.symbol?.toUpperCase();
      if (!sym) return;

      const payload = JSON.stringify({ type: 'tick', data: tick });

      this.server.clients.forEach((client) => {
        const subs = this.clientSymbols.get(client);
        if (
          client.readyState === client.OPEN &&
          subs?.has(sym)
        ) {
          client.send(payload);
        }
      });
    });

    this.bistUpstream.onTick((tick) => {
      const sym = tick.symbol?.toUpperCase();
      if (!sym) return;

      const payload = JSON.stringify({ type: 'tick', data: tick });

      this.server.clients.forEach((client) => {
        const subs = this.clientSymbols.get(client);
        if (client.readyState === client.OPEN && subs?.has(sym)) {
          client.send(payload);
        }
      });
    });
  }

  handleConnection(client: WebSocket) {
    this.clientSymbols.set(client, new Set());

    client.send(
      JSON.stringify({
        type: 'connected',
        upstream:
          this.upstream.isConnected() || this.bistUpstream.isActive(),
      }),
    );

    client.on('message', (raw) => {
      void this.onMessage(client, raw);
    });
  }

  async handleDisconnect(client: WebSocket) {
    const subs = this.clientSymbols.get(client);
    if (subs) {
      for (const sym of subs) {
        if (this.bistService.isBistSymbol(sym)) {
          this.bistUpstream.releaseSymbol(sym);
        } else {
          await this.upstream.releaseSymbol(sym);
        }
      }
    }
    this.clientSymbols.delete(client);
  }

  private getSubs(client: WebSocket): Set<string> {
    let subs = this.clientSymbols.get(client);
    if (!subs) {
      subs = new Set();
      this.clientSymbols.set(client, subs);
    }
    return subs;
  }

  private async addSymbol(client: WebSocket, sym: string) {
    const subs = this.getSubs(client);
    if (subs.has(sym)) return;
    subs.add(sym);
    if (this.bistService.isBistSymbol(sym)) {
      this.bistUpstream.acquireSymbol(sym);
      return;
    }
    await this.upstream.acquireSymbol(sym);
  }

  private async removeSymbol(client: WebSocket, sym: string) {
    const subs = this.clientSymbols.get(client);
    if (!subs?.has(sym)) return;
    subs.delete(sym);
    if (this.bistService.isBistSymbol(sym)) {
      this.bistUpstream.releaseSymbol(sym);
      return;
    }
    await this.upstream.releaseSymbol(sym);
  }

  private async onMessage(client: WebSocket, raw: unknown) {
    try {
      const text =
        typeof raw === 'string'
          ? raw
          : Buffer.isBuffer(raw)
            ? raw.toString('utf8')
            : String(raw);
      const msg = JSON.parse(text) as ClientMessage;

      if (msg.action === 'subscribe' && msg.symbol) {
        await this.addSymbol(client, msg.symbol.toUpperCase());
        client.send(
          JSON.stringify({ type: 'subscribed', symbol: msg.symbol.toUpperCase() }),
        );
        return;
      }

      if (msg.action === 'subscribe_many' && msg.symbols?.length) {
        for (const s of msg.symbols) {
          await this.addSymbol(client, s.toUpperCase());
        }
        client.send(
          JSON.stringify({
            type: 'subscribed_many',
            symbols: msg.symbols.map((s) => s.toUpperCase()),
          }),
        );
        return;
      }

      if (msg.action === 'unsubscribe') {
        if (msg.symbol) {
          await this.removeSymbol(client, msg.symbol.toUpperCase());
        } else {
          const subs = this.clientSymbols.get(client);
          if (subs) {
            for (const sym of [...subs]) {
              await this.removeSymbol(client, sym);
            }
          }
        }
        client.send(JSON.stringify({ type: 'unsubscribed' }));
      }
    } catch (err) {
      this.logger.warn(`WS mesaj hatası: ${err}`);
      client.send(
        JSON.stringify({ type: 'error', message: 'Geçersiz mesaj' }),
      );
    }
  }
}
