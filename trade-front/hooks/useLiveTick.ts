'use client';

import { useEffect, useRef, useState } from 'react';
import { useMarketTicks } from '@/contexts/MarketTicksContext';
import { fetchTick } from '@/lib/api';
import { isMarketWsOpen } from '@/lib/market-ws';
import type { Tick } from '@/lib/types';

const POLL_MS = 3000;

export type LiveMode = 'websocket' | 'polling' | 'connecting';

export function useLiveTick(symbol: string, initial?: Tick | null) {
  const sym = symbol.toUpperCase();
  const { ticks, watch, wsConnected } = useMarketTicks();
  const [localTick, setLocalTick] = useState<Tick | null>(initial ?? null);
  const [mode, setMode] = useState<LiveMode>('connecting');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const streamTick = ticks[sym];
  const tick = streamTick ?? localTick ?? initial ?? null;

  useEffect(() => {
    watch([sym]);
  }, [sym, watch]);

  useEffect(() => {
    setLocalTick(initial ?? null);
  }, [sym, initial]);

  useEffect(() => {
    let active = true;

    if (streamTick) {
      setMode('websocket');
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const startPolling = () => {
      if (pollRef.current || !active) return;
      setMode('polling');
      const poll = async () => {
        if (!active) return;
        try {
          const data = await fetchTick(sym);
          setLocalTick(data);
          if (isMarketWsOpen()) setMode('websocket');
        } catch {
          /* ignore */
        }
      };
      void poll();
      pollRef.current = setInterval(poll, POLL_MS);
    };

    const fallbackTimer = setTimeout(() => {
      if (active && !ticks[sym]) startPolling();
    }, 3000);

    if (wsConnected && isMarketWsOpen()) {
      setMode('websocket');
    }

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [sym, streamTick, ticks, wsConnected]);

  const connected = mode === 'websocket' || mode === 'polling';

  return { tick, connected, mode };
}
