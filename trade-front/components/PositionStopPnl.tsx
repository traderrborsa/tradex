import { formatMoney } from '@/lib/format-money';
import { formatMarketPrice } from '@/lib/price';
import {
  potentialPnlAtPrice,
  potentialPnlForOrder,
} from '@/lib/trading/engine';
import type { Position, PositionSide } from '@/lib/trading/types';

function StopBadge({
  kind,
  price,
  pnl,
  symbol,
}: {
  kind: 'SL' | 'TP';
  price: number;
  pnl: number;
  symbol: string;
}) {
  const isUp = pnl >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${
        isUp
          ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-400'
          : 'border-red-500/35 bg-red-500/15 text-red-400'
      }`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wider">
        {kind}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums opacity-90">
        {formatMarketPrice(price, symbol)}
      </span>
      <span className="text-sm font-extrabold tabular-nums">
        {formatMoney(pnl)}
      </span>
    </span>
  );
}

type Props = {
  position?: Position;
  symbol?: string;
  side?: PositionSide;
  quantity?: number;
  entryPrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  className?: string;
  showHint?: boolean;
};

export function PositionStopPnl({
  position,
  symbol,
  side,
  quantity,
  entryPrice,
  stopLoss,
  takeProfit,
  className = '',
  showHint = true,
}: Props) {
  const sym = (position?.symbol ?? symbol ?? '').toUpperCase();
  const resolvedSide = position?.side ?? side ?? 'long';
  const qty = position?.quantity ?? quantity ?? 0;
  const entry = position?.avgEntry ?? entryPrice ?? 0;
  const sl = stopLoss ?? position?.stopLoss;
  const tp = takeProfit ?? position?.takeProfit;
  const hasSl = sl != null && sl > 0;
  const hasTp = tp != null && tp > 0;
  if (!hasSl && !hasTp) return null;
  if (!sym || qty <= 0 || entry <= 0) return null;

  const pnlAt = (exit: number) =>
    position
      ? potentialPnlAtPrice(position, exit)
      : potentialPnlForOrder(resolvedSide, qty, entry, exit);

  return (
    <div className={className}>
      {showHint && (
        <p className="mb-1.5 text-[10px] font-medium text-muted">
          Tahmini kâr/zarar (komisyon hariç)
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {hasSl && (
          <StopBadge kind="SL" price={sl} pnl={pnlAt(sl)} symbol={sym} />
        )}
        {hasTp && (
          <StopBadge kind="TP" price={tp} pnl={pnlAt(tp)} symbol={sym} />
        )}
      </div>
    </div>
  );
}
