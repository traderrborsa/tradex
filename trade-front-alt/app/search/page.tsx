import { Suspense } from 'react';
import { SearchPageContent } from '@/components/SearchPageContent';
import { Skeleton } from '@/components/ui/Skeleton';

function SearchFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <Skeleton className="mx-auto h-10 w-full max-w-3xl rounded-full" />
      <div className="mx-auto mt-8 w-full max-w-3xl space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
