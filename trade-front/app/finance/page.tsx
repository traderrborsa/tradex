'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { PageTabs } from '@/components/PageTabs';
import { CampaignForm } from '@/components/finance/CampaignForm';
import { CreditForm } from '@/components/finance/CreditForm';
import { DepositForm } from '@/components/finance/DepositForm';
import { FinanceRequestsList } from '@/components/finance/FinanceRequestsList';
import { VerificationNotice } from '@/components/finance/shared';
import { WithdrawForm } from '@/components/finance/WithdrawForm';
import { useAuth } from '@/contexts/AuthContext';
import { userNeedsVerification } from '@/lib/verification';

const TABS = [
  { id: 'deposit', label: 'Para yatır' },
  { id: 'withdraw', label: 'Para çek' },
  { id: 'credit', label: 'Kredi talebi' },
  { id: 'campaign', label: 'Kampanyalar' },
  { id: 'history', label: 'Geçmiş işlemler' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}

function FinanceInner() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(isTabId(initialTab) ? initialTab : 'deposit');

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
          <h1 className="text-2xl font-bold">Finansal İşlemler</h1>
          <p className="mt-4 text-muted">İşlem yapmak için giriş yapın.</p>
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

  const needsVerification = userNeedsVerification(user);
  const isFormTab = tab !== 'history';

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">Finansal İşlemler</h1>

      <PageTabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {needsVerification && isFormTab ? (
        <VerificationNotice title={TABS.find((t) => t.id === tab)?.label ?? 'İşlem'} />
      ) : (
        <>
          {tab === 'deposit' && <DepositForm />}
          {tab === 'withdraw' && <WithdrawForm />}
          {tab === 'credit' && <CreditForm />}
          {tab === 'campaign' && <CampaignForm />}
          {tab === 'history' && (
            <FinanceRequestsList
              filter="all"
              emptyText="Henüz para yatırma/çekme işleminiz yok"
            />
          )}
        </>
      )}
    </Shell>
  );
}

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="p-6 text-center text-muted">Yükleniyor…</p>
        </Shell>
      }
    >
      <FinanceInner />
    </Suspense>
  );
}
