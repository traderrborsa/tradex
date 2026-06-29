export type PositionSide = 'long' | 'short';

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgEntry: number;
  openedAt: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  limitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  realizedPnl: number;
  at: string;
  note?: string;
  grossPnl?: number;
  commission?: number;
  swap?: number;
  netPnl?: number;
  balancePnl?: number;
}

export interface Portfolio {
  balance: number;
  positions: Position[];
  pendingOrders: PendingOrder[];
  history: Trade[];
}

export const INITIAL_BALANCE = 10_000; // TL
export const STORAGE_KEY = 'forex-paper-portfolio';
