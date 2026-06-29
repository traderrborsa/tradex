'use client';

import { useEffect, useState } from 'react';
import {
  fetchBusinessVerificationSettings,
  updateBusinessVerificationSettings,
  type BusinessVerificationSettings,
} from '@/lib/panel/verification';
import { BTN_PRIMARY, CARD } from './ui';

interface Props {
  businessId: string;
  canWrite: boolean;
}

export function BusinessVerificationForm({ businessId, canWrite }: Props) {
  const [settings, setSettings] = useState<BusinessVerificationSettings | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessVerificationSettings(businessId)
      .then(setSettings)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      );
  }, [businessId]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateBusinessVerificationSettings(
        businessId,
        settings,
      );
      setSettings(updated);
      setMessage('İşletme doğrulama ayarları kaydedildi');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  if (!settings && !error) {
    return <p className="text-sm text-zinc-500">Doğrulama ayarları yükleniyor…</p>;
  }

  return (
    <div className={`${CARD} p-6`}>
      <h2 className="text-sm font-semibold">Doğrulama ayarları (işletme)</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Sistem ayarları açıkken bu işletmenin müşterileri için geçerli kurallar.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}

      {settings && (
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Doğrulama sistemi</span>
            <input
              type="checkbox"
              disabled={!canWrite}
              checked={settings.verificationEnabled}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, verificationEnabled: e.target.checked } : s,
                )
              }
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">E-posta doğrulaması</span>
            <input
              type="checkbox"
              disabled={!canWrite || !settings.verificationEnabled}
              checked={settings.emailVerificationEnabled}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, emailVerificationEnabled: e.target.checked } : s,
                )
              }
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">SMS doğrulaması</span>
            <input
              type="checkbox"
              disabled={!canWrite || !settings.verificationEnabled}
              checked={settings.smsVerificationEnabled}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, smsVerificationEnabled: e.target.checked } : s,
                )
              }
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Kimlik onayı</span>
            <input
              type="checkbox"
              disabled={!canWrite || !settings.verificationEnabled}
              checked={settings.identityVerificationRequired}
              onChange={(e) =>
                setSettings((s) =>
                  s
                    ? { ...s, identityVerificationRequired: e.target.checked }
                    : s,
                )
              }
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">2FA zorunlu</span>
            <input
              type="checkbox"
              disabled={!canWrite || !settings.verificationEnabled}
              checked={settings.twoFactorRequired}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, twoFactorRequired: e.target.checked } : s,
                )
              }
            />
          </label>
        </div>
      )}

      {canWrite && settings && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`${BTN_PRIMARY} mt-4`}
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      )}
    </div>
  );
}
