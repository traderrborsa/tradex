'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  approveFinanceRequest,
  deleteFinanceRequest,
  fetchFinanceRequest,
  rejectFinanceRequest,
  updateFinanceRequest,
  type FinanceRequestRow,
  type FinanceRequestStatus,
  type FinanceRequestType,
} from '@/lib/panel/finance';
import { fetchBanks, type BankRow } from '@/lib/panel/banks';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';

interface Props {
  id: string;
  canWrite: boolean;
  showActions?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function typeLabel(type: FinanceRequestType) {
  if (type === 'withdrawal') return 'Para çekme';
  if (type === 'deposit') return 'Para yatırma';
  return type;
}

export function FinanceEditSheet({
  id,
  canWrite,
  showActions = false,
  onClose,
  onSaved,
}: Props) {
  const [row, setRow] = useState<FinanceRequestRow | null>(null);
  const [status, setStatus] = useState<FinanceRequestStatus>('pending');
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBanks().then(setBanks).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchFinanceRequest(id)
      .then((r) => {
        setRow(r);
        setStatus(r.status);
        setAmount(String(r.amount));
        setBankId(r.bankId ?? '');
        setAccountHolderName(r.accountHolderName ?? '');
        setIban(r.iban ?? '');
        setDescription(r.description ?? '');
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const bankLabel = row?.bankName ?? banks.find((b) => b.id === bankId)?.name;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateFinanceRequest(id, {
        status,
        amount: Number(amount),
        iban: row?.type === 'withdrawal' ? iban : undefined,
        bankId: row?.type === 'withdrawal' && bankId ? bankId : undefined,
        accountHolderName:
          row?.type === 'withdrawal' ? accountHolderName : undefined,
        description: description.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove() {
    if (!canWrite) return;
    setSubmitting(true);
    setError(null);
    try {
      await approveFinanceRequest(id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onaylanamadı');
      setSubmitting(false);
    }
  }

  async function onReject() {
    if (!canWrite) return;
    setSubmitting(true);
    setError(null);
    try {
      await rejectFinanceRequest(id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reddedilemedi');
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!canWrite || !confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
    setSubmitting(true);
    try {
      await deleteFinanceRequest(id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
      setSubmitting(false);
    }
  }

  if (!row && loading) return null;

  const isPdf = row?.receiptUrl?.toLowerCase().endsWith('.pdf');
  const editable = canWrite && row?.status === 'pending';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold">Talep detayı</h2>
          <button type="button" onClick={onClose} className="cursor-pointer px-2 py-1 text-zinc-500">✕</button>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-zinc-500">Yükleniyor…</p>
            ) : (
              <>
                <p className="text-sm text-zinc-500">
                  {row?.user.fullName} · {row?.user.email}
                </p>
                <p className="text-sm font-medium">
                  Tip:{' '}
                  <span className={row?.type === 'withdrawal' ? 'text-red-600' : 'text-emerald-600'}>
                    {row ? typeLabel(row.type) : ''}
                  </span>
                </p>
                {row?.receiptUrl && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Dekont</p>
                    {isPdf ? (
                      <a
                        href={row.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        PDF dekontu aç
                      </a>
                    ) : (
                      <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={row.receiptUrl}
                          alt="Dekont"
                          className="max-h-48 rounded-lg border border-zinc-200 dark:border-zinc-700"
                        />
                      </a>
                    )}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Durum</label>
                  <select
                    className={INPUT}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FinanceRequestStatus)}
                    disabled={!editable}
                  >
                    <option value="pending">Bekliyor</option>
                    <option value="approved">Onaylandı</option>
                    <option value="rejected">Reddedildi</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Tutar</label>
                  <input className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!editable} required />
                </div>
                {row?.type === 'withdrawal' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Banka</label>
                      {editable ? (
                        <select
                          className={INPUT}
                          value={bankId}
                          onChange={(e) => setBankId(e.target.value)}
                        >
                          <option value="">Banka seçin</option>
                          {banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.name}
                            </option>
                          ))}
                        </select>
                      ) : bankLabel ? (
                        <p className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium dark:border-zinc-700">
                          {bankLabel}
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-500">—</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Alıcı adı</label>
                      <input
                        className={INPUT}
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        disabled={!editable}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">IBAN</label>
                      <input className={INPUT} value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} disabled={!editable} />
                    </div>
                  </>
                )}
                {row?.type === 'deposit' && (bankLabel || iban) && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Yatırılan banka</label>
                      <p className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium dark:border-zinc-700">
                        {bankLabel ?? '—'}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Alıcı adı</label>
                      <p className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                        {accountHolderName || '—'}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">IBAN</label>
                      <p className="rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm dark:border-zinc-700">
                        {iban || '—'}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Açıklama</label>
                  <input className={INPUT} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editable} />
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            {canWrite && row?.status !== 'approved' && (
              <button type="button" onClick={() => void onDelete()} className="mr-auto text-sm text-red-600 hover:underline" disabled={submitting}>
                Sil
              </button>
            )}
            <button type="button" className={BTN_SECONDARY} onClick={onClose}>Kapat</button>
            {canWrite && showActions && row?.status === 'pending' && (
              <>
                <button type="button" className={BTN_SECONDARY} onClick={() => void onReject()} disabled={submitting}>
                  Reddet
                </button>
                <button type="button" className={`${BTN_PRIMARY} bg-emerald-600 hover:bg-emerald-500`} onClick={() => void onApprove()} disabled={submitting}>
                  Onayla
                </button>
              </>
            )}
            {canWrite && row?.status === 'pending' && !showActions && (
              <button type="submit" className={BTN_PRIMARY} disabled={submitting || loading}>
                {submitting ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
