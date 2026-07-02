'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { TwoFactorChallenge } from '@/components/TwoFactorChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { setToken } from '@/lib/auth-storage';
import type { TwoFactorLoginChallenge } from '@/lib/two-factor';
import { isTwoFactorChallenge } from '@/lib/two-factor';
import { login as apiLogin } from '@/lib/trading-api';

export function AuthForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorLoginChallenge | null>(
    null,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiLogin(email, password);
      if (isTwoFactorChallenge(res)) {
        setTwoFactor(res);
        return;
      }
      setToken(res.accessToken);
      await refreshUser();
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Giriş yap"
      subtitle="E-posta ve şifrenle devam et."
      footer={
        <p className="text-sm text-muted">
          Henüz hesabınız yok mu?{' '}
          <Link
            href="/register"
            className="font-semibold text-accent hover:underline"
          >
            Yeni hesap açın
          </Link>
        </p>
      }
    >
      {twoFactor ? (
        <TwoFactorChallenge
          challenge={twoFactor}
          onCancel={() => setTwoFactor(null)}
          onSuccess={async (res) => {
            setToken(res.accessToken);
            await refreshUser();
            router.push('/');
            router.refresh();
          }}
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="corp-section-title block"
            >
              E-posta
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="corp-input"
              placeholder="ornek@sirket.com"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="corp-section-title block"
            >
              Şifre
            </label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="corp-input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="corp-btn w-full">
            {submitting ? 'Doğrulanıyor…' : 'Giriş yap'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
