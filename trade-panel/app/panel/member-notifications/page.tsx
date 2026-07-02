'use client';

import { useCallback, useEffect, useState } from 'react';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BusinessFilterSelect } from '@/app/panel/components/BusinessFilterSelect';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import { sendMemberNotification } from '@/lib/panel/member-notifications';
import { fetchMembers } from '@/lib/panel/members';
import type { PanelMemberRow } from '@/lib/panel/types';
import { PERMS } from '@/lib/permissions';
import { CARD, PAGE } from '../components/ui';
import { MemberPicker } from './components/MemberPicker';

function SendForm() {
  const { user } = useAuth();
  const canRead = canAccess(user, PERMS.MEMBERS_READ);
  const { businessId, setBusinessId } = usePanelBusinessFilter();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [href, setHref] = useState('');
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const [members, setMembers] = useState<PanelMemberRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) {
      setMembers([]);
      setMembersError('Müşteri listesini görmek için okuma izni gerekli');
      return;
    }

    setMembersLoading(true);
    setMembersError(null);
    fetchMembers(businessId || undefined)
      .then((rows) => {
        const sorted = [...rows].sort((a, b) =>
          a.user.fullName.localeCompare(b.user.fullName, 'tr'),
        );
        setMembers(sorted);
      })
      .catch((e) => {
        setMembers([]);
        setMembersError(
          e instanceof Error ? e.message : 'Müşteriler yüklenemedi',
        );
      })
      .finally(() => setMembersLoading(false));
  }, [businessId, canRead]);

  const toggleMember = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const resolveSendBusinessId = () => {
    if (businessId) return businessId;
    if (user?.businesses?.length === 1) {
      return user.businesses[0]!.id;
    }
    return '';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const sendBusinessId = resolveSendBusinessId();
    if (!sendBusinessId) {
      setError('Lütfen bir işletme seçin');
      return;
    }
    if (!title.trim() || !message.trim()) {
      setError('Başlık ve mesaj gerekli');
      return;
    }
    if (mode === 'selected' && selectedIds.length === 0) {
      setError('En az bir müşteri seçin');
      return;
    }
    if (mode === 'all' && members.length === 0) {
      setError('Gönderilecek müşteri bulunamadı');
      return;
    }

    setLoading(true);
    try {
      const res = await sendMemberNotification({
        title: title.trim(),
        message: message.trim(),
        businessId: sendBusinessId,
        href: href.trim() || undefined,
        userIds: mode === 'selected' ? selectedIds : undefined,
      });
      setResult(`${res.count} müşteriye bildirim gönderildi`);
      setTitle('');
      setMessage('');
      setHref('');
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gönderim başarısız');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900';

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={PAGE}>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`${CARD} space-y-5 p-5`}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Bildirim içeriği
          </h2>

          <BusinessFilterSelect
            value={businessId}
            onChange={setBusinessId}
            allowAll
            alwaysShow
            label="İşletme"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Başlık
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Örn: Teminat seviyesi düştü"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Mesaj
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={inputClass}
              placeholder="Bildirim metni…"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Link (isteğe bağlı)
            </label>
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              className={inputClass}
              placeholder="/portfolio"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Alıcılar
            </legend>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50">
              <input
                type="radio"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
              />
              <span>
                Tüm müşteriler
                <span className="ml-1 text-zinc-500">
                  ({membersLoading ? '…' : members.length})
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50">
              <input
                type="radio"
                checked={mode === 'selected'}
                onChange={() => setMode('selected')}
              />
              <span>Seçili müşteriler</span>
            </label>
          </fieldset>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {result && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {result}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || membersLoading}
            className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor…' : 'Bildirim gönder'}
          </button>
        </div>

        <div className={`${CARD} p-5`}>
          <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Müşteri seçimi
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            {mode === 'all'
              ? 'Önizleme — tüm müşterilere gidecek. Seçmek için “Seçili müşteriler” moduna geçin.'
              : 'Göndermek istediğiniz müşterileri işaretleyin.'}
          </p>

          <MemberPicker
            members={members}
            selectedIds={selectedIds}
            onToggle={(id) => {
              if (mode === 'all') setMode('selected');
              toggleMember(id);
            }}
            onSetSelected={(ids) => {
              if (mode === 'all') setMode('selected');
              setSelectedIds(ids);
            }}
            loading={membersLoading}
            error={membersError}
            readOnly={mode === 'all'}
          />

          {mode === 'selected' && selectedIds.length > 0 && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {selectedIds.length} müşteriye gönderilecek
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

export default function MemberNotificationsPage() {
  return (
    <PermissionGate permission={PERMS.MEMBER_NOTIFICATIONS_SEND}>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Müşteri bildirimleri
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Toplu veya kişi bazlı sistem bildirimi gönderin.
        </p>
        <div className="mt-6">
          <SendForm />
        </div>
      </div>
    </PermissionGate>
  );
}
