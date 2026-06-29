'use client';

import { useCallback, useState } from 'react';
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

type SplashPhase = 'off' | 'on' | 'out';

export function HomePageContent() {
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

  return (
    <>
      {splash !== 'off' && <SplashScreen fading={splash === 'out'} />}

      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 lg:hidden">
            <SymbolSearch autoFocus />
          </div>

          <div className="mb-10 hidden lg:block">
            <SymbolSearch />
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
                <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-stretch">
                  <MarketGlance ticks={ticks} />
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <FeaturedChart
                      symbol="XU100"
                      label="BIST 100"
                      tick={ticks.XU100}
                      fill
                    />
                    <FeaturedChart
                      symbol="XU030"
                      label="BIST 30"
                      tick={ticks.XU030}
                      fill
                    />
                  </div>
                </div>
              </>
            )}
          </HomeMarketFeed>
        </main>
      </div>
    </>
  );
}
