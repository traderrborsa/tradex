'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess, isAdmin } from '@/lib/auth';
import { fetchDashboardOverview, type DashboardOverview } from '@/lib/panel/dashboard';
import { PERMS } from '@/lib/permissions';
import { subscribePanelPresence } from '@/lib/panel-presence-ws';
import { DashboardCharts } from './DashboardCharts';
import { PageHeader } from './PageHeader';
import { BTN_SECONDARY, CARD, PAGE } from './ui';

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canViewStats = canAccess(user, PERMS.DASHBOARD_READ);

  const loadDashboard = () => {
    if (!user || !canViewStats) return;
    fetchDashboardOverview()
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Dashboard yüklenemedi'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || !canViewStats) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    loadDashboard();
  }, [user, canViewStats]);

  useEffect(() => {
    if (!user || !canViewStats) return;
    return subscribePanelPresence(() => {
      fetchDashboardOverview()
        .then(setData)
        .catch(() => {});
    });
  }, [user, canViewStats]);

  if (!user) return null;

  return (
    <div className={PAGE}>
      <PageHeader
        title="Dashboard"
        description={
          isAdmin(user)
            ? `Hoş geldin, ${user.fullName} — tüm işletmeler`
            : `Hoş geldin, ${user.fullName}`
        }
      />

      {canViewStats ? (
        <>
          {loading && (
            <p className="text-sm text-zinc-500">İstatistikler yükleniyor…</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {data && <DashboardCharts data={data} />}
        </>
      ) : (
        <div className={`${CARD} p-6 text-sm text-zinc-500`}>
          Dashboard istatistiklerini görüntüleme yetkiniz yok.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canAccess(user, PERMS.USERS_READ) && (
          <Link href="/panel/users" className={`${CARD} block p-5 transition hover:border-zinc-400`}>
            <p className="font-medium">Panel kullanıcıları</p>
            <p className="mt-1 text-sm text-zinc-500">Admin ve panel personeli</p>
          </Link>
        )}
        {canAccess(user, PERMS.BUSINESSES_READ) && (
          <Link href="/panel/businesses" className={`${CARD} block p-5 transition hover:border-zinc-400`}>
            <p className="font-medium">İşletmeler</p>
            <p className="mt-1 text-sm text-zinc-500">Marka ve müşteri yönetimi</p>
          </Link>
        )}
        {canAccess(user, PERMS.MEMBERS_READ) && (
          <Link href="/panel/members" className={`${CARD} block p-5 transition hover:border-zinc-400`}>
            <p className="font-medium">Müşteriler</p>
            <p className="mt-1 text-sm text-zinc-500">Web müşterileri</p>
          </Link>
        )}
        {canAccess(user, PERMS.FINANCE_READ) && (
          <Link href="/panel/finance" className={`${CARD} block p-5 transition hover:border-zinc-400`}>
            <p className="font-medium">Finans</p>
            <p className="mt-1 text-sm text-zinc-500">Yatırma ve çekim talepleri</p>
          </Link>
        )}
        {canAccess(user, PERMS.TRANSACTIONS_READ) && (
          <Link href="/panel/positions/open" className={`${CARD} block p-5 transition hover:border-zinc-400`}>
            <p className="font-medium">İşlemler</p>
            <p className="mt-1 text-sm text-zinc-500">Açık, bekleyen ve kapanan</p>
          </Link>
        )}
      </div>

      <section className={`${CARD} p-6`}>
        <h2 className="text-sm font-semibold">Hesabınız</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <span
              key={role.name}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
            >
              {role.displayName}
            </span>
          ))}
        </div>
        {canAccess(user, PERMS.USERS_READ) && (
          <Link href="/panel/users" className={`${BTN_SECONDARY} mt-4 inline-flex`}>
            Kullanıcılara git
          </Link>
        )}
      </section>
    </div>
  );
}
