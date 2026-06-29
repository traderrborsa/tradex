import { panelFetch } from './client';

export type FinanceRequestType = 'withdrawal' | 'deposit';
export type FinanceRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type FinanceTab = 'pending' | 'approved' | 'rejected';

export interface FinanceRequestRow {
  id: string;
  displayId: number | null;
  type: FinanceRequestType;
  status: FinanceRequestStatus;
  amount: number;
  iban: string | null;
  bankId: string | null;
  bankLogoUrl?: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  receiptPath: string | null;
  receiptUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    label: string;
  };
}

export function fetchFinanceRequests(opts?: {
  type?: FinanceRequestType;
  status?: FinanceRequestStatus;
  businessId?: string;
  userId?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.type) params.set('type', opts.type);
  if (opts?.status) params.set('status', opts.status);
  if (opts?.businessId) params.set('businessId', opts.businessId);
  if (opts?.userId) params.set('userId', opts.userId);
  const q = params.toString() ? `?${params}` : '';
  return panelFetch<FinanceRequestRow[]>(`/panel/finance${q}`);
}

export function fetchFinanceRequest(id: string) {
  return panelFetch<FinanceRequestRow>(`/panel/finance/${id}`);
}

export function updateFinanceRequest(
  id: string,
  body: {
    status?: FinanceRequestStatus;
    amount?: number;
    iban?: string;
    bankId?: string;
    accountHolderName?: string;
    description?: string | null;
  },
) {
  return panelFetch<FinanceRequestRow>(`/panel/finance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function approveFinanceRequest(id: string) {
  return updateFinanceRequest(id, { status: 'approved' });
}

export function rejectFinanceRequest(id: string) {
  return updateFinanceRequest(id, { status: 'rejected' });
}

export function deleteFinanceRequest(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/finance/${id}`, {
    method: 'DELETE',
  });
}
