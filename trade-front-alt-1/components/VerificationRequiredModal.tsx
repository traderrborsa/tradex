'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AuthUser } from '@/lib/auth';
import { getVerificationMissing } from '@/lib/verification';

export interface VerificationRequiredModalProps {
  open: boolean;
  onClose: () => void;
  user: AuthUser;
  title?: string;
  description?: string;
  profileHref?: string;
  dismissLabel?: string;
}

export function VerificationRequiredModal({
  open,
  onClose,
  user,
  title = 'Hesap doğrulaması gerekli',
  description = 'İşlem yapabilmek için hesabınızı doğrulamanız gerekiyor.',
  profileHref = '/profile',
  dismissLabel = 'Kapat',
}: VerificationRequiredModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const missing = getVerificationMissing(user);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border-strong bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        {missing.length > 0 && (
          <ul className="mt-3 list-inside list-disc text-sm text-amber-400">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-secondary hover:text-foreground"
          >
            {dismissLabel}
          </button>
          <Link
            href={profileHref}
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            Doğrulamaya git
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
