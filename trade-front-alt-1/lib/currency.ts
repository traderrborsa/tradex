export const ACCOUNT_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

export type ExchangeRates = Record<AccountCurrency, number>;

export interface CurrencyContext {
  accountCurrency: AccountCurrency;
  rates: ExchangeRates;
}

export const CURRENCY_LABELS: Record<AccountCurrency, string> = {
  TRY: 'TL',
  USD: 'Dolar',
  EUR: 'Euro',
  GBP: 'Sterlin (STG)',
};

export function normalizeAccountCurrency(value: unknown): AccountCurrency {
  if (typeof value !== 'string') return 'TRY';
  const upper = value.toUpperCase();
  if (upper === 'STG') return 'GBP';
  if ((ACCOUNT_CURRENCIES as readonly string[]).includes(upper)) {
    return upper as AccountCurrency;
  }
  return 'TRY';
}

const QUOTE_OVERRIDES: Record<string, AccountCurrency> = {
  XAUUSD: 'USD',
  XAGUSD: 'USD',
};

function isBistLike(sym: string): boolean {
  if (sym.startsWith('XU')) return true;
  return /^[A-Z]{4,6}$/.test(sym) && !/^[A-Z]{6}$/.test(sym);
}

export function getInstrumentQuoteCurrency(symbol: string): AccountCurrency {
  const sym = symbol.toUpperCase();
  if (QUOTE_OVERRIDES[sym]) return QUOTE_OVERRIDES[sym];
  if (isBistLike(sym)) return 'TRY';
  if (/^[A-Z]{6}$/.test(sym)) {
    const quote = sym.slice(3);
    if (quote === 'TRY' || quote === 'USD' || quote === 'EUR' || quote === 'GBP') {
      return quote;
    }
    return 'USD';
  }
  return 'USD';
}

export function convertToAccount(
  amount: number,
  from: AccountCurrency,
  ctx: CurrencyContext,
): number {
  if (!Number.isFinite(amount)) return 0;
  const to = ctx.accountCurrency;
  if (from === to) return amount;
  const inTry = from === 'TRY' ? amount : amount * ctx.rates[from];
  const result = to === 'TRY' ? inTry : inTry / ctx.rates[to];
  return Math.round(result * 1_000_000) / 1_000_000;
}

export function toAccountFromSymbol(
  amount: number,
  symbol: string,
  ctx?: CurrencyContext,
): number {
  if (!ctx) return amount;
  return convertToAccount(amount, getInstrumentQuoteCurrency(symbol), ctx);
}

export function portfolioCurrencyContext(
  portfolio: { currency?: string; exchangeRates?: Record<string, number> },
): CurrencyContext | undefined {
  if (!portfolio.currency || !portfolio.exchangeRates) return undefined;
  const accountCurrency = normalizeAccountCurrency(portfolio.currency);
  const rates = portfolio.exchangeRates as ExchangeRates;
  if (!rates.TRY || !rates.USD || !rates.EUR || !rates.GBP) return undefined;
  return { accountCurrency, rates };
}
