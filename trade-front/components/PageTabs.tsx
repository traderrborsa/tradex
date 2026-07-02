'use client';

interface TabDef<T extends string> {
  id: T;
  label: string;
}

export function PageTabs<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: readonly TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-1 ${className}`}
      role="tablist"
      style={{ scrollbarWidth: 'none' }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-accent text-accent-fg'
                : 'border border-border-strong text-secondary hover:bg-elevated hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
