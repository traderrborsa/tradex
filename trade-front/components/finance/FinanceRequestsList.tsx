'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiFetchFinanceRequests,
  type FinanceRequest,
  type FinanceRequestStatus,
  type FinanceRequestType,
} from '@/lib/trading-api';
import { RequestRow } from './RequestRow';
import {
  FIN_CARD,
  FINANCE_STATUS_META,
  StatusBadge,
  formatFinanceDate,
  formatTl,
  type StatusGroup,
} from './shared';

function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function matchesGroup(status: FinanceRequestStatus, group?: StatusGroup) {
  if (!group) return true;
  if (group === 'pending') return status === 'pending';
  if (group === 'approved') return status === 'approved';
  return status === 'rejected' || status === 'cancelled';
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-subtle">{label}</dt>
      <dd className={`text-secondary ${mono ? 'break-all font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </>
  );
}

function FinanceCard({ request }: { request: FinanceRequest }) {
  const meta = FINANCE_STATUS_META[request.status];
  const isDeposit = request.type === 'deposit';
  return (
    <RequestRow
      badge={<StatusBadge label={meta.label} tone={meta.tone} />}
      summary={
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">
            {isDeposit ? 'Para yatırma' : 'Para çekme'}
          </span>
          <span
            className={`shrink-0 text-sm font-semibold tabular-nums ${isDeposit ? 'text-emerald-500' : 'text-foreground'}`}
          >
            {isDeposit ? '+' : '−'}
            {formatTl(request.amount)}
          </span>
          <span className="ml-auto hidden shrink-0 text-xs text-subtle sm:block">
            {formatFinanceDate(request.createdAt)}
          </span>
        </div>
      }
    >
      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5">
        <Detail label="No" value={`#${request.displayId ?? request.id.slice(-8)}`} />
        <Detail label="Tarih" value={formatFinanceDate(request.createdAt)} />
        {request.bankName && <Detail label="Banka" value={request.bankName} />}
        {request.accountHolderName && (
          <Detail label="Hesap sahibi" value={request.accountHolderName} />
        )}
        {request.iban && <Detail label="IBAN" value={formatIban(request.iban)} mono />}
        {request.description && (
          <Detail label="Açıklama" value={request.description} />
        )}
      </dl>

      {request.receiptUrl && (
        <a
          href={request.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          Dekontu görüntüle
        </a>
      )}
    </RequestRow>
  );
}

export function FinanceRequestsList({
  filter = 'all',
  statusGroup,
  emptyText,
  reloadKey = 0,
}: {
  filter?: FinanceRequestType | 'all';
  statusGroup?: StatusGroup;
  emptyText?: string;
  reloadKey?: number;
}) {
  const [requests, setRequests] = useState<FinanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetchFinanceRequests()
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const filtered = useMemo(
    () =>
      requests.filter(
        (r) =>
          (filter === 'all' || r.type === filter) &&
          matchesGroup(r.status, statusGroup),
      ),
    [requests, filter, statusGroup],
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
        <p className="font-medium">{emptyText ?? 'Kayıt yok'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((req) => (
        <FinanceCard key={req.id} request={req} />
      ))}
    </div>
  );
}
