'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { SymbolIcon } from '@/components/SymbolIcon';
import { SymbolSearch } from '@/components/SymbolSearch';
import { browseSymbolsPage, searchSymbolsPage } from '@/lib/api';
import { formatSymbolType } from '@/lib/symbol-labels';
import {
  isWatchlistCategory,
  WATCHLIST_CATEGORY_LABELS,
} from '@/lib/symbol-assets';
import type { SearchPageResult } from '@/lib/types';
import { Skeleton } from './ui/Skeleton';

function SearchResultRow({
  name,
  description,
  type,
  exchange,
}: {
  name: string;
  description: string;
  type: string;
  exchange: string;
}) {
  return (
    <Link
      href={`/symbol/${name}`}
      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-border-strong hover:bg-hover"
    >
      <SymbolIcon symbol={name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{name}</p>
        <p className="truncate text-sm text-subtle">{description}</p>
      </div>
      <span className="hidden shrink-0 text-xs text-subtle sm:block">
        {exchange}
      </span>
      <span className="shrink-0 rounded-full bg-elevated px-2.5 py-0.5 text-xs text-muted">
        {formatSymbolType(type)}
      </span>
    </Link>
  );
}

function ResultSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const nums: number[] = [];
  for (let i = start; i <= end; i += 1) nums.push(i);

  return (
    <nav
      className="flex items-center justify-end gap-1"
      aria-label="Sayfalama"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        ‹
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPage(n)}
          className={`min-w-8 cursor-pointer rounded-lg px-2.5 py-1.5 text-sm transition ${
            n === page
              ? 'bg-accent font-semibold text-accent-fg'
              : 'text-muted hover:bg-elevated hover:text-foreground'
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        ›
      </button>
    </nav>
  );
}

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toUpperCase();
  const categoryParam = searchParams.get('category') ?? '';
  const category = isWatchlistCategory(categoryParam) ? categoryParam : null;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const categoryLabel = category ? WATCHLIST_CATEGORY_LABELS[category] : null;

  const [result, setResult] = useState<SearchPageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams();
      if (category) {
        params.set('category', category);
      } else {
        params.set('q', q);
      }
      if (nextPage > 1) params.set('page', String(nextPage));
      router.push(`/search?${params}`);
    },
    [q, category, router],
  );

  useEffect(() => {
    if (!category && !q) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = category
      ? browseSymbolsPage(category, page)
      : searchSymbolsPage(q, page);

    void request
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError('Liste yüklenemedi. Tekrar deneyin.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, page, category]);

  const showEmptyPrompt = !category && !q;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader showSearch searchQuery={q} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 lg:hidden">
          <SymbolSearch initialQuery={q} />
        </div>

        {showEmptyPrompt ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
            <p className="text-muted">Aramak için bir sembol veya şirket adı yazın.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-foreground">
                {category
                  ? categoryLabel
                  : `\u201c${q}\u201d için arama sonuçları`}
              </h1>
              {!category && !loading && result && (
                <p className="mt-1 text-sm text-subtle">
                  {result.total} sonuç
                  {result.pages > 1
                    ? ` · Sayfa ${result.page}/${result.pages}`
                    : ''}
                </p>
              )}
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-400">{error}</p>
            )}

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ResultSkeleton key={i} />
                ))}
              </div>
            ) : result && result.total === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
                <p className="text-muted">
                  {category
                    ? 'Bu kategoride sembol bulunamadı.'
                    : `\u201c${q}\u201d için sonuç bulunamadı.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {result?.items.map((item) => (
                  <SearchResultRow
                    key={item.name}
                    name={item.name}
                    description={item.description}
                    type={item.type}
                    exchange={item.exchange}
                  />
                ))}
              </div>
            )}

            {!loading && result && result.pages > 1 && (
              <div className="mt-8">
                <Pagination
                  page={result.page}
                  pages={result.pages}
                  onPage={goToPage}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
