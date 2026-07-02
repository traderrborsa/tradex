'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiFetchCampaignApplications,
  type CampaignApplication,
  type CampaignApplicationStatus,
} from '@/lib/campaign-api';
import { RequestRow } from './RequestRow';
import {
  FIN_CARD,
  StatusBadge,
  formatFinanceDate,
  formatTl,
  type StatusGroup,
} from './shared';

const STATUS_META: Record<
  CampaignApplicationStatus,
  { label: string; hint: string; tone: string }
> = {
  pending: {
    label: 'Değerlendiriliyor',
    hint: 'Başvurunuz alındı, en kısa sürede değerlendirilecek.',
    tone: 'bg-amber-500/15 text-amber-500',
  },
  approved: {
    label: 'Onaylandı',
    hint: 'Kampanyanız hesabınıza tanımlandı.',
    tone: 'bg-emerald-500/15 text-emerald-500',
  },
  rejected: {
    label: 'Reddedildi',
    hint: 'Kampanya başvurunuz reddedildi.',
    tone: 'bg-red-500/15 text-red-500',
  },
  cancelled: {
    label: 'İptal edildi',
    hint: 'Başvuru iptal edildi.',
    tone: 'bg-zinc-500/15 text-zinc-400',
  },
};

function matchesGroup(status: CampaignApplicationStatus, group?: StatusGroup) {
  if (!group) return true;
  if (group === 'pending') return status === 'pending';
  if (group === 'approved') return status === 'approved';
  return status === 'rejected' || status === 'cancelled';
}

function ApplicationCard({ request }: { request: CampaignApplication }) {
  const meta = STATUS_META[request.status];
  return (
    <RequestRow
      badge={<StatusBadge label={meta.label} tone={meta.tone} />}
      summary={
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">
            {request.campaign.title}
          </span>
          {request.amount > 0 && (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-500">
              {formatTl(request.amount)}
            </span>
          )}
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
        {request.amount > 0 && (
          <>
            <dt className="text-subtle">Tutar</dt>
            <dd className="font-semibold tabular-nums text-emerald-500">
              {formatTl(request.amount)}
            </dd>
          </>
        )}
      </dl>

      <p className="mt-3 text-sm text-muted">{meta.hint}</p>
    </RequestRow>
  );
}

export function CampaignList({
  statusGroup,
  reloadKey = 0,
}: {
  statusGroup?: StatusGroup;
  reloadKey?: number;
}) {
  const [requests, setRequests] = useState<CampaignApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetchCampaignApplications()
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
        <ApplicationCard key={req.id} request={req} />
      ))}
    </div>
  );
}
