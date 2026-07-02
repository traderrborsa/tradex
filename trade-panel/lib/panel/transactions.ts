import { panelFetch } from './client';
import type {
  PanelTransactionDetail,
  PanelTransactionRow,
  TransactionStatus,
} from './types';

export function fetchTransactions(
  status: TransactionStatus,
  panelOnly = false,
  businessId?: string,
  userId?: string,
) {
  const params = new URLSearchParams({ status });
  if (panelOnly) params.set('panelOnly', 'true');
  if (businessId) params.set('businessId', businessId);
  if (userId) params.set('userId', userId);
  return panelFetch<PanelTransactionRow[]>(
    `/panel/transactions?${params}`,
  );
}

export function fetchPositionDetail(id: string) {
  return panelFetch<PanelTransactionDetail>(
    `/panel/transactions/positions/${id}`,
  );
}

export function fetchPendingDetail(id: string) {
  return panelFetch<PanelTransactionDetail>(
    `/panel/transactions/orders/${id}`,
  );
}

export function fetchTradeDetail(id: string) {
  return panelFetch<PanelTransactionDetail>(
    `/panel/transactions/trades/${id}`,
  );
}

export function updatePosition(
  id: string,
  body: Record<string, unknown>,
) {
  return panelFetch<PanelTransactionDetail>(
    `/panel/transactions/positions/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function updatePendingOrder(
  id: string,
  body: Record<string, unknown>,
) {
  return panelFetch<PanelTransactionDetail>(
    `/panel/transactions/orders/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function updateTrade(id: string, body: Record<string, unknown>) {
  return panelFetch<PanelTransactionDetail>(
    `/panel/transactions/trades/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function deletePosition(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/transactions/positions/${id}`, {
    method: 'DELETE',
  });
}

export function closePositionAtMarket(
  id: string,
  body: { bid: number; ask: number; takeProfit?: number },
) {
  return panelFetch<{ ok: boolean }>(
    `/panel/transactions/positions/${id}/close`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function deletePendingOrder(id: string) {
  return panelFetch<{ ok: boolean }>(`/panel/transactions/orders/${id}`, {
    method: 'DELETE',
  });
}

export interface OpenTransactionPayload {
  userId: string;
  orderType: 'market' | 'limit';
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  bid: number;
  ask: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  businessId: string;
}

export function openTransactionForUser(payload: OpenTransactionPayload) {
  return panelFetch<{ ok: boolean }>('/panel/transactions/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
