export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'aurex-theme';
export const THEME_COOKIE = 'aurex-theme';

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;SameSite=Lax`;
}

export function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

export function parseTheme(value: string | undefined | null): Theme {
  return value === 'light' || value === 'dark' ? value : 'light';
}

export function getChartColors(theme: Theme) {
  if (theme === 'light') {
    return {
      background: '#ffffff',
      text: '#9ca3af',
      grid: '#f0f2f5',
      border: '#e8eaed',
      line: '#3d8f6a',
    };
  }
  return {
    background: '#16181d',
    text: '#6b7280',
    grid: '#1c1f26',
    border: '#2a2e38',
      line: '#5aab84',
  };
}
