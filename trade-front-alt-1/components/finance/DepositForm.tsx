'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FileUpload } from '@/components/ui/FileUpload';
import { useAuth } from '@/contexts/AuthContext';
import {
  apiCreateDeposit,
  apiFetchDepositBanks,
  apiFetchFinanceRequests,
  type DepositBankOption,
} from '@/lib/trading-api';
import { sanitizeIntegerAmountInput } from '@/lib/amount-input';
import { FIN_CARD, FIN_INPUT } from './shared';

function formatIbanDisplay(iban: string) {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CopyField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-input-border bg-input px-3 py-2.5">
        <span className="min-w-0 flex-1 break-all text-sm">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md p-1 text-muted transition hover:bg-elevated hover:text-foreground"
          aria-label="Kopyala"
        >
          {copied ? (
            <span className="text-xs font-medium text-emerald-500">✓</span>
          ) : (
            <CopyIcon />
          )}
        </button>
      </div>
    </div>
  );
}

function BankPickCard({
  bank,
  onSelect,
}: {
  bank: DepositBankOption;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${FIN_CARD} flex w-full cursor-pointer flex-col items-center gap-3 p-6 text-center transition hover:border-border-strong hover:bg-elevated`}
    >
      {bank.bankLogoUrl ? (
        <img
          src={bank.bankLogoUrl}
          alt=""
          className="h-10 w-auto max-w-[140px] object-contain"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-elevated text-sm font-bold">
          {bank.bankName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="text-sm font-semibold tracking-wide">{bank.bankName}</span>
    </button>
  );
}

export function DepositForm() {
  const { user } = useAuth();

  const [banks, setBanks] = useState<DepositBankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<DepositBankOption | null>(null);
  const [copiedField, setCopiedField] = useState<'holder' | 'iban' | null>(null);

  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingDeposit, setHasPendingDeposit] = useState(false);

  const parsedAmount = useMemo(() => Number(amount.replace(',', '.')), [amount]);

  useEffect(() => {
    setBanksLoading(true);
    setBanksError(null);
    apiFetchDepositBanks()
      .then(setBanks)
      .catch((e) =>
        setBanksError(e instanceof Error ? e.message : 'Bankalar yüklenemedi'),
      )
      .finally(() => setBanksLoading(false));
  }, []);

  useEffect(() => {
    apiFetchFinanceRequests()
      .then((rows) =>
        setHasPendingDeposit(
          rows.some((r) => r.type === 'deposit' && r.status === 'pending'),
        ),
      )
      .catch(() => {
        /* sessizce geç */
      });
  }, []);

  useEffect(() => {
    if (selectedBank && user?.fullName) {
      setAccountName(user.fullName);
    }
  }, [selectedBank, user?.fullName]);

  function onReceiptChange(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setReceipt(file);
    if (file && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function resetForm() {
    setAmount('');
    setAccountName(user?.fullName ?? '');
    onReceiptChange(null);
    setError(null);
  }

  function goBackToBanks() {
    setSelectedBank(null);
    resetForm();
    setSuccess(null);
    setCopiedField(null);
  }

  async function copyText(text: string, field: 'holder' | 'iban') {
    const value = field === 'iban' ? text.replace(/\s+/g, '') : text;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* ignore */
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedBank) return;
    setError(null);
    setSuccess(null);

    const name = accountName.trim().replace(/\s+/g, ' ');
    if (name.length < 3) {
      setError('Hesap adı soyadı en az 3 karakter olmalı');
      return;
    }
    if (!receipt) {
      setError('Dekont yüklemeniz gerekiyor');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Geçerli bir tutar girin');
      return;
    }

    setSubmitting(true);
    try {
      await apiCreateDeposit({
        amount: parsedAmount,
        description: name,
        receipt,
        depositBankAccountId: selectedBank.id,
      });
      resetForm();
      setHasPendingDeposit(true);
      setSuccess(
        'Talebiniz alındı. En kısa sürede değerlendirilip size dönüş yapılacaktır.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Talep gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (hasPendingDeposit && !success) {
    return (
      <div className={`${FIN_CARD} p-6 text-center`}>
        <p className="font-medium text-amber-300">
          Bekleyen para yatırma talebiniz var
        </p>
        <p className="mt-2 text-sm text-muted">
          Mevcut talebiniz onaylanana kadar yeni bir para yatırma talebi
          oluşturamazsınız. Durumu “Taleplerim” sayfasından takip edebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {selectedBank
          ? 'Havaleyi yaptıktan sonra tutar ve dekontu gönderin.'
          : 'Para yatıracağınız bankayı seçin.'}
      </p>

      {!selectedBank ? (
        <section className="space-y-3">
          {banksLoading ? (
            <p className="text-center text-sm text-muted">Bankalar yükleniyor…</p>
          ) : banksError ? (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {banksError}
            </p>
          ) : banks.length === 0 ? (
            <div className={`${FIN_CARD} p-8 text-center`}>
              <p className="font-medium">Aktif banka hesabı yok</p>
              <p className="mt-1 text-sm text-muted">
                Şu an para yatırma için tanımlı hesap bulunmuyor.
              </p>
            </div>
          ) : (
            banks.map((bank) => (
              <BankPickCard
                key={bank.id}
                bank={bank}
                onSelect={() => {
                  setSelectedBank(bank);
                  setSuccess(null);
                  setError(null);
                }}
              />
            ))
          )}
        </section>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={goBackToBanks}
            className="text-sm text-muted hover:text-foreground"
          >
            ← Başka banka seç
          </button>

          <div className={`${FIN_CARD} flex flex-col items-center gap-3 p-6 text-center`}>
            {selectedBank.bankLogoUrl ? (
              <img
                src={selectedBank.bankLogoUrl}
                alt=""
                className="h-11 w-auto max-w-[160px] object-contain"
              />
            ) : null}
            <p className="font-semibold">{selectedBank.bankName}</p>
          </div>

          {success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6 text-center">
              <p className="text-sm font-medium text-emerald-300">{success}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={goBackToBanks}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
                >
                  Başka işlem
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`${FIN_CARD} space-y-4 p-5`}>
                <CopyField
                  label="Hesap bilgileri"
                  value={selectedBank.accountHolderName}
                  copied={copiedField === 'holder'}
                  onCopy={() => void copyText(selectedBank.accountHolderName, 'holder')}
                />
                <CopyField
                  label="Hesap adresi (IBAN)"
                  value={formatIbanDisplay(selectedBank.iban)}
                  copied={copiedField === 'iban'}
                  onCopy={() => void copyText(selectedBank.iban, 'iban')}
                />
                {selectedBank.description?.trim() && (
                  <div className="rounded-lg border border-border-strong bg-elevated px-4 py-3">
                    <p className="text-sm leading-relaxed text-secondary">
                      <span className="font-medium text-foreground">Açıklama:</span>{' '}
                      {selectedBank.description.trim()}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={onSubmit} className={`${FIN_CARD} space-y-4 p-6`}>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Hesap adı soyadı <span className="text-red-400">*</span>
                  </label>
                  <input
                    className={FIN_INPUT}
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ad Soyad"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Yatırılan tutar (₺) <span className="text-red-400">*</span>
                  </label>
                  <input
                    className={FIN_INPUT}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amount}
                    onChange={(e) =>
                      setAmount(sanitizeIntegerAmountInput(e.target.value))
                    }
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Dekont <span className="text-red-400">*</span>
                  </label>
                  <FileUpload
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    hint="JPG, PNG, WEBP, GIF veya PDF — en fazla 8 MB"
                    file={receipt}
                    previewUrl={previewUrl}
                    onChange={onReceiptChange}
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !receipt}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
                  >
                    {submitting ? 'Gönderiliyor…' : 'Talep oluştur'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
