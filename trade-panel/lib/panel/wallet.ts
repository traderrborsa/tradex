import { panelFetch } from './client';

export interface MemberWalletPosition {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  avgEntry: number;
  marginUsed: number;
}

export interface MemberWalletResponse {
  userId: string;
  fullName: string;
  email: string;
  businessId: string | null;
  accountId: string | null;
  balance: number;
  marginUsed: number;
  freeBalance: number;
  leverage: number | null;
  leverageOptions: number[];
  openPositions: number;
  positions: MemberWalletPosition[];
  finance: {
    pendingDepositTotal: number;
    pendingDepositCount: number;
    pendingWithdrawTotal: number;
    pendingWithdrawCount: number;
    totalDeposited: number;
    totalWithdrawn: number;
  };
}

export interface BusinessWalletMemberRow {
  userId: string;
  fullName: string;
  email: string;
  balance: number;
  marginUsed: number;
  freeBalance: number;
  openPositions: number;
}

export interface BusinessWalletSummary {
  businessId: string;
  businessName: string;
  memberCount: number;
  membersWithAccount: number;
  totalBalance: number;
  totalMarginUsed: number;
  totalFreeBalance: number;
  members: BusinessWalletMemberRow[];
}

export function fetchMemberWallet(userId: string, businessId?: string) {
  const q = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
  return panelFetch<MemberWalletResponse>(
    `/panel/members/${userId}/wallet${q}`,
  );
}

export function adjustMemberWallet(
  userId: string,
  body: { type: 'deposit' | 'withdraw'; amount: number; note?: string },
) {
  return panelFetch<{ ok: boolean; balance: number }>(
    `/panel/members/${userId}/wallet/adjust`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function fetchBusinessWallet(businessId: string) {
  return panelFetch<BusinessWalletSummary>(
    `/panel/businesses/${businessId}/wallet`,
  );
}

export function formatTry(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}
