import Link from 'next/link';

interface Props {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = 'Geri',
  action,
}: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← {backLabel}
          </Link>
        )}
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
