'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BusinessFilterSelect } from '../components/BusinessFilterSelect';
import { CARD } from '../components/ui';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type PanelNotification,
} from '@/lib/panel/notifications';

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NotificationsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.NOTIFICATIONS_WRITE);

  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNotifications(
        50,
        0,
        businessId || undefined,
      );
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleItemClick(
    id: string,
    href: string | null,
    read: boolean,
  ) {
    if (!read && canWrite) {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (href) router.push(href);
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <div>
      <BusinessFilterSelect value={businessId} onChange={setBusinessId} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Bildirimler
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-zinc-500">{unreadCount} okunmamış</p>
          )}
        </div>
        {canWrite && unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="cursor-pointer text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      <div className={`${CARD} overflow-hidden`}>
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : notifications.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Henüz bildirim yok</p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li
                key={n.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => void handleItemClick(n.id, n.href, n.read)}
                  className={`flex w-full cursor-pointer gap-3 px-4 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    !n.read ? 'bg-blue-50/40 dark:bg-blue-950/15' : ''
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read ? 'bg-transparent' : 'bg-blue-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {n.message}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                  {n.href && (
                    <Link
                      href={n.href}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 self-center text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Git →
                    </Link>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <PermissionGate permission={PERMS.NOTIFICATIONS_READ}>
      <NotificationsContent />
    </PermissionGate>
  );
}
