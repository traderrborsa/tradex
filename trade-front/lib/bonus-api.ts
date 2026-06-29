import { apiFetch } from './trading-api';
import { resolveActiveBusinessId } from './business';

export type BonusRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface BonusRequest {
  id: string;
  displayId: number | null;
  status: BonusRequestStatus;
  amount: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

export function apiFetchBonusRequests() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<BonusRequest[]>(
    `/bonus?businessId=${encodeURIComponent(businessId)}`,
  );
}

export function apiCreateBonusRequest(body: { description?: string }) {
  return apiFetch<BonusRequest>('/bonus', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      businessId: resolveActiveBusinessId(),
    }),
  });
}
