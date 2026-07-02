import Image from 'next/image';
import { BistStockLogo } from '@/components/BistStockLogo';
import {
  cryptoIconUrl,
  flagUrl,
  parseSymbolVisual,
  stockLogoUrl,
} from '@/lib/symbol-assets';

interface Props {
  symbol: string;
  size?: number;
}

function CommodityBadge({ kind, size }: { kind: string; size: number }) {
  const isGold = kind === 'gold';
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-foreground shadow-inner"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: isGold
          ? 'linear-gradient(135deg,#f59e0b,#d97706)'
          : 'linear-gradient(135deg,#94a3b8,#64748b)',
      }}
    >
      {isGold ? 'Au' : 'Ag'}
    </div>
  );
}

function FlagImg({ code, size }: { code: string; size: number }) {
  const url = flagUrl(code);
  if (!url) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-secondary"
        style={{ width: size, height: size }}
      >
        {code.slice(0, 2)}
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={code}
      width={size}
      height={size}
      className="rounded-full border border-input-border object-cover"
      unoptimized
    />
  );
}

function BistIndexBadge({ symbol, size }: { symbol: string; size: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-emerald-900/40 bg-gradient-to-br from-emerald-700 to-emerald-950 font-bold text-foreground shadow-inner"
      style={{ width: size, height: size, fontSize: size * 0.22 }}
    >
      {symbol}
    </div>
  );
}

function StockLogo({ symbol, size }: { symbol: string; size: number }) {
  return (
    <Image
      src={stockLogoUrl(symbol)}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-xl bg-white object-contain p-0.5"
      unoptimized
    />
  );
}

export function SymbolIcon({ symbol, size = 40 }: Props) {
  const visual = parseSymbolVisual(symbol);

  if (visual.type === 'bist-index') {
    return <BistIndexBadge symbol={symbol} size={size} />;
  }

  if (visual.type === 'bist') {
    return <BistStockLogo symbol={symbol} size={size} />;
  }

  if (visual.type === 'stock') {
    return <StockLogo symbol={symbol} size={size} />;
  }

  if (visual.type === 'commodity') {
    return <CommodityBadge kind={visual.primary} size={size} />;
  }

  if (visual.type === 'crypto') {
    return (
      <Image
        src={cryptoIconUrl(visual.primary)}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full bg-elevated"
        unoptimized
      />
    );
  }

  const half = size * 0.62;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute left-0 top-0 z-10">
        <FlagImg code={visual.primary} size={half} />
      </div>
      {visual.secondary && (
        <div className="absolute bottom-0 right-0 z-20">
          <FlagImg code={visual.secondary} size={half} />
        </div>
      )}
    </div>
  );
}
