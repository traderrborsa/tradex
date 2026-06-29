'use client';

import { useEffect, useState } from 'react';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import {
  fetchAllPermissions,
  updatePermissionAdminOnly,
  type PermissionAdminRow,
} from '@/lib/panel/permissions';
import { PageHeader } from '../../components/PageHeader';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { CARD } from '../../components/ui';

export function PermissionList() {
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [rows, setRows] = useState<PermissionAdminRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPermissions(businessId || undefined)
      .then(setRows)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  async function toggleAdminOnly(row: PermissionAdminRow) {
    setSavingId(row.id);
    setError(null);
    try {
      const updated = await updatePermissionAdminOnly(
        row.id,
        !row.adminOnly,
        businessId || undefined,
      );
      setRows((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="İzinler"
        description="İşletme bazında rol-izin eşlemesi. Admin-only izinler yalnızca admin rolüne atanabilir."
      />

      <BusinessFilterSelect value={businessId} onChange={setBusinessId} />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className={`${CARD} overflow-hidden`}>
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">İzin</th>
                <th className="px-4 py-3 font-medium">Kod</th>
                <th className="px-4 py-3 font-medium">Rol sayısı</th>
                <th className="px-4 py-3 font-medium">Admin only</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.displayName}</p>
                    {row.description && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {row.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {row.key}
                  </td>
                  <td className="px-4 py-3">{row.roleCount}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.adminOnly}
                        disabled={savingId === row.id}
                        onChange={() => void toggleAdminOnly(row)}
                      />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {row.adminOnly ? 'Sadece admin' : 'Herkes görebilir'}
                      </span>
                    </label>
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
