const SYMBOL_TYPE_LABELS: Record<string, string> = {
  Stock: 'Hisse',
  Forex: 'Forex',
  Crypto: 'Kripto',
  Index: 'Endeks',
  Commodity: 'Emtia',
  ETF: 'ETF',
  CFD: 'CFD',
};

export function formatSymbolType(type: string): string {
  return SYMBOL_TYPE_LABELS[type] ?? type;
}

export function formatTradeSide(side: 'buy' | 'sell'): string {
  return side === 'buy' ? 'AL' : 'SAT';
}

export function formatPositionSide(side: 'long' | 'short'): string {
  return side === 'long' ? 'Long' : 'Short';
}
