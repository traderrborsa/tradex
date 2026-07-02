import { redirect } from 'next/navigation';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { TransactionList } from '../components/TransactionList';
import { PERMS } from '@/lib/permissions';
import type { TransactionStatus } from '@/lib/panel/types';

const VALID_STATUSES: TransactionStatus[] = ['open', 'pending', 'closed'];

const LEGACY_REDIRECTS: Record<string, TransactionStatus> = {
  acik: 'open',
  bekleyen: 'pending',
  kapanan: 'closed',
};

export default async function PositionsStatusPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;

  if (status in LEGACY_REDIRECTS) {
    redirect(`/panel/positions/${LEGACY_REDIRECTS[status]}`);
  }

  if (!VALID_STATUSES.includes(status as TransactionStatus)) {
    redirect('/panel/positions/open');
  }

  return (
    <PermissionGate permission={PERMS.TRANSACTIONS_READ}>
      <TransactionList status={status as TransactionStatus} />
    </PermissionGate>
  );
}
