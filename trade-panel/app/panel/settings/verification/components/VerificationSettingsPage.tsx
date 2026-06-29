'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import {
  fetchVerificationSettings,
  updateVerificationSettings,
  type PlatformVerificationSettings,
} from '@/lib/panel/verification';
import { PageHeader } from '../../../components/PageHeader';
import { BTN_PRIMARY, CARD, PAGE } from '../../../components/ui';

export function VerificationSettingsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, PERMS.SETTINGS_WRITE);
  const [settings, setSettings] = useState<PlatformVerificationSettings | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetchVerificationSettings()
      .then(setSettings)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      );
  }, []);

  async function save() {
    if (!settings || !canWrite) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateVerificationSettings(settings);
      setSettings(updated);
      setMessage('Doğrulama ayarları kaydedildi');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={PAGE}>
      <PageHeader
        title="Doğrulama ayarları"
        description="Tüm platform için üst seviye doğrulama kuralları. Kapalıyken hiçbir işletmede doğrulama zorunlu olmaz."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      {!settings ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : (
        <div className={`${CARD} space-y-4 p-6`}>
          <label className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <span>
              <span className="block text-sm font-semibold">
                Doğrulama sistemi (ana anahtar)
              </span>
              <span className="text-xs text-zinc-500">
                Kapalıyken tüm platformda hiçbir müşteri doğrulama zorunluluğu yaşamaz
              </span>
            </span>
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
            <span className="block text-sm font-medium">E-posta doğrulaması</span>
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
            <span className="block text-sm font-medium">SMS doğrulaması</span>
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
            <span className="block text-sm font-medium">Kimlik onayı zorunlu</span>
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
            <span className="block text-sm font-medium">2FA zorunlu</span>
            <input
              type="checkbox"
              disabled={!canWrite || !settings.verificationEnabled}
              checked={settings.twoFactorEnabled}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, twoFactorEnabled: e.target.checked } : s,
                )
              }
            />
          </label>

          {canWrite && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
