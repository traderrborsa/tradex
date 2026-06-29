export interface AuthUserRecord {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;
  roles: { name: string; displayName: string }[];
  permissions: string[];
}

export function hasPermission(
  user: Pick<AuthUserRecord, 'permissions'> | null | undefined,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false;
}

export function isAdminRole(
  user: Pick<AuthUserRecord, 'permissions'> | null | undefined,
): boolean {
  return hasPermission(user, 'trading:bypass-market-hours');
}
