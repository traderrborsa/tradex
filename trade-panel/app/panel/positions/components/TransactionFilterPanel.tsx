'use client';

import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';

export type TransactionFilters = {
  id: string;
  customer: string;
  lot: string;
  side: string;
  symbol: string;
  openPrice: string;
  stopLoss: string;
  takeProfit: string;
  profit: string;
  dateFrom: string;
  dateTo: string;
  openedSource: '' | 'panel';
};

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  id: '',
  customer: '',
  lot: '',
  side: '',
  symbol: '',
  openPrice: '',
  stopLoss: '',
  takeProfit: '',
  profit: '',
  dateFrom: '',
  dateTo: '',
  openedSource: '',
};

interface Props {
  open: boolean;
  draft: TransactionFilters;
  showSlTp: boolean;
  onChange: (draft: TransactionFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

const LABEL = 'mb-1 block text-xs font-medium text-zinc-500';

export function TransactionFilterPanel({
  open,
  draft,
  showSlTp,
  onChange,
  onApply,
  onClear,
  onClose,
}: Props) {
  if (!open) return null;

  function set(key: keyof TransactionFilters, value: string) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Filtrele
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className={LABEL}>Açan</label>
            <select
              className={INPUT}
              value={draft.openedSource}
              onChange={(e) =>
                set('openedSource', e.target.value as '' | 'panel')
              }
            >
              <option value="">Tümü</option>
              <option value="panel">Panelden açılan</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>ID</label>
            <input
              className={INPUT}
              value={draft.id}
              onChange={(e) => set('id', e.target.value)}
              placeholder="İşlem ID"
            />
          </div>
          <div>
            <label className={LABEL}>Müşteri</label>
            <input
              className={INPUT}
              value={draft.customer}
              onChange={(e) => set('customer', e.target.value)}
              placeholder="Ad, e-posta"
            />
          </div>
          <div>
            <label className={LABEL}>Sembol</label>
            <input
              className={INPUT}
              value={draft.symbol}
              onChange={(e) => set('symbol', e.target.value)}
              placeholder="ASELS, XAUUSD…"
            />
          </div>
          <div>
            <label className={LABEL}>Tip</label>
            <select
              className={INPUT}
              value={draft.side}
              onChange={(e) => set('side', e.target.value)}
            >
              <option value="">Tümü</option>
              <option value="Alış">Alış</option>
              <option value="Satış">Satış</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Lot</label>
            <input
              className={INPUT}
              value={draft.lot}
              onChange={(e) => set('lot', e.target.value)}
              placeholder="580"
            />
          </div>
          <div>
            <label className={LABEL}>Açılış fiyatı</label>
            <input
              className={INPUT}
              value={draft.openPrice}
              onChange={(e) => set('openPrice', e.target.value)}
            />
          </div>
          {showSlTp && (
            <>
              <div>
                <label className={LABEL}>Zarar durdur</label>
                <input
                  className={INPUT}
                  value={draft.stopLoss}
                  onChange={(e) => set('stopLoss', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Kar al</label>
                <input
                  className={INPUT}
                  value={draft.takeProfit}
                  onChange={(e) => set('takeProfit', e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <label className={LABEL}>Kar / Zarar</label>
            <input
              className={INPUT}
              value={draft.profit}
              onChange={(e) => set('profit', e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Tarih (başlangıç)</label>
            <input
              type="date"
              className={INPUT}
              value={draft.dateFrom}
              onChange={(e) => set('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Tarih (bitiş)</label>
            <input
              type="date"
              className={INPUT}
              value={draft.dateTo}
              onChange={(e) => set('dateTo', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <button type="button" onClick={onClear} className={BTN_SECONDARY}>
            Temizle
          </button>
          <button
            type="button"
            onClick={onApply}
            className={`${BTN_PRIMARY} flex-1`}
          >
            Uygula
          </button>
        </div>
      </aside>
    </>
  );
}

function countActiveFilters(filters: TransactionFilters) {
  return Object.entries(filters).filter(([key, v]) => {
    if (key === 'openedSource') return v === 'panel';
    return String(v).trim();
  }).length;
}

export function activeFilterCount(filters: TransactionFilters) {
  return countActiveFilters(filters);
}
