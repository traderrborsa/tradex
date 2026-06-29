import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import { TransactionsEventsService } from './transactions-events.service';

@WebSocketGateway({
  path: '/ws/panel/transactions',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3002',
  },
})
export class PanelTransactionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(PanelTransactionsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly events: TransactionsEventsService) {}

  afterInit() {
    this.events.register(() => this.broadcast());
  }

  private broadcast() {
    const payload = JSON.stringify({ type: 'transactions_changed' });
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
