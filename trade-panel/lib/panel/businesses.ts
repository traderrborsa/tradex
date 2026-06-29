import { panelFetch } from './client';
import type { BusinessMemberRow, PanelBusinessRow } from './types';

export function fetchBusinesses() {
  return panelFetch<PanelBusinessRow[]>('/panel/businesses');
}

export function fetchBusiness(id: string) {
  return panelFetch<PanelBusinessRow>(`/panel/businesses/${id}`);
}

export function fetchBusinessMembers(id: string) {
  return panelFetch<BusinessMemberRow[]>(`/panel/businesses/${id}/members`);
}

export interface BusinessFormPayload {
  name: string;
  displayName: string;
  slug?: string;
  isActive?: boolean;
  staffUserIds?: string[];
}

export function createBusiness(payload: BusinessFormPayload) {
  return panelFetch<PanelBusinessRow>('/panel/businesses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBusiness(id: string, payload: Partial<BusinessFormPayload>) {
  return panelFetch<PanelBusinessRow>(`/panel/businesses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteBusiness(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/businesses/${id}`, {
    method: 'DELETE',
  });
}
