'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useTrading } from '@/contexts/TradingContext';
import { apiCreateWithdrawal, apiFetchBanks } from '@/lib/trading-api';
import { formatMoney } from '@/lib/format-money';
import { sanitizeIntegerAmountInput } from '@/lib/amount-input';
import { FIN_CARD, FIN_INPUT } from './shared';

function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function formatIbanInput(value: string) {
  const raw = normalizeIban(value).replace(/[^A-Z0-9]/g, '');
  return raw.replace(/(.{4})/g, '$1 ').trim();
}

export function WithdrawForm() {
  const { portfolio, portfolioLoading, refreshPortfolio } = useTrading();
  const [bankId, setBankId] = useState('');
  const [banks, setBanks] = useState<{ id: string; name: string; logoUrl: string | null }[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableBalance = portfolio.balance;
  const parsedAmount = useMemo(() => Number(amount.replace(',', '.')), [amount]);

  const bankOptions = useMemo(
    () => banks.map((b) => ({ value: b.id, label: b.name, imageUrl: b.logoUrl })),
    [banks],
  );

  useEffect(() => {
    apiFetchBanks()
      .then(setBanks)
      .finally(() => setBanksLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Geçerli bir tutar girin');
      return;
    }
    if (parsedAmount > availableBalance) {
      setError(`Tutar bakiyenizden fazla olamaz (max ${formatMoney(availableBalance)})`);
      return;
    }

    setSubmitting(true);
    try {
      await apiCreateWithdrawal({
        bankId,
        accountHolderName: holder,
        iban: normalizedIban,
        amount: parsedAmount,
        description: description.trim() || undefined,
      });
      setSuccess(
        'Talebiniz alındı. En kısa sürede değerlendirilip size dönüş yapılacaktır.',
      );
      setBankId('');
      setAccountHolderName('');
      setIban('');
      setAmount('');
      setDescription('');
      await refreshPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Talep gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Banka hesabınızı seçin, alıcı adı ve IBAN ile çekim talebi oluşturun.
      </p>

      <div className={`${FIN_CARD} mb-6 p-5`}>
        <p className="text-sm text-muted">Kullanılabilir bakiye</p>
        <p className="text-2xl font-semibold tabular-nums">
          {portfolioLoading ? '…' : formatMoney(availableBalance)}
        </p>
      </div>

      <form onSubmit={onSubmit} className={`${FIN_CARD} space-y-4 p-6`}>
        <div>
          <label className="mb-1 block text-sm font-medium">Banka</label>
          <SearchableSelect
            options={bankOptions}
            value={bankId}
            onChange={setBankId}
            placeholder={banksLoading ? 'Yükleniyor…' : 'Banka seçin'}
            searchPlaceholder="Banka ara…"
            disabled={banksLoading || banks.length === 0}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Alıcı adı</label>
          <input
            className={FIN_INPUT}
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            placeholder="Hesap sahibinin adı soyadı"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">IBAN</label>
          <input
            className={FIN_INPUT}
            value={iban}
            onChange={(e) => setIban(formatIbanInput(e.target.value))}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tutar (₺)</label>
          <input
            className={FIN_INPUT}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => setAmount(sanitizeIntegerAmountInput(e.target.value))}
            placeholder="0"
            required
          />
          {parsedAmount > availableBalance && (
            <p className="mt-1 text-xs text-red-400">Bakiyenizden fazla</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Açıklama (isteğe bağlı)</label>
          <input
            className={FIN_INPUT}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Not…"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
        )}
        {success && (
          <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">{success}</p>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || parsedAmount > availableBalance || !bankId}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {submitting ? 'Gönderiliyor…' : 'Talep oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
