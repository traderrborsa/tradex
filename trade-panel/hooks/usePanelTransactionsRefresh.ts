'use client';

import { useEffect } from 'react';
import { subscribePanelTransactionsRefresh } from '@/lib/panel-transactions-ws';

export function usePanelTransactionsRefresh(onRefresh: () => void) {
  useEffect(() => {
    return subscribePanelTransactionsRefresh(onRefresh);
  }, [onRefresh]);
}
