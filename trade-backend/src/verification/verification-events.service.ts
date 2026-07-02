import { Injectable } from '@nestjs/common';

export interface VerificationUpdatedPayload {
  type: 'verification_updated';
  businessId: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  identityVerified?: boolean;
}

type NotifyFn = (userId: string, payload: VerificationUpdatedPayload) => void;

@Injectable()
export class VerificationEventsService {
  private emitFn: NotifyFn | null = null;

  register(emit: NotifyFn) {
    this.emitFn = emit;
  }

  notifyUser(userId: string, payload: VerificationUpdatedPayload) {
    this.emitFn?.(userId, payload);
  }
}
