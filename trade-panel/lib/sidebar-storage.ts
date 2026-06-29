const STORAGE_KEY = 'tradex-panel-sidebar-open';

export function getSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function setSidebarOpen(open: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(open));
}
