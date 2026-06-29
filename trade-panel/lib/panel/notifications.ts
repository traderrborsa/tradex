import { apiFetch } from '../api';

export interface PanelNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}

export function fetchNotifications(take = 50, skip = 0, businessId?: string) {
  const params = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  });
  if (businessId) params.set('businessId', businessId);
  return apiFetch<PanelNotification[]>(`/panel/notifications?${params}`);
}

export function fetchUnreadNotificationCount(businessId?: string) {
  const q = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
  return apiFetch<{ count: number }>(`/panel/notifications/unread-count${q}`);
}

export function markNotificationRead(id: string) {
  return apiFetch<{ ok: boolean }>(`/panel/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return apiFetch<{ ok: boolean; count?: number }>(
    '/panel/notifications/read-all',
    { method: 'PATCH' },
  );
}
