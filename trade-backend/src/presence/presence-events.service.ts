import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceEventsService {
  private emitFn: (() => void) | null = null;

  register(emit: () => void) {
    this.emitFn = emit;
  }

  notifyPresenceChanged() {
    this.emitFn?.();
  }
}
