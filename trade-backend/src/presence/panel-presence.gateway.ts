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

@WebSocketGateway({
  path: '/ws/panel/presence',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3002',
  },
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
