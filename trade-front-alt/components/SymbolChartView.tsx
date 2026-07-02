'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { TradePanel } from '@/components/TradePanel';
import { fetchOhlc, fetchTick } from '@/lib/api';
import { resolvePrice } from '@/lib/price';
import type { ChartInterval, OhlcBar, Tick } from '@/lib/types';
import { CHART_INTERVALS } from '@/lib/types';
import { useTrading } from '@/contexts/TradingContext';
import { useLiveTick } from '@/hooks/useLiveTick';
import { CandlestickChart } from './CandlestickChart';
import { PositionsView } from './PositionsView';
import { PriceHeader } from './PriceHeader';
import { SkeletonChart } from './ui/Skeleton';
import { MOBILE_NAV_PB } from '@/lib/layout';

interface Props {
  symbol: string;
}

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Keşfet
    </Link>
  );
}

export function SymbolChartView({ symbol }: Props) {
  const sym = symbol.toUpperCase();
  const [initialTick, setInitialTick] = useState<Tick | null>(null);
  const [bars, setBars] = useState<OhlcBar[]>([]);
  const [interval, setChartInterval] = useState<ChartInterval>('1h');
  const [error, setError] = useState<string | null>(null);
  const [loadingTick, setLoadingTick] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  const { tick: liveTick } = useLiveTick(sym, initialTick);
  const tick = liveTick ?? initialTick;
  const { portfolio } = useTrading();

  const loadTick = useCallback(async () => {
    setLoadingTick(true);
    setError(null);
    try {
      const tickData = await fetchTick(sym);
      setInitialTick(tickData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veri yüklenemedi');
    } finally {
      setLoadingTick(false);
    }
  }, [sym]);

  const loadChart = useCallback(async () => {
    setLoadingChart(true);
    try {
      const ohlcData = await fetchOhlc(sym, interval, 300);
      setBars(ohlcData.bars);
    } catch (e) {
      setError((prev) =>
        prev ?? (e instanceof Error ? e.message : 'Grafik yüklenemedi'),
      );
    } finally {
      setLoadingChart(false);
    }
  }, [sym, interval]);

  useEffect(() => {
    void loadTick();
  }, [loadTick]);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  const livePrice = tick != null ? resolvePrice(tick) : undefined;

  return (
    <div className={`flex min-h-screen flex-col bg-background ${MOBILE_NAV_PB}`}>
      <AppHeader showSearch searchQuery={sym} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-4">
          <BackLink />
        </div>

        {error ? (
          <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
            <p className="font-semibold text-negative">{error}</p>
            <p className="mt-2 text-sm text-muted">
              Sembol bulunamadı. EURUSD, THYAO, XU100 gibi geçerli bir sembol deneyin.
            </p>
            <Link href="/" className="corp-btn mt-5 inline-flex text-sm">
              Ana sayfaya dön
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
            {/* Sol: fiyat + grafik */}
            <div className="flex min-w-0 flex-col gap-4">
              {loadingTick ? (
                <PriceHeader tick={null} symbol={sym} />
              ) : (
                <PriceHeader tick={tick} />
              )}

              {/* Zaman aralığı chip'leri */}
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-0.5">
                {CHART_INTERVALS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChartInterval(value)}
                    className={`chip shrink-0 ${
                      interval === value ? 'chip-active' : 'chip-inactive'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Grafik kartı */}
              <div className="relative min-h-[260px] overflow-hidden rounded-2xl bg-card shadow-sm sm:min-h-[380px] lg:min-h-[440px]">
                {loadingChart && (
                  <div className="absolute inset-0 z-10 bg-card">
                    <SkeletonChart />
                  </div>
                )}
                <CandlestickChart
                  symbol={sym}
                  bars={bars}
                  interval={interval}
                  livePrice={livePrice}
                  portfolio={portfolio}
                />
              </div>

              {/* Mobilde işlem paneli grafik altında */}
              <div className="lg:hidden">
                <TradePanel symbol={sym} tick={tick} />
              </div>
            </div>

            {/* Sağ: sticky işlem paneli (desktop) */}
            <aside className="hidden lg:block">
              <div className="sticky top-[4.5rem]">
                <TradePanel symbol={sym} tick={tick} />
              </div>
            </aside>

            {/* Bu maldaki işlemlerim — sayfa altında, normal akışta */}
            <div className="lg:col-span-2">
              <PositionsView filterSymbol={sym} title="Bu maldaki işlemlerim" card />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
