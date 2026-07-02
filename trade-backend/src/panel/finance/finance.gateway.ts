import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import { FinanceEventsService } from './finance-events.service';
import { CORS_ORIGINS } from '../../cors-origins';

@WebSocketGateway({
  path: '/ws/panel/finance',
  cors: { origin: CORS_ORIGINS },
})
export class PanelFinanceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(PanelFinanceGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly events: FinanceEventsService) {}

  afterInit() {
    this.events.register(() => this.broadcast());
  }

  private broadcast() {
    const payload = JSON.stringify({ type: 'finance_changed' });
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
