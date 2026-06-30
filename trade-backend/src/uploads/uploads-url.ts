export function toPublicUploadUrl(
  relativePath: string | null | undefined,
): string | null {
  if (!relativePath?.trim()) return null;

  const normalized = relativePath.replace(/^\/+/, '');
  const publicBase = (process.env.API_PUBLIC_URL ?? '').replace(/\/$/, '');

  if (publicBase) {
    return `${publicBase}/uploads/${normalized}`;
  }

  return `/uploads/${normalized}`;
}
