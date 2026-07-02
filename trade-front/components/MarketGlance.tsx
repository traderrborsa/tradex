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
  { id: 'forex', label: 'Forex & Kripto', items: HOME_WATCHLIST },
  { id: 'us', label: 'ABD', items: US_STOCKS_WATCHLIST },
] as const;

const GLANCE_PICKS = [
  { symbol: 'XU100', label: 'BIST 100' },
  { symbol: 'XU030', label: 'BIST 30' },
  { symbol: 'EURUSD', label: 'Euro / Dolar' },
  { symbol: 'BTCUSD', label: 'Bitcoin' },
];

function GlanceCard({
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
      <div className="rounded-2xl border border-border bg-card p-4">
        <Skeleton className="mb-3 h-3 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    );
  }

  const change = tick.dayDiffPercent ?? 0;
  const isUp = change >= 0;

  return (
    <Link
      href={`/symbol/${symbol}`}
      className="cursor-pointer rounded-2xl border border-border bg-card p-4 transition hover:border-border-strong hover:bg-hover"
    >
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}
      >
        {formatMarketChange(change)}
      </p>
    </Link>
  );
}

function MoverRow({
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
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    );
  }

  const price = resolvePrice(tick);
  const change = tick.dayDiffPercent ?? 0;
  const isUp = change >= 0;

  return (
    <Link
      href={`/symbol/${symbol}`}
      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:border-border-strong hover:bg-hover"
    >
      <SymbolIcon symbol={symbol} size={44} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{description}</p>
        <p className="text-sm text-subtle">{symbol}</p>
      </div>
      <div className="text-right tabular-nums">
        <p className="font-semibold text-foreground">
          {formatMarketPrice(price, symbol)}
        </p>
        <p
          className={`text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}
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
  const movers = active.items.slice(0, 6);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Piyasaya genel bakış
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-elevated text-foreground'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {GLANCE_PICKS.map(({ symbol, label }) => (
            <GlanceCard
              key={symbol}
              symbol={symbol}
              label={label}
              tick={ticks[symbol]}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Öne çıkanlar
            </h2>
            <p className="text-sm text-subtle">
              {active.label} — günlük değişim
            </p>
          </div>
          <Link
            href={`/search?category=${active.id}`}
            className="shrink-0 text-sm font-medium text-muted transition hover:text-foreground"
          >
            Tümünü gör
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {movers.map(({ symbol, description }) => (
            <MoverRow
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
