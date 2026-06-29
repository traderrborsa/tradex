import { Injectable } from '@nestjs/common';

export type PanelVerificationChange =
  | 'documents'
  | 'email'
  | 'phone'
  | 'identity';

export interface PanelVerificationChangedPayload {
  type: 'member_verification_changed';
  userId: string;
  businessId: string;
  change?: PanelVerificationChange;
}

type NotifyFn = (payload: PanelVerificationChangedPayload) => void;

@Injectable()
export class PanelVerificationEventsService {
  private emitFn: NotifyFn | null = null;

  register(emit: NotifyFn) {
    this.emitFn = emit;
  }

  notify(
    userId: string,
    businessId: string,
    change?: PanelVerificationChange,
  ) {
    this.emitFn?.({
      type: 'member_verification_changed',
      userId,
      businessId,
      change,
    });
  }
}
