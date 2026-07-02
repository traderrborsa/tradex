const ACTIVE_BUSINESS_KEY = 'panel.activeBusinessId';
const PENDING_BUSINESS_SLUG_KEY = 'panel.pendingBusinessSlug';

export function getStoredActiveBusinessId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_BUSINESS_KEY);
}

export function setStoredActiveBusinessId(businessId: string | null) {
  if (typeof window === 'undefined') return;
  if (businessId) {
    localStorage.setItem(ACTIVE_BUSINESS_KEY, businessId);
  } else {
    localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  }
}

export function setPendingBusinessSlug(slug: string | null) {
  if (typeof window === 'undefined') return;
  if (slug?.trim()) {
    sessionStorage.setItem(PENDING_BUSINESS_SLUG_KEY, slug.trim().toLowerCase());
  } else {
    sessionStorage.removeItem(PENDING_BUSINESS_SLUG_KEY);
  }
}

export function consumePendingBusinessSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = sessionStorage.getItem(PENDING_BUSINESS_SLUG_KEY);
  sessionStorage.removeItem(PENDING_BUSINESS_SLUG_KEY);
  return slug;
}

export interface PanelBusinessBrief {
  id: string;
  name: string;
  displayName: string;
  slug: string;
}

export function resolveInitialActiveBusinessId(
  businesses: PanelBusinessBrief[],
): string | null {
  if (!businesses.length) return null;

  const pendingSlug = consumePendingBusinessSlug();
  if (pendingSlug) {
    const bySlug = businesses.find(
      (b) =>
        b.slug.toLowerCase() === pendingSlug ||
        b.name.toLowerCase() === pendingSlug ||
        b.id === pendingSlug,
    );
    if (bySlug) return bySlug.id;
  }

  const stored = getStoredActiveBusinessId();
  if (stored && businesses.some((b) => b.id === stored)) {
    return stored;
  }

  if (businesses.length === 1) {
    return businesses[0]!.id;
  }

  return null;
}
