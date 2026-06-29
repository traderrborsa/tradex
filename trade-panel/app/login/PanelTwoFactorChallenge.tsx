'use client';

import { useEffect, useState } from 'react';
import {
  panelBeginTwoFactorSetup,
  panelCompleteTwoFactorSetup,
  panelSkipTwoFactorOffer,
  panelVerifyTwoFactor,
  type AuthResponse,
} from '@/lib/api';
import type { TwoFactorLoginChallenge } from '@/lib/api';

const INPUT =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

function qrUrl(otpauthUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
}

export function PanelTwoFactorChallenge({
  challenge,
  onSuccess,
  onCancel,
}: {
  challenge: TwoFactorLoginChallenge;
  onSuccess: (res: AuthResponse) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedSetup, setAcceptedSetup] = useState(
    challenge.mode !== 'offer',
  );

  const showSetup = challenge.mode === 'setup' || acceptedSetup;
  const canSkip = challenge.mode === 'offer';

  useEffect(() => {
    if (challenge.mode === 'verify' || !showSetup) return;
    panelBeginTwoFactorSetup(challenge.pendingToken)
      .then((res) => setOtpauthUrl(res.otpauthUrl))
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Kurulum başlatılamadı'),
      );
  }, [challenge, showSetup]);

  async function skipOffer() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await panelSkipTwoFactorOffer(challenge.pendingToken);
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
          ? await panelVerifyTwoFactor(challenge.pendingToken, code)
          : await panelCompleteTwoFactorSetup(challenge.pendingToken, code);
      onSuccess(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kod hatalı');
    } finally {
      setSubmitting(false);
    }
  }

  if (challenge.mode === 'offer' && !acceptedSetup) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">İki faktörlü doğrulama</h2>
        <p className="text-sm text-zinc-500">
          Hesabınızı daha güvenli hale getirmek için 2FA açmak ister misiniz?
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={submitting}
          onClick={() => setAcceptedSetup(true)}
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Evet, 2FA kurmak istiyorum
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void skipOffer()}
          className="w-full rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm text-zinc-500 dark:border-zinc-600"
        >
          Şimdilik atla
        </button>
        <button type="button" onClick={onCancel} className="w-full text-sm text-zinc-500">
          Geri
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {showSetup ? '2FA kurulumu' : '2FA doğrulama'}
      </h2>
      {showSetup && (
        <p className="text-sm text-zinc-500">
          Authenticator uygulamanızla QR kodu okutun, ardından 6 haneli kodu girin.
        </p>
      )}
      {otpauthUrl && (
        <img
          src={qrUrl(otpauthUrl)}
          alt="QR"
          className="mx-auto h-40 w-40 rounded-lg bg-white p-2"
        />
      )}
      <input
        className={INPUT}
        placeholder="6 haneli kod"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border px-4 py-2 text-sm">
            Geri
          </button>
          <button
            type="button"
            disabled={submitting || code.length !== 6}
            onClick={() => void submit()}
            className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Devam
          </button>
        </div>
        {canSkip && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void skipOffer()}
            className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-zinc-500 dark:border-zinc-600"
          >
            Şimdilik atla
          </button>
        )}
      </div>
    </div>
  );
}
