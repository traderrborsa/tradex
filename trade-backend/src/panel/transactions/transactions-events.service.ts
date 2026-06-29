import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionsEventsService {
  private emitFn: (() => void) | null = null;

  register(emit: () => void) {
    this.emitFn = emit;
  }

  notifyTransactionsChanged() {
    this.emitFn?.();
  }
}
