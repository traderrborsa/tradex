import { apiFetch } from './trading-api';
import { resolveActiveBusinessId } from './business';

export interface MemberNotification {
  id: string;
  userId: string;
  businessId: string | null;
  type: string;
  title: string;
  message: string;
  href: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}

function businessQuery() {
  const businessId = resolveActiveBusinessId();
  return businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
}

export function fetchNotifications(take = 50, skip = 0) {
  const businessId = resolveActiveBusinessId();
  const params = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  });
  if (businessId) params.set('businessId', businessId);
  return apiFetch<MemberNotification[]>(`/notifications?${params}`);
}

export function fetchUnreadNotificationCount() {
  return apiFetch<{ count: number }>(
    `/notifications/unread-count${businessQuery()}`,
  );
}

export function markNotificationRead(id: string) {
  return apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return apiFetch<{ ok: boolean; count?: number }>(
    `/notifications/read-all${businessQuery()}`,
    { method: 'PATCH' },
  );
}

export function isTradeAlertType(type: string) {
  return (
    type === 'trade_buy' ||
    type === 'trade_sell' ||
    type === 'position_closed' ||
    type === 'take_profit' ||
    type === 'stop_loss'
  );
}
