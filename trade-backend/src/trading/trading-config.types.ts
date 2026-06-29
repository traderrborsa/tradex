/** Müşteri / işlem motoru ayarları (başlangıç bakiyesi hariç). */
export interface TradingSettingsPartial {
  commissionRate?: number;
  /** 1 = kaldıraçsız, 100 = 1:100 */
  leverage?: number;
  minLot?: number;
  maxLot?: number | null;
  lotStep?: number;
  swapForexLong?: number;
  swapForexShort?: number;
  swapOtherLong?: number;
  swapOtherShort?: number;
  minDeposit?: number;
  minWithdraw?: number;
}

/** Sadece işletme seviyesinde ayarlanır. */
export interface BusinessOnlySettings {
  initialBalance?: number;
}

export type BusinessSettingsPartial = TradingSettingsPartial &
  BusinessOnlySettings;

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

export interface BusinessEffectiveSettings extends EffectiveTradingSettings {
  initialBalance: number;
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

/** İşletme ayarlamadıysa yeni kayıt/reset için 0 (sabit 10.000 yok). */
export const DEFAULT_BUSINESS_INITIAL_BALANCE = 0;

export const BUSINESS_ONLY_KEYS = ['initialBalance'] as const;

export const TRADING_SETTINGS_FIELDS: {
  key: keyof EffectiveTradingSettings;
  label: string;
  hint?: string;
  step?: string;
}[] = [
  { key: 'commissionRate', label: 'Komisyon oranı', hint: '0.0002 = %0.02', step: '0.0001' },
  { key: 'leverage', label: 'Kaldıraç', hint: '1 = kaldıraçsız, 100 = 1:100', step: '1' },
  { key: 'minLot', label: 'Min lot', step: '0.01' },
  { key: 'maxLot', label: 'Max lot', hint: 'Boş = limitsiz', step: '0.01' },
  { key: 'lotStep', label: 'Lot adımı', step: '0.01' },
  { key: 'swapForexLong', label: 'Forex swap (long, 1 lot/gün)', step: '0.01' },
  { key: 'swapForexShort', label: 'Forex swap (short, 1 lot/gün)', step: '0.01' },
  { key: 'swapOtherLong', label: 'Diğer swap (long)', step: '0.01' },
  { key: 'swapOtherShort', label: 'Diğer swap (short)', step: '0.01' },
  { key: 'minDeposit', label: 'Min yatırma (₺)', step: '1' },
  { key: 'minWithdraw', label: 'Min çekme (₺)', step: '1' },
];

export const BUSINESS_SETTINGS_FIELDS: {
  key: keyof BusinessEffectiveSettings;
  label: string;
  hint?: string;
  step?: string;
}[] = [
  {
    key: 'initialBalance',
    label: 'Yeni müşteri başlangıç bakiyesi (₺)',
    hint: 'Sadece işletme — kayıt ve hesap sıfırlamada kullanılır',
    step: '1',
  },
  ...TRADING_SETTINGS_FIELDS,
];

export function mergeTradingSettings(
  ...layers: (TradingSettingsPartial | null | undefined)[]
): EffectiveTradingSettings {
  const merged: EffectiveTradingSettings = { ...DEFAULT_TRADING_SETTINGS };
  for (const layer of layers) {
    if (!layer) continue;
    for (const { key } of TRADING_SETTINGS_FIELDS) {
      const value = layer[key];
      if (value === undefined) continue;
      if (key === 'maxLot' && value === null) {
        merged.maxLot = null;
        continue;
      }
      if (value !== null) {
        merged[key] = value as never;
      }
    }
  }
  if (merged.leverage < 1) merged.leverage = 1;
  if (merged.minLot <= 0) merged.minLot = DEFAULT_TRADING_SETTINGS.minLot;
  if (merged.lotStep <= 0) merged.lotStep = DEFAULT_TRADING_SETTINGS.lotStep;
  if (merged.commissionRate < 0) merged.commissionRate = 0;
  return merged;
}

export function mergeBusinessSettings(
  businessLayer?: BusinessSettingsPartial | null,
): BusinessEffectiveSettings {
  const trading = mergeTradingSettings(businessLayer);
  const raw = businessLayer?.initialBalance;
  const initialBalance =
    raw !== undefined && Number.isFinite(raw) && raw >= 0
      ? raw
      : DEFAULT_BUSINESS_INITIAL_BALANCE;
  return { ...trading, initialBalance };
}

export function stripBusinessOnlySettings(
  input: BusinessSettingsPartial,
): TradingSettingsPartial {
  const out: TradingSettingsPartial = { ...input };
  delete (out as BusinessSettingsPartial).initialBalance;
  return out;
}

export function sanitizeTradingSettingsInput(
  input: TradingSettingsPartial,
): TradingSettingsPartial {
  const out: TradingSettingsPartial = {};
  for (const { key } of TRADING_SETTINGS_FIELDS) {
    const raw = input[key];
    if (raw === undefined) continue;
    if (key === 'maxLot') {
      if (raw === null || raw === ('' as unknown)) {
        out.maxLot = null;
      } else {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) out.maxLot = n;
      }
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out[key] = n;
  }
  return out;
}

export function sanitizeBusinessSettingsInput(
  input: BusinessSettingsPartial,
): BusinessSettingsPartial {
  const out: BusinessSettingsPartial = sanitizeTradingSettingsInput(input);
  if (input.initialBalance !== undefined) {
    const n = Number(input.initialBalance);
    if (Number.isFinite(n) && n >= 0) out.initialBalance = n;
  }
  return out;
}

export function sanitizeMemberSettingsInput(
  input: TradingSettingsPartial,
): TradingSettingsPartial {
  return sanitizeTradingSettingsInput(input);
}

/** @deprecated use sanitizeBusinessSettingsInput or sanitizeMemberSettingsInput */
export function sanitizeSettingsInput(
  input: BusinessSettingsPartial,
): BusinessSettingsPartial {
  return sanitizeBusinessSettingsInput(input);
}

export function requiredMargin(
  quantity: number,
  price: number,
  leverage: number,
): number {
  const lev = Math.max(1, leverage);
  return (quantity * price) / lev;
}

export function validateLot(
  quantity: number,
  settings: EffectiveTradingSettings,
): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Miktar 0 olamaz';
  if (quantity < settings.minLot) {
    return `Minimum lot ${settings.minLot}`;
  }
  if (settings.maxLot != null && quantity > settings.maxLot) {
    return `Maksimum lot ${settings.maxLot}`;
  }
  const stepped = Math.round(quantity / settings.lotStep) * settings.lotStep;
  if (Math.abs(stepped - quantity) > 1e-6) {
    return `Lot ${settings.lotStep} adımlı olmalı`;
  }
  return null;
}
