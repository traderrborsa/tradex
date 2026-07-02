/** Müşteri / işlem motoru ayarları (başlangıç bakiyesi hariç). */
export interface TradingSettingsPartial {
  commissionRate?: number;
  /** İşletme: müşterinin seçebileceği kaldıraç listesi (örn. [1, 5, 10, 50]). */
  leverageOptions?: number[];
  /** Müşteri özel sabit kaldıraç veya eski tek değerli işletme ayarı (geriye uyum). */
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
  /** Müşterinin seçebileceği kaldıraçlar (1 = kaldıraçsız). */
  leverageOptions: number[];
  /** Müşteri özel sabit kaldıraç; null ise müşteri işlemde seçer. */
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

export interface BusinessEffectiveSettings extends EffectiveTradingSettings {
  initialBalance: number;
}

export const DEFAULT_LEVERAGE_OPTIONS = [1];

export const DEFAULT_TRADING_SETTINGS: EffectiveTradingSettings = {
  commissionRate: 0.0002,
  leverageOptions: [...DEFAULT_LEVERAGE_OPTIONS],
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

export function normalizeLeverageOptions(
  options: number[] | undefined,
  legacyLeverage?: number,
): number[] {
  let raw = options;
  if ((!raw || raw.length === 0) && legacyLeverage != null && legacyLeverage >= 1) {
    raw = [legacyLeverage];
  }
  if (!raw || raw.length === 0) return [...DEFAULT_LEVERAGE_OPTIONS];
  const sorted = [
    ...new Set(
      raw.map((n) => Math.floor(Number(n))).filter((n) => Number.isFinite(n) && n >= 1),
    ),
  ].sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : [...DEFAULT_LEVERAGE_OPTIONS];
}

export function resolveLeverageConfig(
  business: TradingSettingsPartial,
  member?: TradingSettingsPartial | null,
): Pick<EffectiveTradingSettings, 'leverageOptions' | 'fixedLeverage'> {
  const memberFixed =
    member?.leverage != null && member.leverage >= 1
      ? Math.floor(member.leverage)
      : null;

  if (memberFixed != null) {
    return { leverageOptions: [memberFixed], fixedLeverage: memberFixed };
  }

  return {
    leverageOptions: normalizeLeverageOptions(
      business.leverageOptions,
      business.leverage,
    ),
    fixedLeverage: null,
  };
}

export function validateOrderLeverage(
  requested: number | undefined,
  settings: EffectiveTradingSettings,
): number {
  if (settings.fixedLeverage != null) return settings.fixedLeverage;
  const fallback = settings.leverageOptions[0] ?? 1;
  const lev =
    requested != null && Number.isFinite(requested)
      ? Math.floor(requested)
      : fallback;
  if (!settings.leverageOptions.includes(lev)) {
    throw new Error('Geçersiz kaldıraç');
  }
  return lev;
}

export function mergeTradingSettings(
  businessLayer?: TradingSettingsPartial | null,
  memberLayer?: TradingSettingsPartial | null,
): EffectiveTradingSettings {
  const merged: EffectiveTradingSettings = { ...DEFAULT_TRADING_SETTINGS };

  for (const layer of [businessLayer, memberLayer]) {
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

  const leverage = resolveLeverageConfig(
    businessLayer ?? {},
    memberLayer,
  );
  merged.leverageOptions = leverage.leverageOptions;
  merged.fixedLeverage = leverage.fixedLeverage;

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

function sanitizeLeverageOptionsInput(raw: unknown): number[] | undefined {
  if (raw == null) return undefined;
  let nums: number[];
  if (Array.isArray(raw)) {
    nums = raw.map((v) => Number(v));
  } else if (typeof raw === 'string') {
    nums = raw
      .split(/[,;\s]+/)
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) => Number(part));
  } else {
    return undefined;
  }
  const normalized = normalizeLeverageOptions(nums);
  return normalized.length > 0 ? normalized : undefined;
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

  if (input.leverageOptions !== undefined) {
    const opts = sanitizeLeverageOptionsInput(input.leverageOptions);
    if (opts) out.leverageOptions = opts;
  }
  if (input.leverage !== undefined) {
    const n = Number(input.leverage);
    if (Number.isFinite(n) && n >= 1) out.leverage = Math.floor(n);
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
  const out = sanitizeTradingSettingsInput(input);
  delete out.leverageOptions;
  return out;
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

export function positionLeverage(
  position: { leverage?: number },
  fallback = 1,
): number {
  return Math.max(1, position.leverage ?? fallback);
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
