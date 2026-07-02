import { Injectable } from '@nestjs/common';
import type { PanelNotificationRow } from './notifications.service';

type BroadcastFn = (notification: PanelNotificationRow) => void;

@Injectable()
export class NotificationsEventsService {
  private emitFn: BroadcastFn | null = null;

  register(emit: BroadcastFn) {
    this.emitFn = emit;
  }

  broadcast(notification: PanelNotificationRow) {
    this.emitFn?.(notification);
  }
}
