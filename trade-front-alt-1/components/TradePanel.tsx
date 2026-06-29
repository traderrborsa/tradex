'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTradingConfig } from '@/contexts/TradingConfigContext';
import { isAdmin } from '@/lib/auth';
import { useTrading } from '@/contexts/TradingContext';
import { formatTradeSide } from '@/lib/symbol-labels';
import { getMarketStatus } from '@/lib/market-hours';
import { getPendingOrders, getPosition, unrealizedPnl } from '@/lib/trading/engine';
import { usePositionStopsControls } from '@/hooks/usePositionStopsControls';
import {
  clampLot,
  estimateCommission,
  formatSwap,
  getSwapRates,
  requiredMargin,
} from '@/lib/trading/margin';
import { formatMoney } from '@/lib/format-money';
import { formatEditableMarketPrice, formatMarketPrice } from '@/lib/price';
import type { Tick } from '@/lib/types';

type Tab = 'market' | 'limit';

interface Props {
  symbol: string;
  tick: Tick | null;
}

const INPUT_CLASS =
  'rounded-xl border-0 bg-surface px-3 py-2.5 text-center font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30';

function isDecimalInput(value: string) {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

function parseDecimalInput(value: string) {
  if (value === '' || value === '.') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function TradePanel({ symbol, tick }: Props) {
  const sym = symbol.toUpperCase();
  const {
    portfolio,
    buy,
    sell,
    placeLimit,
    cancelOrder,
    updatePositionStops,
    onTick,
  } = useTrading();
  const { user } = useAuth();
  const { settings, hasMemberOverrides } = useTradingConfig();
  const minLot = settings.minLot;
  const leverage = settings.leverage;

  const [tab, setTab] = useState<Tab>('market');
  const [volume, setVolume] = useState(minLot);
  const [volumeInput, setVolumeInput] = useState(minLot.toFixed(2));
  const [limitPrice, setLimitPrice] = useState(0);
  const [limitPriceInput, setLimitPriceInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [marketStatus, setMarketStatus] = useState(() => getMarketStatus(sym));

  const pending = getPendingOrders(portfolio, sym);
  const openPos = getPosition(portfolio, sym);
  const bid = tick?.bid ?? 0;
  const ask = tick?.ask ?? 0;
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : bid || ask;

  useEffect(() => {
    const refresh = () => setMarketStatus(getMarketStatus(sym));
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [sym]);

  useEffect(() => {
    if (mid > 0) {
      setLimitPrice(mid);
      setLimitPriceInput(formatEditableMarketPrice(mid, sym));
    }
  }, [sym, mid]);

  useEffect(() => {
    setVolume(minLot);
    setVolumeInput(minLot.toFixed(2));
  }, [minLot]);

  const setVolumeSafe = (next: number) => {
    const clamped = clampLot(next, settings);
    setVolume(clamped);
    setVolumeInput(clamped.toFixed(2));
  };

  const fillMarketPrice = (
    setPrice: (value: number) => void,
    setInput: (value: string) => void,
  ) => {
    if (mid <= 0) return;
    setPrice(mid);
    setInput(formatEditableMarketPrice(mid, sym));
  };

  const lotStep = settings.lotStep;

  const swapRates = getSwapRates(sym, settings);
  const swapLong = swapRates.long;
  const swapShort = swapRates.short;
  const openPosMargin =
    openPos != null
      ? requiredMargin(openPos.quantity, openPos.avgEntry, settings)
      : 0;
  const openPosPnl =
    openPos != null && bid > 0 && ask > 0
      ? unrealizedPnl(openPos, bid, ask)
      : null;
  const totalLockedMargin = portfolio.positions.reduce(
    (sum, p) => sum + requiredMargin(p.quantity, p.avgEntry, settings),
    0,
  );
  const totalEquity =
    portfolio.balance + totalLockedMargin + (openPosPnl ?? 0);

  useEffect(() => {
    if (bid > 0 || ask > 0) onTick(sym, bid, ask);
  }, [sym, bid, ask, onTick]);

  const tradingDisabled =
    (!marketStatus.open && !isAdmin(user)) ||
    user?.verification?.canTrade === false;
  const activePrice = tab === 'market' ? (ask || mid) : limitPrice;
  const margin = activePrice > 0 ? requiredMargin(volume, activePrice, settings) : 0;
  const commission =
    activePrice > 0 ? estimateCommission(volume, activePrice, settings) : 0;

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2500);
  };

  const stops = usePositionStopsControls({
    symbol: sym,
    openPos,
    updatePositionStops,
    onMessage: flash,
  });

  const runMarket = async (side: 'buy' | 'sell') => {
    if (tradingDisabled) {
      flash(marketStatus.reason ?? 'Piyasa kapalı');
      return;
    }
    if (!tick || bid <= 0 || ask <= 0) {
      flash('Fiyat bekleniyor…');
      return;
    }
    // Açık pozisyon varken (positionMode) SL/TP kutuları o pozisyonu
    // düzenlemek içindir; yeni (ör. hedge) emre kopyalanırsa ters yön için
    // anında tetikleyip emri açılır açılmaz kapatabilir.
    const orderStops = stops.positionMode ? {} : stops.stopOpts();
    const err =
      side === 'buy'
        ? await buy(sym, volume, bid, ask, orderStops)
        : await sell(sym, volume, bid, ask, orderStops);
    flash(err ?? 'İşlem gerçekleşti');
  };

  const runLimit = async (side: 'buy' | 'sell') => {
    if (tradingDisabled) {
      flash(marketStatus.reason ?? 'Piyasa kapalı');
      return;
    }
    if (limitPrice <= 0) {
      flash('Geçerli bir fiyat girin');
      return;
    }
    const orderStops = stops.positionMode ? {} : stops.stopOpts();
    const err = await placeLimit(sym, side, volume, limitPrice, orderStops);
    flash(err ?? 'Bekleyen emir oluşturuldu');
  };

  const sellLabel = tab === 'market' ? 'Sat' : 'Sat limit';
  const buyLabel = tab === 'market' ? 'Al' : 'Al limit';
  const sellDisplay = tab === 'market' ? bid : limitPrice;
  const buyDisplay = tab === 'market' ? ask : limitPrice;

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">İşlem yap</h2>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-foreground">
            1:{leverage}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              marketStatus.open
                ? 'bg-positive/10 text-positive'
                : 'bg-surface text-muted'
            }`}
          >
            {marketStatus.label}
          </span>
        </div>
      </div>

      {hasMemberOverrides && (
        <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-xs font-medium text-accent">
          Size özel işlem ayarları aktif
        </p>
      )}

      {/* Piyasa / Emir sekmeleri */}
      <div className="mb-4 flex gap-1 rounded-full bg-surface p-1">
        {(['market', 'limit'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 cursor-pointer rounded-full py-2 text-sm font-semibold transition ${
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {t === 'market' ? 'Piyasa' : 'Emir'}
          </button>
        ))}
      </div>

      {tradingDisabled && user?.verification?.canTrade === false && (
        <div className="mb-4 rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          İşlem için hesap doğrulaması gerekli.{' '}
          <Link href="/profile" className="font-semibold underline">
            Profilim
          </Link>
        </div>
      )}

      {tradingDisabled && marketStatus.open === false && isAdmin(user) === false && user?.verification?.canTrade !== false && (
        <p className="mb-4 rounded-xl bg-surface px-3 py-2.5 text-xs text-muted">
          {marketStatus.reason ?? 'Piyasa şu an kapalı — işlem yapılamaz.'}
        </p>
      )}

      {!user && (
        <div className="mb-4 rounded-xl bg-surface px-3 py-3 text-sm text-muted">
          İşlem yapmak için{' '}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            giriş yap
          </Link>{' '}
          veya{' '}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            kayıt ol
          </Link>
        </div>
      )}

      {/* Lot seçici */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold text-muted">Lot miktarı</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVolumeSafe(volume - lotStep)}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-xl font-medium text-foreground transition hover:bg-hover"
          >
            −
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={volumeInput}
            onChange={(e) => {
              const next = e.target.value.replace(',', '.');
              if (!isDecimalInput(next)) return;
              setVolumeInput(next);
              if (next && next !== '.') {
                setVolume(clampLot(parseDecimalInput(next), settings));
              }
            }}
            onBlur={() => {
              if (
                !volumeInput ||
                volumeInput === '.' ||
                parseDecimalInput(volumeInput) < minLot
              ) {
                setVolumeSafe(minLot);
              } else {
                setVolumeSafe(parseDecimalInput(volumeInput));
              }
            }}
            className={`min-w-0 flex-1 ${INPUT_CLASS}`}
          />
          <button
            type="button"
            onClick={() => setVolumeSafe(volume + lotStep)}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-xl font-medium text-foreground transition hover:bg-hover"
          >
            +
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Teminat:{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(margin)}
          </span>
        </p>
      </div>

      {tab === 'limit' && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-muted">Limit fiyat</p>
          <input
            type="text"
            inputMode="decimal"
            value={limitPriceInput}
            onChange={(e) => {
              const next = e.target.value.replace(',', '.');
              if (!isDecimalInput(next)) return;
              setLimitPriceInput(next);
              setLimitPrice(parseDecimalInput(next));
            }}
            className={`w-full ${INPUT_CLASS} text-left`}
          />
        </div>
      )}

      {/* Al / Sat butonları */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!tick || tradingDisabled}
          onClick={() =>
            tab === 'market' ? runMarket('sell') : runLimit('sell')
          }
          className="cursor-pointer rounded-2xl bg-negative py-3.5 font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {sellLabel}
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            {sellDisplay ? formatMarketPrice(sellDisplay, sym) : '—'}
          </span>
        </button>
        <button
          type="button"
          disabled={!tick || tradingDisabled}
          onClick={() => (tab === 'market' ? runMarket('buy') : runLimit('buy'))}
          className="cursor-pointer rounded-2xl bg-positive py-3.5 font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {buyLabel}
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            {buyDisplay ? formatMarketPrice(buyDisplay, sym) : '—'}
          </span>
        </button>
      </div>

      <details className="mb-4 rounded-xl bg-surface" open={stops.positionMode}>
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-muted">
          Stop loss / Take profit
          {stops.positionMode ? ' (açık pozisyon)' : ''}
        </summary>
        <div className="space-y-3 border-t border-border px-3 py-3">
          {stops.positionMode && (
            <p className="text-[10px] font-medium text-muted">
              SL/TP değişikliklerini kaydetmek için Değiştir&apos;e basın.
            </p>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={stops.useSl}
              onChange={(e) => stops.setSlChecked(e.target.checked)}
              className="rounded accent-accent"
            />
            Zarar durdur (SL)
          </label>
          {stops.useSl && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={stops.slPriceInput}
                onChange={(e) => stops.onSlInputChange(e.target.value)}
                onFocus={stops.onSlFocus}
                onBlur={stops.onSlBlur}
                placeholder="SL fiyatı"
                className={`min-w-0 flex-1 py-2 text-sm ${INPUT_CLASS} text-left`}
              />
              <button
                type="button"
                disabled={mid <= 0}
                title="Anlık fiyatı kullan"
                onClick={() => stops.fillSlFromPrice(mid)}
                className="shrink-0 cursor-pointer rounded-lg border border-input-border px-2 py-2 font-mono text-xs text-foreground hover:bg-elevated disabled:opacity-40"
              >
                {mid > 0 ? formatMarketPrice(mid, sym) : '—'}
              </button>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={stops.useTp}
              onChange={(e) => stops.setTpChecked(e.target.checked)}
              className="rounded accent-accent"
            />
            Kar al (TP)
          </label>
          {stops.useTp && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={stops.tpPriceInput}
                onChange={(e) => stops.onTpInputChange(e.target.value)}
                onFocus={stops.onTpFocus}
                onBlur={stops.onTpBlur}
                placeholder="TP fiyatı"
                className={`min-w-0 flex-1 py-2 text-sm ${INPUT_CLASS} text-left`}
              />
              <button
                type="button"
                disabled={mid <= 0}
                title="Anlık fiyatı kullan"
                onClick={() => stops.fillTpFromPrice(mid)}
                className="shrink-0 cursor-pointer rounded-lg border border-input-border px-2 py-2 font-mono text-xs text-foreground hover:bg-elevated disabled:opacity-40"
              >
                {mid > 0 ? formatMarketPrice(mid, sym) : '—'}
              </button>
            </div>
          )}
          {stops.positionMode && (
            <button
              type="button"
              disabled={!stops.hasChanges || stops.saving}
              onClick={() => void stops.applyChanges()}
              className="w-full cursor-pointer rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {stops.saving ? 'Kaydediliyor…' : 'Değiştir'}
            </button>
          )}
        </div>
      </details>

      {/* Özet bilgiler */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-surface p-3 text-xs">
        <div>
          <p className="text-muted">Bakiye</p>
          <p className="font-bold tabular-nums text-foreground">
            {formatMoney(portfolio.balance)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">Serbest nakit</p>
        </div>
        <div>
          <p className="text-muted">Toplam varlık</p>
          <p className="font-bold tabular-nums text-foreground">
            {formatMoney(totalEquity)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">Bakiye + teminat + açık K/Z</p>
        </div>
        {openPos != null && (
          <>
            <div>
              <p className="text-muted">Teminat (pozisyon)</p>
              <p className="font-bold tabular-nums text-foreground">
                {formatMoney(openPosMargin)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {openPos.quantity.toLocaleString('tr-TR')} lot ·{' '}
                {openPos.side === 'long' ? 'Long' : 'Short'}
              </p>
            </div>
            <div>
              <p className="text-muted">Açık K/Z</p>
              <p
                className={`font-bold tabular-nums ${
                  openPosPnl == null
                    ? 'text-muted'
                    : openPosPnl >= 0
                      ? 'text-positive'
                      : 'text-negative'
                }`}
              >
                {openPosPnl != null ? formatMoney(openPosPnl) : '—'}
              </p>
            </div>
          </>
        )}
        <div>
          <p className="text-muted">Teminat (bu emir)</p>
          <p className="font-bold tabular-nums text-foreground">
            {formatMoney(margin)}
          </p>
        </div>
        <div>
          <p className="text-muted">Komisyon</p>
          <p className="font-bold tabular-nums text-foreground">
            {formatMoney(commission)}
          </p>
        </div>
        <div>
          <p className="text-muted">Min. lot</p>
          <p className="font-bold tabular-nums text-foreground">{minLot.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted">Swap L/S</p>
          <p className="truncate font-bold tabular-nums text-foreground">
            {formatSwap(swapLong)} / {formatSwap(swapShort)}
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-500/10 p-3">
          <p className="mb-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            Bekleyen emirler
          </p>
          <ul className="space-y-2">
            {pending.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-medium text-secondary">
                  {formatTradeSide(order.side)} {order.quantity.toLocaleString()}{' '}
                  @ {formatMarketPrice(order.limitPrice, sym)}
                </span>
                <button
                  type="button"
                  onClick={() => void cancelOrder(order.id)}
                  className="cursor-pointer font-semibold text-negative hover:underline"
                >
                  İptal
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p className="mt-3 rounded-xl bg-accent-soft py-2 text-center text-xs font-semibold text-accent">
          {message}
        </p>
      )}
    </div>
  );
}
