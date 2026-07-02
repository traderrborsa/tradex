'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchMarketLatest } from '@/lib/market-latest';
import type { Tick } from '@/lib/market-types';
import { subscribeMarketTicksMany } from '@/lib/market-ws';

export function useMarketTicks(symbols: string[] = []) {
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const latestReqRef = useRef(0);

  const symbolsKey = symbols
    .map((s) => s.toUpperCase())
    .sort()
    .join(',');

  useEffect(() => {
    if (!symbolsKey) return;

    const list = symbolsKey.split(',').filter(Boolean);
    const reqId = ++latestReqRef.current;

    void fetchMarketLatest(list).then((latest) => {
      if (reqId !== latestReqRef.current) return;
      if (Object.keys(latest).length === 0) return;
      setTicks((prev) => ({ ...prev, ...latest }));
    });

    const onTick = (tick: Tick) => {
      const sym = tick.symbol?.toUpperCase();
      if (!sym) return;
      setTicks((prev) => ({
        ...prev,
        [sym]: { ...prev[sym], ...tick, symbol: sym },
      }));
    };

    const unsub = subscribeMarketTicksMany(list, onTick);
    return () => {
      latestReqRef.current += 1;
      unsub();
    };
  }, [symbolsKey]);

  return { ticks };
}
