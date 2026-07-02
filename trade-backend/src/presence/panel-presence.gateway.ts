import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import { PresenceEventsService } from './presence-events.service';
import { CORS_ORIGINS } from '../cors-origins';

@WebSocketGateway({
  path: '/ws/panel/presence',
  cors: { origin: CORS_ORIGINS },
})
export class PanelPresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(PanelPresenceGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly events: PresenceEventsService) {}

  afterInit() {
    this.events.register(() => this.broadcast());
  }

  private broadcast() {
    const payload = JSON.stringify({ type: 'presence_changed' });
    this.server.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    });
  }

  handleConnection(client: WebSocket) {
    client.send(JSON.stringify({ type: 'connected' }));
  }

  handleDisconnect() {
    /* noop */
  }
}
