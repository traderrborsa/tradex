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
      className={`scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${className}`}
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`chip shrink-0 cursor-pointer whitespace-nowrap ${
            active === t.id ? 'chip-active' : 'chip-inactive'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
