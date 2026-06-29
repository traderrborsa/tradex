"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { TwoFactorChallenge } from "@/components/TwoFactorChallenge";
import { useAuth } from "@/contexts/AuthContext";
import { setToken } from "@/lib/auth-storage";
import type { TwoFactorLoginChallenge } from "@/lib/two-factor";
import { isTwoFactorChallenge } from "@/lib/two-factor";
import { login as apiLogin } from "@/lib/trading-api";

const INPUT =
  "w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none";

export function AuthForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 items-center justify-center bg-black px-6 py-12 lg:w-1/2 lg:py-0">
        <Link href="/" className="cursor-pointer transition hover:opacity-80">
          <BrandLogo size="splash" className="text-white" />
        </Link>
      </aside>

      <main className="flex flex-1 flex-col justify-center bg-background px-6 py-10 sm:px-12 lg:w-1/2 lg:px-16 lg:py-0">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Giriş yap</h1>
          <p className="mb-8 text-sm text-muted">
            Portföyünüze ve işlemlerinize erişin.
          </p>

          {twoFactor ? (
            <TwoFactorChallenge
              challenge={twoFactor}
              onCancel={() => setTwoFactor(null)}
              onSuccess={async (res) => {
                setToken(res.accessToken);
                await refreshUser();
                router.push("/");
                router.refresh();
              }}
            />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-muted">E-posta</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                  placeholder="ornek@mail.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted">Şifre</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT}
                  placeholder="En az 6 karakter"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded-lg bg-accent py-2.5 font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Bekleyin…" : "Giriş yap"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            Hesabınız yok mu?{" "}
            <Link href="/register" className="text-foreground hover:underline">
              Kayıt olun
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
