'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchLatest } from '@/lib/api';
import { ensureBistSymbolsLoaded } from '@/lib/bist-symbols';
import { isMarketOpen } from '@/lib/market-hours';
import { isMarketWsOpen, subscribeMarketTicks } from '@/lib/market-ws';
import { ALL_HOME_SYMBOLS } from '@/lib/symbol-assets';
import type { Tick } from '@/lib/types';

interface MarketTicksContextValue {
  ticks: Record<string, Tick>;
  watch: (symbols: string[]) => void;
  getTick: (symbol: string) => Tick | undefined;
  wsConnected: boolean;
}

const MarketTicksContext = createContext<MarketTicksContextValue | null>(null);

const DEFAULT_SYMBOLS = ALL_HOME_SYMBOLS;

export function MarketTicksProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [watched, setWatched] = useState<string[]>(DEFAULT_SYMBOLS);
  const [wsConnected, setWsConnected] = useState(false);

  const watch = useCallback((symbols: string[]) => {
    const normalized = [...new Set(symbols.map((s) => s.toUpperCase()))];
    setWatched((prev) => [...new Set([...prev, ...normalized])]);
  }, []);

  const getTick = useCallback(
    (symbol: string) => ticks[symbol.toUpperCase()],
    [ticks],
  );

  const watchedKey = watched.slice().sort().join(',');

  useEffect(() => {
    if (watched.length === 0) return;
    void fetchLatest(watched)
      .then((data) => {
        setTicks((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
    void ensureBistSymbolsLoaded();
  }, [watchedKey]);

  useEffect(() => {
    if (watched.length === 0) return;

    const onTick = (tick: Tick) => {
      const sym = tick.symbol?.toUpperCase();
      if (!sym) return;
      setTicks((prev) => {
        const existing = prev[sym];
        if (!isMarketOpen(sym) && existing?.stale) {
          return {
            ...prev,
            [sym]: {
              ...existing,
              dayDiffPercent:
                tick.dayDiffPercent ?? existing.dayDiffPercent ?? 0,
            },
          };
        }

        return {
          ...prev,
          [sym]: {
            ...existing,
            ...tick,
            dayDiffPercent:
              tick.dayDiffPercent ?? existing?.dayDiffPercent ?? 0,
            stale: tick.stale ?? existing?.stale,
          },
        };
      });
      setWsConnected(true);
    };

    const unsubs = watched.map((sym) => subscribeMarketTicks(sym, onTick));

    const interval = setInterval(() => {
      setWsConnected(isMarketWsOpen());
    }, 500);

    return () => {
      unsubs.forEach((u) => u());
      clearInterval(interval);
    };
  }, [watchedKey]);

  const value = useMemo(
    () => ({ ticks, watch, getTick, wsConnected }),
    [ticks, watch, getTick, wsConnected],
  );

  return (
    <MarketTicksContext.Provider value={value}>
      {children}
    </MarketTicksContext.Provider>
  );
}

export function useMarketTicks() {
  const ctx = useContext(MarketTicksContext);
  if (!ctx) {
    throw new Error('useMarketTicks MarketTicksProvider içinde kullanılmalı');
  }
  return ctx;
}
