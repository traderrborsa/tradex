'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { useMarketTicks } from '@/hooks/useMarketTicks';
import { fetchMembers } from '@/lib/panel/members';
import { openTransactionForUser } from '@/lib/panel/transactions';
import type { PanelMemberRow } from '@/lib/panel/types';
import { SearchableSelect } from '@/components/SearchableSelect';
import type { SearchableSelectOption } from '@/components/SearchableSelect';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  businessId: string;
}

export function OpenPositionSheet({ open, onClose, onSaved, businessId }: Props) {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.TRANSACTIONS_WRITE);

  const [members, setMembers] = useState<PanelMemberRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userId, setUserId] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sym = symbol.trim().toUpperCase();
  const { ticks } = useMarketTicks(sym ? [sym] : []);
  const tick = sym ? ticks[sym] : undefined;
  const bid = tick?.bid ?? 0;
  const ask = tick?.ask ?? 0;

  useEffect(() => {
    if (!open) return;
    if (!businessId) {
      setMembers([]);
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    fetchMembers(businessId)
      .then(setMembers)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Müşteriler yüklenemedi'),
      )
      .finally(() => setLoadingUsers(false));
  }, [open, businessId]);

  useEffect(() => {
    if (orderType === 'limit' && bid > 0 && !limitPrice) {
      setLimitPrice(String(bid));
    }
  }, [orderType, bid, limitPrice]);

  const selectedMember = useMemo(
    () => members.find((m) => m.user.id === userId),
    [members, userId],
  );

  // Önce online müşteriler, sonra isme göre. Searchable select arama
  // yapılmadığında ilk 5 müşteriyi (online öncelikli) gösterir.
  const memberOptions = useMemo<SearchableSelectOption[]>(() => {
    return [...members]
      .sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.user.fullName.localeCompare(b.user.fullName, 'tr-TR');
      })
      .map((m) => ({
        value: m.user.id,
        label: m.user.fullName,
        description: m.user.email,
        online: m.isOnline,
      }));
  }, [members]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite || !userId || !sym || !businessId) return;

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Geçerli bir lot girin');
      return;
    }
    if (bid <= 0 || ask <= 0) {
      setError('Fiyat bekleniyor — sembolü kontrol edin');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await openTransactionForUser({
        userId,
        orderType,
        symbol: sym,
        side,
        quantity: qty,
        bid,
        ask,
        limitPrice: orderType === 'limit' ? Number(limitPrice) : undefined,
        stopLoss: stopLoss.trim() ? Number(stopLoss) : undefined,
        takeProfit: takeProfit.trim() ? Number(takeProfit) : undefined,
        businessId,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem açılamadı');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            İşlem aç
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form
          id="open-position-form"
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Müşteri
            </label>
            {loadingUsers ? (
              <p className="text-sm text-zinc-500">Kullanıcılar yükleniyor…</p>
            ) : !businessId ? (
              <p className="text-sm text-amber-600">
                İşlem açmak için önce işletme seçin.
              </p>
            ) : (
              <SearchableSelect
                options={memberOptions}
                value={userId}
                onChange={setUserId}
                placeholder="Müşteri seçin…"
                searchPlaceholder="İsim veya e-posta ile ara…"
                emptyText="Müşteri bulunamadı"
                maxVisible={5}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Emir tipi
              </label>
              <select
                className={INPUT}
                value={orderType}
                onChange={(e) =>
                  setOrderType(e.target.value as 'market' | 'limit')
                }
              >
                <option value="market">Piyasa</option>
                <option value="limit">Limit</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Yön
              </label>
              <select
                className={INPUT}
                value={side}
                onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
              >
                <option value="buy">Alış</option>
                <option value="sell">Satış</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Sembol
              </label>
              <input
                className={INPUT}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="ASELS, XAUUSD…"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Lot
              </label>
              <input
                className={INPUT}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          {sym && bid > 0 && (
            <p className="text-sm text-zinc-500">
              Anlık: Alış {ask.toLocaleString('tr-TR')} / Satış{' '}
              {bid.toLocaleString('tr-TR')}
              {selectedMember ? ` · ${selectedMember.user.fullName}` : ''}
            </p>
          )}

          {orderType === 'limit' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Limit fiyat
              </label>
              <input
                className={INPUT}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                required
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Zarar durdur
              </label>
              <input
                className={INPUT}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Kar al
              </label>
              <input
                className={INPUT}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <button type="button" className={BTN_SECONDARY} onClick={onClose}>
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting || !userId || !sym || !businessId}
              className={BTN_PRIMARY}
            >
              {submitting ? 'Açılıyor…' : 'İşlem aç'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
