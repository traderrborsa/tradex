'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { fetchBusinesses } from '@/lib/panel/businesses';
import type { PanelBusinessRow } from '@/lib/panel/types';
import { PageHeader } from '../../components/PageHeader';
import { BTN_PRIMARY, CARD, PAGE } from '../../components/ui';

export function BusinessList() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.BUSINESSES_WRITE);
  const [rows, setRows] = useState<PanelBusinessRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses()
      .then(setRows)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={PAGE}>
      <PageHeader
        title="İşletmeler"
        description="Marka ve işletme yönetimi"
        action={
          canWrite ? (
            <Link href="/panel/businesses/create" className={BTN_PRIMARY}>
              Yeni işletme
            </Link>
          ) : undefined
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className={`${CARD} overflow-hidden`}>
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">İşletme bulunamadı</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">İşletme</th>
                <th className="px-4 py-3 font-medium">Kod</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 font-medium">{row.displayName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {row.name}
                  </td>
                  <td className="px-4 py-3">{row.memberCount}</td>
                  <td className="px-4 py-3">
                    {row.isActive ? (
                      <span className="text-emerald-600">Aktif</span>
                    ) : (
                      <span className="text-red-600">Pasif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/panel/businesses/${row.id}`}
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
