import { panelFetch } from './client';
import type { PanelMemberRow, PanelUserRow } from './types';

export interface CreateMemberPayload {
  email: string;
  password: string;
  fullName: string;
  tcKimlikNo: string;
  phone: string;
  referenceNumber?: string;
  businessId?: string;
}

export function fetchMembers(businessId?: string) {
  const qs = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
  return panelFetch<PanelMemberRow[]>(`/panel/members${qs}`);
}

export function fetchMember(userId: string) {
  return panelFetch<PanelUserRow>(`/panel/members/${userId}`);
}

export function createMember(payload: CreateMemberPayload) {
  return panelFetch<PanelUserRow>('/panel/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteMember(userId: string, businessId: string) {
  const qs = `?businessId=${encodeURIComponent(businessId)}`;
  return panelFetch<{
    ok: boolean;
    deletedUser: boolean;
    removedBusinessId: string;
  }>(`/panel/members/${userId}${qs}`, { method: 'DELETE' });
}
