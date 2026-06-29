import { isValidPhone } from './phone';
import { isValidTcKimlikNo } from './tc-kimlik';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  tcKimlikNo: string;
  birthDate: string;
  referenceNumber?: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterFormFields extends RegisterPayload {
  passwordConfirm: string;
  emailCode?: string;
}

export type RegisterFieldKey =
  | 'firstName'
  | 'lastName'
  | 'tcKimlikNo'
  | 'birthDate'
  | 'email'
  | 'phone'
  | 'password'
  | 'passwordConfirm'
  | 'emailCode';

export type RegisterFieldErrors = Partial<Record<RegisterFieldKey, string>>;

export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function buildFullName(firstName: string, lastName: string): string {
  return normalizeFullName(`${firstName} ${lastName}`);
}

export function isValidNamePart(value: string): boolean {
  return value.trim().length >= 2;
}

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) return false;
  const minAge = new Date(today);
  minAge.setFullYear(minAge.getFullYear() - 18);
  return date <= minAge;
}

export function getRegisterFormStepFieldErrors(
  step: number,
  payload: RegisterFormFields,
): RegisterFieldErrors {
  switch (step) {
    case 0: {
      const errors: RegisterFieldErrors = {};
      if (!isValidNamePart(payload.firstName)) {
        errors.firstName = 'Ad girin (en az 2 karakter)';
      }
      if (!isValidNamePart(payload.lastName)) {
        errors.lastName = 'Soyad girin (en az 2 karakter)';
      }
      return errors;
    }
    case 1: {
      const errors: RegisterFieldErrors = {};
      if (!isValidTcKimlikNo(payload.tcKimlikNo)) {
        errors.tcKimlikNo = 'Geçerli bir T.C. kimlik numarası girin';
      }
      if (!isValidBirthDate(payload.birthDate)) {
        errors.birthDate = 'Geçerli bir doğum tarihi girin (18 yaş ve üzeri)';
      }
      return errors;
    }
    case 2: {
      const errors: RegisterFieldErrors = {};
      const email = payload.email.trim();
      if (!email) {
        errors.email = 'E-posta girin';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Geçerli bir e-posta adresi girin';
      }
      if (!isValidPhone(payload.phone)) {
        errors.phone = 'Geçerli bir cep telefonu numarası girin';
      }
      return errors;
    }
    case 3: {
      const errors: RegisterFieldErrors = {};
      if (payload.password.length < 6) {
        errors.password = 'Şifre en az 6 karakter olmalı';
      }
      if (payload.password !== payload.passwordConfirm) {
        errors.passwordConfirm = 'Şifreler eşleşmiyor';
      }
      return errors;
    }
    case 4: {
      const errors: RegisterFieldErrors = {};
      const code = payload.emailCode?.trim() ?? '';
      if (!/^\d{6}$/.test(code)) {
        errors.emailCode = '6 haneli doğrulama kodunu girin';
      }
      return errors;
    }
    default:
      return {};
  }
}

export function validateRegisterFormStep(
  step: number,
  payload: RegisterFormFields,
): string | null {
  const errors = getRegisterFormStepFieldErrors(step, payload);
  const first = Object.values(errors)[0];
  return first ?? null;
}

export function validateRegisterForm(payload: RegisterFormFields): string | null {
  for (let step = 0; step < 4; step += 1) {
    const err = validateRegisterFormStep(step, payload);
    if (err) return err;
  }
  return null;
}
