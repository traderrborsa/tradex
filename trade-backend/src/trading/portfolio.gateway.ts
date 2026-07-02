import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import { MEMBER_ROLE_NAME } from '../rbac/permissions.constants';
import { RbacService } from '../rbac/rbac.service';
import { PortfolioConnectionService } from './portfolio-connection.service';
import { PortfolioEventsService } from './portfolio-events.service';
import { CORS_ORIGINS } from '../cors-origins';

interface JwtPayload {
  sub: string;
}

@WebSocketGateway({
  path: '/ws/portfolio',
  cors: { origin: CORS_ORIGINS },
})
export class PortfolioGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(PortfolioGateway.name);

  constructor(
    private readonly connections: PortfolioConnectionService,
    private readonly events: PortfolioEventsService,
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
  ) {}

  afterInit() {
    this.events.register((userId, payload) => {
      this.connections.sendToUser(userId, payload);
    });
  }

  async handleConnection(client: WebSocket, req: IncomingMessage) {
    const token = this.extractToken(req);
    if (!token) {
      client.close(4401, 'Token gerekli');
      return;
    }

    let userId: string;
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      userId = payload.sub;
    } catch {
      client.close(4401, 'Geçersiz token');
      return;
    }

    const profile = await this.rbac.getUserAuthProfile(userId);
    const isMember = profile?.roles.some((r) => r.name === MEMBER_ROLE_NAME);
    if (!isMember) {
      client.close(4403, 'Yalnızca müşteriler');
      return;
    }

    this.connections.register(userId, client);
    client.send(JSON.stringify({ type: 'connected' }));

    client.on('message', (raw) => {
      try {
        const text =
          typeof raw === 'string'
            ? raw
            : Buffer.isBuffer(raw)
              ? raw.toString('utf8')
              : String(raw);
        const msg = JSON.parse(text) as { action?: string };
        if (msg.action === 'ping') {
          client.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        /* ignore */
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.connections.unregister(client);
  }

  private extractToken(req: IncomingMessage): string | null {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const fromQuery = url.searchParams.get('token');
      if (fromQuery) return fromQuery;
    } catch {
      /* ignore */
    }
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }
}
