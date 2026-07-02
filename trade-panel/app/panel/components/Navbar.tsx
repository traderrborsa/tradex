'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { canAccess, isAdmin } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileDropdown } from './ProfileDropdown';
import { ThemeToggle } from './ThemeToggle';

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Navbar() {
  const { user } = useAuth();
  const { businesses, activeBusiness, activeBusinessId, setActiveBusinessId } =
    useBusiness();
  const { open: sidebarOpen, toggle } = useSidebar();
  const canNotifications = canAccess(user, PERMS.NOTIFICATIONS_READ);

  if (!user) return null;

  const viewerIsAdmin = isAdmin(user);
  const showBusinessSelect = businesses.length > 1;

  const subtitle =
    activeBusiness?.displayName ??
    (businesses.length === 1 ? businesses[0]?.displayName : null) ??
    'Yönetim Paneli';

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
      <button
        type="button"
        onClick={toggle}
        aria-label={sidebarOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-widest text-zinc-500">
          TRADEX
        </p>
        {showBusinessSelect ? (
          <select
            value={activeBusinessId ?? ''}
            onChange={(e) =>
              setActiveBusinessId(e.target.value ? e.target.value : null)
            }
            className="mt-0.5 max-w-[min(100%,14rem)] cursor-pointer truncate rounded border border-zinc-200 bg-white px-2 py-0.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            aria-label="Aktif işletme"
          >
            {viewerIsAdmin && <option value="">Tüm işletmeler</option>}
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.displayName}
              </option>
            ))}
          </select>
        ) : (
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {canNotifications && <NotificationDropdown />}
        <ProfileDropdown />
      </div>
    </header>
  );
}
