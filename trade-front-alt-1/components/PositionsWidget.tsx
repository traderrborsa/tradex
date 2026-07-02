'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTrading } from '@/contexts/TradingContext';
import { PositionsView } from './PositionsView';

const POS_KEY = 'aurex-positions-widget-pos';
const HIDDEN_PREFIXES = ['/login', '/register'];

function symbolFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/symbol\/([^/]+)/i);
  return match ? decodeURIComponent(match[1]).toUpperCase() : undefined;
}

function clamp(value: number, max: number) {
  return Math.min(Math.max(value, 8), max);
}

export function PositionsWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { portfolio } = useTrading();

  const btnRef = useRef<HTMLButtonElement>(null);
  const drag = useRef({
    active: false,
    moved: false,
    px: 0,
    py: 0,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) setPos(JSON.parse(raw));
    } catch {
      /* yoksay */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!user) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const activeSymbol = symbolFromPath(pathname);
  const openCount = portfolio.positions.length;

  const navigateToSymbol = (symbol: string) => {
    setOpen(false);
    router.push(`/symbol/${symbol}`);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      active: true,
      moved: false,
      px: e.clientX,
      py: e.clientY,
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
    };
    btnRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true;
    if (!d.moved) return;
    setPos({
      x: clamp(d.x + dx, window.innerWidth - d.w - 8),
      y: clamp(d.y + dy, window.innerHeight - d.h - 8),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    btnRef.current?.releasePointerCapture(e.pointerId);
    if (d.moved) {
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(p));
          } catch {
            /* yoksay */
          }
        }
        return p;
      });
    } else {
      setOpen((v) => !v);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={
          pos
            ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
            : undefined
        }
        className={`fixed flex touch-none cursor-pointer items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-accent-fg shadow-xl transition active:scale-95 ${
          open ? 'z-[70]' : 'z-50'
        } ${
          pos
            ? ''
            : 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6 md:right-6'
        }`}
        aria-label="Pozisyonlar"
        aria-expanded={open}
      >
        Pozisyonlar
        {openCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-negative px-1 text-[10px] font-bold text-white">
            {openCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
            <h2 className="text-base font-bold text-foreground">
              Pozisyonlar
              <span className="ml-1.5 font-normal text-muted">(tümü)</span>
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface text-muted transition hover:text-foreground"
              aria-label="Kapat"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <PositionsView
              highlightSymbol={activeSymbol}
              onSymbolNavigate={navigateToSymbol}
              listClassName="space-y-1"
            />
          </div>
        </div>
      )}
    </>
  );
}
