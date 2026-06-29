'use client';

import { useEffect, useState } from 'react';
import {
  BUSINESS_SETTINGS_FIELDS,
  TRADING_SETTINGS_FIELDS,
  type BusinessEffectiveSettings,
  type BusinessSettingsPartial,
  type EffectiveTradingSettings,
  type TradingSettingsPartial,
} from '@/lib/panel/trading-settings';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from './ui';

interface Props {
  title: string;
  description?: string;
  scope: 'business' | 'member';
  effective: EffectiveTradingSettings | BusinessEffectiveSettings;
  values: TradingSettingsPartial | BusinessSettingsPartial;
  inherited?: TradingSettingsPartial;
  onSave: (settings: TradingSettingsPartial | BusinessSettingsPartial) => Promise<void>;
  onClear?: () => Promise<void>;
  readOnly?: boolean;
}

function fieldValue(
  key: keyof BusinessEffectiveSettings,
  values: TradingSettingsPartial | BusinessSettingsPartial,
  effective: EffectiveTradingSettings | BusinessEffectiveSettings,
): string {
  const v = values[key as keyof typeof values];
  if (v === undefined || v === null) {
    // Bu kapsama özel bir değer yoksa input'u kalıtılan/efektif değerle doldur.
    if (key === 'maxLot' && effective.maxLot === null) return '';
    const effVal = effective[key as keyof typeof effective];
    return effVal !== undefined && effVal !== null ? String(effVal) : '';
  }
  if (key === 'maxLot' && v === null) return '';
  return String(v);
}

// Gösterilen değer bu kapsama özel mi (override) yoksa kalıtılan varsayılan mı?
function hasOwnValue(
  key: keyof BusinessEffectiveSettings,
  values: TradingSettingsPartial | BusinessSettingsPartial,
): boolean {
  const v = values[key as keyof typeof values];
  return v !== undefined && v !== null;
}

export function TradingSettingsForm({
  title,
  description,
  scope,
  effective,
  values,
  inherited,
  onSave,
  onClear,
  readOnly,
}: Props) {
  const fields =
    scope === 'business' ? BUSINESS_SETTINGS_FIELDS : TRADING_SETTINGS_FIELDS;

  const [draft, setDraft] = useState(values);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(values);
  }, [values]);

  function updateField(key: keyof BusinessEffectiveSettings, raw: string) {
    setDraft((prev) => {
      const next = { ...prev };
      if (raw === '') {
        delete next[key as keyof typeof next];
        return next;
      }
      if (key === 'maxLot') {
        next.maxLot = Number(raw);
        return next;
      }
      const n = Number(raw);
      if (Number.isFinite(n)) (next as Record<string, number>)[key] = n;
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onSave(draft);
      setMessage('Ayarlar kaydedildi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!onClear || !confirm('Müşteri özel ayarları silinsin mi?')) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onClear();
      setDraft({});
      setMessage('Özel ayarlar kaldırıldı');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${CARD} p-6`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, hint, step }) => {
            const inheritedVal = inherited?.[key as keyof TradingSettingsPartial];
            const placeholder =
              inheritedVal !== undefined && inheritedVal !== null
                ? `Varsayılan: ${inheritedVal}`
                : `Aktif: ${effective[key as keyof typeof effective] ?? '—'}`;

            const own = hasOwnValue(key, draft);

            return (
              <div key={key}>
                <label className="mb-1 flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {label}
                  {own && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      özel
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step={step ?? 'any'}
                  className={`${INPUT} ${own ? 'font-semibold' : 'italic text-zinc-400 dark:text-zinc-500'}`}
                  value={fieldValue(key, draft, effective)}
                  placeholder={placeholder}
                  disabled={readOnly}
                  onChange={(e) => updateField(key, e.target.value)}
                />
                {hint && (
                  <p className="mt-1 text-[11px] text-zinc-400">{hint}</p>
                )}
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            {onClear && (
              <button
                type="button"
                disabled={saving}
                onClick={handleClear}
                className={BTN_SECONDARY}
              >
                Özel ayarları temizle
              </button>
            )}
          </div>
        )}

        {message && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {message}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="mt-6 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-950">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">
          {scope === 'business'
            ? 'İşletme efektif değerleri'
            : 'Müşteriye uygulanan işlem ayarları'}
        </p>
        <dl className="mt-2 grid gap-1 sm:grid-cols-2">
          {fields.map(({ key, label }) => (
            <div key={key} className="flex justify-between gap-2">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="font-mono text-zinc-800 dark:text-zinc-200">
                {key === 'maxLot' && effective.maxLot === null
                  ? '—'
                  : String(
                      effective[key as keyof typeof effective] ?? '—',
                    )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
