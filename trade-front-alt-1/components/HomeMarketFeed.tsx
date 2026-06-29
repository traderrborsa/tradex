'use client';

import { useEffect } from 'react';
import { useMarketTicks } from '@/contexts/MarketTicksContext';
import { ALL_HOME_SYMBOLS } from '@/lib/symbol-assets';
import type { Tick } from '@/lib/types';

interface Props {
  children: (ticks: Record<string, Tick>) => React.ReactNode;
}

export function HomeMarketFeed({ children }: Props) {
  const { ticks, watch } = useMarketTicks();

  useEffect(() => {
    watch(ALL_HOME_SYMBOLS);
  }, [watch]);

  return <>{children(ticks)}</>;
}
