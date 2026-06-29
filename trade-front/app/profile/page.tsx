'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mx-auto mb-6 max-w-3xl text-2xl font-bold">Profilim</h1>
        <ProfilePageContent />
      </main>
    </div>
  );
}
