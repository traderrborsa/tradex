import { apiFetch } from './trading-api';
import { resolveActiveBusinessId } from './business';

export type CampaignApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface Campaign {
  id: string;
  businessId: string;
  title: string;
  description: string;
  terms: string;
  imageUrl: string | null;
  isActive: boolean;
  hasApplied?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignApplication {
  id: string;
  displayId: number | null;
  campaignId: string;
  status: CampaignApplicationStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  campaign: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
}

export function apiFetchCampaigns() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<Campaign[]>(
    `/campaigns?businessId=${encodeURIComponent(businessId)}`,
  );
}

export function apiFetchCampaign(id: string) {
  const businessId = resolveActiveBusinessId();
  return apiFetch<Campaign>(
    `/campaigns/${id}?businessId=${encodeURIComponent(businessId)}`,
  );
}

export function apiApplyCampaign(campaignId: string) {
  return apiFetch<CampaignApplication>(`/campaigns/${campaignId}/apply`, {
    method: 'POST',
    body: JSON.stringify({
      businessId: resolveActiveBusinessId(),
    }),
  });
}

export function apiFetchCampaignApplications() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<CampaignApplication[]>(
    `/campaigns/applications?businessId=${encodeURIComponent(businessId)}`,
  );
}
