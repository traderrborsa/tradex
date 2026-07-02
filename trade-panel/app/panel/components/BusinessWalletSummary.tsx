'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import {
  fetchBusinessWallet,
  formatTry,
  type BusinessWalletSummary,
} from '@/lib/panel/wallet';
import { CARD } from './ui';

interface Props {
  businessId: string;
}

export function BusinessWalletSummary({ businessId }: Props) {
  const { user } = useAuth();
  const canRead = canAccess(user, PERMS.WALLET_READ);
  const [summary, setSummary] = useState<BusinessWalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    fetchBusinessWallet(businessId)
      .then(setSummary)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Özet yüklenemedi'),
      );
  }, [businessId, canRead]);

  if (!canRead) return null;

  if (error && !summary) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!summary) {
    return <p className="text-sm text-zinc-500">Finans özeti yükleniyor…</p>;
  }

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">İşletme finans özeti</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {summary.memberCount} müşteri · toplam bakiye ve teminat
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-3">
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Toplam bakiye</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {formatTry(summary.totalBalance)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Toplam teminat</p>
          <p className="mt-1 font-mono text-lg font-semibold text-amber-700 dark:text-amber-400">
            {formatTry(summary.totalMarginUsed)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Toplam serbest</p>
          <p className="mt-1 font-mono text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            {formatTry(summary.totalFreeBalance)}
          </p>
        </div>
      </div>
    </div>
  );
}
