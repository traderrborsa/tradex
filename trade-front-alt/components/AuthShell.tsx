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
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Mobil: üstte animasyonlu panel */}
      <aside className="corp-auth-panel relative h-52 shrink-0 overflow-hidden lg:hidden">
        <AuthPanelMotion variant="mobile" />
        <div className="relative z-10 p-5">
          <Link href="/" className="inline-block transition hover:opacity-80">
            <BrandLogo size="splash" variant="panel" />
          </Link>
        </div>
      </aside>

      {/* Desktop: sol panel */}
      <aside className="corp-auth-panel relative hidden w-[44%] overflow-hidden lg:block">
        <AuthPanelMotion variant="desktop" />
        <div className="relative z-10 p-8 xl:p-12">
          <Link href="/" className="inline-block transition hover:opacity-80">
            <BrandLogo size="splash" variant="panel" />
          </Link>
        </div>
      </aside>

      <main className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:py-10">
        <motion.div
          className={`mx-auto w-full ${wide ? 'max-w-lg' : 'max-w-sm'}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
            )}
          </div>

          {children}

          {footer && (
            <div className="mt-8 border-t border-border pt-6">{footer}</div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
