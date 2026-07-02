'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessPicker } from '@/lib/use-panel-business-filter';
import type { CreateMemberPayload } from '@/lib/panel/members';
import { PageHeader } from '../../components/PageHeader';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from '../../components/ui';

interface Props {
  onSubmit: (payload: CreateMemberPayload) => Promise<void>;
  backHref: string;
}

export function MemberForm({ onSubmit, backHref }: Props) {
  const router = useRouter();
  const { businessId, setBusinessId, singleBusiness } = useBusinessPicker();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tcKimlikNo, setTcKimlikNo] = useState('');
  const [phone, setPhone] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        email,
        password,
        fullName,
        tcKimlikNo,
        phone,
        referenceNumber: referenceNumber || undefined,
        businessId: businessId || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Yeni müşteri" backHref={backHref} />

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
            <label className="mb-1 block text-sm font-medium">Şifre</label>
            <input
              type="password"
              className={INPUT}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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

          {!singleBusiness && (
            <BusinessFilterSelect
              value={businessId}
              onChange={setBusinessId}
              allowAll={false}
              required
              alwaysShow
              label="İşletme"
            />
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

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
