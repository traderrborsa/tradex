'use client';

import Image from 'next/image';
import { useState } from 'react';
import { bistLogoUrl } from '@/lib/symbol-assets';

interface Props {
  symbol: string;
  size: number;
}

function BistBadgeFallback({ symbol, size }: Props) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-border-strong bg-elevated text-foreground"
      style={{ width: size, height: size, fontSize: size * 0.28 }}
    >
      <span className="font-bold tracking-tight">{symbol.slice(0, 4)}</span>
    </div>
  );
}

export function BistStockLogo({ symbol, size }: Props) {
  const [failed, setFailed] = useState(false);
  const sym = symbol.toUpperCase();

  if (failed) {
    return <BistBadgeFallback symbol={sym} size={size} />;
  }

  return (
    <Image
      src={bistLogoUrl(sym)}
      alt={sym}
      width={size}
      height={size}
      className="rounded-xl bg-white object-contain p-0.5"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
