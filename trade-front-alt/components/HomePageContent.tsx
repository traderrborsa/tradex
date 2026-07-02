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
  { href: '/search?category=forex', label: 'Döviz' },
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

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {/* Karşılama + bakiye kartı */}
          {user ? (
            <Link
              href="/portfolio"
              className="mb-5 block rounded-2xl bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="text-sm text-muted">
                Merhaba{greeting ? `, ${greeting}` : ''}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                {formatMoney(portfolio.balance, { fractionDigits: 0 })}
              </p>
              <p className="mt-0.5 text-xs text-muted">Toplam bakiye · Portföye git →</p>
            </Link>
          ) : (
            <div className="mb-5 rounded-2xl bg-card p-5 shadow-sm">
              <h1 className="text-xl font-bold">Yatırıma başla</h1>
              <p className="mt-1 text-sm text-muted">
                BIST, döviz ve kripto piyasalarını tek yerden takip et.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link href="/register" className="corp-btn py-2.5 text-center text-sm">
                  Hesap aç
                </Link>
                <Link href="/login" className="corp-btn-outline py-2.5 text-center text-sm">
                  Giriş yap
                </Link>
              </div>
            </div>
          )}

          {/* Arama */}
          <div className="mb-4">
            <SymbolSearch autoFocus />
          </div>

          {/* Hızlı kategoriler */}
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
                    <h2 className="mb-3 text-base font-bold text-foreground">
                      Grafikler
                    </h2>
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
