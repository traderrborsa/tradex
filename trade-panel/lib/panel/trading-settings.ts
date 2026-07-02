import { panelFetch } from './client';

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

export interface BusinessEffectiveSettings extends EffectiveTradingSettings {
  initialBalance: number;
}

export type TradingSettingsPartial = Partial<EffectiveTradingSettings> & {
  leverageOptions?: number[];
  /** Müşteri özel sabit kaldıraç */
  leverage?: number;
};

export type BusinessSettingsPartial = Partial<BusinessEffectiveSettings> & {
  leverageOptions?: number[];
  leverage?: number;
};

export interface BusinessTradingSettingsResponse {
  businessId: string;
  businessName?: string;
  business: BusinessSettingsPartial;
  effective: BusinessEffectiveSettings;
}

export interface MemberTradingSettingsResponse {
  userId: string;
  businessId: string;
  user?: { id: string; fullName: string; email: string };
  businessInfo?: { id: string; displayName: string };
  defaults: EffectiveTradingSettings;
  business: TradingSettingsPartial;
  member: TradingSettingsPartial;
  effective: EffectiveTradingSettings;
}

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
  { key: 'swapForexLong', label: 'Forex swap (long)', step: '0.01' },
  { key: 'swapForexShort', label: 'Forex swap (short)', step: '0.01' },
  { key: 'swapOtherLong', label: 'Diğer swap (long)', step: '0.01' },
  { key: 'swapOtherShort', label: 'Diğer swap (short)', step: '0.01' },
  { key: 'minDeposit', label: 'Min yatırma (₺)', step: '1' },
  { key: 'minWithdraw', label: 'Min çekme (₺)', step: '1' },
];

export const MEMBER_LEVERAGE_FIELD = {
  key: 'leverage' as const,
  label: 'Sabit kaldıraç',
  hint: 'Boş = müşteri işlemde seçer. Dolu = bu oran zorunlu (örn. 10 = 1:10)',
  step: '1',
};

export const BUSINESS_LEVERAGE_OPTIONS_FIELD = {
  key: 'leverageOptions' as const,
  label: 'Kaldıraç seçenekleri',
  hint: 'Virgülle ayırın. Varsayılan: 1 (kaldıraçsız). Örn: 1, 5, 10, 50, 100',
};

export const BUSINESS_SETTINGS_FIELDS: {
  key: keyof BusinessEffectiveSettings;
  label: string;
  hint?: string;
  step?: string;
}[] = [
  {
    key: 'initialBalance',
    label: 'Yeni müşteri başlangıç bakiyesi (₺)',
    hint: 'Kayıt ve hesap sıfırlamada kullanılır — sadece işletme ayarı',
    step: '1',
  },
  ...TRADING_SETTINGS_FIELDS,
];

export function fetchBusinessTradingSettings(businessId: string) {
  return panelFetch<BusinessTradingSettingsResponse>(
    `/panel/businesses/${businessId}/trading-settings`,
  );
}

export function updateBusinessTradingSettings(
  businessId: string,
  settings: BusinessSettingsPartial,
) {
  return panelFetch<BusinessTradingSettingsResponse>(
    `/panel/businesses/${businessId}/trading-settings`,
    {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    },
  );
}

export function fetchMemberTradingSettings(userId: string, businessId: string) {
  return panelFetch<MemberTradingSettingsResponse>(
    `/panel/members/${userId}/trading-settings?businessId=${encodeURIComponent(businessId)}`,
  );
}

export function updateMemberTradingSettings(
  userId: string,
  businessId: string,
  settings: TradingSettingsPartial,
) {
  return panelFetch<MemberTradingSettingsResponse>(
    `/panel/members/${userId}/trading-settings?businessId=${encodeURIComponent(businessId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    },
  );
}

export function clearMemberTradingSettings(userId: string, businessId: string) {
  return panelFetch<MemberTradingSettingsResponse>(
    `/panel/members/${userId}/trading-settings?businessId=${encodeURIComponent(businessId)}`,
    { method: 'DELETE' },
  );
}

export function formatLeverageOptions(
  options: number[] | undefined,
  effective?: number[],
): string {
  const src = options ?? effective ?? [1];
  return src.join(', ');
}

export function parseLeverageOptionsInput(raw: string): number[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const nums = trimmed
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .map((n) => Math.floor(n));
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : undefined;
}
