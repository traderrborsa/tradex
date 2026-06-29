'use client';

import { useEffect } from 'react';
import { subscribePanelFinanceRefresh } from '@/lib/panel-finance-ws';

export function usePanelFinanceRefresh(onRefresh: () => void) {
  useEffect(() => {
    return subscribePanelFinanceRefresh(onRefresh);
  }, [onRefresh]);
}
