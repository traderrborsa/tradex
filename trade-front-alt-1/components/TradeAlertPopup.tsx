'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useNotificationsOptional } from '@/contexts/NotificationsContext';

function resolveAlertStyle(type: string): {
  border: string;
  badge: string;
  icon: string;
} {
  switch (type) {
    case 'trade_buy':
      return {
        border: 'border-positive/30',
        badge: 'bg-positive/15 text-positive',
        icon: '↑',
      };
    case 'trade_sell':
      return {
        border: 'border-negative/30',
        badge: 'bg-negative/15 text-negative',
        icon: '↓',
      };
    case 'take_profit':
      return {
        border: 'border-positive/30',
        badge: 'bg-positive/15 text-positive',
        icon: '✓',
      };
    case 'stop_loss':
      return {
        border: 'border-negative/30',
        badge: 'bg-negative/15 text-negative',
        icon: '!',
      };
    case 'position_closed':
    default:
      return {
        border: 'border-accent/30',
        badge: 'bg-accent-soft text-accent',
        icon: '✕',
      };
  }
}

export function TradeAlertPopup() {
  const notifications = useNotificationsOptional();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !notifications) return null;

  const alert = notifications.tradeAlert;
  const style = alert ? resolveAlertStyle(alert.type) : null;

  return createPortal(
    <AnimatePresence>
      {alert && style && (
        <div
          className="pointer-events-none fixed inset-x-0 top-20 z-[150] flex justify-center px-4 sm:top-24"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`pointer-events-auto w-full max-w-md rounded-2xl border px-5 py-4 shadow-xl ${style.border} bg-card text-foreground`}
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${style.badge}`}
              >
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{alert.title}</p>
                <p className="mt-0.5 text-sm text-muted">{alert.message}</p>
              </div>
              <button
                type="button"
                onClick={notifications.dismissTradeAlert}
                className="shrink-0 cursor-pointer rounded-full p-1 text-muted transition hover:bg-hover hover:text-foreground"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
