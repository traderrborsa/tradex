'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import type { DashboardBusinessRow, DashboardOverview } from '@/lib/panel/dashboard';
import { formatTry } from '@/lib/panel/wallet';
import { OnlineStatusBadge } from './OnlineStatusBadge';
import { CARD } from './ui';

type OnlineMember = DashboardOverview['onlineMembers'][number];

interface Props {
  onlineMembers: OnlineMember[];
  businesses: DashboardBusinessRow[];
}

export function OnlineMembersPanel({ onlineMembers, businesses }: Props) {
  const { businessId: defaultBusinessId, singleBusiness } =
    usePanelBusinessFilter();
  const [businessId, setBusinessId] = useState('');

  const filtered = useMemo(() => {
    if (!businessId) return onlineMembers;
    return onlineMembers.filter((m) =>
      m.businesses.some((b) => b.id === businessId),
    );
  }, [onlineMembers, businessId]);

  const businessOptions = useMemo(() => {
    const fromDashboard = businesses.map((b) => ({
      id: b.businessId,
      displayName: b.displayName,
    }));
    if (fromDashboard.length > 0) return fromDashboard;

    const map = new Map<string, string>();
    for (const m of onlineMembers) {
      for (const b of m.businesses) {
        map.set(b.id, b.displayName);
      }
    }
    return [...map.entries()].map(([id, displayName]) => ({ id, displayName }));
  }, [businesses, onlineMembers]);

  useEffect(() => {
    if (businessId) return;
    if (defaultBusinessId) {
      setBusinessId(defaultBusinessId);
      return;
    }
    if (businessOptions.length === 1) {
      setBusinessId(businessOptions[0]!.id);
    }
  }, [businessId, defaultBusinessId, businessOptions]);

  const hideAllOption = singleBusiness || businessOptions.length === 1;

  return (
    <section className={`${CARD} flex min-h-[28rem] w-full flex-col overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Şu an online</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {filtered.length} kişi
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Web uygulamasında oturum açmış ve gezinen müşteriler
          </p>
        </div>

        {businessOptions.length > 0 && (
          <div className="w-full shrink-0 sm:w-auto sm:min-w-[220px]">
            <label className="mb-1 block text-right text-xs font-medium text-zinc-500 sm:text-right">
              İşletme
            </label>
            <select
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              disabled={hideAllOption}
            >
              {!hideAllOption && <option value="">Tümü</option>}
              {businessOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.displayName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[20rem] items-center justify-center p-8 text-sm text-zinc-500">
            {businessId
              ? 'Bu işletmede şu anda online müşteri yok'
              : 'Şu anda online müşteri yok'}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-5 py-3 font-medium">Müşteri</th>
                <th className="px-5 py-3 font-medium">İletişim</th>
                <th className="px-5 py-3 font-medium">İşletme</th>
                <th className="px-5 py-3 font-medium">Bakiye</th>
                <th className="px-5 py-3 font-medium">Katılım</th>
                <th className="px-5 py-3 font-medium">Durum</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.userId}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-xs text-zinc-500">{m.email}</p>
                  </td>
                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                    {m.phone || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      {m.businesses.map((b) => (
                        <Link
                          key={b.id}
                          href={`/panel/businesses/${b.id}`}
                          className="text-xs hover:underline"
                        >
                          {b.displayName}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-sm">
                    {formatTry(m.balance)}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-500">
                    {new Date(m.joinedAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-5 py-4">
                    <OnlineStatusBadge online />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/panel/members/${m.userId}`}
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
    </section>
  );
}
