export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tradex-theme';
export const THEME_COOKIE = 'tradex-theme';

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;SameSite=Lax`;
}

export function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

export function parseTheme(value: string | undefined | null): Theme {
  return value === 'light' || value === 'dark' ? value : 'dark';
}
