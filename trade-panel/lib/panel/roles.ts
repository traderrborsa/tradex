import { panelFetch } from './client';
import type { AssignableRole, PanelRoleRow, PermissionRow } from './types';

function businessQuery(businessId?: string) {
  return businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
}

export function fetchRoles(businessId?: string) {
  return panelFetch<PanelRoleRow[]>(`/panel/roles${businessQuery(businessId)}`);
}

export function fetchRole(id: string) {
  return panelFetch<PanelRoleRow>(`/panel/roles/${id}`);
}

export function fetchAssignableRoles(businessId?: string) {
  return panelFetch<AssignableRole[]>(
    `/panel/roles/assignable${businessQuery(businessId)}`,
  );
}

export function fetchPermissions(forRole?: string) {
  const q = forRole ? `?forRole=${encodeURIComponent(forRole)}` : '';
  return panelFetch<PermissionRow[]>(`/panel/roles/permissions${q}`);
}

export interface RoleFormPayload {
  businessId: string;
  name: string;
  displayName: string;
  description?: string;
  permissionKeys: string[];
  isActive?: boolean;
  isHidden?: boolean;
}

export function createRole(payload: RoleFormPayload) {
  return panelFetch<PanelRoleRow>('/panel/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRole(id: string, payload: Partial<RoleFormPayload>) {
  return panelFetch<PanelRoleRow>(`/panel/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteRole(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/roles/${id}`, {
    method: 'DELETE',
  });
}
