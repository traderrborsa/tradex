'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { PageTabs } from '@/components/PageTabs';
import { CampaignList } from '@/components/finance/CampaignList';
import { CreditList } from '@/components/finance/CreditList';
import { FinanceRequestsList } from '@/components/finance/FinanceRequestsList';
import {
  STATUS_GROUP_TABS,
  type StatusGroup,
} from '@/components/finance/shared';
import { useAuth } from '@/contexts/AuthContext';
import { MOBILE_NAV_PB } from '@/lib/layout';

const TABS = [
  { id: 'deposit', label: 'Para yatırma talebim' },
  { id: 'withdraw', label: 'Para çekme talebim' },
  { id: 'credit', label: 'Kredi talebi' },
  { id: 'campaign', label: 'Kampanya talebi' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex min-h-screen flex-col bg-background text-foreground ${MOBILE_NAV_PB}`}>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}

function RequestsInner() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(isTabId(initialTab) ? initialTab : 'deposit');
  const [status, setStatus] = useState<StatusGroup>('pending');

  if (authLoading) {
    return (
      <Shell>
        <p className="p-6 text-center text-muted">Yükleniyor…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Taleplerim</h1>
          <p className="mt-4 text-muted">Taleplerinizi görmek için giriş yapın.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            Giriş yap
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">Taleplerim</h1>

      <PageTabs tabs={TABS} active={tab} onChange={setTab} className="mb-3" />

      <PageTabs
        tabs={STATUS_GROUP_TABS}
        active={status}
        onChange={setStatus}
        className="mb-5"
      />

      {tab === 'deposit' && (
        <FinanceRequestsList
          filter="deposit"
          statusGroup={status}
          emptyText="Bu durumda para yatırma talebiniz yok"
        />
      )}
      {tab === 'withdraw' && (
        <FinanceRequestsList
          filter="withdrawal"
          statusGroup={status}
          emptyText="Bu durumda para çekme talebiniz yok"
        />
      )}
      {tab === 'credit' && <CreditList statusGroup={status} />}
      {tab === 'campaign' && <CampaignList statusGroup={status} />}
    </Shell>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="p-6 text-center text-muted">Yükleniyor…</p>
        </Shell>
      }
    >
      <RequestsInner />
    </Suspense>
  );
}
