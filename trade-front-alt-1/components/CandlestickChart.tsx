'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';
import { isBistSymbol } from '@/lib/bist-symbols';
import {
  createChartTimeContext,
  filterBistIntradayBars,
  sanitizeOhlcBar,
} from '@/lib/chart-time';
import { buildChartTradeOverlay } from '@/lib/trading/chart-overlays';
import { getChartColors } from '@/lib/theme';
import type { Portfolio } from '@/lib/trading/types';
import type { ChartInterval, OhlcBar } from '@/lib/types';

function dedupeBarsByTime(bars: OhlcBar[]): OhlcBar[] {
  const sorted = [...bars]
    .map(sanitizeOhlcBar)
    .sort(
      (a, b) =>
        new Date(a.openTime).getTime() - new Date(b.openTime).getTime(),
    );

  const byOpenTime = new Map<string, OhlcBar>();

  for (const bar of sorted) {
    const key = bar.openTime;
    const prev = byOpenTime.get(key);
    if (!prev) {
      byOpenTime.set(key, bar);
      continue;
    }
    byOpenTime.set(key, {
      ...prev,
      high: Math.max(prev.high, bar.high),
      low: Math.min(prev.low, bar.low),
      close: bar.isOpen ? bar.close : prev.isOpen ? prev.close : bar.close,
      volume: prev.volume + bar.volume,
      tickVolume: prev.tickVolume + bar.tickVolume,
      isOpen: prev.isOpen || bar.isOpen,
    });
  }

  return [...byOpenTime.values()];
}

interface Props {
  symbol: string;
  bars: OhlcBar[];
  interval?: ChartInterval;
  livePrice?: number;
  portfolio?: Portfolio;
}

export function CandlestickChart({
  symbol,
  bars,
  interval = '1h',
  livePrice,
  portfolio,
}: Props) {
  const { theme } = useTheme();
  const chartColors = useMemo(() => getChartColors(theme), [theme]);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRefs = useRef<IPriceLine[]>([]);
  const dataKeyRef = useRef('');
  const timeCtxRef = useRef<ReturnType<typeof createChartTimeContext> | null>(
    null,
  );

  const isBist = isBistSymbol(symbol);
  const chartBars = useMemo(() => {
    const cleaned = bars.map(sanitizeOhlcBar);
    const filtered = isBist ? filterBistIntradayBars(cleaned, interval) : cleaned;
    return dedupeBarsByTime(filtered);
  }, [bars, interval, isBist]);

  const timeCtx = useMemo(
    () => createChartTimeContext(chartBars, interval, isBist),
    [chartBars, interval, isBist],
  );

  const tradeOverlay = useMemo(() => {
    if (!portfolio || chartBars.length === 0) return null;
    return buildChartTradeOverlay(symbol, portfolio, chartBars, timeCtx);
  }, [portfolio, symbol, chartBars, timeCtx]);

  useEffect(() => {
    timeCtxRef.current = timeCtx;
  }, [timeCtx]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      rightPriceScale: {
        borderColor: chartColors.border,
        autoScale: true,
      },
      timeScale: {
        borderColor: chartColors.border,
        timeVisible: true,
        secondsVisible: interval === '1m' || interval === '5m',
        rightOffset: 8,
        tickMarkFormatter: (time: Time) =>
          timeCtxRef.current?.tickLabelForTime(time) ?? '',
      },
      localization: {
        locale: 'tr-TR',
        timeFormatter: (time: Time) =>
          timeCtxRef.current?.tickLabelForTime(time) ?? '',
      },
      crosshair: { mode: 1 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#3d8f6a',
      downColor: '#e05252',
      borderUpColor: '#3d8f6a',
      borderDownColor: '#e05252',
      wickUpColor: '#3d8f6a',
      wickDownColor: '#e05252',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRefs.current = [];
    };
  }, [interval]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      rightPriceScale: { borderColor: chartColors.border },
      timeScale: { borderColor: chartColors.border },
    });
  }, [chartColors]);

  useEffect(() => {
    if (!seriesRef.current || chartBars.length === 0) return;

    const key = `${symbol}:${interval}:${chartBars.length}:${chartBars[0]?.openTime}:${chartBars.at(-1)?.openTime}`;

    seriesRef.current.setData(
      chartBars.map((bar, index) => {
        const clean = sanitizeOhlcBar(bar);
        return {
          time: timeCtx.timeForIndex(index),
          open: clean.open,
          high: clean.high,
          low: clean.low,
          close: clean.close,
        };
      }),
    );

    if (key !== dataKeyRef.current) {
      dataKeyRef.current = key;
      const len = chartBars.length;
      const visible = Math.min(80, len);
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, len - visible - 1),
        to: len + 4,
      });
    }
  }, [chartBars, interval, symbol, timeCtx]);

  useEffect(() => {
    if (!seriesRef.current || livePrice == null || chartBars.length === 0) {
      return;
    }
    const lastIndex = chartBars.length - 1;
    let openIndex = lastIndex;
    for (let i = chartBars.length - 1; i >= 0; i--) {
      if (chartBars[i].isOpen) {
        openIndex = i;
        break;
      }
    }
    const idx = openIndex >= 0 ? openIndex : lastIndex;
    const openBar = chartBars[idx];
    if (!openBar) return;

    const clean = sanitizeOhlcBar(openBar);
    seriesRef.current.update({
      time: timeCtx.timeForIndex(idx),
      open: clean.open,
      high: Math.max(clean.high, livePrice),
      low: Math.min(clean.low, livePrice),
      close: livePrice,
    });
  }, [livePrice, chartBars, interval, timeCtx]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    for (const line of priceLineRefs.current) {
      series.removePriceLine(line);
    }
    priceLineRefs.current = [];

    if (!tradeOverlay) return;
    for (const opts of tradeOverlay.priceLines) {
      priceLineRefs.current.push(series.createPriceLine(opts));
    }
  }, [tradeOverlay]);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full" />
  );
}
