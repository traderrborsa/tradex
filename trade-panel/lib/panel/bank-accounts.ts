import { panelFetch } from './client';

export interface DepositBankAccountRow {
  id: string;
  businessId: string;
  businessName: string | null;
  bankId: string;
  bankName: string;
  bankLogoUrl: string | null;
  accountHolderName: string;
  iban: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function businessQuery(businessId?: string) {
  return businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
}

export function fetchBankAccounts(businessId?: string) {
  return panelFetch<DepositBankAccountRow[]>(
    `/panel/bank-accounts${businessQuery(businessId)}`,
  );
}

export function fetchBankAccount(id: string) {
  return panelFetch<DepositBankAccountRow>(`/panel/bank-accounts/${id}`);
}

export function createBankAccount(body: {
  businessId: string;
  bankId: string;
  accountHolderName: string;
  iban: string;
  description?: string | null;
  isActive?: boolean;
}) {
  return panelFetch<DepositBankAccountRow>('/panel/bank-accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateBankAccount(
  id: string,
  body: {
    bankId?: string;
    accountHolderName?: string;
    iban?: string;
    description?: string | null;
    isActive?: boolean;
  },
) {
  return panelFetch<DepositBankAccountRow>(`/panel/bank-accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteBankAccount(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/bank-accounts/${id}`, {
    method: 'DELETE',
  });
}
