"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTrading } from "@/contexts/TradingContext";
import { BrandLogo } from "@/components/BrandLogo";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerificationRequiredModal } from "@/components/VerificationRequiredModal";
import { formatMoney } from "@/lib/format-money";
import { userNeedsVerification } from "@/lib/verification";
import { SymbolSearch } from "./SymbolSearch";

interface Props {
  showSearch?: boolean;
  searchQuery?: string;
}

const NAV = [
  { href: '/', label: 'Keşfet' },
  { href: '/portfolio', label: 'Portföy' },
] as const;

function ProfileAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-fg sm:h-9 sm:w-9 sm:text-sm">
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

function WithdrawMenuIcon() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden>
        <path d="M12 3v12" strokeLinecap="round" />
        <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 21h14" strokeLinecap="round" />
      </svg>
    </MenuIcon>
  );
}

function DepositMenuIcon() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden>
        <path d="M12 21V9" strokeLinecap="round" />
        <path d="m7 14 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 3h14" strokeLinecap="round" />
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
  const [financeVerifyOpen, setFinanceVerifyOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const openFinance = useCallback(
    (path: "/portfolio/withdraw" | "/portfolio/deposit") => {
      close();
      if (userNeedsVerification(user)) {
        setFinanceVerifyOpen(true);
        return;
      }
      router.push(path);
    },
    [close, router, user],
  );

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
              <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
              <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
                {formatMoney(portfolio.balance, { fractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted">Kullanılabilir bakiye</p>
            </div>

            <div className="mt-1 space-y-0.5">
              <Link href="/profile" role="menuitem" onClick={close} className={MENU_ITEM}>Profil</Link>
              <Link href="/portfolio" role="menuitem" onClick={close} className={MENU_ITEM}>
                <PortfolioMenuIcon />
                Portföy
              </Link>
              <button type="button" role="menuitem" onClick={() => openFinance("/portfolio/deposit")} className={`${MENU_ITEM} w-full cursor-pointer text-left`}>
                <DepositMenuIcon />
                Para yatır
              </button>
              <button type="button" role="menuitem" onClick={() => openFinance("/portfolio/withdraw")} className={`${MENU_ITEM} w-full cursor-pointer text-left`}>
                <WithdrawMenuIcon />
                Para çek
              </button>
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

      <VerificationRequiredModal
        open={financeVerifyOpen}
        onClose={() => setFinanceVerifyOpen(false)}
        user={user}
        title="Para yatırma / çekme için doğrulama gerekli"
        description="Para yatırma ve çekme işlemlerine geçmeden önce hesabınızı doğrulamanız gerekiyor."
      />

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
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
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
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-foreground'
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
