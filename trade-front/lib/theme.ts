export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tradex-theme';
export const THEME_COOKIE = 'tradex-theme';

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
      background: '#eef1f6',
      text: '#64748b',
      grid: '#dde2ea',
      border: '#cdd3df',
      line: '#334155',
    };
  }
  return {
    background: '#0c0c0e',
    text: '#94a3b8',
    grid: '#1a1a1e',
    border: '#2a2a30',
    line: '#e5e5e5',
  };
}
