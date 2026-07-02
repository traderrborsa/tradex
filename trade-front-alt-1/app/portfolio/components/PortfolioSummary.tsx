import Link from 'next/link';
import { formatMoney } from '@/lib/format-money';
import type { resolvePortfolioBalances } from '@/lib/portfolio-balances';

type Balances = ReturnType<typeof resolvePortfolioBalances>;

interface Props {
  balances: Balances;
  totalEquity: number;
  unrealizedTotal: number;
  hasOpenPositions: boolean;
}

function pnlClass(value: number, empty = false) {
  if (empty) return 'text-muted';
  if (value > 0) return 'text-positive';
  if (value < 0) return 'text-negative';
  return 'text-muted';
}

function incomeClass(value: number) {
  return value > 0 ? 'text-positive' : 'text-muted';
}

function SummaryRow({
  label,
  value,
  valueClassName,
  emphasize,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span
        className={`text-sm ${emphasize ? 'font-semibold text-foreground' : 'text-muted'}`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${emphasize ? 'text-base font-bold' : 'text-sm font-semibold'} ${valueClassName ?? 'text-foreground'}`}
      >
        {value}
      </span>
    </div>
  );
}

export function PortfolioSummary({
  balances,
  totalEquity,
  unrealizedTotal,
  hasOpenPositions,
}: Props) {
  const openPnlLabel = hasOpenPositions
    ? formatMoney(unrealizedTotal)
    : '—';

  return (
    <section className="corp-card mb-6 overflow-hidden p-0">
      <div className="border-b border-border/60 bg-accent/5 px-5 py-6 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Toplam bakiye
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
          {formatMoney(balances.totalBalance)}
        </p>
        <p className="mt-1.5 text-xs text-muted">Nakit + bonus + kredi</p>
      </div>

      <div className="divide-y divide-border/60 px-5 sm:px-6">
        <SummaryRow
          label="Bonus geliri"
          value={formatMoney(balances.bonusIncome)}
          valueClassName={incomeClass(balances.bonusIncome)}
        />
        <SummaryRow
          label="Kredi geliri"
          value={formatMoney(balances.creditIncome)}
          valueClassName={incomeClass(balances.creditIncome)}
        />
        <SummaryRow
          label="Nakit bakiye"
          value={formatMoney(balances.cashBalance)}
          emphasize
        />
      </div>

      <div className="border-t border-border/60 bg-background/40 px-5 sm:px-6">
        <SummaryRow
          label="Toplam varlık"
          value={formatMoney(totalEquity)}
          emphasize
        />
        <div className="flex items-center justify-between gap-4 border-t border-border/40 py-3">
          <span className="text-sm font-semibold text-foreground">Açık K/Z</span>
          <span
            className={`text-base font-bold tabular-nums ${pnlClass(unrealizedTotal, !hasOpenPositions)}`}
          >
            {openPnlLabel}
          </span>
        </div>
      </div>

      <div className="border-t border-border/60 px-5 py-4 sm:px-6">
        <Link href="/finance" className="corp-btn block py-2.5 text-center text-sm">
          Finansal İşlemler
        </Link>
      </div>
    </section>
  );
}
