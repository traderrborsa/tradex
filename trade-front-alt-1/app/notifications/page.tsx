'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { MOBILE_NAV_PB } from '@/lib/layout';

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, loading, markRead, markAllRead, unreadCount } =
    useNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!user) {
    return (
      <div className={`flex min-h-screen flex-col bg-background ${MOBILE_NAV_PB}`}>
        <AppHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 p-6">
          <p className="text-sm text-muted">
            Bildirimleri görmek için{' '}
            <Link href="/login" className="font-medium text-accent hover:underline">
              giriş yapın
            </Link>
            .
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col bg-background text-foreground ${MOBILE_NAV_PB}`}>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bildirimler</h1>
            <p className="mt-1 text-sm text-muted">
              {unreadCount > 0
                ? `${unreadCount} okunmamış bildirim`
                : 'Tüm bildirimler okundu'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="corp-btn-outline cursor-pointer text-sm"
            >
              Tümünü okundu işaretle
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted">Yükleniyor…</p>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">Henüz bildiriminiz yok.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read) void markRead(n.id);
                  }}
                  className={`w-full cursor-pointer rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:bg-hover ${
                    !n.read ? 'border-accent/30 bg-accent-soft/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foreground">{n.title}</p>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">{n.message}</p>
                  <p className="mt-2 text-xs text-muted/80">
                    {formatTime(n.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
