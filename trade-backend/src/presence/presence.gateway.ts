import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import { MEMBER_ROLE_NAME } from '../rbac/permissions.constants';
import { RbacService } from '../rbac/rbac.service';
import { PresenceEventsService } from './presence-events.service';
import { PresenceService } from './presence.service';
import { CORS_ORIGINS } from '../cors-origins';

interface JwtPayload {
  sub: string;
}

@WebSocketGateway({
  path: '/ws/presence',
  cors: { origin: CORS_ORIGINS },
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PresenceGateway.name);

  constructor(
    private readonly presence: PresenceService,
    private readonly events: PresenceEventsService,
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
  ) {}

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

    const becameOnline = this.presence.register(userId, client);
    if (becameOnline) this.events.notifyPresenceChanged();

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
    const wentOffline = this.presence.unregister(client);
    if (wentOffline) this.events.notifyPresenceChanged();
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
