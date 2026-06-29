'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  apiCreateBonusRequest,
  apiFetchBonusRequests,
  type BonusRequest,
  type BonusRequestStatus,
} from '@/lib/bonus-api';
import { userNeedsVerification } from '@/lib/verification';

const INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';
const CARD = 'rounded-2xl border border-border bg-card';

const STATUS_META: Record<
  BonusRequestStatus,
  { label: string; hint: string; tone: string }
> = {
  pending: {
    label: 'Değerlendiriliyor',
    hint: 'Talebiniz alındı, en kısa sürede değerlendirilecek.',
    tone: 'bg-amber-500/15 text-amber-500',
  },
  approved: {
    label: 'Tanımlandı',
    hint: 'Bonusunuz hesabınıza tanımlandı.',
    tone: 'bg-emerald-500/15 text-emerald-500',
  },
  rejected: {
    label: 'Reddedildi',
    hint: 'Bonus talebiniz reddedildi.',
    tone: 'bg-red-500/15 text-red-500',
  },
  cancelled: {
    label: 'İptal edildi',
    hint: 'Talep iptal edildi.',
    tone: 'bg-zinc-500/15 text-zinc-400',
  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTl(n: number) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

function BonusCard({ request }: { request: BonusRequest }) {
  const meta = STATUS_META[request.status];
  return (
    <div className={`${CARD} space-y-3 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            Bonus talebi #{request.displayId ?? request.id.slice(-8)}
          </p>
          <p className="text-xs text-subtle">{formatDate(request.createdAt)}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}
        >
          {meta.label}
        </span>
      </div>

      {request.amount > 0 && (
        <div className="flex items-baseline justify-between rounded-xl bg-elevated px-4 py-3">
          <span className="text-xs text-subtle">Bonus tutarı</span>
          <span className="text-lg font-bold text-emerald-500">
            {formatTl(request.amount)}
          </span>
        </div>
      )}

      {request.description && (
        <p className="text-sm text-secondary">{request.description}</p>
      )}

      <p className="text-sm text-muted">{meta.hint}</p>
    </div>
  );
}

export default function BonusPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<BonusRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const needsVerification = userNeedsVerification(user);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetchBonusRequests()
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    if (needsVerification) {
      router.replace('/profile');
      return;
    }
    load();
  }, [authLoading, user, needsVerification, router, load]);

  async function onCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      await apiCreateBonusRequest({
        description: description.trim() || undefined,
      });
      setDescription('');
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Talep oluşturulamadı');
    } finally {
      setCreating(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24 text-foreground">
        <AppHeader />
        <main className="p-6 text-center text-muted">Yükleniyor…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24 text-foreground">
        <AppHeader />
        <main className="mx-auto max-w-md flex-1 p-6 text-center">
          <h1 className="text-2xl font-bold">Bonuslarım</h1>
          <p className="mt-4 text-muted">Bonus talep etmek için giriş yapın.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            Giriş yap
          </Link>
        </main>
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24 text-foreground">
        <AppHeader />
        <main className="mx-auto max-w-md flex-1 p-6 text-center">
          <h1 className="text-2xl font-bold">Bonuslarım</h1>
          <p className="mt-4 text-sm text-muted">
            Bonus talep edebilmek için önce hesabınızı doğrulamanız gerekiyor.
            Profil sayfasına yönlendiriliyorsunuz…
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 text-foreground">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg flex-1 p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Bonuslarım</h1>
          <p className="mt-1 text-sm text-muted">
            Bonus talebinde bulunun. Talebiniz değerlendirildikten sonra bonus
            tutarı hesabınıza tanımlanır.
          </p>
        </div>

        <section className={`${CARD} mb-6 space-y-4 p-5`}>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Açıklama (opsiyonel)
            </label>
            <textarea
              className={`${INPUT} min-h-[80px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bonus talebinizle ilgili not ekleyebilirsiniz"
            />
          </div>
          {createError && (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {createError}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={creating}
              onClick={() => void onCreate()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
            >
              {creating ? 'Gönderiliyor…' : 'Bonus talep et'}
            </button>
          </div>
        </section>

        {error && (
          <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-sm text-muted">Yükleniyor…</p>
        ) : requests.length === 0 ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="font-medium">Henüz bonus talebiniz yok</p>
            <p className="mt-1 text-sm text-muted">
              Yukarıdan yeni bir bonus talebi oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <BonusCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
