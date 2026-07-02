'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/auth';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import { fetchAssignableRoles } from '@/lib/panel/roles';
import type { AssignableRole } from '@/lib/panel/types';
import type { UserFormPayload } from '@/lib/panel/users';
import { PageHeader } from '../../components/PageHeader';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from '../../components/ui';

interface Props {
  mode: 'create' | 'edit';
  initial?: Partial<UserFormPayload>;
  onSubmit: (payload: UserFormPayload) => Promise<void>;
  backHref: string;
}

export function UserForm({ mode, initial, onSubmit, backHref }: Props) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const viewerIsAdmin = isAdmin(authUser);
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const { businesses: authBusinesses } = useBusiness();
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [tcKimlikNo, setTcKimlikNo] = useState(initial?.tcKimlikNo ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [referenceNumber, setReferenceNumber] = useState(
    initial?.referenceNumber ?? '',
  );
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds ?? []);
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const businesses = authBusinesses;
  const multiBusiness = businesses.length > 1;
  const roleBusinessId = businessId || businessIds[0] || undefined;

  useEffect(() => {
    fetchAssignableRoles(roleBusinessId)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [roleBusinessId]);

  useEffect(() => {
    if (!businesses.length) return;

    const initialIds = (initial?.businessIds ?? []).filter((id) =>
      businesses.some((b) => b.id === id),
    );

    if (initialIds.length) {
      setBusinessIds(initialIds);
      setBusinessId(initialIds[0] ?? '');
      return;
    }

    if (mode === 'create' && businessId) {
      setBusinessIds([businessId]);
    }
  }, [initial?.businessIds, businesses, mode, businessId, setBusinessId]);

  function toggleRole(id: string) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  function handleSingleBusinessChange(id: string) {
    setBusinessId(id);
    setBusinessIds(id ? [id] : []);
  }

  function handleMultiBusinessChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
    setBusinessIds(selected);
    setBusinessId(selected[0] ?? '');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resolvedBusinessIds = viewerIsAdmin && multiBusiness
        ? businessIds
        : businessId
          ? [businessId]
          : [];

      await onSubmit({
        email,
        password: password || undefined,
        fullName,
        tcKimlikNo,
        phone,
        referenceNumber: referenceNumber || undefined,
        roleIds,
        businessIds: resolvedBusinessIds,
        createTradingAccount: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={mode === 'create' ? 'Yeni kullanıcı' : 'Kullanıcı düzenle'}
        backHref={backHref}
      />

      <form onSubmit={handleSubmit} className={`${CARD} max-w-2xl p-6`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Ad Soyad</label>
            <input
              className={INPUT}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-posta</label>
            <input
              type="email"
              className={INPUT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Şifre {mode === 'edit' && '(boş bırakılırsa değişmez)'}
            </label>
            <input
              type="password"
              className={INPUT}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === 'create'}
              minLength={mode === 'create' ? 6 : undefined}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                T.C. Kimlik No
              </label>
              <input
                className={INPUT}
                value={tcKimlikNo}
                onChange={(e) => setTcKimlikNo(e.target.value)}
                required
                maxLength={11}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefon</label>
              <input
                className={INPUT}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={10}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Referans No (opsiyonel)
            </label>
            <input
              className={INPUT}
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {businesses.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">İşletme</label>
              {viewerIsAdmin && multiBusiness ? (
                <>
                  <p className="mb-2 text-xs text-zinc-500">
                    Birden fazla işletme seçmek için Ctrl (Mac: Cmd) ile tıklayın.
                  </p>
                  <select
                    multiple
                    className={`${INPUT} min-h-32`}
                    value={businessIds}
                    onChange={handleMultiBusinessChange}
                  >
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.displayName}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <select
                  className={INPUT}
                  value={businessId}
                  onChange={(e) => handleSingleBusinessChange(e.target.value)}
                  required
                >
                  {multiBusiness && (
                    <option value="">İşletme seçin</option>
                  )}
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Roller</label>
            <p className="mb-2 text-xs text-zinc-500">
              Kullanıcıya atanacak roller. Her rolün izinleri Roller sayfasından
              düzenlenir.
            </p>
            <div className="space-y-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <span>
                    <span className="font-medium">
                      {role.displayName}
                      {role.isHidden && (
                        <span className="ml-1 text-xs text-amber-600">
                          (gizli)
                        </span>
                      )}
                      {role.isSystem && (
                        <span className="ml-1 text-xs text-zinc-500">
                          (sistem)
                        </span>
                      )}
                    </span>
                    <span className="block font-mono text-xs text-zinc-400">
                      {role.name}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => router.push(backHref)}
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
