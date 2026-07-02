export interface EffectiveTradingSettings {
  commissionRate: number;
  leverageOptions: number[];
  fixedLeverage: number | null;
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
  leverageOptions: [1],
  fixedLeverage: null,
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
  business: Partial<EffectiveTradingSettings> & { leverageOptions?: number[] };
  member: Partial<EffectiveTradingSettings> & { leverage?: number };
  effective: EffectiveTradingSettings;
  hasMemberOverrides: boolean;
}

export function activeLeverage(
  settings: EffectiveTradingSettings,
  selected?: number,
): number {
  if (settings.fixedLeverage != null) return settings.fixedLeverage;
  const fallback = settings.leverageOptions[0] ?? 1;
  const lev = selected ?? fallback;
  return settings.leverageOptions.includes(lev) ? lev : fallback;
}
