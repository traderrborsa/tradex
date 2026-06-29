import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import { NotificationsEventsService } from './notifications-events.service';
import type { PanelNotificationRow } from './notifications.service';

@WebSocketGateway({
  path: '/ws/panel/notifications',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3002',
  },
})
export class PanelNotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(PanelNotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly events: NotificationsEventsService) {}

  afterInit() {
    this.events.register((notification) => this.broadcast(notification));
  }

  private broadcast(notification: PanelNotificationRow) {
    const payload = JSON.stringify({ type: 'notification', notification });
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
