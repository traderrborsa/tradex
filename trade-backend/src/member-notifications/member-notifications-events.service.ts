import { Injectable } from '@nestjs/common';
import type { MemberNotificationRow } from './member-notifications.service';

type Listener = (userId: string, notification: MemberNotificationRow) => void;

@Injectable()
export class MemberNotificationsEventsService {
  private listeners = new Set<Listener>();

  register(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  broadcast(userId: string, notification: MemberNotificationRow) {
    for (const listener of this.listeners) {
      listener(userId, notification);
    }
  }
}
