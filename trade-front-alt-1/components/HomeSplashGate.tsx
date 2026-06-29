'use client';

import { useEffect, useRef } from 'react';
import { ensureSearchIndexLoaded } from '@/lib/search-index';
import type { Tick } from '@/lib/types';

const SPLASH_KEY = 'nova-splash-seen';
const MIN_MS = 700;
const MAX_MS = 4500;
const READY_SYMBOLS = ['XU100', 'EURUSD', 'THYAO'] as const;

function isHomeDataReady(ticks: Record<string, Tick>) {
  return READY_SYMBOLS.some((sym) => (ticks[sym]?.last ?? 0) > 0);
}

export function shouldShowHomeSplash(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !sessionStorage.getItem(SPLASH_KEY);
  } catch {
    return false;
  }
}

export function markHomeSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_KEY, '1');
  } catch {
    /* ignore */
  }
}

interface Props {
  ticks: Record<string, Tick>;
  active: boolean;
  onDismiss: () => void;
}

export function HomeSplashGate({ ticks, active, onDismiss }: Props) {
  const startedAt = useRef(Date.now());
  const dismissed = useRef(false);

  useEffect(() => {
    if (!active) return;
    void ensureSearchIndexLoaded();
  }, [active]);

  useEffect(() => {
    if (!active || dismissed.current) return;

    const elapsed = Date.now() - startedAt.current;
    if (isHomeDataReady(ticks) && elapsed >= MIN_MS) {
      dismissed.current = true;
      onDismiss();
    }
  }, [active, ticks, onDismiss]);

  useEffect(() => {
    if (!active || dismissed.current) return;

    const remaining = Math.max(0, MAX_MS - (Date.now() - startedAt.current));
    const timer = setTimeout(() => {
      if (dismissed.current) return;
      dismissed.current = true;
      onDismiss();
    }, remaining);

    return () => clearTimeout(timer);
  }, [active, onDismiss]);

  return null;
}
