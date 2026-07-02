'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type FloatingItem = {
  id: string;
  symbol: string;
  label: string;
  price: string;
  change: string;
  up: boolean;
  sparkline: number[];
  top?: string;
  left?: string;
  right?: string;
};

const POOL: Omit<FloatingItem, 'top' | 'left' | 'right'>[] = [
  {
    id: 'thyao',
    symbol: 'THYAO',
    label: 'THYAO',
    price: '328,40 ₺',
    change: '+2,41%',
    up: true,
    sparkline: [40, 42, 41, 44, 43, 46, 48, 47, 50],
  },
  {
    id: 'xu100',
    symbol: 'XU100',
    label: 'BIST 100',
    price: '10.842',
    change: '+0,87%',
    up: true,
    sparkline: [30, 32, 31, 33, 35, 34, 36, 38, 39],
  },
  {
    id: 'btc',
    symbol: 'BTCUSD',
    label: 'Bitcoin',
    price: '$97.420',
    change: '-1,12%',
    up: false,
    sparkline: [55, 54, 52, 53, 50, 49, 48, 47, 46],
  },
  {
    id: 'eurusd',
    symbol: 'EURUSD',
    label: 'EUR/USD',
    price: '1,0842',
    change: '+0,28%',
    up: true,
    sparkline: [20, 21, 20, 22, 23, 22, 24, 25, 26],
  },
  {
    id: 'garan',
    symbol: 'GARAN',
    label: 'GARAN',
    price: '142,10 ₺',
    change: '+1,55%',
    up: true,
    sparkline: [35, 36, 38, 37, 39, 41, 40, 43, 45],
  },
  {
    id: 'nvda',
    symbol: 'NVDA',
    label: 'NVIDIA',
    price: '$892',
    change: '+3,02%',
    up: true,
    sparkline: [25, 28, 30, 29, 33, 35, 38, 40, 42],
  },
];

const DESKTOP_SLOTS: Pick<FloatingItem, 'top' | 'left' | 'right'>[] = [
  { top: '12%', left: '8%' },
  { top: '10%', right: '8%' },
  { top: '38%', left: '12%' },
  { top: '36%', right: '10%' },
  { top: '64%', left: '6%' },
  { top: '62%', right: '6%' },
];

const MOBILE_SLOTS: Pick<FloatingItem, 'top' | 'left' | 'right'>[] = [
  { top: '18%', left: '4%' },
  { top: '16%', right: '4%' },
  { top: '52%', left: '8%' },
  { top: '50%', right: '8%' },
];

function MiniSparkline({ values, up, compact }: { values: number[]; up: boolean; compact?: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = compact ? 88 : 120;
  const h = compact ? 28 : 36;
  const color = up ? '#3d8f6a' : '#e05252';
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return { x, y };
  });
  const linePoints = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `0,${h} ${linePoints} ${w},${h}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polygon points={areaPoints} fill={up ? 'rgba(61,143,106,0.15)' : 'rgba(224,82,82,0.12)'} />
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={linePoints} />
    </svg>
  );
}

function FloatingCard({ item, compact }: { item: FloatingItem; compact?: boolean }) {
  return (
    <div
      className={`auth-float-card rounded-2xl p-3 ${compact ? 'w-[148px]' : 'w-[176px]'} ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className={`truncate font-bold text-[#1a2e24] ${compact ? 'text-xs' : 'text-sm'}`}>{item.symbol}</p>
          {!compact && <p className="truncate text-[11px] text-[#5a6e64]">{item.label}</p>}
        </div>
        <span
          className={`shrink-0 rounded-md px-1 py-0.5 text-[10px] font-bold ${
            item.up ? 'bg-[#e4f2eb] text-[#2d6b4f]' : 'bg-[#fceaea] text-[#b84040]'
          }`}
        >
          {item.change}
        </span>
      </div>
      <p className={`mt-1.5 font-bold tabular-nums text-[#1a2e24] ${compact ? 'text-sm' : 'text-base'}`}>{item.price}</p>
      <div className="mt-1.5">
        <MiniSparkline values={item.sparkline} up={item.up} compact={compact} />
      </div>
    </div>
  );
}

interface Props {
  variant?: 'desktop' | 'mobile';
}

export function AuthPanelMotion({ variant = 'desktop' }: Props) {
  const slots = variant === 'mobile' ? MOBILE_SLOTS : DESKTOP_SLOTS;
  const compact = variant === 'mobile';

  const [visible, setVisible] = useState<FloatingItem[]>(() =>
    slots.map((slot, i) => ({
      ...POOL[i % POOL.length],
      id: `${POOL[i % POOL.length].id}-init-${i}`,
      ...slot,
    })),
  );
  const counterRef = useRef(POOL.length);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((prev) => {
        const slotIndex = Math.floor(Math.random() * slots.length);
        counterRef.current += 1;
        const base = POOL[counterRef.current % POOL.length];
        const slot = slots[slotIndex];
        const next: FloatingItem = {
          ...base,
          id: `${base.id}-${counterRef.current}`,
          ...slot,
        };
        const copy = [...prev];
        copy[slotIndex] = next;
        return copy;
      });
    }, 2800);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slots derived from variant
  }, [variant]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      <AnimatePresence initial={false}>
        {visible.map((item) => (
          <motion.div
            key={item.id}
            className="absolute"
            style={{ top: item.top, left: item.left, right: item.right }}
            initial={{ opacity: 0, y: 28, scale: 0.88 }}
            animate={{ opacity: 1, y: [0, -10, 0], scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.88 }}
            transition={{
              opacity: { duration: 0.5 },
              y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
              scale: { duration: 0.5 },
            }}
          >
            <FloatingCard item={item} compact={compact} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
