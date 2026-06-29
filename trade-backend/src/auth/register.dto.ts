export interface RegisterDto {
  fullName: string;
  birthDate: string;
  tcKimlikNo: string;
  referenceNumber?: string;
  email: string;
  phone: string;
  password: string;
  businessId: string;
  registeredViaApp?: string;
}

export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidFullName(value: string): boolean {
  const normalized = normalizeFullName(value);
  const parts = normalized.split(' ').filter(Boolean);
  return parts.length >= 2 && parts.every((part) => part.length >= 2);
}

export function parseBirthDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isValidBirthDate(value: string): boolean {
  const date = parseBirthDate(value);
  if (!date) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date >= today) return false;
  const minAge = new Date(today);
  minAge.setUTCFullYear(minAge.getUTCFullYear() - 18);
  return date <= minAge;
}
