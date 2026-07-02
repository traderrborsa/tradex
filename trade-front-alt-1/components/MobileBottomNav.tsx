'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsOptional } from '@/contexts/NotificationsContext';

const TABS = [
  {
    href: '/',
    label: 'Piyasalar',
    match: (p: string) => p === '/' || p.startsWith('/search') || p.startsWith('/symbol'),
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} className="h-6 w-6" aria-hidden>
        <path d="M3 3v18h18" strokeLinecap="round" />
        <path d="M7 14l4-4 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/portfolio',
    label: 'Hesabım',
    match: (p: string) => p.startsWith('/portfolio'),
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} className="h-6 w-6" aria-hidden>
        <rect x="3" y="7" width="18" height="14" rx="1" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
        <path d="M3 11h18" />
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
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition ${
        active ? 'text-accent' : 'text-muted'
      }`}
    >
      {active && (
        <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />
      )}
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
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t-2 border-accent/30 bg-card/98 backdrop-blur-md md:hidden"
      aria-label="Ana navigasyon"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch">
        {TABS.map(({ href, label, match, icon }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />
              )}
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
