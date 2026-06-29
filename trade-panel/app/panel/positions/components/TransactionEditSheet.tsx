'use client';

import { useEffect, useState } from 'react';
import { useMarketTicks } from '@/hooks/useMarketTicks';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from '../../components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type {
  PanelPositionDetail,
  PanelPendingDetail,
  PanelTradeDetail,
  PanelTransactionDetail,
  TransactionKind,
} from '@/lib/panel/types';
import {
  closePositionAtMarket,
  deletePendingOrder,
  deletePosition,
  fetchPendingDetail,
  fetchPositionDetail,
  fetchTradeDetail,
  updatePendingOrder,
  updatePosition,
  updateTrade,
} from '@/lib/panel/transactions';
import { formatDisplayId } from '@/lib/format-display-id';
import {
  formatTradingFee,
  formatTradingMoney,
  formatTradingPrice,
} from '@/lib/format-trading';
import { netPnlFromRow, unrealizedPnl } from '@/lib/trading-pnl';

interface Props {
  id: string;
  kind: TransactionKind;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sideLabel(side: string) {
  if (side === 'long' || side === 'buy') return 'Alış';
  if (side === 'short' || side === 'sell') return 'Satış';
  return side;
}

function positionSideFromLabel(label: string): 'long' | 'short' {
  return label === 'Satış' ? 'short' : 'long';
}

function orderSideFromLabel(label: string): 'buy' | 'sell' {
  return label === 'Satış' ? 'sell' : 'buy';
}

const FIELD =
  'w-full rounded border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50';
const FIELD_EDIT =
  'w-full rounded border border-dashed border-red-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-red-400 focus:outline-none dark:border-red-800 dark:bg-zinc-900 dark:text-zinc-50';

export function TransactionEditSheet({
  id,
  kind,
  canWrite,
  onClose,
  onSaved,
}: Props) {
  const [detail, setDetail] = useState<PanelTransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const [balance, setBalance] = useState('');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState('Alış');
  const [quantity, setQuantity] = useState('');
  const [openPrice, setOpenPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [realizedPnl, setRealizedPnl] = useState('');
  const [note, setNote] = useState('');

  const sym = symbol.trim().toUpperCase();
  const { ticks } = useMarketTicks(
    kind === 'position' && sym ? [sym] : [],
  );
  const tick = sym ? ticks[sym] : undefined;

  const feeSwap =
    detail && (detail.kind === 'position' || detail.kind === 'pending' || detail.kind === 'trade')
      ? detail.swap
      : 0;
  const feeCommission =
    detail && (detail.kind === 'position' || detail.kind === 'pending' || detail.kind === 'trade')
      ? detail.commission
      : 0;
  const liveGrossPnl =
    detail?.kind === 'position' && tick?.bid && tick?.ask
      ? unrealizedPnl(
          detail.side,
          detail.quantity,
          detail.avgEntry,
          tick.bid,
          tick.ask,
        )
      : null;
  const liveNetPnl =
    liveGrossPnl != null
      ? netPnlFromRow(liveGrossPnl, feeSwap, feeCommission)
      : detail?.kind === 'trade'
        ? (detail.netPnl ??
          netPnlFromRow(detail.realizedPnl, detail.swap, detail.commission))
        : null;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetcher =
      kind === 'position'
        ? fetchPositionDetail
        : kind === 'pending'
          ? fetchPendingDetail
          : fetchTradeDetail;

    fetcher(id)
      .then((data) => {
        setDetail(data);
        setBalance(String(data.account.balance));
        setSymbol(data.symbol);

        if (data.kind === 'position') {
          setSide(sideLabel(data.side));
          setQuantity(String(data.quantity));
          setOpenPrice(String(data.avgEntry));
          setStopLoss(data.stopLoss != null ? String(data.stopLoss) : '');
          setTakeProfit(data.takeProfit != null ? String(data.takeProfit) : '');
          setDateTime(toLocalInput(data.openedAt));
        } else if (data.kind === 'pending') {
          setSide(sideLabel(data.side));
          setQuantity(String(data.quantity));
          setOpenPrice(String(data.limitPrice));
          setStopLoss(data.stopLoss != null ? String(data.stopLoss) : '');
          setTakeProfit(data.takeProfit != null ? String(data.takeProfit) : '');
          setDateTime(toLocalInput(data.createdAt));
        } else {
          setSide(sideLabel(data.side));
          setQuantity(String(data.quantity));
          setOpenPrice(String(data.price));
          setRealizedPnl(String(data.realizedPnl));
          setNote(data.note ?? '');
          setDateTime(toLocalInput(data.executedAt));
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [id, kind]);

  async function handleSave() {
    if (!detail || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const balanceNum = balance.trim() ? Number(balance) : undefined;
      const sl = stopLoss.trim() ? Number(stopLoss) : null;
      const tp = takeProfit.trim() ? Number(takeProfit) : null;

      if (detail.kind === 'position') {
        await updatePosition(id, {
          balance: balanceNum,
          symbol: symbol.trim().toUpperCase(),
          side: positionSideFromLabel(side),
          quantity: Number(quantity),
          avgEntry: Number(openPrice),
          stopLoss: sl,
          takeProfit: tp,
          openedAt: new Date(dateTime).toISOString(),
        });
      } else if (detail.kind === 'pending') {
        await updatePendingOrder(id, {
          balance: balanceNum,
          symbol: symbol.trim().toUpperCase(),
          side: orderSideFromLabel(side),
          quantity: Number(quantity),
          limitPrice: Number(openPrice),
          stopLoss: sl,
          takeProfit: tp,
          createdAt: new Date(dateTime).toISOString(),
        });
      } else {
        await updateTrade(id, {
          balance: balanceNum,
          symbol: symbol.trim().toUpperCase(),
          side: orderSideFromLabel(side),
          quantity: Number(quantity),
          price: Number(openPrice),
          realizedPnl: Number(realizedPnl),
          note: note.trim() || null,
          executedAt: new Date(dateTime).toISOString(),
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  function requestClosePosition() {
    if (!canWrite || kind !== 'position' || !sym) return;
    if (!tick?.bid || !tick?.ask) {
      setError('Canlı fiyat bekleniyor — pozisyon kapatılamıyor');
      return;
    }
    setCloseConfirmOpen(true);
  }

  async function confirmClosePosition() {
    if (!tick?.bid || !tick?.ask) return;
    setSaving(true);
    setError(null);
    try {
      const tp = takeProfit.trim() ? Number(takeProfit) : undefined;
      await closePositionAtMarket(id, {
        bid: tick.bid,
        ask: tick.ask,
        takeProfit: tp != null && Number.isFinite(tp) && tp > 0 ? tp : undefined,
      });
      setCloseConfirmOpen(false);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pozisyon kapatılamadı');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canWrite) return;
    const msg =
      kind === 'position'
        ? 'Bu açık pozisyonu silmek istediğinize emin misiniz?'
        : 'Bu bekleyen emri silmek istediğinize emin misiniz?';
    if (!window.confirm(msg)) return;
    setSaving(true);
    try {
      if (kind === 'position') await deletePosition(id);
      else if (kind === 'pending') await deletePendingOrder(id);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
    } finally {
      setSaving(false);
    }
  }

  const title =
    kind === 'position'
      ? 'Pozisyon Düzenle'
      : kind === 'pending'
        ? 'Bekleyen Emir Düzenle'
        : 'Kapanan İşlem Düzenle';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            {detail && (
              <span className="text-xs text-zinc-500">
                {formatDisplayId(detail.displayId, detail.id)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Yükleniyor…</p>
          ) : error && !detail ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : detail ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">ID</label>
                  <input
                    className={FIELD}
                    value={formatDisplayId(detail.displayId, detail.id)}
                    readOnly
                  />
                </div>
                {detail.openedBy && (
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-zinc-500">
                      Panelden açan
                    </label>
                    <input
                      className={FIELD}
                      value={`${detail.openedBy.fullName} (${detail.openedBy.email})`}
                      readOnly
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-zinc-500">
                    Müşteri
                  </label>
                  <input
                    className={FIELD}
                    value={`${detail.user.fullName} (${detail.user.email})`}
                    readOnly
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Bakiye
                  </label>
                  <input
                    className={canWrite ? FIELD_EDIT : FIELD}
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    readOnly={!canWrite}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Sembol
                  </label>
                  <input
                    className={canWrite ? FIELD_EDIT : FIELD}
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    readOnly={!canWrite}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Tip</label>
                  {canWrite ? (
                    <select
                      className={FIELD_EDIT}
                      value={side}
                      onChange={(e) => setSide(e.target.value)}
                    >
                      <option value="Alış">Alış</option>
                      <option value="Satış">Satış</option>
                    </select>
                  ) : (
                    <input className={FIELD} value={side} readOnly />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Lot</label>
                  <input
                    className={canWrite ? FIELD_EDIT : FIELD}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    readOnly={!canWrite}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    {kind === 'pending' ? 'Limit fiyat' : 'Açılış fiyatı'}
                  </label>
                  <input
                    className={canWrite ? FIELD_EDIT : FIELD}
                    value={openPrice}
                    onChange={(e) => setOpenPrice(e.target.value)}
                    readOnly={!canWrite}
                  />
                </div>
              </div>

              {kind !== 'trade' && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Zarar durdur
                    </label>
                    <input
                      className={canWrite ? FIELD_EDIT : FIELD}
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      placeholder="—"
                      readOnly={!canWrite}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Kar al
                    </label>
                    <input
                      className={canWrite ? FIELD_EDIT : FIELD}
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      placeholder="—"
                      readOnly={!canWrite}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Swap
                    </label>
                    <input className={FIELD} value={formatTradingFee(feeSwap)} readOnly />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Komisyon
                    </label>
                    <input
                      className={FIELD}
                      value={formatTradingFee(feeCommission)}
                      readOnly
                    />
                  </div>
                  {kind === 'position' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          K/Z (brüt, canlı)
                        </label>
                        <input
                          className={FIELD}
                          value={formatTradingMoney(liveGrossPnl, {
                            withCurrency: false,
                          })}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          Net PnL
                        </label>
                        <input
                          className={FIELD}
                          value={formatTradingMoney(liveNetPnl, {
                            withCurrency: false,
                          })}
                          readOnly
                        />
                        <p className="mt-1 text-[10px] text-zinc-500">
                          Brüt + swap − komisyon
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {kind === 'trade' && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Kar / Zarar (brüt)
                    </label>
                    <input
                      className={canWrite ? FIELD_EDIT : FIELD}
                      value={realizedPnl}
                      onChange={(e) => setRealizedPnl(e.target.value)}
                      readOnly={!canWrite}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Net PnL
                    </label>
                    <input
                      className={FIELD}
                      value={formatTradingMoney(liveNetPnl, {
                        withCurrency: false,
                      })}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Swap
                    </label>
                    <input className={FIELD} value={formatTradingFee(feeSwap)} readOnly />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Komisyon
                    </label>
                    <input
                      className={FIELD}
                      value={formatTradingFee(feeCommission)}
                      readOnly
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-zinc-500">
                      Not
                    </label>
                    <input
                      className={canWrite ? FIELD_EDIT : FIELD}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      readOnly={!canWrite}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    {kind === 'pending' ? 'Emir tarihi' : 'Açılış tarihi'}
                  </label>
                  {canWrite ? (
                    <input
                      type="datetime-local"
                      className={FIELD_EDIT}
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                  ) : (
                    <input
                      className={FIELD}
                      value={formatDateTime(
                        detail.kind === 'position'
                          ? (detail as PanelPositionDetail).openedAt
                          : detail.kind === 'pending'
                            ? (detail as PanelPendingDetail).createdAt
                            : (detail as PanelTradeDetail).executedAt,
                      )}
                      readOnly
                    />
                  )}
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <div>
            {canWrite && kind !== 'trade' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="cursor-pointer text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sil
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={BTN_SECONDARY}
              disabled={saving}
            >
              İptal
            </button>
            {canWrite && (
              <button
                type="button"
                onClick={handleSave}
                className={BTN_PRIMARY}
                disabled={saving || loading}
              >
                {saving ? 'Kaydediliyor…' : 'Düzenle'}
              </button>
            )}
            {canWrite && kind === 'position' && (
              <button
                type="button"
                onClick={requestClosePosition}
                disabled={saving}
                className="cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Kapatılıyor…' : 'Pozisyonu kapat'}
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={closeConfirmOpen}
        title="Pozisyonu kapat"
        message={
          takeProfit.trim()
            ? `${sym} pozisyonu gerçek piyasa fiyatından kapatılacak; kâr/zarar ise girdiğiniz TP fiyatına (${takeProfit}) göre hesaplanacak. Bu işlem panele log olarak düşer. Devam edilsin mi?`
            : `${sym} pozisyonunu piyasa fiyatından kapatmak istiyor musunuz?`
        }
        confirmLabel="Pozisyonu kapat"
        loading={saving}
        onConfirm={() => void confirmClosePosition()}
        onCancel={() => {
          if (saving) return;
          setCloseConfirmOpen(false);
        }}
      />
    </>
  );
}
