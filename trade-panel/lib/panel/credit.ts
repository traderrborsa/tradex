import { panelFetch } from './client';

export type CreditRequestStatus =
  | 'pending'
  | 'contract_uploaded'
  | 'signed'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type CreditTab = 'active' | 'approved' | 'rejected';

export interface CreditRequestRow {
  id: string;
  displayId: number | null;
  status: CreditRequestStatus;
  amount: number;
  description: string | null;
  contractUrl: string | null;
  signedContractUrl: string | null;
  contractUploadedAt: string | null;
  signedUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    label: string;
  };
}

export function fetchCreditRequests(opts?: {
  status?: CreditRequestStatus;
  businessId?: string;
  userId?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.businessId) params.set('businessId', opts.businessId);
  if (opts?.userId) params.set('userId', opts.userId);
  const q = params.toString() ? `?${params}` : '';
  return panelFetch<CreditRequestRow[]>(`/panel/credit${q}`);
}

export function fetchCreditRequest(id: string) {
  return panelFetch<CreditRequestRow>(`/panel/credit/${id}`);
}

export function uploadCreditContract(id: string, file: File) {
  const form = new FormData();
  form.append('contract', file);
  return panelFetch<CreditRequestRow>(`/panel/credit/${id}/contract`, {
    method: 'POST',
    body: form,
  });
}

export function updateCreditRequest(
  id: string,
  body: {
    status?: CreditRequestStatus;
    description?: string | null;
    amount?: number;
  },
) {
  return panelFetch<CreditRequestRow>(`/panel/credit/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function approveCreditRequest(id: string) {
  return updateCreditRequest(id, { status: 'approved' });
}

export function rejectCreditRequest(id: string) {
  return updateCreditRequest(id, { status: 'rejected' });
}

export function deleteCreditRequest(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/credit/${id}`, {
    method: 'DELETE',
  });
}
