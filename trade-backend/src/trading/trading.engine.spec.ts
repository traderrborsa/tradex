import { DEFAULT_TRADING_SETTINGS } from './trading-config.types';
import { closePositionById, executeBuy } from './trading.engine';
import type { Portfolio } from './trading.types';

const noFeeSettings = {
  ...DEFAULT_TRADING_SETTINGS,
  commissionRate: 0,
};

function portfolio(balance: number): Portfolio {
  return {
    balance,
    positions: [],
    pendingOrders: [],
    history: [],
  };
}

describe('trading engine leveraged balances', () => {
  it('returns only reserved margin plus realized PnL when closing a leveraged long', () => {
    const opened = executeBuy(portfolio(1000), 'EURUSD', 1000, 1, 1, {
      config: noFeeSettings,
      leverage: 10,
      merge: false,
    });

    expect(opened.error).toBeUndefined();
    expect(opened.portfolio.balance).toBe(900);

    const position = opened.portfolio.positions[0];
    const closed = closePositionById(
      opened.portfolio,
      position.id,
      1.05,
      1.051,
      undefined,
      noFeeSettings,
    );

    expect(closed.error).toBeUndefined();
    expect(closed.portfolio.balance).toBeCloseTo(1050);
  });
});
