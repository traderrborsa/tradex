'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useMarketTicks } from '@/contexts/MarketTicksContext';
import {
  formatMarketChange,
  formatMarketPrice,
  resolvePrice,
} from '@/lib/price';
import type { Tick } from '@/lib/types';

const TICKER_SYMBOLS = [
  { symbol: 'EURUSD', label: 'EUR/USD' },
  { symbol: 'GBPUSD', label: 'GBP/USD' },
  { symbol: 'XAUUSD', label: 'XAU/USD' },
  { symbol: 'BTCUSD', label: 'BTC/USD' },
  { symbol: 'XU100', label: 'XU100' },
  { symbol: 'USDTRY', label: 'USD/TRY' },
  { symbol: 'NVDA', label: 'NVDA' },
  { symbol: 'THYAO', label: 'THYAO' },
] as const;

const TICKER_CODES = TICKER_SYMBOLS.map((item) => item.symbol);

function TickerItem({
  label,
  symbol,
  tick,
}: {
  label: string;
  symbol: string;
  tick?: Tick;
}) {
  const change = tick?.dayDiffPercent ?? 0;
  const isUp = change >= 0;
  const price = tick ? resolvePrice(tick) : 0;
  const hasPrice = price > 0;

  return (
    <Link
      href={`/symbol/${symbol}`}
      className="inline-flex items-center gap-2.5 text-xs transition-opacity hover:opacity-80"
    >
      <span className="font-bold tracking-wide text-foreground">{label}</span>
      {hasPrice ? (
        <span className="font-mono tabular-nums text-secondary">
          {formatMarketPrice(price, symbol)}
        </span>
      ) : (
        <span className="inline-block h-3.5 w-14 animate-pulse rounded bg-elevated" />
      )}
      {tick && hasPrice ? (
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
            isUp
              ? 'bg-positive/10 text-positive'
              : 'bg-negative/10 text-negative'
          }`}
        >
          {formatMarketChange(change)}
        </span>
      ) : (
        <span className="inline-block h-4 w-12 animate-pulse rounded bg-elevated" />
      )}
    </Link>
  );
}

export function MarketTicker() {
  const { ticks, watch } = useMarketTicks();

  useEffect(() => {
    watch(TICKER_CODES);
  }, [watch]);

  const items = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS];

  return (
    <div
      className="overflow-hidden border-b border-accent/20 bg-card/95 py-2.5 backdrop-blur-sm"
      aria-label="Canlı piyasa özeti"
    >
      <div className="ticker-scroll flex w-max gap-10 whitespace-nowrap px-4">
        {items.map((item, i) => (
          <TickerItem
            key={`${item.symbol}-${i}`}
            label={item.label}
            symbol={item.symbol}
            tick={ticks[item.symbol]}
          />
        ))}
      </div>
    </div>
  );
}
