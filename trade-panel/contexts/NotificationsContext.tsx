'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { playNotificationSound } from '@/lib/notification-sound';
import { subscribePanelNotifications } from '@/lib/panel-notifications-ws';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type PanelNotification,
} from '@/lib/panel/notifications';

interface NotificationsContextValue {
  notifications: PanelNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  prepend: (notification: PanelNotification) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const canRead = canAccess(user, PERMS.NOTIFICATIONS_READ);
  const canWrite = canAccess(user, PERMS.NOTIFICATIONS_WRITE);

  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const syncUnreadCount = useCallback(async () => {
    if (!canRead) return;
    try {
      const { count } = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  }, [canRead]);

  const refresh = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [list, unread] = await Promise.all([
        fetchNotifications(50, 0),
        fetchUnreadNotificationCount(),
      ]);
      setNotifications(list);
      setUnreadCount(unread.count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    if (!canRead) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void refresh();
  }, [canRead, refresh]);

  useEffect(() => {
    if (!canRead) return;
    const onFocus = () => {
      void syncUnreadCount();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [canRead, syncUnreadCount]);

  useEffect(() => {
    if (!canRead) return;

    return subscribePanelNotifications((notification) => {
      let isNew = false;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        isNew = true;
        return [notification, ...prev].slice(0, 50);
      });
      if (isNew && !notification.read) {
        setUnreadCount((c) => c + 1);
        playNotificationSound();
      }
    });
  }, [canRead]);

  const markRead = useCallback(
    async (id: string) => {
      if (!canWrite) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      try {
        await markNotificationRead(id);
        await syncUnreadCount();
      } catch {
        await refresh();
      }
    },
    [canWrite, refresh, syncUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    if (!canWrite) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
    } catch {
      await refresh();
    }
  }, [canWrite, refresh]);

  const prepend = useCallback((notification: PanelNotification) => {
    let isNew = false;
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev;
      isNew = true;
      return [notification, ...prev].slice(0, 50);
    });
    if (isNew && !notification.read) {
      setUnreadCount((c) => c + 1);
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      prepend,
    }),
    [
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      prepend,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotifications NotificationsProvider içinde kullanılmalı',
    );
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
