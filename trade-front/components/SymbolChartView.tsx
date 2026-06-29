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
import { OpenPositionsBar } from './OpenPositionsBar';
import { PriceHeader } from './PriceHeader';
import { SkeletonChart } from './ui/Skeleton';

interface Props {
  symbol: string;
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
    <div
      className={`flex min-h-screen flex-col bg-background ${portfolio.positions.length > 0 ? 'pb-48' : ''}`}
    >
      <AppHeader showSearch />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-stretch lg:px-8">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
          {error ? (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
              <p className="text-red-400">{error}</p>
              <p className="mt-2 text-sm text-subtle">
                Sembol bulunamadı. EURUSD, THYAO, XU100 gibi geçerli bir sembol
                deneyin.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block text-foreground hover:underline"
              >
                Ana sayfaya dön
              </Link>
            </div>
          ) : (
            <>
              {loadingTick ? <PriceHeader tick={null} /> : <PriceHeader tick={tick} />}

              <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-card p-1">
                {CHART_INTERVALS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChartInterval(value)}
                    className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      interval === value
                        ? 'bg-elevated text-foreground'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-border bg-surface lg:min-h-[480px]">
                {loadingChart && (
                  <div className="absolute inset-0 z-10 bg-surface">
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
            </>
          )}
        </div>

        {!error && (
          <aside className="flex w-full shrink-0 flex-col lg:w-80 lg:self-stretch">
            <TradePanel symbol={sym} tick={tick} />
          </aside>
        )}
      </main>

      {!error && <OpenPositionsBar activeSymbol={sym} />}
    </div>
  );
}
