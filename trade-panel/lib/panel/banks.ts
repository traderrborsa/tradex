import { panelFetch } from './client';

export interface BankRow {
  id: string;
  businessId: string;
  businessName: string | null;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  accountCount: number;
  createdAt: string;
  updatedAt: string;
}

function businessQuery(businessId?: string) {
  return businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
}

export function fetchBanks(businessId?: string) {
  return panelFetch<BankRow[]>(`/panel/banks${businessQuery(businessId)}`);
}

export function fetchBank(id: string) {
  return panelFetch<BankRow>(`/panel/banks/${id}`);
}

export function createBank(form: FormData) {
  return panelFetch<BankRow>('/panel/banks', {
    method: 'POST',
    body: form,
  });
}

export function updateBank(id: string, form: FormData) {
  return panelFetch<BankRow>(`/panel/banks/${id}`, {
    method: 'PUT',
    body: form,
  });
}

export function deleteBank(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/banks/${id}`, {
    method: 'DELETE',
  });
}
