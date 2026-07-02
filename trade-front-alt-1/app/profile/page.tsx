'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { MOBILE_NAV_PB } from '@/lib/layout';
import { ProfilePageContent } from '@/components/ProfilePageContent';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) setReady(true);
  }, [loading]);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  return (
    <div className={`flex min-h-screen flex-col bg-background text-foreground ${MOBILE_NAV_PB}`}>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-xl font-bold sm:text-2xl">Profilim</h1>
        <ProfilePageContent />
      </main>
    </div>
  );
}
