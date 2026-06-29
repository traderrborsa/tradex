"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTrading } from "@/contexts/TradingContext";
import { BrandLogo } from "@/components/BrandLogo";
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
  { href: "/", label: "Piyasalar" },
  { href: "/portfolio", label: "Portföy" },
] as const;

function ProfileIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-elevated text-secondary">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const MENU_ITEM =
  "flex items-center gap-2.5 px-4 py-2.5 text-sm text-secondary transition hover:bg-elevated hover:text-foreground";

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted">
      {children}
    </span>
  );
}

function PortfolioMenuIcon() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden>
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden>
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden>
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

  return (
    <>
      <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-card py-2 pl-2 pr-3 text-sm transition hover:border-border-strong"
      >
        <ProfileIcon />
        <span className="font-medium text-foreground">Hesabım</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] overflow-hidden rounded-xl border border-border-strong bg-card py-1 shadow-xl shadow-black/40"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">
              {user.email}
            </p>
            <p className="mt-1 text-xs text-muted">
              Bakiye:{' '}
              <span className="font-mono text-secondary">
                {formatMoney(portfolio.balance, { fractionDigits: 0 })}
              </span>
            </p>
          </div>

          <Link
            href="/profile"
            role="menuitem"
            onClick={close}
            className={MENU_ITEM}
          >
            <ProfileIcon />
            Profilim
          </Link>

          <Link
            href="/portfolio"
            role="menuitem"
            onClick={close}
            className={MENU_ITEM}
          >
            <PortfolioMenuIcon />
            Portföy
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => openFinance("/portfolio/withdraw")}
            className={`${MENU_ITEM} w-full cursor-pointer text-left`}
          >
            <WithdrawMenuIcon />
            Para çek
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => openFinance("/portfolio/deposit")}
            className={`${MENU_ITEM} w-full cursor-pointer text-left`}
          >
            <DepositMenuIcon />
            Para yatır
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              setLogoutConfirmOpen(true);
            }}
            className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-elevated"
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

      {mounted &&
        logoutConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={() => setLogoutConfirmOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-border-strong bg-card p-6 shadow-xl shadow-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="logout-confirm-title"
                className="text-lg font-semibold text-foreground"
              >
                Emin misin?
              </h2>
              <p className="mt-2 text-sm text-muted">
                Hesabından çıkış yapılacak.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="cursor-pointer rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-secondary transition hover:bg-elevated hover:text-foreground"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
                >
                  Çıkış yap
                </button>
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:px-6 lg:px-8">
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
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-elevated text-foreground"
                    : "text-muted hover:text-foreground"
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

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/portfolio"
                className="hidden h-[36px] items-center gap-1.5 rounded-full border border-border-strong bg-card px-4 py-2 text-sm leading-none transition hover:border-border-strong sm:inline-flex"
              >
                <span className="text-subtle">Bakiye:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatMoney(portfolio.balance, { fractionDigits: 0 })}
                </span>
              </Link>
              <UserMenu />
            </>
          ) : (
            !authLoading && (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-border-strong bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:opacity-90"
                >
                  Giriş yap
                </Link>
                <Link
                  href="/register"
                  className="rounded-full border border-border-strong bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
                >
                  Kayıt ol
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}
