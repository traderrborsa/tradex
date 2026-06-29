'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

const TRIGGER =
  'flex w-full items-center justify-between gap-2 rounded-lg border border-input-border bg-input px-3 py-2.5 text-left text-foreground focus:border-foreground focus:outline-none';

const SEARCH_INPUT =
  'w-full rounded-md border border-input-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';

export interface SearchableSelectOption {
  value: string;
  label: string;
  imageUrl?: string | null;
}

interface Props {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-subtle transition ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function OptionContent({
  label,
  imageUrl,
}: {
  label: string;
  imageUrl?: string | null;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-4 w-auto max-w-[36px] shrink-0 object-contain"
        />
      ) : (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-elevated text-[8px] font-semibold text-muted">
          {label.slice(0, 2).toLocaleUpperCase('tr-TR')}
        </span>
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seçin',
  searchPlaceholder = 'Ara…',
  emptyText = 'Sonuç bulunamadı',
  disabled = false,
  id,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return options;
    return options.filter((o) =>
      o.label.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function select(next: string) {
    onChange(next);
    close();
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      close();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`${TRIGGER} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className={`min-w-0 flex-1 ${selected ? '' : 'text-subtle'}`}>
          {selected ? (
            <OptionContent label={selected.label} imageUrl={selected.imageUrl} />
          ) : (
            <span className="block truncate">{placeholder}</span>
          )}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={SEARCH_INPUT}
              aria-label={searchPlaceholder}
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => select(opt.value)}
                    className={`w-full cursor-pointer px-3 py-2.5 text-left text-sm transition hover:bg-elevated ${
                      active ? 'bg-accent/10 font-medium text-foreground' : 'text-secondary'
                    }`}
                  >
                    <OptionContent label={opt.label} imageUrl={opt.imageUrl} />
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-muted">{emptyText}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
