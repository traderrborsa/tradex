'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { RegisterStepIndicator } from '@/components/RegisterStepIndicator';
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
  getRegisterFormStepFieldErrors,
  sanitizeNameInput,
  type RegisterFieldErrors,
  type RegisterFieldKey,
} from '@/lib/register';
import { normalizeTcKimlikNo } from '@/lib/tc-kimlik';

const STEPS = [
  { id: 0, label: 'Ad Soyad', shortLabel: 'Ad' },
  { id: 1, label: 'Kimlik bilgileri', shortLabel: 'Kimlik' },
  { id: 2, label: 'İletişim bilgileri', shortLabel: 'İletişim' },
  { id: 3, label: 'Şifre oluştur', shortLabel: 'Şifre' },
  { id: 4, label: 'E-posta doğrulama', shortLabel: 'E-posta' },
  { id: 5, label: 'Evrak belgeleri', shortLabel: 'Evrak' },
];

function FieldWrap({
  error,
  children,
}: {
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
      {error && <p className="register-field-error">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `corp-input${hasError ? ' corp-input--error' : ''}`;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function BirthDateField({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const [yy, mm, dd] = value ? value.split('-') : ['', '', ''];
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 18; y >= currentYear - 100; y -= 1) years.push(y);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const emit = (d: string, m: string, y: string) => {
    onChange(d && m && y ? `${y}-${m}-${d}` : '');
  };

  const selectCls = `${inputClass(hasError)} cursor-pointer`;

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        aria-label="Gün"
        className={selectCls}
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
        className={selectCls}
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
        className={selectCls}
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
  hasError,
}: {
  dial: string;
  onDialChange: (v: string) => void;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  return (
    <div className="flex gap-2">
      <select
        aria-label="Ülke kodu"
        className={`${inputClass(hasError)} w-auto shrink-0 cursor-pointer`}
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
        className={inputClass(hasError)}
        type="tel"
        inputMode="numeric"
        placeholder={dial === DEFAULT_DIAL ? PHONE_MASK_HINT : 'Telefon numarası'}
        value={value}
        onChange={(e) => onChange(formatNationalInput(dial, e.target.value))}
      />
    </div>
  );
}

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
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
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
    emailCode,
  };

  const canOffer2fa = user?.twoFactor?.canOfferSetup ?? false;
  const activeStep = STEPS[Math.min(step, STEPS.length - 1)];

  function clearErrors() {
    setError(null);
    setFieldErrors({});
  }

  function applyStepValidation(validationStep: number): boolean {
    const errors = getRegisterFormStepFieldErrors(validationStep, formFields);
    if (Object.keys(errors).length === 0) return true;
    setFieldErrors(errors);
    setError(Object.values(errors)[0] ?? null);
    return false;
  }

  function fieldError(key: RegisterFieldKey) {
    return fieldErrors[key];
  }

  function goNextStep() {
    clearErrors();
    if (!applyStepValidation(step)) return;

    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (step === 3) {
      void createAccount();
    }
  }

  function goPrevStep() {
    clearErrors();
    if (step > 0 && step < 4) setStep(step - 1);
  }

  async function createAccount() {
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

  async function confirmEmailStep() {
    clearErrors();
    if (!applyStepValidation(4)) return;

    setSubmitting(true);
    setError(null);
    try {
      await confirmEmailCode(emailCode);
      setMessage('E-posta doğrulandı.');
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kod doğrulanamadı');
    } finally {
      setSubmitting(false);
    }
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
    <AuthShell
      wide
      title="Hesap oluştur"
      subtitle={
        show2fa
          ? 'İsteğe bağlı — iki faktörlü doğrulama'
          : `Adım ${step + 1} / ${STEPS.length} — ${activeStep.label}`
      }
      footer={
        <p className="text-sm text-muted">
          Zaten kayıtlı mısınız?{' '}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Giriş yapın
          </Link>
        </p>
      }
    >
      {!show2fa && <RegisterStepIndicator steps={STEPS} currentStep={step} />}

      {message && (
        <p className="mb-4 border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
          {error}
        </p>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <FieldWrap error={fieldError('firstName')}>
            <input
              className={inputClass(!!fieldError('firstName'))}
              placeholder="Ad"
              value={firstName}
              onChange={(e) => setFirstName(sanitizeNameInput(e.target.value))}
              autoFocus
            />
          </FieldWrap>
          <FieldWrap error={fieldError('lastName')}>
            <input
              className={inputClass(!!fieldError('lastName'))}
              placeholder="Soyad"
              value={lastName}
              onChange={(e) => setLastName(sanitizeNameInput(e.target.value))}
            />
          </FieldWrap>
          <button type="button" onClick={goNextStep} className="corp-btn mt-2 w-full">
            Devam et
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <FieldWrap error={fieldError('tcKimlikNo')}>
            <input
              className={inputClass(!!fieldError('tcKimlikNo'))}
              placeholder="T.C. Kimlik No"
              inputMode="numeric"
              maxLength={11}
              value={tcKimlikNo}
              onChange={(e) =>
                setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))
              }
              autoFocus
            />
          </FieldWrap>
          <FieldWrap error={fieldError('birthDate')}>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Doğum tarihi
            </label>
            <BirthDateField
              value={birthDate}
              onChange={setBirthDate}
              hasError={!!fieldError('birthDate')}
            />
          </FieldWrap>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={goPrevStep} className="corp-btn-outline w-full">
              Geri
            </button>
            <button type="button" onClick={goNextStep} className="corp-btn w-full">
              Devam et
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <input
            className="corp-input"
            placeholder="Referans kodu (isteğe bağlı)"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
          <FieldWrap error={fieldError('email')}>
            <input
              className={inputClass(!!fieldError('email'))}
              type="email"
              placeholder="E-posta adresi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </FieldWrap>
          <FieldWrap error={fieldError('phone')}>
            <PhoneField
              dial={phoneDial}
              onDialChange={(d) => {
                setPhoneDial(d);
                setPhone((p) => formatNationalInput(d, p));
              }}
              value={phone}
              onChange={setPhone}
              hasError={!!fieldError('phone')}
            />
          </FieldWrap>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={goPrevStep} className="corp-btn-outline w-full">
              Geri
            </button>
            <button type="button" onClick={goNextStep} className="corp-btn w-full">
              Devam et
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <FieldWrap error={fieldError('password')}>
            <input
              className={inputClass(!!fieldError('password'))}
              type="password"
              placeholder="Şifre (en az 6 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </FieldWrap>
          <FieldWrap error={fieldError('passwordConfirm')}>
            <input
              className={inputClass(!!fieldError('passwordConfirm'))}
              type="password"
              placeholder="Şifre tekrar"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </FieldWrap>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={goPrevStep} className="corp-btn-outline w-full">
              Geri
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={goNextStep}
              className="corp-btn w-full"
            >
              {submitting ? 'Kayıt oluşturuluyor…' : 'Devam et'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && registered && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            E-posta adresinizi doğrulayın. İsterseniz bu adımı atlayıp devam edebilirsiniz.
          </p>
          <button
            type="button"
            className="corp-btn-outline w-full"
            onClick={async () => {
              clearErrors();
              try {
                await sendEmailVerificationCode();
                setMessage('Doğrulama kodu gönderildi.');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Kod gönderilemedi');
              }
            }}
          >
            Kod gönder
          </button>
          <FieldWrap error={fieldError('emailCode')}>
            <input
              className={inputClass(!!fieldError('emailCode'))}
              placeholder="6 haneli doğrulama kodu"
              inputMode="numeric"
              maxLength={6}
              value={emailCode}
              onChange={(e) =>
                setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
          </FieldWrap>
          <button
            type="button"
            disabled={submitting}
            className="corp-btn w-full"
            onClick={() => void confirmEmailStep()}
          >
            {submitting ? 'Doğrulanıyor…' : 'Kodu onayla'}
          </button>
          <button
            type="button"
            className="corp-btn-ghost w-full"
            onClick={() => {
              clearErrors();
              setStep(5);
            }}
          >
            Şimdilik atla
          </button>
        </div>
      )}

      {step === 5 && (registered || user) && (
        <RegisterEvrakStep
          submitting={submitting}
          doneLabel={canOffer2fa ? 'Sonraki adım' : 'Kaydı tamamla'}
          onDone={goAfterDocuments}
        />
      )}

      {show2fa && canOffer2fa && (
        <TwoFactorOptionalStep
          onComplete={async () => {
            await refreshUser();
            setMessage('İki faktörlü doğrulama etkinleştirildi.');
            finish();
          }}
          onSkip={finish}
        />
      )}
    </AuthShell>
  );
}
