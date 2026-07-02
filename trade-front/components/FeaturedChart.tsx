'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchOhlc } from '@/lib/api';
import {
  formatMarketChange,
  formatMarketPrice,
  resolvePrice,
} from '@/lib/price';
import { getChartColors } from '@/lib/theme';
import type { Tick } from '@/lib/types';
import { SkeletonChart } from './ui/Skeleton';

interface Props {
  symbol: string;
  label: string;
  tick?: Tick;
  compact?: boolean;
  fill?: boolean;
}

export function FeaturedChart({
  symbol,
  label,
  tick,
  compact = false,
  fill = false,
}: Props) {
  const { theme } = useTheme();
  const chartColors = useMemo(() => getChartColors(theme), [theme]);
  const sym = symbol.toUpperCase();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartColors.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: chartColors.grid },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(LineSeries, {
      color: chartColors.line,
      lineWidth: 2,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { textColor: chartColors.text },
      grid: { horzLines: { color: chartColors.grid } },
    });
    seriesRef.current?.applyOptions({ color: chartColors.line });
  }, [chartColors]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchOhlc(sym, '1d', 60)
      .then((data) => {
        if (!active || !seriesRef.current) return;
        const points = data.bars.map((b) => ({
          time: Math.floor(new Date(b.openTime).getTime() / 1000) as UTCTimestamp,
          value: b.close,
        }));
        seriesRef.current.setData(points);
        chartRef.current?.timeScale().fitContent();
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sym]);

  const price = tick ? resolvePrice(tick) : null;
  const change = tick?.dayDiffPercent ?? 0;
  const isUp = change >= 0;

  return (
    <Link
      href={`/symbol/${sym}`}
      className={`overflow-hidden rounded-2xl border border-border bg-card transition hover:border-border-strong ${
        fill ? 'flex min-h-0 flex-1 flex-col' : 'block'
      }`}
    >
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm text-muted">{label}</p>
        {price != null ? (
          <>
            <p
              className={`mt-1 font-bold tabular-nums text-foreground ${compact ? 'text-2xl' : 'text-3xl'}`}
            >
              {formatMarketPrice(price, sym)}
              <span className="ml-1 text-lg text-subtle">₺</span>
            </p>
            <p
              className={`text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {formatMarketChange(change)}
            </p>
          </>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="h-8 w-36 animate-pulse rounded-lg bg-elevated" />
            <div className="h-4 w-16 animate-pulse rounded-lg bg-elevated" />
          </div>
        )}
      </div>
      <div
        className={`relative ${
          fill ? 'min-h-0 flex-1' : compact ? 'h-36' : 'h-52'
        }`}
      >
        {loading && (
          <div className="absolute inset-0 z-10 bg-card">
            <SkeletonChart />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </Link>
  );
}
