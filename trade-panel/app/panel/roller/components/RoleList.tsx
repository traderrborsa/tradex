'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess, isAdmin } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import { fetchRoles } from '@/lib/panel/roles';
import type { PanelRoleRow } from '@/lib/panel/types';
import { PageHeader } from '../../components/PageHeader';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { BTN_PRIMARY, CARD } from '../../components/ui';

function StatusBadge({
  active,
  hidden,
}: {
  active: boolean;
  hidden: boolean;
}) {
  if (!active) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
        Pasif
      </span>
    );
  }
  if (hidden) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        Gizli
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      Aktif
    </span>
  );
}

export function RoleList() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.ROLES_WRITE);
  const viewerIsAdmin = isAdmin(user);
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [rows, setRows] = useState<PanelRoleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles(businessId || undefined)
      .then(setRows)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  return (
    <div>
      <PageHeader
        title="Roller"
        description="Rolleri ve izinleri yönetin"
        action={
          canWrite ? (
            <Link href="/panel/roller/create" className={BTN_PRIMARY}>
              Yeni rol
            </Link>
          ) : undefined
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!viewerIsAdmin && (
        <BusinessFilterSelect value={businessId} onChange={setBusinessId} />
      )}

      <div className={`${CARD} overflow-hidden`}>
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Rol bulunamadı</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">İşletme</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Kod</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Kullanıcı</th>
                <th className="px-4 py-3 font-medium">İzin</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {row.businessName ?? (row.isSystem ? 'Sistem' : '—')}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {row.displayName}
                    {row.isSystem && viewerIsAdmin && (
                      <span className="ml-2 text-xs text-zinc-400">sistem</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {row.name}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={row.isActive} hidden={row.isHidden} />
                  </td>
                  <td className="px-4 py-3">{row.userCount}</td>
                  <td className="px-4 py-3">{row.permissions.length}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/panel/roller/${row.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Görüntüle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
