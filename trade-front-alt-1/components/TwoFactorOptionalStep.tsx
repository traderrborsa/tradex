'use client';

import { useEffect, useState } from 'react';
import {
  beginProfile2faSetup,
  dismissProfile2faOffer,
  enableProfile2fa,
} from '@/lib/profile';
import { qrImageUrl } from '@/lib/two-factor';

const INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function TwoFactorOptionalStep({ onComplete, onSkip }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [code, setCode] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accepted) return;
    beginProfile2faSetup()
      .then((res) => setOtpauthUrl(res.otpauthUrl))
      .catch((e) =>
        setError(e instanceof Error ? e.message : '2FA kurulumu başlatılamadı'),
      );
  }, [accepted]);

  async function skip() {
    setSubmitting(true);
    setError(null);
    try {
      await dismissProfile2faOffer();
      onSkip();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  async function enable() {
    setSubmitting(true);
    setError(null);
    try {
      await enableProfile2fa(code);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kod doğrulanamadı');
    } finally {
      setSubmitting(false);
    }
  }

  if (!accepted) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Hesabınızı daha güvenli hale getirmek için iki faktörlü doğrulama (2FA)
          açmak ister misiniz? İsterseniz şimdilik atlayıp profilden sonra da
          kurabilirsiniz.
        </p>
        {error && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={submitting}
          onClick={() => setAccepted(true)}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-fg"
        >
          Evet, 2FA kurmak istiyorum
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void skip()}
          className="w-full rounded-lg border border-dashed border-border-strong py-2.5 text-sm text-muted"
        >
          Şimdilik atla
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Google Authenticator veya benzeri uygulamayla QR kodu okutun, ardından 6
        haneli kodu girin.
      </p>
      {otpauthUrl && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-elevated p-4">
          <img
            src={qrImageUrl(otpauthUrl)}
            alt="2FA QR kodu"
            className="h-40 w-40 rounded-lg bg-white p-2"
          />
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
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={submitting || code.length !== 6}
        onClick={() => void enable()}
        className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-fg disabled:opacity-50"
      >
        {submitting ? 'Etkinleştiriliyor…' : '2FA\'yı etkinleştir'}
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={() => void skip()}
        className="w-full text-sm text-muted hover:text-foreground"
      >
        Şimdilik atla
      </button>
    </div>
  );
}
