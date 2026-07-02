'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import {
  deleteCampaign,
  fetchCampaignApplications,
  fetchCampaigns,
  updateCampaign,
  type CampaignApplicationRow,
  type CampaignApplicationStatus,
  type CampaignRow,
  type CampaignTab,
} from '@/lib/panel/campaigns';
import { formatDisplayId } from '@/lib/format-display-id';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from '../../components/ui';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { ApplicationSheet } from './ApplicationSheet';
import { CampaignCreateSheet } from './CampaignCreateSheet';

const MAIN_TABS: { id: CampaignTab; label: string }[] = [
  { id: 'campaigns', label: 'Kampanyalar' },
  { id: 'applications', label: 'Başvurular' },
];

const APP_TABS: { id: 'active' | 'approved' | 'rejected'; label: string }[] = [
  { id: 'active', label: 'Bekleyenler' },
  { id: 'approved', label: 'Onaylananlar' },
  { id: 'rejected', label: 'Reddedilenler' },
];

const STATUS_META: Record<
  CampaignApplicationStatus,
  { label: string; tone: string }
> = {
  pending: {
    label: 'Değerlendiriliyor',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  approved: {
    label: 'Onaylandı',
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  rejected: {
    label: 'Reddedildi',
    tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  cancelled: {
    label: 'İptal',
    tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

function appTabForStatus(status: CampaignApplicationStatus) {
  if (status === 'approved') return 'approved';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  return 'active';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTl(n: number) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

function rowId(row: CampaignApplicationRow) {
  return formatDisplayId(row.displayId, row.id);
}

export function CampaignPanel() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.BONUS_WRITE);

  const [mainTab, setMainTab] = useState<CampaignTab>('campaigns');
  const [appTab, setAppTab] = useState<'active' | 'approved' | 'rejected'>(
    'active',
  );
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [applications, setApplications] = useState<CampaignApplicationRow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<CampaignApplicationRow | null>(
    null,
  );
  const [creating, setCreating] = useState(false);

  const loadCampaigns = useCallback(
    (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      fetchCampaigns(businessId || undefined)
        .then(setCampaigns)
        .catch((e) => {
          if (!silent) setError(e instanceof Error ? e.message : 'Yüklenemedi');
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [businessId],
  );

  const loadApplications = useCallback(
    (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      fetchCampaignApplications({ businessId: businessId || undefined })
        .then(setApplications)
        .catch((e) => {
          if (!silent) setError(e instanceof Error ? e.message : 'Yüklenemedi');
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [businessId],
  );

  useEffect(() => {
    if (mainTab === 'campaigns') loadCampaigns();
    else loadApplications();
  }, [mainTab, loadCampaigns, loadApplications]);

  const filteredCampaigns = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (!q) return true;
      return [c.title, c.description, formatDate(c.createdAt)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [campaigns, appliedSearch]);

  const filteredApps = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return applications.filter((row) => {
      if (appTabForStatus(row.status) !== appTab) return false;
      if (!q) return true;
      const text = [
        rowId(row),
        row.user.fullName,
        row.user.email,
        row.campaign.title,
        STATUS_META[row.status].label,
        formatDate(row.createdAt),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [applications, appliedSearch, appTab]);

  function runSearch() {
    setAppliedSearch(searchInput);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  }

  async function onToggleActive(campaign: CampaignRow) {
    if (!canWrite) return;
    const form = new FormData();
    form.append('isActive', String(!campaign.isActive));
    try {
      await updateCampaign(campaign.id, form);
      loadCampaigns(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi');
    }
  }

  async function onDeleteCampaign(campaign: CampaignRow) {
    if (!canWrite || !confirm(`"${campaign.title}" kampanyasını silmek istiyor musunuz?`))
      return;
    try {
      await deleteCampaign(campaign.id);
      loadCampaigns(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
    }
  }

  const thClass =
    'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500';
  const tdClass = 'whitespace-nowrap px-3 py-2.5 text-sm';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BusinessFilterSelect value={businessId} onChange={setBusinessId} />
        {canWrite && mainTab === 'campaigns' && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={BTN_PRIMARY}
            disabled={!businessId}
          >
            + Kampanya oluştur
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMainTab(t.id)}
            className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition ${
              mainTab === t.id
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'applications' && (
        <div className="mb-4 flex flex-wrap gap-2">
          {APP_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAppTab(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                appTab === t.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <input
            className={`${INPUT} min-w-0 max-w-md flex-1`}
            placeholder="Ara…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button type="button" onClick={runSearch} className={BTN_PRIMARY}>
            Ara
          </button>
          {appliedSearch.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
              }}
              className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Temizle
            </button>
          )}
        </div>

        {mainTab === 'campaigns' ? (
          loading && campaigns.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
          ) : filteredCampaigns.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">Kampanya bulunamadı</p>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                      Görsel yok
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{c.title}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                        }`}
                      >
                        {c.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                      {c.description}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {formatDate(c.createdAt)}
                    </p>
                    {canWrite && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className={`${BTN_SECONDARY} text-xs`}
                          onClick={() => void onToggleActive(c)}
                        >
                          {c.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => void onDeleteCampaign(c)}
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loading && applications.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : filteredApps.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Başvuru bulunamadı</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Müşteri</th>
                  <th className={thClass}>Kampanya</th>
                  <th className={thClass}>Tutar</th>
                  <th className={thClass}>Durum</th>
                  <th className={thClass}>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((row) => {
                  const meta = STATUS_META[row.status];
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedApp(row)}
                      className="cursor-pointer border-b border-zinc-100 transition hover:bg-blue-50/60 last:border-0 dark:border-zinc-800 dark:hover:bg-blue-950/20"
                    >
                      <td className={`${tdClass} font-mono text-xs`}>
                        {rowId(row)}
                      </td>
                      <td className={tdClass}>
                        <span className="font-medium">{row.user.fullName}</span>
                        <span className="ml-1 text-xs text-zinc-500">
                          {row.user.email}
                        </span>
                      </td>
                      <td className={tdClass}>{row.campaign.title}</td>
                      <td className={`${tdClass} font-semibold tabular-nums`}>
                        {row.amount > 0 ? formatTl(row.amount) : '—'}
                      </td>
                      <td className={tdClass}>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className={`${tdClass} text-xs text-zinc-500`}>
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedApp && (
        <ApplicationSheet
          id={selectedApp.id}
          canWrite={canWrite}
          onClose={() => setSelectedApp(null)}
          onSaved={() => loadApplications(true)}
        />
      )}

      {creating && (
        <CampaignCreateSheet
          businessId={businessId}
          onClose={() => setCreating(false)}
          onSaved={() => loadCampaigns(true)}
        />
      )}
    </div>
  );
}
