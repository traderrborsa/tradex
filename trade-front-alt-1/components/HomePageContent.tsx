'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { FeaturedChart } from '@/components/FeaturedChart';
import { HomeMarketFeed } from '@/components/HomeMarketFeed';
import {
  HomeSplashGate,
  markHomeSplashSeen,
  shouldShowHomeSplash,
} from '@/components/HomeSplashGate';
import { MarketGlance } from '@/components/MarketGlance';
import { SplashScreen } from '@/components/SplashScreen';
import { SymbolSearch } from '@/components/SymbolSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useTrading } from '@/contexts/TradingContext';
import { formatMoney } from '@/lib/format-money';
import { MOBILE_NAV_PB } from '@/lib/layout';

type SplashPhase = 'off' | 'on' | 'out';

const QUICK_LINKS = [
  { href: '/search?category=bist', label: 'BIST' },
  { href: '/search?category=forex', label: 'Forex' },
  { href: '/search?category=forex', label: 'Kripto' },
  { href: '/search?category=us', label: 'ABD' },
];

export function HomePageContent() {
  const { user } = useAuth();
  const { portfolio } = useTrading();
  const [splash, setSplash] = useState<SplashPhase>(() =>
    shouldShowHomeSplash() ? 'on' : 'off',
  );

  const dismissSplash = useCallback(() => {
    setSplash((phase) => {
      if (phase !== 'on') return phase;
      return 'out';
    });
    markHomeSplashSeen();
    window.setTimeout(() => setSplash('off'), 500);
  }, []);

  const greeting = user?.fullName?.split(' ')[0] ?? null;

  return (
    <>
      {splash !== 'off' && <SplashScreen fading={splash === 'out'} />}

      <div className={`flex min-h-screen flex-col bg-background text-foreground ${MOBILE_NAV_PB}`}>
        <AppHeader />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {/* Kırmızı hero banner */}
          <section className="fx-hero-banner relative mb-6 overflow-hidden rounded-md border p-5 sm:p-7">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, #e52520 0%, transparent 70%)' }}
              aria-hidden
            />
            {user ? (
              <Link href="/portfolio" className="relative block transition hover:opacity-95">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  Hoş geldin{greeting ? `, ${greeting}` : ''}
                </p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">
                  {formatMoney(portfolio.balance, { fractionDigits: 0 })}
                </p>
                <p className="mt-1 text-sm text-muted">Hesap bakiyesi → Portföy</p>
              </Link>
            ) : (
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  PrimeFX Platform
                </p>
                <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                  Küresel piyasalarda işlem yapın
                </h1>
                <p className="mt-2 max-w-lg text-sm text-muted">
                  Forex, emtia, endeks ve hisse senetlerinde profesyonel araçlarla trade edin.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link href="/register" className="corp-btn py-2.5 text-center text-sm">
                    Hesap Aç
                  </Link>
                  <Link href="/login" className="corp-btn-outline py-2.5 text-center text-sm">
                    Giriş Yap
                  </Link>
                </div>
              </div>
            )}
          </section>

          <div className="mb-4">
            <SymbolSearch autoFocus />
          </div>

          <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-1">
            {QUICK_LINKS.map(({ href, label }) => (
              <Link key={label} href={href} className="chip chip-inactive">
                {label}
              </Link>
            ))}
          </div>

          <HomeMarketFeed>
            {(ticks) => (
              <>
                {splash === 'on' && (
                  <HomeSplashGate
                    ticks={ticks}
                    active
                    onDismiss={dismissSplash}
                  />
                )}

                <div className="space-y-6">
                  <MarketGlance ticks={ticks} />

                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-4 w-1 rounded-sm bg-accent" />
                      <h2 className="text-base font-extrabold uppercase tracking-wide text-foreground">
                        Canlı Grafikler
                      </h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FeaturedChart
                        symbol="XU100"
                        label="BIST 100"
                        tick={ticks.XU100}
                      />
                      <FeaturedChart
                        symbol="XU030"
                        label="BIST 30"
                        tick={ticks.XU030}
                      />
                    </div>
                  </section>
                </div>
              </>
            )}
          </HomeMarketFeed>
        </main>
      </div>
    </>
  );
}
