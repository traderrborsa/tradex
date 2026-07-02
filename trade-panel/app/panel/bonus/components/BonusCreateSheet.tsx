'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchMembers } from '@/lib/panel/members';
import type { PanelMemberRow } from '@/lib/panel/types';
import { createBonus } from '@/lib/panel/bonus';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';
import { SearchableSelect } from '@/components/SearchableSelect';

interface Props {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function BonusCreateSheet({ businessId, onClose, onSaved }: Props) {
  const [members, setMembers] = useState<PanelMemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingMembers(true);
    fetchMembers(businessId || undefined)
      .then(setMembers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoadingMembers(false));
  }, [businessId]);

  const options = useMemo(
    () =>
      members.map((m) => ({
        value: `${m.user.id}|${m.business.id}`,
        label: m.user.fullName,
        description: `${m.user.email} · ${m.business.displayName}`,
      })),
    [members],
  );

  const amountValue = Number(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;

  async function onCreate() {
    if (!selected) {
      setError('Müşteri seçin');
      return;
    }
    if (!amountValid) {
      setError('Geçerli bir bonus tutarı girin');
      return;
    }
    const [userId, memberBusinessId] = selected.split('|');
    setSubmitting(true);
    setError(null);
    try {
      await createBonus({
        userId,
        businessId: memberBusinessId,
        amount: amountValue,
        description: description.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oluşturulamadı');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold">Yeni bonus tanımla</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-2 py-1 text-zinc-500"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Müşteri</label>
            <SearchableSelect
              options={options}
              value={selected}
              onChange={setSelected}
              placeholder={
                loadingMembers ? 'Müşteriler yükleniyor…' : 'Müşteri seçin'
              }
              searchPlaceholder="Ad veya e-posta ara…"
              emptyText="Müşteri bulunamadı"
              disabled={loadingMembers}
              maxVisible={50}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Bonus tutarı (₺)
            </label>
            <input
              className={INPUT}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="Örn. 500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Tanımladığınız tutar müşterinin bakiyesine anında eklenir.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Açıklama (opsiyonel)
            </label>
            <textarea
              className={`${INPUT} min-h-[80px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bonus ile ilgili not"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <button type="button" className={BTN_SECONDARY} onClick={onClose}>
            İptal
          </button>
          <button
            type="button"
            className={`${BTN_PRIMARY} bg-emerald-600 hover:bg-emerald-500`}
            onClick={() => void onCreate()}
            disabled={submitting || !selected || !amountValid}
          >
            {submitting ? 'Kaydediliyor…' : 'Bonusu tanımla'}
          </button>
        </div>
      </div>
    </>
  );
}
