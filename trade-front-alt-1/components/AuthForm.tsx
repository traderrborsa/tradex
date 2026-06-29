'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { LoginLayout } from '@/components/LoginLayout';
import { TwoFactorChallenge } from '@/components/TwoFactorChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { setToken } from '@/lib/auth-storage';
import type { TwoFactorLoginChallenge } from '@/lib/two-factor';
import { isTwoFactorChallenge } from '@/lib/two-factor';
import { login as apiLogin } from '@/lib/trading-api';

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="login-input-icon h-[18px] w-[18px]" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="login-input-icon h-[18px] w-[18px]" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

export function AuthForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <LoginLayout
      footer={
        <p className="text-center text-sm text-muted">
          Hesabınız yok mu?{' '}
          <Link
            href="/register"
            className="font-bold uppercase tracking-wide text-accent hover:underline"
          >
            Ücretsiz hesap açın
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
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="corp-section-title block">
              E-posta
            </label>
            <div className="login-input-wrap">
              <EmailIcon />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="corp-input"
                placeholder="ornek@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="corp-section-title block">
              Şifre
            </label>
            <div className="login-input-wrap">
              <LockIcon />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="corp-input"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="login-input-toggle"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]" aria-hidden>
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path d="M10.58 10.58A2 2 0 0 0 12 18a2 2 0 0 0 1.42-3.42" />
                    <path d="M9.88 5.1A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a18.45 18.45 0 0 1-3.07 4.2" />
                    <path d="M6.61 6.61A18.48 18.48 0 0 0 2 12s3 7 10 7a10.66 10.66 0 0 0 5.39-1.45" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]" aria-hidden>
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error-shake border border-negative/40 bg-negative/10 px-4 py-3 text-sm text-negative">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="corp-btn mt-2 w-full">
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="login-btn-spinner" aria-hidden />
                Doğrulanıyor…
              </span>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
      )}
    </LoginLayout>
  );
}
