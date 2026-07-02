'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  apiFetchCreditRequests,
  apiUploadSignedContract,
  type CreditRequest,
  type CreditRequestStatus,
} from '@/lib/credit-api';
import { RequestRow } from './RequestRow';
import {
  FIN_CARD,
  StatusBadge,
  formatFinanceDate,
  formatTl,
  type StatusGroup,
} from './shared';

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

function matchesGroup(status: CreditRequestStatus, group?: StatusGroup) {
  if (!group) return true;
  if (group === 'pending') {
    return (
      status === 'pending' ||
      status === 'contract_uploaded' ||
      status === 'signed'
    );
  }
  if (group === 'approved') return status === 'approved';
  return status === 'rejected' || status === 'cancelled';
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
    <RequestRow
      badge={<StatusBadge label={meta.label} tone={meta.tone} />}
      summary={
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">Kredi talebi</span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatTl(request.amount)}
          </span>
          <span className="ml-auto hidden shrink-0 text-xs text-subtle sm:block">
            {formatFinanceDate(request.createdAt)}
          </span>
        </div>
      }
    >
      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-subtle">No</dt>
        <dd className="text-secondary">
          #{request.displayId ?? request.id.slice(-8)}
        </dd>
        <dt className="text-subtle">Tarih</dt>
        <dd className="text-secondary">{formatFinanceDate(request.createdAt)}</dd>
        <dt className="text-subtle">Tutar</dt>
        <dd className="font-semibold tabular-nums">{formatTl(request.amount)}</dd>
        {request.description && (
          <>
            <dt className="text-subtle">Açıklama</dt>
            <dd className="text-secondary">{request.description}</dd>
          </>
        )}
      </dl>

      <p className="mt-3 text-sm text-muted">{meta.hint}</p>

      {request.contractUrl && (
        <a
          href={request.contractUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-elevated"
        >
          Sözleşmeyi indir (PDF)
        </a>
      )}

      {request.signedContractUrl && (
        <p className="mt-3 text-sm text-emerald-500">
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
        <div className="mt-4 space-y-3 border-t border-border pt-4">
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
    </RequestRow>
  );
}

export function CreditList({
  statusGroup,
  reloadKey = 0,
}: {
  statusGroup?: StatusGroup;
  reloadKey?: number;
}) {
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetchCreditRequests()
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const filtered = useMemo(
    () => requests.filter((r) => matchesGroup(r.status, statusGroup)),
    [requests, statusGroup],
  );

  if (loading) {
    return <p className="text-center text-sm text-muted">Yükleniyor…</p>;
  }
  if (error) {
    return (
      <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className={`${FIN_CARD} p-8 text-center`}>
        <p className="font-medium">Kayıt yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((req) => (
        <CreditCard key={req.id} request={req} onUploaded={load} />
      ))}
    </div>
  );
}
