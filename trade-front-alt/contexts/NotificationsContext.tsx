'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  isTradeAlertType,
  markAllNotificationsRead,
  markNotificationRead,
  type MemberNotification,
} from '@/lib/notifications-api';
import {
  connectNotifications,
  getNotificationsToken,
  subscribeNotifications,
} from '@/lib/notifications-ws';

interface NotificationsContextValue {
  notifications: MemberNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  showTradeAlert: (notification: MemberNotification) => void;
  tradeAlert: MemberNotification | null;
  dismissTradeAlert: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

function showToast(notification: MemberNotification) {
  if (isTradeAlertType(notification.type)) return;

  const isPositive =
    notification.type.includes('approved') ||
    notification.type === 'take_profit';
  const isNegative =
    notification.type.includes('rejected') ||
    notification.type === 'stop_loss';

  toast(notification.title, {
    type: isNegative ? 'error' : isPositive ? 'success' : 'info',
    autoClose: 5000,
  });
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tradeAlert, setTradeAlert] = useState<MemberNotification | null>(null);

  const dismissTradeAlert = useCallback(() => setTradeAlert(null), []);

  const showTradeAlert = useCallback((notification: MemberNotification) => {
    setTradeAlert(notification);
    window.setTimeout(() => setTradeAlert(null), 4000);
  }, []);

  const handleIncoming = useCallback(
    (notification: MemberNotification) => {
      let isNew = false;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        isNew = true;
        return [notification, ...prev].slice(0, 50);
      });
      if (!isNew) return;

      if (!notification.read) {
        setUnreadCount((c) => c + 1);
      }

      if (isTradeAlertType(notification.type)) {
        showTradeAlert(notification);
      } else {
        showToast(notification);
      }
    },
    [showTradeAlert],
  );

  const syncUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setTradeAlert(null);
      return;
    }
    void refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    const token = getNotificationsToken();
    if (!token) return;

    const disconnect = connectNotifications(token);
    const unsubscribe = subscribeNotifications(handleIncoming);

    return () => {
      unsubscribe();
      disconnect();
    };
  }, [user?.id, handleIncoming]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => {
      void syncUnreadCount();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, syncUnreadCount]);

  const markRead = useCallback(
    async (id: string) => {
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
    [refresh, syncUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
    } catch {
      await refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      showTradeAlert,
      tradeAlert,
      dismissTradeAlert,
    }),
    [
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      showTradeAlert,
      tradeAlert,
      dismissTradeAlert,
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
