export class UpdatePanelPositionDto {
  symbol?: string;
  side?: 'long' | 'short';
  quantity?: number;
  avgEntry?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  openedAt?: string;
  balance?: number;
}

export class UpdatePanelPendingOrderDto {
  symbol?: string;
  side?: 'buy' | 'sell';
  quantity?: number;
  limitPrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  createdAt?: string;
  balance?: number;
}

export class UpdatePanelTradeDto {
  symbol?: string;
  side?: 'buy' | 'sell';
  quantity?: number;
  price?: number;
  realizedPnl?: number;
  executedAt?: string;
  balance?: number;
}

export class OpenPanelTransactionDto {
  userId!: string;
  orderType!: 'market' | 'limit';
  symbol!: string;
  side!: 'buy' | 'sell';
  quantity!: number;
  bid!: number;
  ask!: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  businessId!: string;
}

export class ClosePanelPositionDto {
  bid!: number;
  ask!: number;
  /**
   * Opsiyonel TP fiyatı. Verilirse kâr/zarar bu fiyattan hesaplanır; işlem
   * yine gerçek piyasa fiyatından kaydedilir ve panele log düşülür.
   */
  takeProfit?: number;
}
