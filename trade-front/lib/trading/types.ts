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
  leverage?: number;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  limitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
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
  buyPrice?: number;
  sellPrice?: number;
  buyAt?: string;
  sellAt?: string;
}

export interface Portfolio {
  balance: number;
  /** Onaylı bonus toplamı. */
  bonusIncome?: number;
  /** Onaylı kredi toplamı. */
  creditIncome?: number;
  /** Yatırım/işlem kaynaklı nakit (bonus hariç). */
  cashBalance?: number;
  /** Nakit + bonus + kredi toplamı. */
  totalBalance?: number;
  positions: Position[];
  pendingOrders: PendingOrder[];
  history: Trade[];
}

export const INITIAL_BALANCE = 10_000; // TL
export const STORAGE_KEY = 'forex-paper-portfolio';
