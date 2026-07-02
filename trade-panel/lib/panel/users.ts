import { panelFetch } from './client';
import type { PanelUserRow } from './types';

export function fetchUsers(businessId?: string) {
  const q = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
  return panelFetch<PanelUserRow[]>(`/panel/users${q}`);
}

export function fetchUser(id: string) {
  return panelFetch<PanelUserRow>(`/panel/users/${id}`);
}

export interface UserFormPayload {
  email: string;
  password?: string;
  fullName: string;
  tcKimlikNo: string;
  phone: string;
  referenceNumber?: string;
  roleIds: string[];
  businessIds?: string[];
  createTradingAccount?: boolean;
}

export function createUser(payload: UserFormPayload) {
  return panelFetch<PanelUserRow>('/panel/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: string, payload: Partial<UserFormPayload>) {
  return panelFetch<PanelUserRow>(`/panel/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/users/${id}`, {
    method: 'DELETE',
  });
}
