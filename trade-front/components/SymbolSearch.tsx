'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { searchSymbolsQuick } from '@/lib/api';
import { formatSymbolType } from '@/lib/symbol-labels';
import type { SymbolInfo } from '@/lib/types';

const POPULAR = [
  'EURUSD',
  'BTCUSD',
  'XU100',
  'XU030',
  'THYAO',
  'GARAN',
  'AAPL',
  'NVDA',
  'XAUUSD',
];

interface Props {
  autoFocus?: boolean;
  compact?: boolean;
  initialQuery?: string;
}

function pickBestMatch(query: string, items: SymbolInfo[]): SymbolInfo | null {
  if (items.length === 0) return null;
  const q = query.toUpperCase();
  const exact = items.find((item) => item.name === q);
  if (exact) return exact;
  const prefix = items.filter((item) => item.name.startsWith(q));
  if (prefix.length === 1) return prefix[0];
  return null;
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SymbolSearch({
  autoFocus,
  compact = false,
  initialQuery = '',
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const closeDropdown = useCallback(() => {
    setOpen(false);
  }, []);

  const goToSymbol = useCallback(
    (name: string) => {
      closeDropdown();
      setQuery('');
      setHint(null);
      router.push(`/symbol/${name.toUpperCase()}`);
    },
    [router, closeDropdown],
  );

  const runSearch = useCallback(async () => {
    const q = query.trim().toUpperCase();
    if (!q) return;

    setHint(null);
    setSubmitting(true);
    try {
      const items = await searchSymbolsQuick(q);
      setResults(items);

      const best = pickBestMatch(q, items);
      if (best) {
        goToSymbol(best.name);
        return;
      }

      closeDropdown();
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } catch {
      setHint('Arama yapılamadı. Tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }, [query, goToSymbol, router, closeDropdown]);

  useEffect(() => {
    setQuery(initialQuery);
    closeDropdown();
  }, [initialQuery, closeDropdown]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      closeDropdown();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closeDropdown]);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      closeDropdown();
      setHint(null);
      return;
    }

    let cancelled = false;
    const t = setTimeout(() => {
      void searchSymbolsQuick(query)
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setOpen(data.length > 0);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          closeDropdown();
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, closeDropdown]);

  const shellClass = compact
    ? 'rounded-full border border-border-strong bg-card py-1 pl-4 pr-1'
    : 'rounded-full border border-border-strong bg-card py-1.5 pl-5 pr-1.5';

  const inputClass = compact
    ? 'min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none'
    : 'min-w-0 flex-1 bg-transparent py-2.5 text-base text-foreground placeholder:text-subtle focus:outline-none';

  const btnSize = compact ? 'h-8 w-8' : 'h-9 w-9';

  return (
    <div ref={rootRef} className="relative w-full">
      <div className={`flex items-center gap-2 ${shellClass}`}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void runSearch();
            }
            if (e.key === 'Escape') {
              closeDropdown();
            }
          }}
          placeholder="Piyasada ara…"
          className={inputClass}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />

        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={submitting}
          aria-label="Ara"
          className={`flex ${btnSize} shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg transition hover:opacity-90 disabled:cursor-wait disabled:opacity-80`}
        >
          <SearchIcon />
        </button>
      </div>

      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-border-strong bg-card shadow-2xl"
        >
          {results.map((s) => (
            <li key={s.name} role="option">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goToSymbol(s.name)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition hover:bg-elevated"
              >
                <span className="font-semibold text-foreground">{s.name}</span>
                <span className="truncate pl-4 text-sm text-subtle">
                  {s.description}
                </span>
                <span className="ml-2 shrink-0 rounded-full bg-elevated px-2.5 py-0.5 text-xs text-muted">
                  {formatSymbolType(s.type)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          {POPULAR.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => goToSymbol(sym)}
              className="cursor-pointer rounded-full border border-border-strong px-3.5 py-1.5 text-sm text-muted transition hover:border-border-strong hover:text-foreground"
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
