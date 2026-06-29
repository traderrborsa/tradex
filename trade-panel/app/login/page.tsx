'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isTwoFactorChallenge, panelLogin } from '@/lib/api';
import { setToken } from '@/lib/auth-storage';
import { setPendingBusinessSlug } from '@/lib/panel-business-storage';
import { PanelTwoFactorChallenge } from './PanelTwoFactorChallenge';
import type { TwoFactorLoginChallenge } from '@/lib/api';

const INPUT =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorLoginChallenge | null>(null);

  useEffect(() => {
    const business = searchParams.get('business');
    if (business) setPendingBusinessSlug(business);
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await panelLogin(email, password);
      if (isTwoFactorChallenge(res)) {
        setTwoFactor(res);
        return;
      }
      setToken(res.accessToken);
      await refreshUser();
      router.push('/panel/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            TRADEX
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Yönetim Paneli
          </h1>
        </div>

        {twoFactor ? (
          <PanelTwoFactorChallenge
            challenge={twoFactor}
            onCancel={() => setTwoFactor(null)}
            onSuccess={async (res) => {
              setToken(res.accessToken);
              await refreshUser();
              router.push('/panel/dashboard');
              router.refresh();
            }}
          />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              className={INPUT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta"
              required
            />
            <input
              type="password"
              className={INPUT}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              required
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
