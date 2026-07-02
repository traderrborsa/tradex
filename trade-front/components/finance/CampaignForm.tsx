'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiApplyCampaign,
  apiFetchCampaigns,
  type Campaign,
} from '@/lib/campaign-api';
import { FIN_CARD } from './shared';

function CampaignApplyModal({
  campaign,
  onClose,
  onApplied,
}: {
  campaign: Campaign;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onApply() {
    setApplying(true);
    setError(null);
    try {
      await apiApplyCampaign(campaign.id);
      setSuccess(true);
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Başvuru gönderilemedi');
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85vh] w-full max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl">
        {campaign.imageUrl && (
          <img
            src={campaign.imageUrl}
            alt=""
            className="h-44 w-full object-cover"
          />
        )}
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">{campaign.title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-secondary">
              Açıklama
            </h3>
            <p className="whitespace-pre-wrap text-sm text-muted">
              {campaign.description}
            </p>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-secondary">
              Kullanım koşulları
            </h3>
            <p className="whitespace-pre-wrap text-sm text-muted">
              {campaign.terms}
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
              Başvurunuz alındı. Onaylandığında hesabınıza tanımlanacaktır.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-secondary"
            >
              Kapat
            </button>
            {!success && !campaign.hasApplied && (
              <button
                type="button"
                disabled={applying}
                onClick={() => void onApply()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
              >
                {applying ? 'Gönderiliyor…' : 'Başvur'}
              </button>
            )}
            {(success || campaign.hasApplied) && (
              <span className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-muted">
                Başvuruldu
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function CampaignCard({
  campaign,
  onSelect,
}: {
  campaign: Campaign;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${FIN_CARD} group w-full overflow-hidden text-left transition hover:ring-2 hover:ring-accent/40`}
    >
      {campaign.imageUrl ? (
        <img
          src={campaign.imageUrl}
          alt=""
          className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-zinc-900 text-muted">
          Kampanya
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{campaign.title}</h3>
          {campaign.hasApplied && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
              Başvuruldu
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted">
          {campaign.description}
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-accent">
          Detay &amp; başvur →
        </span>
      </div>
    </button>
  );
}

export function CampaignForm({ onCreated }: { onCreated?: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Campaign | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetchCampaigns()
      .then(setCampaigns)
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleApplied() {
    load();
    onCreated?.();
  }

  if (loading) {
    return <p className="text-center text-sm text-muted">Yükleniyor…</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
        {error}
      </p>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className={`${FIN_CARD} p-8 text-center`}>
        <p className="font-medium">Aktif kampanya yok</p>
        <p className="mt-1 text-sm text-muted">
          Yeni kampanyalar burada listelenecek.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Aktif kampanyalara başvurabilirsiniz. Başvurunuz onaylandığında kampanya
        tutarı hesabınıza tanımlanır.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            onSelect={() => setSelected(c)}
          />
        ))}
      </div>

      {selected && (
        <CampaignApplyModal
          campaign={selected}
          onClose={() => setSelected(null)}
          onApplied={handleApplied}
        />
      )}
    </div>
  );
}
