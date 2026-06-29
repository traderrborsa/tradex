'use client';

import { useAuth } from '@/contexts/AuthContext';
import { canAccess, isAdmin } from '@/lib/auth';
import type { PermissionKey } from '@/lib/permissions';
import { CARD } from './ui';

interface Props {
  permission?: PermissionKey | PermissionKey[];
  adminOnly?: boolean;
  children: React.ReactNode;
}

function AccessDenied() {
  return (
    <div className={`${CARD} p-8 text-center`}>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        Bu sayfaya erişim yetkiniz yok
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        Gerekli izinlere sahip değilsiniz veya yöneticinizle iletişime geçin.
      </p>
    </div>
  );
}

export function PermissionGate({
  permission,
  adminOnly,
  children,
}: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="text-sm text-zinc-500">Yükleniyor…</p>;
  }

  if (adminOnly && !isAdmin(user)) {
    return <AccessDenied />;
  }

  if (permission) {
    const keys = Array.isArray(permission) ? permission : [permission];
    if (!keys.some((key) => canAccess(user, key))) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}
