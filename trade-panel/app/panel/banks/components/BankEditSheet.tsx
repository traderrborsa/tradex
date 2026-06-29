'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BankNameAutocomplete } from '@/components/BankNameAutocomplete';
import { FileUpload } from '@/components/FileUpload';
import {
  createBank,
  deleteBank,
  fetchBank,
  updateBank,
  type BankRow,
} from '@/lib/panel/banks';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';

interface Props {
  id?: string;
  businessId?: string;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function BankEditSheet({
  id,
  businessId,
  canWrite,
  onClose,
  onSaved,
}: Props) {
  const isCreate = !id;

  const [row, setRow] = useState<BankRow | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isCreate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBank(id)
      .then((r) => {
        setRow(r);
        setName(r.name);
        setIsActive(r.isActive);
        setLogoPreview(r.logoUrl);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  function onLogoChange(file: File | null) {
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    setLogo(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else if (row?.logoUrl) {
      setLogoPreview(row.logoUrl);
    } else {
      setLogoPreview(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Banka adı en az 2 karakter olmalı');
      return;
    }
    if (isCreate && !logo) {
      setError('Banka logosu gerekli');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('name', trimmed);
      form.append('isActive', String(isActive));
      if (logo) form.append('logo', logo);

      if (isCreate) {
        const targetBusinessId = businessId ?? row?.businessId;
        if (!targetBusinessId) {
          setError('İşletme seçin');
          return;
        }
        form.append('businessId', targetBusinessId);
        await createBank(form);
      } else {
        await updateBank(id!, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!canWrite || !id || !confirm('Bu bankayı silmek istediğinize emin misiniz?')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deleteBank(id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold">
            {isCreate ? 'Yeni banka' : 'Banka düzenle'}
          </h2>
          <button type="button" onClick={onClose} className="cursor-pointer px-2 py-1 text-zinc-500">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-zinc-500">Yükleniyor…</p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Banka adı</label>
                  <BankNameAutocomplete
                    value={name}
                    onChange={setName}
                    disabled={!canWrite}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Logo {isCreate && <span className="text-red-500">*</span>}
                  </label>
                    <FileUpload
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      hint="JPG, PNG, WEBP, GIF veya SVG — en fazla 2 MB"
                      file={logo}
                      previewUrl={logoPreview}
                      onChange={onLogoChange}
                      disabled={!canWrite}
                    />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Durum</label>
                  <select
                    className={INPUT}
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    disabled={!canWrite}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            {canWrite && !isCreate && (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="mr-auto text-sm text-red-600 hover:underline"
                disabled={submitting}
              >
                Sil
              </button>
            )}
            <button type="button" className={BTN_SECONDARY} onClick={onClose}>
              Kapat
            </button>
            {canWrite && (
              <button type="submit" className={BTN_PRIMARY} disabled={submitting || loading}>
                {submitting ? 'Kaydediliyor…' : isCreate ? 'Oluştur' : 'Kaydet'}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
