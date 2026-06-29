'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { SymbolIcon } from '@/components/SymbolIcon';
import { useMarketTicks } from '@/contexts/MarketTicksContext';
import { isBistSymbol } from '@/lib/bist-symbols';
import {
  ALL_HOME_SYMBOLS,
  HOME_MARKET_SECTIONS,
} from '@/lib/symbol-assets';
import {
  formatMarketChange,
  formatMarketPrice,
  hasLiveQuote,
  resolvePrice,
} from '@/lib/price';
import type { Tick } from '@/lib/types';

function LivePrice({ tick, symbol }: { tick?: Tick; symbol: string }) {
  if (!tick) {
    return (
      <div className="text-right">
        <span className="inline-block h-5 w-20 animate-pulse rounded bg-elevated" />
        <span className="mt-1 inline-block h-3 w-12 animate-pulse rounded bg-elevated/80" />
      </div>
    );
  }

  const price = resolvePrice(tick);
  const change = tick.dayDiffPercent ?? 0;
  const isUp = change >= 0;

  return (
    <div className="text-right tabular-nums">
      <p className="text-lg font-semibold text-foreground">
        {formatMarketPrice(price, symbol)}
        {isBistSymbol(symbol) && (
          <span className="ml-1 text-xs text-muted">₺</span>
        )}
      </p>
      <p
        className={`text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}
      >
        {formatMarketChange(change)}
      </p>
      {hasLiveQuote(tick) && (
        <p className="mt-0.5 text-[10px] text-subtle">
          {formatMarketPrice(tick.bid, symbol)} /{' '}
          {formatMarketPrice(tick.ask, symbol)}
        </p>
      )}
    </div>
  );
}

function MarketSection({
  title,
  items,
  ticks,
}: {
  title: string;
  items: { symbol: string; description: string }[];
  ticks: Record<string, Tick>;
}) {
  return (
    <section className="w-full">
      <p className="mb-2 text-sm font-medium text-muted">{title}</p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40">
        {items.map(({ symbol, description }) => (
          <li key={symbol}>
            <Link
              href={`/symbol/${symbol}`}
              className="flex items-center gap-4 px-4 py-3 transition hover:bg-elevated/50"
            >
              <SymbolIcon symbol={symbol} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{symbol}</p>
                <p className="truncate text-sm text-muted">{description}</p>
              </div>
              <LivePrice tick={ticks[symbol]} symbol={symbol} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeMarketList() {
  const { ticks, watch, wsConnected } = useMarketTicks();

  useEffect(() => {
    watch(ALL_HOME_SYMBOLS);
  }, [watch]);

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex items-center justify-end gap-1.5 text-xs text-subtle">
        <span
          className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'}`}
        />
        {wsConnected ? 'Canlı WebSocket' : 'Bağlanıyor…'}
      </div>

      {HOME_MARKET_SECTIONS.map((section) => (
        <MarketSection
          key={section.id}
          title={section.title}
          items={[...section.items]}
          ticks={ticks}
        />
      ))}
    </div>
  );
}

