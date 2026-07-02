'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { TwoFactorOptionalStep } from '@/components/TwoFactorOptionalStep';
import { useAuth } from '@/contexts/AuthContext';
import {
  COUNTRY_DIALS,
  DEFAULT_DIAL,
  formatNationalInput,
  PHONE_MASK_HINT,
  toE164,
} from '@/lib/phone';
import { RegisterEvrakStep } from '@/components/RegisterEvrakStep';
import {
  confirmEmailCode,
  sendEmailVerificationCode,
} from '@/lib/profile';
import {
  sanitizeNameInput,
  validateRegisterForm,
  validateRegisterFormStep,
} from '@/lib/register';
import { normalizeTcKimlikNo } from '@/lib/tc-kimlik';

const INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function BirthDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [yy, mm, dd] = value ? value.split('-') : ['', '', ''];
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 18; y >= currentYear - 100; y -= 1) years.push(y);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const emit = (d: string, m: string, y: string) => {
    onChange(d && m && y ? `${y}-${m}-${d}` : '');
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        aria-label="Gün"
        className={`${INPUT} cursor-pointer`}
        value={dd ?? ''}
        onChange={(e) => emit(e.target.value, mm ?? '', yy ?? '')}
      >
        <option value="">Gün</option>
        {days.map((d) => {
          const v = String(d).padStart(2, '0');
          return (
            <option key={v} value={v}>
              {d}
            </option>
          );
        })}
      </select>
      <select
        aria-label="Ay"
        className={`${INPUT} cursor-pointer`}
        value={mm ?? ''}
        onChange={(e) => emit(dd ?? '', e.target.value, yy ?? '')}
      >
        <option value="">Ay</option>
        {MONTH_NAMES.map((name, i) => {
          const v = String(i + 1).padStart(2, '0');
          return (
            <option key={v} value={v}>
              {name}
            </option>
          );
        })}
      </select>
      <select
        aria-label="Yıl"
        className={`${INPUT} cursor-pointer`}
        value={yy ?? ''}
        onChange={(e) => emit(dd ?? '', mm ?? '', e.target.value)}
      >
        <option value="">Yıl</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

function PhoneField({
  dial,
  onDialChange,
  value,
  onChange,
}: {
  dial: string;
  onDialChange: (v: string) => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <select
        aria-label="Ülke kodu"
        className={`${INPUT} w-auto shrink-0 cursor-pointer`}
        value={dial}
        onChange={(e) => onDialChange(e.target.value)}
      >
        {COUNTRY_DIALS.map((c) => (
          <option key={c.iso} value={c.dial}>
            {c.flag} +{c.dial}
          </option>
        ))}
      </select>
      <input
        className={INPUT}
        type="tel"
        inputMode="numeric"
        placeholder={dial === DEFAULT_DIAL ? PHONE_MASK_HINT : 'Telefon numarası'}
        value={value}
        onChange={(e) => onChange(formatNationalInput(dial, e.target.value))}
      />
    </div>
  );
}

const STEPS = [
  'Ad Soyad',
  'Kimlik',
  'İletişim',
  'Şifre',
  'E-posta doğrulama',
  'Evrak belgeleri',
];

export function RegisterWizard() {
  const router = useRouter();
  const { register, user, refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tcKimlikNo, setTcKimlikNo] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneDial, setPhoneDial] = useState(DEFAULT_DIAL);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [show2fa, setShow2fa] = useState(false);

  const formFields = {
    firstName,
    lastName,
    tcKimlikNo,
    birthDate,
    referenceNumber,
    email,
    phone: toE164(phoneDial, phone),
    password,
    passwordConfirm,
  };

  const canOffer2fa = user?.twoFactor?.canOfferSetup ?? false;
  const stepLabel = STEPS[Math.min(step, STEPS.length - 1)];

  function goNextStep() {
    setError(null);
    if (step < 3) {
      const validationError = validateRegisterFormStep(step, formFields);
      if (validationError) {
        setError(validationError);
        return;
      }
      setStep(step + 1);
      return;
    }
    if (step === 3) {
      void createAccount();
    }
  }

  function goPrevStep() {
    setError(null);
    if (step > 0 && step < 4) setStep(step - 1);
  }

  async function createAccount() {
    const validationError = validateRegisterForm(formFields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    const err = await register({
      firstName,
      lastName,
      tcKimlikNo: normalizeTcKimlikNo(tcKimlikNo),
      birthDate,
      referenceNumber: referenceNumber.trim() || undefined,
      email,
      phone: toE164(phoneDial, phone),
      password,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setRegistered(true);
    setStep(4);
  }

  function finish() {
    router.push('/');
    router.refresh();
  }

  function goAfterDocuments() {
    if (canOffer2fa) {
      setShow2fa(true);
      return;
    }
    finish();
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 items-center justify-center bg-black px-6 py-12 lg:w-1/2 lg:py-0">
        <Link href="/" className="cursor-pointer transition hover:opacity-80">
          <BrandLogo size="splash" className="text-white" />
        </Link>
      </aside>

      <main className="flex flex-1 flex-col justify-center bg-background px-6 py-10 sm:px-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-2 text-2xl font-bold">Hesap oluştur</h1>
          {!show2fa && (
            <>
              <p className="mb-4 text-sm text-muted">
                Adım {step + 1} / {STEPS.length}: {stepLabel}
              </p>

              <div className="mb-6 flex gap-1">
                {STEPS.map((label, i) => (
                  <div
                    key={label}
                    className={`h-1 flex-1 rounded-full ${
                      i <= step ? 'bg-accent' : 'bg-elevated'
                    }`}
                    title={label}
                  />
                ))}
              </div>
            </>
          )}

          {message && (
            <p className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              {message}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <input
                className={INPUT}
                placeholder="Ad"
                value={firstName}
                onChange={(e) => setFirstName(sanitizeNameInput(e.target.value))}
                autoFocus
              />
              <input
                className={INPUT}
                placeholder="Soyad"
                value={lastName}
                onChange={(e) => setLastName(sanitizeNameInput(e.target.value))}
              />
              <button
                type="button"
                onClick={goNextStep}
                className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-fg"
              >
                Devam
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <input
                className={INPUT}
                placeholder="T.C. Kimlik No"
                inputMode="numeric"
                maxLength={11}
                value={tcKimlikNo}
                onChange={(e) =>
                  setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))
                }
                autoFocus
              />
              <div>
                <label className="mb-1.5 block text-sm text-muted">Doğum tarihi</label>
                <BirthDateField value={birthDate} onChange={setBirthDate} />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goPrevStep}
                  className="w-full rounded-lg border border-border-strong py-2.5 text-sm"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={goNextStep}
                  className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-fg"
                >
                  Devam
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <input
                className={INPUT}
                placeholder="Referans kodu (opsiyonel)"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
              <input
                className={INPUT}
                type="email"
                placeholder="E-posta"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <PhoneField
                dial={phoneDial}
                onDialChange={(d) => {
                  setPhoneDial(d);
                  setPhone((p) => formatNationalInput(d, p));
                }}
                value={phone}
                onChange={setPhone}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goPrevStep}
                  className="w-full rounded-lg border border-border-strong py-2.5 text-sm"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={goNextStep}
                  className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-fg"
                >
                  Devam
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <input
                className={INPUT}
                type="password"
                placeholder="Şifre (min 6)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <input
                className={INPUT}
                type="password"
                placeholder="Şifre tekrar"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goPrevStep}
                  className="w-full rounded-lg border border-border-strong py-2.5 text-sm"
                >
                  Geri
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={goNextStep}
                  className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-fg disabled:opacity-50"
                >
                  {submitting ? 'Oluşturuluyor…' : 'Devam'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && registered && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                E-posta adresinizi doğrulayabilir veya şimdilik atlayıp devam edebilirsiniz.
              </p>
              <button
                type="button"
                className="w-full rounded-lg border border-border-strong py-2 text-sm"
                onClick={async () => {
                  await sendEmailVerificationCode();
                  setMessage('Kod gönderildi');
                }}
              >
                Doğrulama kodu gönder
              </button>
              <input
                className={INPUT}
                placeholder="6 haneli kod"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
              />
              <button
                type="button"
                className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-accent-fg"
                onClick={async () => {
                  await confirmEmailCode(emailCode);
                  setMessage('E-posta doğrulandı');
                  setStep(5);
                }}
              >
                Kodu onayla ve devam
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-border-strong py-2 text-sm text-muted"
                onClick={() => setStep(5)}
              >
                Şimdilik atla
              </button>
            </div>
          )}

          {step === 5 && (registered || user) && (
            <RegisterEvrakStep
              submitting={submitting}
              doneLabel={canOffer2fa ? 'Devam' : 'Tamamla'}
              onDone={goAfterDocuments}
            />
          )}

          {show2fa && canOffer2fa && (
            <TwoFactorOptionalStep
              onComplete={async () => {
                await refreshUser();
                setMessage('2FA etkinleştirildi');
                finish();
              }}
              onSkip={finish}
            />
          )}

          <p className="mt-6 text-center text-sm text-muted">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="text-foreground hover:underline">
              Giriş yapın
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
