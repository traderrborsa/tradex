'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/contexts/AuthContext';
import { useTrading } from '@/contexts/TradingContext';
import { apiCreateWithdrawal } from '@/lib/trading-api';
import { userNeedsVerification } from '@/lib/verification';
import {apiFetchBanks } from '@/lib/trading-api';
import { formatMoney } from '@/lib/format-money';
import {
  parseIntegerAmount,
  sanitizeIntegerAmountInput,
} from '@/lib/amount-input';

const INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';

function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function formatIbanInput(value: string) {
  const raw = normalizeIban(value).replace(/[^A-Z0-9]/g, '');
  return raw.replace(/(.{4})/g, '$1 ').trim();
}

export default function WithdrawPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  const needsVerification = userNeedsVerification(user);

  useEffect(() => {
    if (authLoading || !user) return;
    if (needsVerification) {
      router.replace('/profile');
    }
  }, [authLoading, user, needsVerification, router]);

  const bankOptions = useMemo(
    () => banks.map((b) => ({ value: b.id, label: b.name, imageUrl: b.logoUrl })),
    [banks],
  );

  useEffect(() => {
    if (!user) return;
    apiFetchBanks()
      .then(setBanks)
      .finally(() => setBanksLoading(false));
  }, [user]);

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

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <main className="p-6 text-center text-muted">Yükleniyor…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto max-w-md flex-1 p-6 text-center">
          <h1 className="text-2xl font-bold">Para çek</h1>
          <p className="mt-4 text-muted">Talep oluşturmak için giriş yapın.</p>
          <Link href="/login" className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">
            Giriş yap
          </Link>
        </main>
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto max-w-md flex-1 p-6 text-center">
          <h1 className="text-2xl font-bold">Para çek</h1>
          <p className="mt-4 text-sm text-muted">
            Para çekme işlemi için önce hesabınızı doğrulamanız gerekiyor.
            Profil sayfasına yönlendiriliyorsunuz…
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            Doğrulamaya git
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg flex-1 p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Para çek</h1>
          <p className="mt-1 text-sm text-muted">
            Banka hesabınızı seçin, alıcı adı ve IBAN ile çekim talebi oluşturun.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted">Kullanılabilir bakiye</p>
          <p className="text-2xl font-semibold tabular-nums">
            {portfolioLoading ? '…' : formatMoney(availableBalance)}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
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
              className={INPUT}
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Hesap sahibinin adı soyadı"
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
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tutar (₺)</label>
            <input
              className={INPUT}
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
            {parsedAmount > availableBalance && (
              <p className="mt-1 text-xs text-red-400">Bakiyenizden fazla</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Açıklama (isteğe bağlı)</label>
            <input
              className={INPUT}
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
      </main>
    </div>
  );
}
