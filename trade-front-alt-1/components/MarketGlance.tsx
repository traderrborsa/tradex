'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SymbolIcon } from '@/components/SymbolIcon';
import {
  BIST_WATCHLIST,
  HOME_WATCHLIST,
  US_STOCKS_WATCHLIST,
} from '@/lib/symbol-assets';
import {
  formatMarketChange,
  formatMarketPrice,
  resolvePrice,
} from '@/lib/price';
import type { Tick } from '@/lib/types';
import { Skeleton } from './ui/Skeleton';

const TABS = [
  { id: 'bist', label: 'BIST', items: BIST_WATCHLIST },
  { id: 'forex', label: 'Döviz', items: HOME_WATCHLIST },
  { id: 'us', label: 'ABD', items: US_STOCKS_WATCHLIST },
] as const;

const GLANCE_PICKS = [
  { symbol: 'XU100', label: 'BIST 100' },
  { symbol: 'XU030', label: 'BIST 30' },
  { symbol: 'EURUSD', label: 'EUR/USD' },
  { symbol: 'BTCUSD', label: 'Bitcoin' },
  { symbol: 'XAUUSD', label: 'Altın' },
];

function IndexCard({
  symbol,
  label,
  tick,
}: {
  symbol: string;
  label: string;
  tick?: Tick;
}) {
  if (!tick) {
    return (
      <div className="min-w-[140px] shrink-0 rounded-2xl bg-card p-4 shadow-sm">
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    );
  }

  const change = tick.dayDiffPercent ?? 0;
  const isUp = change >= 0;
  const price = resolvePrice(tick);

  return (
    <Link
      href={`/symbol/${symbol}`}
      className="min-w-[128px] shrink-0 rounded-2xl bg-card p-3.5 shadow-sm transition hover:shadow-md sm:min-w-[140px] sm:p-4"
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums text-foreground">
        {formatMarketPrice(price, symbol)}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${isUp ? 'text-positive' : 'text-negative'}`}
      >
        {formatMarketChange(change)}
      </p>
    </Link>
  );
}

function StockRow({
  symbol,
  description,
  tick,
}: {
  symbol: string;
  description: string;
  tick?: Tick;
}) {
  if (!tick) {
    return (
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }

  const price = resolvePrice(tick);
  const change = tick.dayDiffPercent ?? 0;
  const isUp = change >= 0;

  return (
    <Link
      href={`/symbol/${symbol}`}
      className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3.5 transition last:border-b-0 hover:bg-hover"
    >
      <SymbolIcon symbol={symbol} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{description}</p>
        <p className="text-xs text-muted">{symbol}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-foreground">
          {formatMarketPrice(price, symbol)}
        </p>
        <p
          className={`text-sm font-semibold tabular-nums ${isUp ? 'text-positive' : 'text-negative'}`}
        >
          {formatMarketChange(change)}
        </p>
      </div>
    </Link>
  );
}

interface Props {
  ticks: Record<string, Tick>;
}

export function MarketGlance({ ticks }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('bist');
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const movers = active.items.slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Yatay endeks kartları */}
      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">Endeksler</h2>
        <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-0 sm:px-0">
          {GLANCE_PICKS.map(({ symbol, label }) => (
            <IndexCard
              key={symbol}
              symbol={symbol}
              label={label}
              tick={ticks[symbol]}
            />
          ))}
        </div>
      </section>

      {/* Piyasa listesi */}
      <section className="overflow-hidden rounded-2xl bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Piyasalar</h2>
            <p className="mt-0.5 hidden text-xs text-muted sm:block">Güncel fiyat ve günlük değişim</p>
          </div>
          <Link
            href={`/search?category=${active.id}`}
            className="text-sm font-semibold text-accent hover:underline"
          >
            Tümü
          </Link>
        </div>

        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`chip ${tab === t.id ? 'chip-active' : 'chip-inactive'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {movers.map(({ symbol, description }) => (
            <StockRow
              key={symbol}
              symbol={symbol}
              description={description}
              tick={ticks[symbol]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
