'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { fetchBanks, type BankRow } from '@/lib/panel/banks';
import {
  createBankAccount,
  deleteBankAccount,
  fetchBankAccount,
  updateBankAccount,
  type DepositBankAccountRow,
} from '@/lib/panel/bank-accounts';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';

interface Props {
  id?: string;
  businessId?: string;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function formatIbanInput(value: string) {
  const raw = normalizeIban(value).replace(/[^A-Z0-9]/g, '');
  return raw.replace(/(.{4})/g, '$1 ').trim();
}

export function BankAccountEditSheet({
  id,
  businessId,
  canWrite,
  onClose,
  onSaved,
}: Props) {
  const isCreate = !id;

  const [banks, setBanks] = useState<BankRow[]>([]);
  const [row, setRow] = useState<DepositBankAccountRow | null>(null);
  const [bankId, setBankId] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bankOptions = useMemo(
    () => banks.map((b) => ({ value: b.id, label: b.name })),
    [banks],
  );

  useEffect(() => {
    const targetBusinessId = businessId ?? row?.businessId;
    if (!targetBusinessId) {
      setBanks([]);
      return;
    }
    fetchBanks(targetBusinessId)
      .then(setBanks)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Bankalar yüklenemedi'),
      );
  }, [businessId, row?.businessId]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchBankAccount(id)
      .then((r) => {
        setRow(r);
        setBankId(r.bankId);
        setAccountHolderName(r.accountHolderName);
        setIban(formatIbanInput(r.iban));
        setDescription(r.description ?? '');
        setIsActive(r.isActive);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;

    if (!bankId) {
      setError('Banka seçin');
      return;
    }

    const holder = accountHolderName.trim().replace(/\s+/g, ' ');
    if (holder.length < 3) {
      setError('Alıcı adı en az 3 karakter olmalı');
      return;
    }

    const normalizedIban = normalizeIban(iban);
    if (!/^TR\d{24}$/.test(normalizedIban)) {
      setError('Geçerli bir TR IBAN girin (TR + 24 rakam)');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const body = {
        bankId,
        accountHolderName: holder,
        iban: normalizedIban,
        description: description.trim() || null,
        isActive,
      };
      if (isCreate) {
        const targetBusinessId = businessId ?? row?.businessId;
        if (!targetBusinessId) {
          setError('İşletme seçin');
          return;
        }
        await createBankAccount({ ...body, businessId: targetBusinessId });
      } else {
        await updateBankAccount(id!, body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!canWrite || !id || !confirm('Bu banka hesabını silmek istediğinize emin misiniz?')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deleteBankAccount(id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
      setSubmitting(false);
    }
  }

  const selectedBank = banks.find((b) => b.id === bankId) ?? row;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold">
            {isCreate ? 'Yeni banka hesabı' : 'Banka hesabı düzenle'}
          </h2>
          <button type="button" onClick={onClose} className="cursor-pointer px-2 py-1 text-zinc-500">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-zinc-500">Yükleniyor…</p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Banka</label>
                  {banks.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Önce Finans → Bankalar bölümünden banka ekleyin.
                    </p>
                  ) : (
                    <SearchableSelect
                      options={bankOptions}
                      value={bankId}
                      onChange={setBankId}
                      placeholder="Banka seçin"
                      searchPlaceholder="Banka ara…"
                      disabled={!canWrite}
                    />
                  )}
                  {selectedBank && 'logoUrl' in selectedBank && selectedBank.logoUrl && (
                    <div className="mt-2 flex justify-center rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700">
                      <img
                        src={selectedBank.logoUrl}
                        alt=""
                        className="h-8 w-auto max-w-[120px] object-contain"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Alıcı adı</label>
                  <input
                    className={INPUT}
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Hesap sahibinin adı soyadı"
                    disabled={!canWrite}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">IBAN</label>
                  <input
                    className={INPUT}
                    value={iban}
                    onChange={(e) => setIban(formatIbanInput(e.target.value))}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    disabled={!canWrite}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Açıklama</label>
                  <input
                    className={INPUT}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Müşterilere gösterilecek not (isteğe bağlı)"
                    disabled={!canWrite}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Durum</label>
                  <select
                    className={INPUT}
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    disabled={!canWrite}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            {canWrite && !isCreate && (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="mr-auto text-sm text-red-600 hover:underline"
                disabled={submitting}
              >
                Sil
              </button>
            )}
            <button type="button" className={BTN_SECONDARY} onClick={onClose}>
              Kapat
            </button>
            {canWrite && (
              <button
                type="submit"
                className={BTN_PRIMARY}
                disabled={submitting || loading || banks.length === 0}
              >
                {submitting ? 'Kaydediliyor…' : isCreate ? 'Oluştur' : 'Kaydet'}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
