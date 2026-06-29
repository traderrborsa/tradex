import { panelFetch } from './client';
import type { PermissionRow } from './types';

export interface PermissionAdminRow extends PermissionRow {
  adminOnly: boolean;
  roleCount: number;
}

function businessQuery(businessId?: string) {
  return businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
}

export function fetchAllPermissions(businessId?: string) {
  return panelFetch<PermissionAdminRow[]>(
    `/panel/permissions${businessQuery(businessId)}`,
  );
}

export function updatePermissionAdminOnly(
  id: string,
  adminOnly: boolean,
  businessId?: string,
) {
  const q = businessQuery(businessId);
  return panelFetch<PermissionAdminRow>(`/panel/permissions/${id}${q}`, {
    method: 'PATCH',
    body: JSON.stringify({ adminOnly }),
  });
}
