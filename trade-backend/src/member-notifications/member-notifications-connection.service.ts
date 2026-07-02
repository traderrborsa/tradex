import { Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';

@Injectable()
export class MemberNotificationsConnectionService {
  private readonly byUser = new Map<string, Set<WebSocket>>();
  private readonly clientUser = new WeakMap<WebSocket, string>();

  register(userId: string, client: WebSocket) {
    let set = this.byUser.get(userId);
    if (!set) {
      set = new Set();
      this.byUser.set(userId, set);
    }
    set.add(client);
    this.clientUser.set(client, userId);
  }

  unregister(client: WebSocket) {
    const userId = this.clientUser.get(client);
    if (!userId) return;
    this.clientUser.delete(client);
    const set = this.byUser.get(userId);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) this.byUser.delete(userId);
  }

  sendToUser(userId: string, payload: object) {
    const set = this.byUser.get(userId);
    if (!set?.size) return;
    const text = JSON.stringify(payload);
    for (const client of set) {
      if (client.readyState === client.OPEN) {
        client.send(text);
      }
    }
  }
}
