"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTrading } from "@/contexts/TradingContext";
import { BrandLogo } from "@/components/BrandLogo";
import { MarketTicker } from "@/components/MarketTicker";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { formatMoney } from "@/lib/format-money";
import { SymbolSearch } from "./SymbolSearch";

interface Props {
  showSearch?: boolean;
  searchQuery?: string;
}

const NAV = [
  { href: '/', label: 'Piyasalar' },
  { href: '/portfolio', label: 'Hesabım' },
] as const;

function ProfileAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent text-xs font-bold text-accent-fg sm:h-9 sm:w-9 sm:text-sm">
      {initial}
    </span>
  );
}

const MENU_ITEM =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary transition hover:bg-hover hover:text-foreground";

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">
      {children}
    </span>
  );
}

function PortfolioMenuIcon() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden>
        <path d="M4 7h16v12H4z" strokeLinejoin="round" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 11h16" />
      </svg>
    </MenuIcon>
  );
}

function UserMenuIcon() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
      </svg>
    </MenuIcon>
  );
}

function FinanceMenuIcon() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M16 14.5h2" strokeLinecap="round" />
      </svg>
    </MenuIcon>
  );
}

function RequestsMenuIcon() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden>
        <path d="M7 3h7l5 5v13a0 0 0 0 1 0 0H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
        <path d="M14 3v5h5" strokeLinejoin="round" />
        <path d="M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    </MenuIcon>
  );
}

function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { portfolio } = useTrading();
  const [open, setOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const copyId = useCallback(async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 1500);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const confirmLogout = useCallback(() => {
    setLogoutConfirmOpen(false);
    close();
    logout();
    router.push("/");
  }, [close, logout, router]);

  useEffect(() => {
    if (!open && !logoutConfirmOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (logoutConfirmOpen) return;
      if (rootRef.current?.contains(e.target as Node)) return;
      close();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (logoutConfirmOpen) setLogoutConfirmOpen(false);
        else close();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, logoutConfirmOpen, close]);

  if (!user) return null;

  const displayName = user.fullName?.trim() || user.email;

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex cursor-pointer items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-hover sm:gap-2 sm:pr-3"
        >
          <ProfileAvatar name={displayName} />
          <span className="hidden text-sm font-semibold text-foreground sm:inline">
            {displayName.split(' ')[0]}
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,260px)] overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-lg"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="rounded-xl bg-surface px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void copyId();
                }}
                title="ID'yi kopyala"
                className="mt-0.5 flex w-full items-center gap-1 text-xs text-muted transition hover:text-foreground"
              >
                <span className="truncate font-mono">ID: {user.id}</span>
                {copiedId ? (
                  <span className="shrink-0 text-emerald-500">✓</span>
                ) : (
                  <svg
                    className="h-3 w-3 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
              <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
                {formatMoney(portfolio.balance, { fractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted">Kullanılabilir bakiye</p>
            </div>

            <div className="mt-1 space-y-0.5">
              <Link href="/profile" role="menuitem" onClick={close} className={MENU_ITEM}>
                <UserMenuIcon />
                Profil
              </Link>
              <Link href="/finance" role="menuitem" onClick={close} className={MENU_ITEM}>
                <FinanceMenuIcon />
                Finansal İşlemler
              </Link>
              <Link href="/portfolio" role="menuitem" onClick={close} className={MENU_ITEM}>
                <PortfolioMenuIcon />
                Portföy
              </Link>
              <Link href="/requests" role="menuitem" onClick={close} className={MENU_ITEM}>
                <RequestsMenuIcon />
                Taleplerim
              </Link>
            </div>

            <div className="my-1 border-t border-border" />

            <button
              type="button"
              role="menuitem"
              onClick={() => { close(); setLogoutConfirmOpen(true); }}
              className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm font-medium text-negative transition hover:bg-hover"
            >
              Çıkış yap
            </button>
          </div>
        )}
      </div>

      {mounted && logoutConfirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-[var(--overlay)] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 id="logout-confirm-title" className="text-lg font-bold text-foreground">Çıkış yap</h2>
            <p className="mt-2 text-sm text-muted">Hesabından çıkış yapılacak.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setLogoutConfirmOpen(false)} className="corp-btn-outline flex-1 cursor-pointer">İptal</button>
              <button type="button" onClick={confirmLogout} className="flex-1 cursor-pointer rounded-full bg-negative py-3 text-sm font-semibold text-white transition hover:opacity-90">Çıkış yap</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function AppHeader({ showSearch = false, searchQuery }: Props) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { portfolio } = useTrading();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="fx-header-bar h-0.5" />
        <MarketTicker />
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-sm px-4 py-2 text-sm font-bold uppercase tracking-wide transition ${
                    active
                      ? 'border-b-2 border-accent bg-accent-soft text-accent'
                      : 'text-muted hover:bg-hover hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {showSearch && (
            <div className="hidden min-w-0 flex-1 lg:block">
              <SymbolSearch compact initialQuery={searchQuery} />
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            {user ? (
              <>
                <NotificationDropdown />
                <Link
                  href="/portfolio"
                  className="hidden items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold tabular-nums transition hover:bg-hover sm:inline-flex sm:px-4 sm:py-2 sm:text-sm"
                >
                  {formatMoney(portfolio.balance, { fractionDigits: 0 })}
                </Link>
                <UserMenu />
              </>
            ) : (
              !authLoading && (
                <>
                  <Link href="/login" className="corp-btn-ghost hidden text-sm sm:inline-flex">Giriş</Link>
                  <Link href="/register" className="corp-btn inline-flex px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm">Kayıt ol</Link>
                </>
              )
            )}
          </div>
        </div>

        {showSearch && (
          <div className="border-t border-border px-3 py-2 lg:hidden">
            <SymbolSearch compact initialQuery={searchQuery} />
          </div>
        )}
      </header>

      <MobileBottomNav />
    </>
  );
}
