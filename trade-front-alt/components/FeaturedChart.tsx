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
      className={`block overflow-hidden rounded-2xl bg-card shadow-sm transition hover:shadow-md ${
        fill ? 'flex min-h-0 flex-1 flex-col' : ''
      }`}
    >
      <div className="px-4 py-4">
        <p className="text-sm font-medium text-muted">{label}</p>
        {price != null ? (
          <>
            <p
              className={`mt-0.5 font-bold tabular-nums text-foreground ${compact ? 'text-xl' : 'text-2xl'}`}
            >
              {formatMarketPrice(price, sym)}
            </p>
            <p
              className={`text-sm font-semibold tabular-nums ${isUp ? 'text-positive' : 'text-negative'}`}
            >
              {formatMarketChange(change)}
            </p>
          </>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-surface" />
            <div className="h-4 w-14 animate-pulse rounded-lg bg-surface" />
          </div>
        )}
      </div>
      <div
        className={`relative ${fill ? 'min-h-0 flex-1' : compact ? 'h-28' : 'h-36'}`}
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
