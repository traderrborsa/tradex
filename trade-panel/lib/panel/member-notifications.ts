import { panelFetch } from './client';

export function sendMemberNotification(body: {
  title: string;
  message: string;
  businessId: string;
  userIds?: string[];
  href?: string;
}) {
  return panelFetch<{ ok: boolean; count: number }>(
    '/panel/member-notifications/send',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}
