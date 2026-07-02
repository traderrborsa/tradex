import { Injectable } from '@nestjs/common';

@Injectable()
export class FinanceEventsService {
  private emitFn: (() => void) | null = null;

  register(emit: () => void) {
    this.emitFn = emit;
  }

  notifyFinanceChanged() {
    this.emitFn?.();
  }
}
