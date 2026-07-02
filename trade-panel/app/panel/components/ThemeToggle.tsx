'use client';

import { useTheme } from '@/contexts/ThemeContext';

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 0 0 11.5 11.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
      title={isDark ? 'Açık mod' : 'Koyu mod'}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
