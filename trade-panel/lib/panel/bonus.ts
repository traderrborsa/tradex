import { panelFetch } from './client';

export type BonusRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type BonusTab = 'active' | 'approved' | 'rejected';

export interface BonusRequestRow {
  id: string;
  displayId: number | null;
  status: BonusRequestStatus;
  amount: number;
  description: string | null;
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

export function fetchBonusRequests(opts?: {
  status?: BonusRequestStatus;
  businessId?: string;
  userId?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.businessId) params.set('businessId', opts.businessId);
  if (opts?.userId) params.set('userId', opts.userId);
  const q = params.toString() ? `?${params}` : '';
  return panelFetch<BonusRequestRow[]>(`/panel/bonus${q}`);
}

export function fetchBonusRequest(id: string) {
  return panelFetch<BonusRequestRow>(`/panel/bonus/${id}`);
}

export function createBonus(body: {
  userId: string;
  businessId: string;
  amount: number;
  description?: string;
}) {
  return panelFetch<BonusRequestRow>(`/panel/bonus`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateBonusRequest(
  id: string,
  body: {
    status?: BonusRequestStatus;
    amount?: number;
    description?: string | null;
  },
) {
  return panelFetch<BonusRequestRow>(`/panel/bonus/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteBonusRequest(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/bonus/${id}`, {
    method: 'DELETE',
  });
}
