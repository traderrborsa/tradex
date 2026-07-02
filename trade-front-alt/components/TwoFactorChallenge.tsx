'use client';

import { useEffect, useState } from 'react';
import {
  beginLoginTwoFactorSetup,
  completeLoginTwoFactorSetup,
  skipLoginTwoFactorOffer,
  verifyLoginTwoFactor,
  type AuthResponse,
} from '@/lib/trading-api';
import type { TwoFactorLoginChallenge } from '@/lib/two-factor';
import { qrImageUrl } from '@/lib/two-factor';

const INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';

interface Props {
  challenge: TwoFactorLoginChallenge;
  onSuccess: (res: AuthResponse) => void;
  onCancel: () => void;
}

export function TwoFactorChallenge({ challenge, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedSetup, setAcceptedSetup] = useState(
    challenge.mode !== 'offer',
  );

  const showSetup = challenge.mode === 'setup' || acceptedSetup;

  useEffect(() => {
    if (challenge.mode === 'verify' || !showSetup) return;
    beginLoginTwoFactorSetup(challenge.pendingToken)
      .then((res) => setOtpauthUrl(res.otpauthUrl))
      .catch((e) =>
        setError(e instanceof Error ? e.message : '2FA kurulumu başlatılamadı'),
      );
  }, [challenge, showSetup]);

  async function skipOffer() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await skipLoginTwoFactorOffer(challenge.pendingToken);
      onSuccess(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res =
        challenge.mode === 'verify'
          ? await verifyLoginTwoFactor(challenge.pendingToken, code)
          : await completeLoginTwoFactorSetup(challenge.pendingToken, code);
      onSuccess(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kod doğrulanamadı');
    } finally {
      setSubmitting(false);
    }
  }

  if (challenge.mode === 'offer' && !acceptedSetup) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          İki faktörlü doğrulama
        </h2>
        <p className="text-sm text-muted">
          Hesabınızı daha güvenli hale getirmek için 2FA açmak ister misiniz?
          Google Authenticator veya benzeri bir uygulama yeterli.
        </p>
        {error && (
          <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setAcceptedSetup(true)}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg"
          >
            Evet, 2FA kurmak istiyorum
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void skipOffer()}
            className="w-full rounded-lg border border-dashed border-border-strong py-2.5 text-sm text-muted"
          >
            Şimdilik atla
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-sm text-muted hover:text-foreground"
          >
            Geri
          </button>
        </div>
      </div>
    );
  }

  const canSkip = challenge.mode === 'offer';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {showSetup ? '2FA kurulumu' : 'İki faktörlü doğrulama'}
      </h2>
      <p className="text-sm text-muted">
        {showSetup
          ? 'Google Authenticator veya benzeri uygulamayla QR kodu okutun, ardından 6 haneli kodu girin.'
          : 'Authenticator uygulamanızdaki 6 haneli kodu girin.'}
      </p>

      {otpauthUrl && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-elevated p-4">
          <img
            src={qrImageUrl(otpauthUrl)}
            alt="2FA QR kodu"
            className="h-40 w-40 rounded-lg bg-white p-2"
          />
          <p className="text-center text-xs text-muted">
            QR okutulamazsa uygulamaya secret anahtarını manuel ekleyin.
          </p>
        </div>
      )}

      <input
        className={INPUT}
        placeholder="6 haneli kod"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />

      {error && (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border-strong px-4 py-2 text-sm text-secondary"
          >
            Geri
          </button>
          <button
            type="button"
            disabled={submitting || code.length !== 6}
            onClick={() => void submit()}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {submitting ? 'Doğrulanıyor…' : 'Devam'}
          </button>
        </div>
        {canSkip && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void skipOffer()}
            className="w-full rounded-lg border border-dashed border-border-strong py-2 text-sm text-muted"
          >
            Şimdilik atla
          </button>
        )}
      </div>
    </div>
  );
}
