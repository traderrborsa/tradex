'use client';

import { useEffect, useRef, useState } from 'react';
import {
  approveCreditRequest,
  deleteCreditRequest,
  fetchCreditRequest,
  rejectCreditRequest,
  updateCreditRequest,
  uploadCreditContract,
  type CreditRequestRow,
  type CreditRequestStatus,
} from '@/lib/panel/credit';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';

interface Props {
  id: string;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_LABEL: Record<CreditRequestStatus, string> = {
  pending: 'Sözleşme bekliyor',
  contract_uploaded: 'İmza bekliyor',
  signed: 'İmzalı — inceleme bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal edildi',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTl(n: number) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

export function CreditSheet({ id, canWrite, onClose, onSaved }: Props) {
  const [row, setRow] = useState<CreditRequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [amountInput, setAmountInput] = useState('');

  function reload() {
    return fetchCreditRequest(id)
      .then((r) => {
        setRow(r);
        setAmountInput(r.amount ? String(r.amount) : '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'));
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onUploadContract() {
    if (!canWrite || !file) {
      setError('PDF dosyası seçin');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await uploadCreditContract(id, file);
      setRow(updated);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveAmount() {
    if (!canWrite || !row) return;
    const value = Number(amountInput.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) {
      setError('Geçerli bir tutar girin');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateCreditRequest(id, { amount: value });
      setRow(updated);
      setAmountInput(updated.amount ? String(updated.amount) : '');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi');
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove() {
    if (!canWrite) return;
    setSubmitting(true);
    setError(null);
    try {
      await approveCreditRequest(id);
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
      await rejectCreditRequest(id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reddedilemedi');
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!canWrite || !confirm('Bu talebi silmek istediğinize emin misiniz?'))
      return;
    setSubmitting(true);
    try {
      await deleteCreditRequest(id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
      setSubmitting(false);
    }
  }

  if (!row && loading) return null;

  const settled = row?.status === 'approved' || row?.status === 'rejected';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold">Kredi talebi detayı</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-2 py-1 text-zinc-500"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading || !row ? (
            <p className="text-sm text-zinc-500">Yükleniyor…</p>
          ) : (
            <>
              <p className="text-sm text-zinc-500">
                {row.user.fullName} · {row.user.email}
              </p>
              <p className="text-sm font-medium">
                Durum:{' '}
                <span className="text-zinc-700 dark:text-zinc-200">
                  {STATUS_LABEL[row.status]}
                </span>
              </p>
              <p className="text-xs text-zinc-500">
                Oluşturulma: {formatDate(row.createdAt)}
              </p>

              <div className="rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                <p className="mb-1 text-sm font-medium">Talep edilen tutar</p>
                {canWrite && !settled ? (
                  <div className="flex items-center gap-2">
                    <input
                      className={INPUT}
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) =>
                        setAmountInput(e.target.value.replace(/[^\d.,]/g, ''))
                      }
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => void onSaveAmount()}
                      disabled={submitting}
                      className={`${BTN_SECONDARY} shrink-0 text-xs`}
                    >
                      Kaydet
                    </button>
                  </div>
                ) : (
                  <p className="text-lg font-bold">{formatTl(row.amount)}</p>
                )}
              </div>

              {row.description && (
                <div>
                  <p className="mb-1 text-sm font-medium">Müşteri açıklaması</p>
                  <p className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    {row.description}
                  </p>
                </div>
              )}

              <div>
                <p className="mb-1 text-sm font-medium">Sözleşme (imzasız)</p>
                {row.contractUrl ? (
                  <a
                    href={row.contractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Yüklenen sözleşmeyi aç (PDF)
                  </a>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Henüz sözleşme yüklenmedi.
                  </p>
                )}
              </div>

              {canWrite && !settled && (
                <div className="rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
                  <p className="mb-2 text-sm font-medium">
                    {row.contractUrl
                      ? 'Sözleşmeyi değiştir'
                      : 'Sözleşme yükle'}{' '}
                    (PDF)
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Yalnızca PDF — en fazla 16 MB. Yeni sözleşme yüklenince imza
                    süreci yeniden başlar.
                  </p>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void onUploadContract()}
                      disabled={submitting || !file}
                      className={`${BTN_PRIMARY} text-xs`}
                    >
                      {submitting ? 'Yükleniyor…' : 'Sözleşmeyi yükle'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1 text-sm font-medium">
                  İmzalı sözleşme (müşteri)
                </p>
                {row.signedContractUrl ? (
                  <a
                    href={row.signedContractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    İmzalı sözleşmeyi aç (PDF)
                  </a>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Müşteri henüz imzalı sözleşme yüklemedi.
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          {canWrite && row && !settled && (
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
          {canWrite && row && !settled && (
            <>
              <button
                type="button"
                className={BTN_SECONDARY}
                onClick={() => void onReject()}
                disabled={submitting}
              >
                Reddet
              </button>
              <button
                type="button"
                className={`${BTN_PRIMARY} bg-emerald-600 hover:bg-emerald-500`}
                onClick={() => void onApprove()}
                disabled={submitting || row.status !== 'signed'}
                title={
                  row.status !== 'signed'
                    ? 'Onay için imzalı sözleşme gerekli'
                    : undefined
                }
              >
                Onayla
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
