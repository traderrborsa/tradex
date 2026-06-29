import type { CreatePriceLineOptions } from 'lightweight-charts';
import { LineStyle } from 'lightweight-charts';
import type { ChartTimeContext } from '@/lib/chart-time';
import type { OhlcBar } from '@/lib/types';
import type { Portfolio } from './types';
import { getPendingOrders } from './engine';

export interface ChartTradeOverlay {
  priceLines: CreatePriceLineOptions[];
}

function line(
  price: number,
  color: string,
  title: string,
  style: LineStyle = LineStyle.Dashed,
): CreatePriceLineOptions {
  return {
    price,
    color,
    lineWidth: 1,
    lineStyle: style,
    axisLabelVisible: true,
    title,
    axisLabelColor: color,
    axisLabelTextColor: '#f8fafc',
  };
}

export function buildChartTradeOverlay(
  symbol: string,
  portfolio: Portfolio,
  bars: OhlcBar[],
  _timeCtx: ChartTimeContext,
): ChartTradeOverlay {
  const sym = symbol.toUpperCase();
  const priceLines: CreatePriceLineOptions[] = [];

  if (bars.length === 0) {
    return { priceLines };
  }

  // Aynı sembolde birden fazla pozisyon olabilir (FX'te long + short bir arada).
  const positions = portfolio.positions.filter(
    (p) => p.symbol.toUpperCase() === sym,
  );
  const multiple = positions.length > 1;
  for (const position of positions) {
    const isLong = position.side === 'long';
    const sideLabel = isLong ? 'Long' : 'Short';
    const entryColor = isLong ? '#22c55e' : '#ef4444';
    priceLines.push(
      line(
        position.avgEntry,
        entryColor,
        `Giriş (${sideLabel})`,
        LineStyle.Solid,
      ),
    );
    if (position.stopLoss != null && position.stopLoss > 0) {
      priceLines.push(
        line(position.stopLoss, '#ef4444', multiple ? `SL ${sideLabel}` : 'SL'),
      );
    }
    if (position.takeProfit != null && position.takeProfit > 0) {
      priceLines.push(
        line(
          position.takeProfit,
          '#22c55e',
          multiple ? `TP ${sideLabel}` : 'TP',
        ),
      );
    }
  }

  for (const order of getPendingOrders(portfolio, sym)) {
    const sideLabel = order.side === 'buy' ? 'Limit AL' : 'Limit SAT';
    priceLines.push(
      line(order.limitPrice, '#f59e0b', sideLabel, LineStyle.Dotted),
    );
    if (order.stopLoss != null && order.stopLoss > 0) {
      priceLines.push(line(order.stopLoss, '#f87171', 'Emir SL', LineStyle.Dotted));
    }
    if (order.takeProfit != null && order.takeProfit > 0) {
      priceLines.push(
        line(order.takeProfit, '#4ade80', 'Emir TP', LineStyle.Dotted),
      );
    }
  }

  return { priceLines };
}
