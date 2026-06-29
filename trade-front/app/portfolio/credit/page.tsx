'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { FileUpload } from '@/components/ui/FileUpload';
import { useAuth } from '@/contexts/AuthContext';
import {
  apiCreateCreditRequest,
  apiFetchCreditRequests,
  apiUploadSignedContract,
  type CreditRequest,
  type CreditRequestStatus,
} from '@/lib/credit-api';
import { fetchProfile, type UserProfile } from '@/lib/profile';
import { userNeedsVerification } from '@/lib/verification';

const INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';
const CARD = 'rounded-2xl border border-border bg-card';

const STATUS_META: Record<
  CreditRequestStatus,
  { label: string; hint: string; tone: string }
> = {
  pending: {
    label: 'Talep alındı',
    hint: 'Talebiniz alındı. Sözleşmeniz hazırlanıyor.',
    tone: 'bg-amber-500/15 text-amber-500',
  },
  contract_uploaded: {
    label: 'Sözleşme hazır',
    hint: 'Sözleşmeyi indirip imzalayın, ardından imzalı halini geri yükleyin.',
    tone: 'bg-blue-500/15 text-blue-500',
  },
  signed: {
    label: 'İmzalı sözleşme alındı',
    hint: 'İmzalı sözleşmeniz alındı, inceleniyor.',
    tone: 'bg-indigo-500/15 text-indigo-500',
  },
  approved: {
    label: 'Onaylandı',
    hint: 'Kredi talebiniz onaylandı.',
    tone: 'bg-emerald-500/15 text-emerald-500',
  },
  rejected: {
    label: 'Reddedildi',
    hint: 'Kredi talebiniz reddedildi.',
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

function CreditCard({
  request,
  onUploaded,
}: {
  request: CreditRequest;
  onUploaded: () => void;
}) {
  const meta = STATUS_META[request.status];
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUploadSigned =
    request.status === 'contract_uploaded' || request.status === 'signed';

  async function onUpload() {
    if (!file) {
      setError('İmzalı PDF dosyasını seçin');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiUploadSignedContract(request.id, file);
      setFile(null);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`${CARD} space-y-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            Kredi talebi #{request.displayId ?? request.id.slice(-8)}
          </p>
          <p className="text-xs text-subtle">{formatDate(request.createdAt)}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex items-baseline justify-between rounded-xl bg-elevated px-4 py-3">
        <span className="text-xs text-subtle">Talep edilen tutar</span>
        <span className="text-lg font-bold">{formatTl(request.amount)}</span>
      </div>

      {request.description && (
        <p className="text-sm text-secondary">{request.description}</p>
      )}

      <p className="text-sm text-muted">{meta.hint}</p>

      {request.contractUrl && (
        <a
          href={request.contractUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-2 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-elevated"
        >
          Sözleşmeyi indir (PDF)
        </a>
      )}

      {request.signedContractUrl && (
        <p className="text-sm text-emerald-500">
          İmzalı sözleşmeniz gönderildi.{' '}
          <a
            href={request.signedContractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Görüntüle
          </a>
        </p>
      )}

      {canUploadSigned && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium">
            {request.signedContractUrl
              ? 'İmzalı sözleşmeyi yeniden yükle'
              : 'İmzalı sözleşmeyi yükle'}
          </p>
          <FileUpload
            accept="application/pdf"
            hint="Yalnızca PDF — en fazla 16 MB"
            file={file}
            onChange={setFile}
            disabled={submitting}
          />
          {error && (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={submitting || !file}
              onClick={() => void onUpload()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
            >
              {submitting ? 'Gönderiliyor…' : 'İmzalı sözleşmeyi gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const needsVerification = userNeedsVerification(user);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([apiFetchCreditRequests(), fetchProfile().catch(() => null)])
      .then(([reqs, prof]) => {
        setRequests(reqs);
        if (prof) setProfile(prof);
      })
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

  const amountValue = Number(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;

  async function onCreate() {
    if (!amountValid) {
      setCreateError('Geçerli bir kredi tutarı girin');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await apiCreateCreditRequest({
        amount: amountValue,
        description: description.trim() || undefined,
      });
      setAmount('');
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
          <h1 className="text-2xl font-bold">Kredi talebi</h1>
          <p className="mt-4 text-muted">Talep oluşturmak için giriş yapın.</p>
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
          <h1 className="text-2xl font-bold">Kredi talebi</h1>
          <p className="mt-4 text-sm text-muted">
            Kredi talebi için önce hesabınızı doğrulamanız gerekiyor. Profil
            sayfasına yönlendiriliyorsunuz…
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
          <h1 className="text-2xl font-bold">Kredi talebi</h1>
          <p className="mt-1 text-sm text-muted">
            Talep ettiğiniz tutarı girin. Sözleşmeniz hazırlandığında indirip
            imzalayacak ve geri yükleyeceksiniz.
          </p>
        </div>

        <section className={`${CARD} mb-6 space-y-5 p-5`}>
          <div>
            <p className="text-sm font-semibold">Talep eden bilgileri</p>
            <p className="mt-0.5 text-xs text-subtle">
              Bilgileriniz hesabınızdan otomatik dolduruldu.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ReadOnlyField
                label="Ad Soyad"
                value={profile?.fullName ?? user.fullName ?? ''}
              />
              <ReadOnlyField
                label="TC Kimlik No"
                value={profile?.tcKimlikNo ?? ''}
              />
              <ReadOnlyField label="Telefon" value={profile?.phone ?? ''} />
              <ReadOnlyField
                label="E-posta"
                value={profile?.email ?? user.email ?? ''}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="mb-1 block text-sm font-medium">
              Kredi tutarı (₺)
            </label>
            <input
              className={INPUT}
              inputMode="decimal"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^\d.,]/g, ''))
              }
              placeholder="Örn. 25000"
            />
            {amountValid && (
              <p className="mt-1 text-xs text-subtle">{formatTl(amountValue)}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Açıklama (opsiyonel)
            </label>
            <textarea
              className={`${INPUT} min-h-[80px] resize-y`}
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

        {error && (
          <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-sm text-muted">Yükleniyor…</p>
        ) : requests.length === 0 ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="font-medium">Henüz kredi talebiniz yok</p>
            <p className="mt-1 text-sm text-muted">
              Yukarıdan yeni bir kredi talebi oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <CreditCard key={req.id} request={req} onUploaded={load} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
