import { Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';

@Injectable()
export class PresenceService {
  private readonly byUser = new Map<string, Set<WebSocket>>();
  private readonly clientUser = new WeakMap<WebSocket, string>();

  register(userId: string, client: WebSocket): boolean {
    const wasOnline = this.isOnline(userId);
    let set = this.byUser.get(userId);
    if (!set) {
      set = new Set();
      this.byUser.set(userId, set);
    }
    set.add(client);
    this.clientUser.set(client, userId);
    return !wasOnline;
  }

  unregister(client: WebSocket): boolean {
    const userId = this.clientUser.get(client);
    if (!userId) return false;
    this.clientUser.delete(client);
    const set = this.byUser.get(userId);
    if (!set) return false;
    set.delete(client);
    if (set.size === 0) {
      this.byUser.delete(userId);
      return true;
    }
    return false;
  }

  getUserId(client: WebSocket): string | undefined {
    return this.clientUser.get(client);
  }

  isOnline(userId: string): boolean {
    return (this.byUser.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUserIds(): string[] {
    return [...this.byUser.keys()];
  }

  getOnlineCount(): number {
    return this.byUser.size;
  }
}
