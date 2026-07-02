import { panelFetch } from './client';

export type CampaignApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type CampaignTab = 'campaigns' | 'applications';
export type ApplicationTab = 'active' | 'approved' | 'rejected';

export interface CampaignRow {
  id: string;
  businessId: string;
  title: string;
  description: string;
  terms: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignApplicationRow {
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
  user: {
    id: string;
    email: string;
    fullName: string;
    label: string;
  };
}

function businessQuery(businessId?: string) {
  return businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
}

export function fetchCampaigns(businessId?: string) {
  return panelFetch<CampaignRow[]>(
    `/panel/campaigns${businessQuery(businessId)}`,
  );
}

export function fetchCampaign(id: string) {
  return panelFetch<CampaignRow>(`/panel/campaigns/${id}`);
}

export function createCampaign(form: FormData) {
  return panelFetch<CampaignRow>('/panel/campaigns', {
    method: 'POST',
    body: form,
  });
}

export function updateCampaign(id: string, form: FormData) {
  return panelFetch<CampaignRow>(`/panel/campaigns/${id}`, {
    method: 'PUT',
    body: form,
  });
}

export function deleteCampaign(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/campaigns/${id}`, {
    method: 'DELETE',
  });
}

export function fetchCampaignApplications(opts?: {
  status?: CampaignApplicationStatus;
  businessId?: string;
  userId?: string;
  campaignId?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.businessId) params.set('businessId', opts.businessId);
  if (opts?.userId) params.set('userId', opts.userId);
  if (opts?.campaignId) params.set('campaignId', opts.campaignId);
  const q = params.toString() ? `?${params}` : '';
  return panelFetch<CampaignApplicationRow[]>(
    `/panel/campaigns/applications${q}`,
  );
}

export function fetchCampaignApplication(id: string) {
  return panelFetch<CampaignApplicationRow>(
    `/panel/campaigns/applications/${id}`,
  );
}

export function updateCampaignApplication(
  id: string,
  body: {
    status?: CampaignApplicationStatus;
    amount?: number;
  },
) {
  return panelFetch<CampaignApplicationRow>(
    `/panel/campaigns/applications/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export function deleteCampaignApplication(id: string) {
  return panelFetch<{ ok: boolean }>(
    `/panel/campaigns/applications/${id}`,
    { method: 'DELETE' },
  );
}
