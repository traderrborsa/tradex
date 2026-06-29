export interface EffectiveTradingSettings {
  commissionRate: number;
  leverage: number;
  minLot: number;
  maxLot: number | null;
  lotStep: number;
  swapForexLong: number;
  swapForexShort: number;
  swapOtherLong: number;
  swapOtherShort: number;
  minDeposit: number;
  minWithdraw: number;
}

export const DEFAULT_TRADING_SETTINGS: EffectiveTradingSettings = {
  commissionRate: 0.0002,
  leverage: 1,
  minLot: 0.01,
  maxLot: null,
  lotStep: 0.01,
  swapForexLong: -0.35,
  swapForexShort: 0.12,
  swapOtherLong: -0.08,
  swapOtherShort: -0.05,
  minDeposit: 0,
  minWithdraw: 0,
};

export interface TradingConfigBundle {
  defaults: EffectiveTradingSettings;
  business: Partial<EffectiveTradingSettings>;
  member: Partial<EffectiveTradingSettings>;
  effective: EffectiveTradingSettings;
  hasMemberOverrides: boolean;
}
