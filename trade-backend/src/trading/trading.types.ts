export const INITIAL_BALANCE = 10_000; // TL
export const COMMISSION_RATE = 0.0002;

export type PositionSide = 'long' | 'short';

export interface Position {
  /** Pozisyonun benzersiz kimliği. FX'te aynı sembolde birden fazla pozisyon olabilir. */
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgEntry: number;
  openedAt: string;
  stopLoss?: number;
  takeProfit?: number;
  /** Pozisyon açılırken kullanılan kaldıraç (1 = kaldıraçsız). */
  leverage: number;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  limitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  createdAt: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  /** Brüt gerçekleşen K/Z (fiyat farkı × lot). */
  realizedPnl: number;
  at: string;
  note?: string;
  grossPnl?: number;
  commission?: number;
  swap?: number;
  /** Brüt + swap − komisyon (panel ile uyumlu). */
  netPnl?: number;
  /** Bakiyeye yansıyan net kâr: brüt − kapanış komisyonu. */
  balancePnl?: number;
  /** Kapalı pozisyon: alış fiyatı. */
  buyPrice?: number;
  /** Kapalı pozisyon: satış fiyatı. */
  sellPrice?: number;
  /** Kapalı pozisyon: alış tarihi (ISO). */
  buyAt?: string;
  /** Kapalı pozisyon: satış tarihi (ISO). */
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
