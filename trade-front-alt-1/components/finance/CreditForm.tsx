'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiCreateCreditRequest } from '@/lib/credit-api';
import { fetchProfile, type UserProfile } from '@/lib/profile';
import { FIN_CARD, FIN_INPUT, formatTl } from './shared';

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-subtle">{label}</p>
      <p className="truncate rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-secondary">
        {value || '—'}
      </p>
    </div>
  );
}

export function CreditForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => null);
  }, []);

  const amountValue = Number(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;

  async function onCreate() {
    if (!amountValid) {
      setCreateError('Geçerli bir kredi tutarı girin');
      return;
    }
    setCreating(true);
    setCreateError(null);
    setSuccess(null);
    try {
      await apiCreateCreditRequest({
        amount: amountValue,
        description: description.trim() || undefined,
      });
      setAmount('');
      setDescription('');
      setSuccess('Kredi talebiniz alındı. Durumunu “Taleplerim” bölümünden takip edebilirsiniz.');
      onCreated?.();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Talep oluşturulamadı');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Talep ettiğiniz tutarı girin. Sözleşmeniz hazırlandığında “Taleplerim”
        bölümünden indirip imzalayacak ve geri yükleyeceksiniz.
      </p>

      <section className={`${FIN_CARD} space-y-5 p-5`}>
        <div>
          <p className="text-sm font-semibold">Talep eden bilgileri</p>
          <p className="mt-0.5 text-xs text-subtle">
            Bilgileriniz hesabınızdan otomatik dolduruldu.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReadOnlyField label="Ad Soyad" value={profile?.fullName ?? user?.fullName ?? ''} />
            <ReadOnlyField label="TC Kimlik No" value={profile?.tcKimlikNo ?? ''} />
            <ReadOnlyField label="Telefon" value={profile?.phone ?? ''} />
            <ReadOnlyField label="E-posta" value={profile?.email ?? user?.email ?? ''} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <label className="mb-1 block text-sm font-medium">Kredi tutarı (₺)</label>
          <input
            className={FIN_INPUT}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="Örn. 25000"
          />
          {amountValid && (
            <p className="mt-1 text-xs text-subtle">{formatTl(amountValue)}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Açıklama (opsiyonel)</label>
          <textarea
            className={`${FIN_INPUT} min-h-[80px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Talebinizle ilgili not ekleyebilirsiniz"
          />
        </div>

        {createError && (
          <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {createError}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
            {success}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={creating || !amountValid}
            onClick={() => void onCreate()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {creating ? 'Gönderiliyor…' : 'Kredi talebi oluştur'}
          </button>
        </div>
      </section>
    </div>
  );
}
