'use client';

import Link from 'next/link';
import { isBistSymbol } from '@/lib/bist-symbols';
import {
  formatMarketChange,
  formatMarketPrice,
  formatSpread,
  hasLiveQuote,
  resolvePrice,
} from '@/lib/price';
import type { Tick } from '@/lib/types';
import { SymbolIcon } from './SymbolIcon';
import { Skeleton } from './ui/Skeleton';

interface Props {
  tick: Tick | null;
  symbol?: string;
}

export function PriceHeader({ tick, symbol }: Props) {
  const sym = tick?.symbol ?? symbol?.toUpperCase() ?? '';

  if (!tick) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-4">
          {sym && <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="mt-5 h-10 w-36" />
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const price = resolvePrice(tick);
  const change = tick.dayDiffPercent ?? 0;
  const isUp = change >= 0;
  const liveQuote = hasLiveQuote(tick);
  const quoteUnavailable = '—';

  const stats = [
    {
      label: 'Alış',
      value: liveQuote ? formatMarketPrice(tick.bid, tick.symbol) : quoteUnavailable,
    },
    {
      label: 'Satış',
      value: liveQuote ? formatMarketPrice(tick.ask, tick.symbol) : quoteUnavailable,
    },
    ...(tick.high != null
      ? [{ label: 'Yüksek', value: formatMarketPrice(tick.high, tick.symbol) }]
      : []),
    ...(tick.low != null
      ? [{ label: 'Düşük', value: formatMarketPrice(tick.low, tick.symbol) }]
      : []),
    { label: 'Spread', value: formatSpread(tick) },
  ];

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <SymbolIcon symbol={tick.symbol} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {tick.symbol}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                isUp ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
              }`}
            >
              {formatMarketChange(change)}
            </span>
          </div>
          {tick.description && (
            <p className="mt-0.5 truncate text-sm text-muted">{tick.description}</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-foreground sm:mt-4 sm:text-4xl">
        {formatMarketPrice(price, tick.symbol)}
        {isBistSymbol(tick.symbol) && (
          <span className="ml-1 text-xl font-semibold text-muted">₺</span>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl bg-surface px-3 py-2.5"
          >
            <p className="text-[11px] font-medium text-muted">{label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
