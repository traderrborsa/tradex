import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import {
  PanelVerificationEventsService,
  type PanelVerificationChangedPayload,
} from './panel-verification-events.service';
import { CORS_ORIGINS } from '../../cors-origins';

@WebSocketGateway({
  path: '/ws/panel/verification',
  cors: { origin: CORS_ORIGINS },
})
export class PanelVerificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(PanelVerificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly events: PanelVerificationEventsService) {}

  afterInit() {
    this.events.register((payload) => this.broadcast(payload));
  }

  private broadcast(payload: PanelVerificationChangedPayload) {
    const text = JSON.stringify(payload);
    this.server.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(text);
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
