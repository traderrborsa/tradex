import type { Portfolio } from '@/lib/trading/types';

export function resolvePortfolioBalances(portfolio: Portfolio) {
  const bonusIncome = portfolio.bonusIncome ?? 0;
  const creditIncome = portfolio.creditIncome ?? 0;
  const cashBalance =
    portfolio.cashBalance ?? Math.max(0, portfolio.balance - bonusIncome);
  const totalBalance =
    portfolio.totalBalance ?? cashBalance + bonusIncome + creditIncome;
  return { bonusIncome, creditIncome, cashBalance, totalBalance };
}
