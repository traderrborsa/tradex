'use client';

import { FormEvent, useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { createCampaign } from '@/lib/panel/campaigns';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';

interface Props {
  businessId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function CampaignCreateSheet({ businessId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onImageChange(file: File | null) {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!businessId) {
      setError('İşletme seçin');
      return;
    }
    if (!title.trim()) {
      setError('Kampanya başlığı gerekli');
      return;
    }
    if (!description.trim()) {
      setError('Açıklama gerekli');
      return;
    }
    if (!terms.trim()) {
      setError('Kullanım koşulları gerekli');
      return;
    }
    if (!image) {
      setError('Kampanya görseli gerekli');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('businessId', businessId);
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('terms', terms.trim());
      form.append('isActive', String(isActive));
      form.append('image', image);
      await createCampaign(form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oluşturulamadı');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 lg:inset-x-auto lg:top-1/2 lg:right-8 lg:bottom-auto lg:left-auto lg:w-full lg:max-w-lg lg:-translate-y-1/2 lg:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold">Yeni kampanya</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-2 py-1 text-zinc-500"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Başlık</label>
              <input
                className={INPUT}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: %100 Hoş Geldin Bonusu"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Açıklama</label>
              <textarea
                className={`${INPUT} min-h-[100px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kampanya detayları…"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Kullanım koşulları
              </label>
              <textarea
                className={`${INPUT} min-h-[100px] resize-y`}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Kampanya şartları ve koşulları…"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Görsel</label>
              <FileUpload
                accept="image/*"
                file={image}
                previewUrl={imagePreview}
                onChange={onImageChange}
                hint="JPG, PNG, WEBP — en fazla 4 MB"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Aktif (müşterilere göster)
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <button type="button" className={BTN_SECONDARY} onClick={onClose}>
              İptal
            </button>
            <button type="submit" className={BTN_PRIMARY} disabled={submitting}>
              {submitting ? 'Kaydediliyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
