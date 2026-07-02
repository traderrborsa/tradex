export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'primefx-theme';
export const THEME_COOKIE = 'primefx-theme';

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
  return value === 'light' || value === 'dark' ? value : 'dark';
}

export function getChartColors(theme: Theme) {
  if (theme === 'light') {
    return {
      background: '#ffffff',
      text: '#9ca3af',
      grid: '#f0f0f2',
      border: '#e4e4e7',
      line: '#e52520',
    };
  }
  return {
    background: '#141418',
    text: '#6b7280',
    grid: '#1a1a1f',
    border: '#2a2a32',
    line: '#ff2d28',
  };
}
