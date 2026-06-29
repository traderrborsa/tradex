import { createPortfolio } from './engine';
import type { Portfolio } from './types';
import { STORAGE_KEY } from './types';

export function loadPortfolio(): Portfolio {
  if (typeof window === 'undefined') return createPortfolio();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createPortfolio();
    const parsed = JSON.parse(raw) as Portfolio;
    if (typeof parsed.balance !== 'number') return createPortfolio();
    return {
      balance: parsed.balance,
      positions: parsed.positions ?? [],
      pendingOrders: parsed.pendingOrders ?? [],
      history: parsed.history ?? [],
    };
  } catch {
    return createPortfolio();
  }
}

export function savePortfolio(portfolio: Portfolio) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

export function resetPortfolio(): Portfolio {
  const fresh = createPortfolio();
  savePortfolio(fresh);
  return fresh;
}
