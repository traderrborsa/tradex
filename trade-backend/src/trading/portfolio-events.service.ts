import { Injectable } from '@nestjs/common';

export interface PortfolioUpdatedPayload {
  type: 'portfolio_updated';
  businessId: string;
  balance?: number;
}

export interface TradingConfigUpdatedPayload {
  type: 'trading_config_updated';
  businessId: string;
  effective: Record<string, unknown>;
  hasMemberOverrides?: boolean;
}

export type PortfolioWsPayload = PortfolioUpdatedPayload | TradingConfigUpdatedPayload;

type NotifyFn = (userId: string, payload: PortfolioWsPayload) => void;

@Injectable()
export class PortfolioEventsService {
  private emitFn: NotifyFn | null = null;

  register(emit: NotifyFn) {
    this.emitFn = emit;
  }

  notifyUser(userId: string, businessId: string, balance?: number) {
    this.emitFn?.(userId, {
      type: 'portfolio_updated',
      businessId,
      ...(balance !== undefined ? { balance } : {}),
    });
  }

  /** Pozisyon SL/TP veya panel düzenlemesi — müşteri portföyünü yenilesin. */
  notifyPortfolioRefresh(userId: string, businessId: string) {
    this.notifyUser(userId, businessId);
  }

  notifyConfig(
    userId: string,
    businessId: string,
    effective: Record<string, unknown>,
    hasMemberOverrides?: boolean,
  ) {
    this.emitFn?.(userId, {
      type: 'trading_config_updated',
      businessId,
      effective,
      ...(hasMemberOverrides !== undefined ? { hasMemberOverrides } : {}),
    });
  }
}
