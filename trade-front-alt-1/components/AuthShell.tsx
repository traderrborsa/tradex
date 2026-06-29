'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthPanelMotion } from '@/components/AuthPanelMotion';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export function AuthShell({ title, subtitle, children, footer, wide }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#08080a] lg:flex-row">
      <div className="fx-header-bar h-1 shrink-0 lg:hidden" />

      {/* Mobil üst banner */}
      <aside className="relative h-44 shrink-0 overflow-hidden border-b border-accent/20 bg-[#0c0c10] lg:hidden">
        <AuthPanelMotion variant="mobile" />
        <div className="relative z-10 flex h-full flex-col justify-between p-5">
          <Link href="/" className="inline-block transition hover:opacity-90">
            <BrandLogo size="splash" variant="light" />
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Yeni hesap oluştur
          </p>
        </div>
      </aside>

      {/* Desktop sol panel — koyu kırmızı gradient */}
      <aside className="corp-auth-panel relative hidden w-[42%] overflow-hidden lg:block">
        <AuthPanelMotion variant="desktop" />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'linear-gradient(180deg, rgba(229,37,32,0.12) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)',
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
          <Link href="/" className="inline-block transition hover:opacity-90">
            <BrandLogo size="splash" variant="light" />
          </Link>

          <div className="max-w-sm">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
              Kayıt
            </p>
            <h2 className="auth-panel-title mt-3 text-3xl font-extrabold leading-tight">
              Dakikalar içinde
              <span className="block text-accent">işlem yapmaya başlayın</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {['Hızlı hesap açılışı', 'Güvenli doğrulama', 'Anında piyasa erişimi'].map(
                (item) => (
                  <li key={item} className="auth-panel-feature flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-accent/20 text-xs text-accent">
                      ✓
                    </span>
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          <p className="auth-panel-muted text-xs">© PrimeFX Trade Platform</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:py-10">
        <motion.div
          className={`mx-auto w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-6 border-l-4 border-accent pl-4">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
            )}
          </div>

          <div className="corp-card rounded-md p-5 sm:p-6">{children}</div>

          {footer && (
            <div className="mt-6 border-t border-border pt-6">{footer}</div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
