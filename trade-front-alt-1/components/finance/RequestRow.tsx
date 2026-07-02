'use client';

import { useState } from 'react';
import { FIN_CARD } from './shared';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RequestRow({
  summary,
  badge,
  children,
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`${FIN_CARD} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-elevated/50"
      >
        <div className="min-w-0 flex-1">{summary}</div>
        {badge}
        <Chevron open={open} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 text-sm">{children}</div>
      )}
    </div>
  );
}
