'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import { fetchMembers } from '@/lib/panel/members';
import type { PanelMemberRow } from '@/lib/panel/types';
import { subscribePanelPresence } from '@/lib/panel-presence-ws';
import { formatTry } from '@/lib/panel/wallet';
import { PageHeader } from '../../components/PageHeader';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { OnlineStatusBadge } from '../../components/OnlineStatusBadge';
import { BTN_PRIMARY, CARD, PAGE } from '../../components/ui';

export function MemberList() {
  const searchParams = useSearchParams();
  const initialBusinessId = searchParams.get('businessId') ?? undefined;
  const { user } = useAuth();
  const canRead = canAccess(user, PERMS.MEMBERS_READ);
  const canWrite = canAccess(user, PERMS.MEMBERS_WRITE);
  const { businessId, setBusinessId } = usePanelBusinessFilter(initialBusinessId);

  const [rows, setRows] = useState<PanelMemberRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    fetchMembers(businessId || undefined)
      .then(setRows)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [businessId, canRead]);

  useEffect(() => {
    if (!canRead) return;
    return subscribePanelPresence(() => {
      fetchMembers(businessId || undefined)
        .then(setRows)
        .catch(() => {});
    });
  }, [businessId, canRead]);

  if (!canRead) {
    return <p className="text-sm text-red-600">Müşteri listesine erişim yok</p>;
  }

  return (
    <div className={PAGE}>
      <PageHeader
        title="Müşteriler"
        description="Web veya panel üzerinden kayıtlı müşteriler"
        action={
          canWrite ? (
            <Link href="/panel/members/create" className={BTN_PRIMARY}>
              Yeni müşteri
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
          <p className="p-6 text-sm text-zinc-500">
            Henüz müşteri yok. Web uygulamasından veya panelden kayıt ekleyin.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">İşletme</th>
                <th className="px-4 py-3 font-medium">Kayıt kaynağı</th>
                <th className="px-4 py-3 font-medium">Bakiye</th>
                <th className="px-4 py-3 font-medium">Teminat</th>
                <th className="px-4 py-3 font-medium">Katılım</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.membershipId}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.user.fullName}</p>
                    <p className="text-xs text-zinc-500">{row.user.email}</p>
                    <p className="text-xs text-zinc-400">{row.user.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <OnlineStatusBadge online={row.isOnline} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/businesses/${row.business.id}`}
                      className="hover:underline"
                    >
                      {row.business.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {row.registeredViaBusiness && (
                      <p>İşletme: {row.registeredViaBusiness.displayName}</p>
                    )}
                    {row.registeredViaApp && (
                      <p>Uygulama: {row.registeredViaApp}</p>
                    )}
                    {!row.registeredViaBusiness && !row.registeredViaApp && (
                      <span>Panel / manuel</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {formatTry(row.wallet.balance)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-amber-700 dark:text-amber-400">
                    {formatTry(row.wallet.marginUsed)}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(row.joinedAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/panel/members/${row.user.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Detay
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
