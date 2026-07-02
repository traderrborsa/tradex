'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const notifications = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!user) return null;

  const { notifications: items, unreadCount, markRead, markAllRead } =
    notifications;
  const recent = items.slice(0, 8);

  async function handleClick(id: string, href: string | null, read: boolean) {
    if (!read) await markRead(id);
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirimler"
        className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-hover hover:text-foreground"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-negative px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,320px)] overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Bildirimler
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="cursor-pointer text-xs font-medium text-accent hover:underline"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Bildirim yok
              </p>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleClick(n.id, n.href, n.read)}
                  className={`w-full cursor-pointer border-b border-border px-4 py-3 text-left transition last:border-0 hover:bg-hover ${
                    !n.read ? 'bg-accent-soft/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[11px] text-muted/80">
                    {formatTime(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block cursor-pointer py-1.5 text-center text-sm font-medium text-accent hover:underline"
            >
              Tüm bildirimleri gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
