'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import {
  adjustMemberWallet,
  fetchMemberWallet,
  formatTry,
  type MemberWalletResponse,
} from '@/lib/panel/wallet';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from './ui';

interface Props {
  userId: string;
  businessId?: string;
}

export function MemberWalletCard({ userId, businessId }: Props) {
  const { user: me } = useAuth();
  const canRead = canAccess(me, PERMS.WALLET_READ);
  const canAdjust = canAccess(me, PERMS.WALLET_WRITE);

  const [wallet, setWallet] = useState<MemberWalletResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetchMemberWallet(userId, businessId)
      .then(setWallet)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Cüzdan yüklenemedi'),
      );
  }

  useEffect(() => {
    if (!canRead) return;
    load();
  }, [userId, businessId, canRead]);

  if (!canRead) return null;

  async function handleAdjust(type: 'deposit' | 'withdraw') {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Geçerli bir tutar girin');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await adjustMemberWallet(userId, {
        type,
        amount: value,
        note: note.trim() || undefined,
      });
      setWallet((w) =>
        w ? { ...w, balance: res.balance, freeBalance: Math.max(0, res.balance - w.marginUsed) } : w,
      );
      setAmount('');
      setNote('');
      setMessage(
        type === 'deposit'
          ? `${formatTry(value)} bakiyeye eklendi`
          : `${formatTry(value)} bakiyeden çekildi`,
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setSaving(false);
    }
  }

  if (error && !wallet) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!wallet) {
    return <p className="text-sm text-zinc-500">Cüzdan yükleniyor…</p>;
  }

  return (
    <div className={`${CARD} p-6`}>
      <h2 className="text-sm font-semibold">Bakiye ve teminat</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Müşteri hesabındaki para ve açık pozisyonlarda kilitli teminat (kaldıraç{' '}
        1:{wallet.leverage})
      </p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          <dt className="text-xs text-zinc-500">Bakiye</dt>
          <dd className="mt-1 font-mono text-lg font-semibold">
            {formatTry(wallet.balance)}
          </dd>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          <dt className="text-xs text-zinc-500">Kullanılan teminat</dt>
          <dd className="mt-1 font-mono text-lg font-semibold text-amber-700 dark:text-amber-400">
            {formatTry(wallet.marginUsed)}
          </dd>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          <dt className="text-xs text-zinc-500">Serbest bakiye</dt>
          <dd className="mt-1 font-mono text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            {formatTry(wallet.freeBalance)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 text-xs text-zinc-500 sm:grid-cols-2">
        <p>
          Onaylı yatırma: {formatTry(wallet.finance.totalDeposited)}
          {wallet.finance.pendingDepositCount > 0 &&
            ` · Bekleyen: ${formatTry(wallet.finance.pendingDepositTotal)}`}
        </p>
        <p>
          Onaylı çekme: {formatTry(wallet.finance.totalWithdrawn)}
          {wallet.finance.pendingWithdrawCount > 0 &&
            ` · Bekleyen: ${formatTry(wallet.finance.pendingWithdrawTotal)}`}
        </p>
      </div>

      {wallet.positions.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
            Açık pozisyonlar — teminat
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-2 font-medium">Sembol</th>
                <th className="py-2 pr-2 font-medium">Yön</th>
                <th className="py-2 pr-2 font-medium">Lot</th>
                <th className="py-2 pr-2 font-medium">Giriş</th>
                <th className="py-2 font-medium">Teminat</th>
              </tr>
            </thead>
            <tbody>
              {wallet.positions.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="py-2 pr-2 font-mono">{p.symbol}</td>
                  <td className="py-2 pr-2">{p.side}</td>
                  <td className="py-2 pr-2 font-mono">{p.quantity}</td>
                  <td className="py-2 pr-2 font-mono">{p.avgEntry}</td>
                  <td className="py-2 font-mono">{formatTry(p.marginUsed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canAdjust && (
        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Manuel bakiye işlemi
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              className={`${INPUT} max-w-[160px]`}
              placeholder="Tutar (₺)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              className={`${INPUT} min-w-[200px] flex-1`}
              placeholder="Not (isteğe bağlı)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              className={BTN_PRIMARY}
              onClick={() => void handleAdjust('deposit')}
            >
              Para ekle
            </button>
            <button
              type="button"
              disabled={saving}
              className={BTN_SECONDARY}
              onClick={() => void handleAdjust('withdraw')}
            >
              Para çek
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}
      {error && wallet && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
