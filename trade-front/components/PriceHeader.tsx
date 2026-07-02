'use client';

import { isBistSymbol } from '@/lib/bist-symbols';
import {
  formatMarketChange,
  formatMarketPrice,
  formatSpread,
  hasLiveQuote,
  resolvePrice,
} from '@/lib/price';
import type { Tick } from '@/lib/types';
import { Skeleton } from './ui/Skeleton';

interface Props {
  tick: Tick | null;
}

export function PriceHeader({ tick }: Props) {
  if (!tick) {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-4">
          <Skeleton className="h-8 w-24 shrink-0" />
          <Skeleton className="h-9 w-28 shrink-0" />
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
        <div className="flex flex-wrap gap-x-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  const price = resolvePrice(tick);
  const change = tick.dayDiffPercent ?? 0;
  const isUp = change >= 0;
  const liveQuote = hasLiveQuote(tick);
  const quoteUnavailable = '—';

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-4">
        <h1 className="shrink-0 text-2xl font-bold tracking-tight text-foreground">
          {tick.symbol}
        </h1>

        <div className="flex shrink-0 items-baseline gap-x-2">
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {formatMarketPrice(price, tick.symbol)}
            {isBistSymbol(tick.symbol) && (
              <span className="ml-1 text-lg text-subtle">₺</span>
            )}
          </span>
          <span
            className={`text-sm font-medium tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {formatMarketChange(change)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2.5 text-xs tabular-nums sm:gap-x-3 sm:text-sm">
          <Stat
            label="Alış"
            value={
              liveQuote
                ? formatMarketPrice(tick.bid, tick.symbol)
                : quoteUnavailable
            }
          />
          <Stat
            label="Satış"
            value={
              liveQuote
                ? formatMarketPrice(tick.ask, tick.symbol)
                : quoteUnavailable
            }
          />
          <Stat label="Spread" value={formatSpread(tick)} />
          {tick.high != null && (
            <Stat
              label="Yüksek"
              value={formatMarketPrice(tick.high, tick.symbol)}
            />
          )}
          {tick.low != null && (
            <Stat
              label="Düşük"
              value={formatMarketPrice(tick.low, tick.symbol)}
            />
          )}
      </div>

      {tick.description && (
        <p className="truncate text-sm text-subtle">{tick.description}</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
      <span className="text-subtle">{label}</span>
      <span className="font-mono text-secondary">{value}</span>
    </span>
  );
}
