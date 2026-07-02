export interface PanelRole {
  name: string;
  displayName: string;
}

export interface PanelBusinessBrief {
  id: string;
  name: string;
  displayName: string;
  slug: string;
}

export interface PanelUser {
  id: string;
  email: string;
  fullName: string;
  roles: PanelRole[];
  permissions: string[];
  createdAt: string;
  businesses: PanelBusinessBrief[];
}

export function hasPermission(
  user: Pick<PanelUser, 'permissions'> | null | undefined,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false;
}

export function hasAnyPermission(
  user: Pick<PanelUser, 'permissions'> | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function isAdmin(
  user: Pick<PanelUser, 'roles'> | null | undefined,
): boolean {
  return user?.roles.some((r) => r.name === 'admin') ?? false;
}

/** Yalnızca atanmış izinlere göre erişim (admin dahil bypass yok). */
export function canAccess(
  user: Pick<PanelUser, 'permissions' | 'roles'> | null | undefined,
  permission: string,
): boolean {
  return hasPermission(user, permission);
}
