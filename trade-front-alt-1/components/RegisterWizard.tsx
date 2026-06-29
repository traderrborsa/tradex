'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthLayout } from '@/components/LoginLayout';
import { RegisterStepIndicator } from '@/components/RegisterStepIndicator';
import { TwoFactorOptionalStep } from '@/components/TwoFactorOptionalStep';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneInput, normalizePhone, PHONE_MASK_HINT } from '@/lib/phone';
import { RegisterEvrakStep } from '@/components/RegisterEvrakStep';
import {
  confirmEmailCode,
  sendEmailVerificationCode,
} from '@/lib/profile';
import {
  getRegisterFormStepFieldErrors,
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
    phone,
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
      phone: normalizePhone(phone),
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
    <AuthLayout
      mode="register"
      wide
      title="Hesap oluştur"
      subtitle={
        show2fa
          ? 'İsteğe bağlı — iki faktörlü doğrulama'
          : `Adım ${step + 1} / ${STEPS.length} — ${activeStep.label}`
      }
      footer={
        <p className="text-center text-sm text-muted">
          Zaten kayıtlı mısınız?{' '}
          <Link
            href="/login"
            className="font-bold uppercase tracking-wide text-accent hover:underline"
          >
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
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
            />
          </FieldWrap>
          <FieldWrap error={fieldError('lastName')}>
            <input
              className={inputClass(!!fieldError('lastName'))}
              placeholder="Soyad"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
            <input
              className={inputClass(!!fieldError('birthDate'))}
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
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
            <input
              className={inputClass(!!fieldError('phone'))}
              type="tel"
              placeholder={PHONE_MASK_HINT}
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
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
    </AuthLayout>
  );
}
