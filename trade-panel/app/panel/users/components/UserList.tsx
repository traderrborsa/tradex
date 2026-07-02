'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import { fetchUsers } from '@/lib/panel/users';
import type { PanelUserRow } from '@/lib/panel/types';
import { PageHeader } from '../../components/PageHeader';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { BTN_PRIMARY, CARD } from '../../components/ui';

export function UserList() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.USERS_WRITE);
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [rows, setRows] = useState<PanelUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUsers(businessId || undefined)
      .then(setRows)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  return (
    <div>
      <PageHeader
        title="Panel kullanıcıları"
        description="Yönetim paneli personeli — web müşterileri burada görünmez"
        action={
          canWrite ? (
            <Link href="/panel/users/create" className={BTN_PRIMARY}>
              Yeni kullanıcı
            </Link>
          ) : undefined
        }
      />

      <BusinessFilterSelect value={businessId} onChange={setBusinessId} />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className={`${CARD} overflow-hidden`}>
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Kullanıcı bulunamadı</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Roller</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">{row.fullName}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.roles.map((r) => (
                        <span
                          key={r.id}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                        >
                          {r.displayName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/panel/users/${row.id}`}
                      className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
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
