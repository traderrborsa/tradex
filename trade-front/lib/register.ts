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
}

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

export function validateRegisterFormStep(
  step: number,
  payload: RegisterFormFields,
): string | null {
  switch (step) {
    case 0:
      if (!isValidNamePart(payload.firstName)) {
        return 'Ad girin (en az 2 karakter)';
      }
      if (!isValidNamePart(payload.lastName)) {
        return 'Soyad girin (en az 2 karakter)';
      }
      return null;
    case 1:
      if (!isValidTcKimlikNo(payload.tcKimlikNo)) {
        return 'Geçerli bir T.C. kimlik numarası girin';
      }
      if (!isValidBirthDate(payload.birthDate)) {
        return 'Geçerli bir doğum tarihi girin (18 yaş ve üzeri)';
      }
      return null;
    case 2:
      if (!payload.email.trim()) {
        return 'E-posta girin';
      }
      if (!isValidPhone(payload.phone)) {
        return 'Geçerli bir cep telefonu numarası girin';
      }
      return null;
    case 3:
      if (payload.password.length < 6) {
        return 'Şifre en az 6 karakter olmalı';
      }
      if (payload.password !== payload.passwordConfirm) {
        return 'Şifreler eşleşmiyor';
      }
      return null;
    default:
      return null;
  }
}

export function validateRegisterForm(payload: RegisterFormFields): string | null {
  for (let step = 0; step < 4; step += 1) {
    const err = validateRegisterFormStep(step, payload);
    if (err) return err;
  }
  return null;
}
