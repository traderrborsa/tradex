import type { FinanceRequestStatus } from '@/lib/trading-api';

export const FIN_INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';

export const FIN_CARD = 'rounded-2xl border border-border bg-card';

export function formatFinanceDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTl(n: number) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

export type StatusGroup = 'pending' | 'approved' | 'rejected';

export const STATUS_GROUP_TABS = [
  { id: 'pending', label: 'Bekleyenler' },
  { id: 'approved', label: 'Onaylanan' },
  { id: 'rejected', label: 'Reddedilenler' },
] as const;

export function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export const FINANCE_STATUS_META: Record<
  FinanceRequestStatus,
  { label: string; tone: string }
> = {
  pending: { label: 'Değerlendiriliyor', tone: 'bg-amber-500/15 text-amber-500' },
  approved: { label: 'Onaylandı', tone: 'bg-emerald-500/15 text-emerald-500' },
  rejected: { label: 'Reddedildi', tone: 'bg-red-500/15 text-red-500' },
  cancelled: { label: 'İptal edildi', tone: 'bg-zinc-500/15 text-zinc-400' },
};

export function VerificationNotice({ title }: { title: string }) {
  return (
    <div className={`${FIN_CARD} p-6 text-center`}>
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted">
        Bu işlem için önce hesabınızı doğrulamanız gerekiyor.
      </p>
      <a
        href="/profile"
        className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
      >
        Doğrulamaya git
      </a>
    </div>
  );
}
