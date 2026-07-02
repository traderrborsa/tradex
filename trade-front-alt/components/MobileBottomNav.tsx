'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsOptional } from '@/contexts/NotificationsContext';

const TABS = [
  {
    href: '/',
    label: 'Keşfet',
    match: (p: string) => p === '/' || p.startsWith('/search') || p.startsWith('/symbol'),
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} className="h-6 w-6" aria-hidden>
        <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/portfolio',
    label: 'Portföy',
    match: (p: string) => p.startsWith('/portfolio'),
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} className="h-6 w-6" aria-hidden>
        <path d="M4 7h16v12H4z" strokeLinejoin="round" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 11h16" />
      </svg>
    ),
  },
] as const;

const HIDDEN_PREFIXES = ['/login', '/register'];

function NotificationTab({ active }: { active: boolean }) {
  const notifications = useNotificationsOptional();
  const unread = notifications?.unreadCount ?? 0;

  return (
    <Link
      href="/notifications"
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
        active ? 'text-accent' : 'text-muted'
      }`}
    >
      <span className="relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} className="h-6 w-6" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-negative px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </span>
      Bildirim
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const showNotifications = Boolean(user);

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
      aria-label="Ana navigasyon"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch">
        {TABS.map(({ href, label, match, icon }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              {icon(active)}
              {label}
            </Link>
          );
        })}
        {showNotifications && (
          <NotificationTab active={pathname.startsWith('/notifications')} />
        )}
      </div>
    </nav>
  );
}
