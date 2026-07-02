'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { INPUT } from '@/app/panel/components/ui';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** İkincil açıklama (örn. e-posta) — etiketin altında gösterilir. */
  description?: string;
  /** Online ise etikette yeşil bir nokta gösterilir. */
  online?: boolean;
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
  /**
   * Arama yapılmadan açıldığında en fazla kaç seçenek gösterilsin.
   * Belirtilmezse tüm seçenekler listelenir.
   */
  maxVisible?: number;
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
      className={`shrink-0 text-zinc-400 transition ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
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
  maxVisible,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLocaleLowerCase('tr-TR').includes(q) ||
        o.description?.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [options, query]);

  const hasQuery = query.trim().length > 0;
  const capped =
    !hasQuery && maxVisible != null && matches.length > maxVisible;
  const filtered = capped ? matches.slice(0, maxVisible) : matches;
  const hiddenCount = matches.length - filtered.length;

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
        className={`${INPUT} flex cursor-pointer items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span
          className={`flex min-w-0 items-center gap-2 ${selected ? '' : 'text-zinc-400'}`}
        >
          {selected?.online && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-2 dark:border-zinc-700">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={INPUT}
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
                    className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      active
                        ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {opt.online && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                        aria-hidden
                        title="Online"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="block truncate text-xs text-zinc-400">
                          {opt.description}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-zinc-500">{emptyText}</li>
            )}
          </ul>
          {capped && (
            <div className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700">
              +{hiddenCount} müşteri daha · aramak için yazın
            </div>
          )}
        </div>
      )}
    </div>
  );
}
