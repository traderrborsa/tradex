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
import { PositionStopPnl } from '@/components/PositionStopPnl';
import {
  clampLot,
  estimateCommission,
  formatSwap,
  getSwapRates,
  positionLeverage,
  requiredMargin,
} from '@/lib/trading/margin';
import { activeLeverage } from '@/lib/trading-config';
import { formatMoney } from '@/lib/format-money';
import { formatEditableMarketPrice, formatMarketPrice } from '@/lib/price';
import type { Tick } from '@/lib/types';

type Tab = 'market' | 'limit';

interface Props {
  symbol: string;
  tick: Tick | null;
}

const INPUT_CLASS =
  'rounded-lg border border-input-border bg-input px-3 py-2 font-mono text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none';
const BIST_SHORT_SELL_MESSAGE =
  'BIST hisselerinde açığa satış kapalı. Yalnızca mevcut long pozisyonunuzu satabilirsiniz.';

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
  const leverageOptions = settings.leverageOptions;
  const fixedLeverage = settings.fixedLeverage;
  const defaultLeverage = leverageOptions[0] ?? 1;
  const [selectedLeverage, setSelectedLeverage] = useState(defaultLeverage);
  const activeLeverageValue = activeLeverage(settings, selectedLeverage);

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

  useEffect(() => {
    if (fixedLeverage != null) return;
    if (!leverageOptions.includes(selectedLeverage)) {
      setSelectedLeverage(defaultLeverage);
    }
  }, [leverageOptions, fixedLeverage, selectedLeverage, defaultLeverage]);

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
  /** Paneldeki değer 1 lot içindir; ekranda lot başına gösterilir. */
  const swapLong = swapRates.long;
  const swapShort = swapRates.short;
  const openPosMargin =
    openPos != null
      ? requiredMargin(
          openPos.quantity,
          openPos.avgEntry,
          positionLeverage(openPos),
        )
      : 0;
  const openPosPnl =
    openPos != null && bid > 0 && ask > 0
      ? unrealizedPnl(openPos, bid, ask)
      : null;
  const totalLockedMargin = portfolio.positions.reduce(
    (sum, p) =>
      sum + requiredMargin(p.quantity, p.avgEntry, positionLeverage(p)),
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
  const isBist = marketStatus.kind === 'bist';
  const bistSellDisabled =
    isBist &&
    (openPos?.side !== 'long' || volume > openPos.quantity);
  const activePrice = tab === 'market' ? (ask || mid) : limitPrice;
  const margin =
    activePrice > 0
      ? requiredMargin(volume, activePrice, activeLeverageValue)
      : 0;
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
    if (side === 'sell' && bistSellDisabled) {
      flash(BIST_SHORT_SELL_MESSAGE);
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
    const orderOpts = {
      ...orderStops,
      leverage: activeLeverageValue,
    };
    const err =
      side === 'buy'
        ? await buy(sym, volume, bid, ask, orderOpts)
        : await sell(sym, volume, bid, ask, orderOpts);
    flash(err ?? 'İşlem gerçekleşti');
  };

  const runLimit = async (side: 'buy' | 'sell') => {
    if (tradingDisabled) {
      flash(marketStatus.reason ?? 'Piyasa kapalı');
      return;
    }
    if (side === 'sell' && bistSellDisabled) {
      flash(BIST_SHORT_SELL_MESSAGE);
      return;
    }
    if (limitPrice <= 0) {
      flash('Geçerli bir fiyat girin');
      return;
    }
    const orderStops = stops.positionMode ? {} : stops.stopOpts();
    const err = await placeLimit(sym, side, volume, limitPrice, {
      ...orderStops,
      leverage: activeLeverageValue,
    });
    flash(err ?? 'Bekleyen emir oluşturuldu');
  };

  const sellLabel = tab === 'market' ? 'SAT' : 'SAT LİMİT';
  const buyLabel = tab === 'market' ? 'AL' : 'AL LİMİT';
  const sellDisplay = tab === 'market' ? bid : limitPrice;
  const buyDisplay = tab === 'market' ? ask : limitPrice;
  const slTpEntryPrice = openPos?.avgEntry ?? activePrice;
  const slTpQuantity = openPos?.quantity ?? volume;
  const slTpSide = openPos?.side ?? 'long';

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-secondary">İşlem</h2>
        <div className="flex flex-wrap items-center gap-2">
          {fixedLeverage != null ? (
            <span className="rounded bg-elevated px-2 py-0.5 font-mono text-xs text-foreground">
              1:{fixedLeverage}
            </span>
          ) : (
            <select
              value={activeLeverageValue}
              onChange={(e) => setSelectedLeverage(Number(e.target.value))}
              disabled={tradingDisabled || !user}
              className="rounded-lg border border-input-border bg-input px-2 py-0.5 font-mono text-xs text-foreground focus:border-foreground focus:outline-none"
              aria-label="Kaldıraç"
            >
              {leverageOptions.map((lev) => (
                <option key={lev} value={lev}>
                  1:{lev}
                </option>
              ))}
            </select>
          )}
          {hasMemberOverrides && (
            <span className="rounded bg-blue-950/50 px-2 py-0.5 text-xs text-blue-300">
              Size özel
            </span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              marketStatus.open
                ? 'bg-emerald-950/60 text-emerald-400'
                : 'bg-elevated text-muted'
            }`}
          >
            {marketStatus.label}
          </span>
        </div>
      </div>

      <div className="flex rounded-lg border border-border bg-surface p-1">
        {(['market', 'limit'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-medium transition ${
              tab === t
                ? 'bg-elevated text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {t === 'market' ? 'Piyasa' : 'Emir'}
          </button>
        ))}
      </div>

      {tradingDisabled && user?.verification?.canTrade === false && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          İşlem için hesap doğrulaması gerekli.{' '}
          <Link href="/profile" className="font-medium underline">
            Profilim
          </Link>
        </div>
      )}

      {tradingDisabled && marketStatus.open === false && isAdmin(user) === false && user?.verification?.canTrade !== false && (
        <p className="rounded-lg border border-input-border bg-input/80 px-3 py-2 text-xs text-muted">
          {marketStatus.reason ?? 'Piyasa şu an kapalı — işlem yapılamaz.'}
        </p>
      )}

      {bistSellDisabled && (
        <p className="rounded-lg border border-input-border bg-input/80 px-3 py-2 text-xs text-muted">
          {BIST_SHORT_SELL_MESSAGE}
        </p>
      )}

      {!user && (
        <p className="rounded-lg border border-input-border bg-input/80 px-3 py-2 text-xs text-muted">
          İşlem yapmak için{' '}
          <Link href="/login" className="text-foreground hover:underline">
            giriş yapın
          </Link>{' '}
          veya{' '}
          <Link href="/register" className="text-foreground hover:underline">
            kayıt olun
          </Link>
          .
        </p>
      )}

      <div>
        <label className="mb-2 block text-xs text-muted">Hacim (Lot)</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVolumeSafe(volume - lotStep)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-input-border text-lg text-foreground hover:bg-elevated"
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
            className={`min-w-0 flex-1 text-center ${INPUT_CLASS}`}
          />
          <button
            type="button"
            onClick={() => setVolumeSafe(volume + lotStep)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-input-border text-lg text-foreground hover:bg-elevated"
          >
            +
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Gerekli teminat:{' '}
          <span className="font-mono text-secondary">{formatMoney(margin)}</span>
        </p>
      </div>

      <div className="min-h-18">
        <div
          className={tab !== 'limit' ? 'invisible' : undefined}
          aria-hidden={tab !== 'limit'}
        >
          <label className="mb-1 block text-xs text-muted">Fiyat</label>
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
            disabled={tab !== 'limit'}
            tabIndex={tab === 'limit' ? 0 : -1}
            className={`w-full ${INPUT_CLASS}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!tick || tradingDisabled || bistSellDisabled}
          onClick={() =>
            tab === 'market' ? runMarket('sell') : runLimit('sell')
          }
          className="cursor-pointer rounded-lg bg-red-600 py-3 font-semibold text-foreground transition hover:bg-red-500 disabled:opacity-40"
        >
          {sellLabel}
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            @ {sellDisplay ? formatMarketPrice(sellDisplay, sym) : '—'}
          </span>
        </button>
        <button
          type="button"
          disabled={!tick || tradingDisabled}
          onClick={() => (tab === 'market' ? runMarket('buy') : runLimit('buy'))}
          className="cursor-pointer rounded-lg bg-emerald-600 py-3 font-semibold text-foreground transition hover:bg-emerald-500 disabled:opacity-40"
        >
          {buyLabel}
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            @ {buyDisplay ? formatMarketPrice(buyDisplay, sym) : '—'}
          </span>
        </button>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-input/40 p-3">
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
            className="rounded"
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
              className={`min-w-0 flex-1 py-1.5 text-sm ${INPUT_CLASS}`}
            />
            <button
              type="button"
              disabled={mid <= 0}
              title="Anlık fiyatı kullan"
              onClick={() => stops.fillSlFromPrice(mid)}
              className="shrink-0 cursor-pointer rounded-lg border border-input-border px-2 py-1.5 font-mono text-xs text-foreground hover:bg-elevated disabled:opacity-40"
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
            className="rounded"
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
              className={`min-w-0 flex-1 py-1.5 text-sm ${INPUT_CLASS}`}
            />
            <button
              type="button"
              disabled={mid <= 0}
              title="Anlık fiyatı kullan"
              onClick={() => stops.fillTpFromPrice(mid)}
              className="shrink-0 cursor-pointer rounded-lg border border-input-border px-2 py-1.5 font-mono text-xs text-foreground hover:bg-elevated disabled:opacity-40"
            >
              {mid > 0 ? formatMarketPrice(mid, sym) : '—'}
            </button>
          </div>
        )}
        {(stops.useSl || stops.useTp) &&
          slTpEntryPrice > 0 &&
          slTpQuantity > 0 && (
            <PositionStopPnl
              position={openPos}
              symbol={sym}
              side={slTpSide}
              quantity={slTpQuantity}
              entryPrice={slTpEntryPrice}
              stopLoss={stops.useSl ? stops.slPrice : null}
              takeProfit={stops.useTp ? stops.tpPrice : null}
              className="mt-1"
            />
          )}
        {stops.positionMode && (
          <button
            type="button"
            disabled={!stops.hasChanges || stops.saving}
            onClick={() => void stops.applyChanges()}
            className="w-full cursor-pointer rounded-lg bg-accent py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stops.saving ? 'Kaydediliyor…' : 'Değiştir'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-border bg-input/60 p-3 text-xs">
        <div className="min-w-0">
          <p className="text-muted">Serbest teminat</p>
          <p className="font-mono text-foreground">
            {formatMoney(portfolio.balance)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted">Toplam varlık</p>
          <p className="font-mono text-foreground">
            {formatMoney(totalEquity)}
          </p>
        </div>
        {openPos != null && (
          <>
            <div className="min-w-0">
              <p className="text-muted">Teminat (pozisyon)</p>
              <p className="font-mono text-foreground">
                {formatMoney(openPosMargin)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {openPos.quantity.toLocaleString('tr-TR')} lot
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-muted">Açık K/Z</p>
              <p
                className={`font-mono ${
                  openPosPnl == null
                    ? 'text-muted'
                    : openPosPnl >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                }`}
              >
                {openPosPnl != null ? formatMoney(openPosPnl) : '—'}
              </p>
            </div>
          </>
        )}
        <div className="min-w-0">
          <p className="text-muted">Teminat (bu emir)</p>
          <p className="font-mono text-foreground">{formatMoney(margin)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-muted">Komisyon</p>
          <p className="truncate font-mono text-foreground">
            {formatMoney(commission, { dynamic: true })}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted">Kaldıraç</p>
          <p className="font-mono text-foreground">1:{activeLeverageValue}</p>
        </div>
        <div className="min-w-0">
          <p className="text-muted">Min. lot</p>
          <p className="font-mono text-foreground">{minLot.toFixed(2)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-muted">Swap Long (1 lot)</p>
          <p
            className={`truncate font-mono ${
              swapLong >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatSwap(swapLong)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted">Swap Short (1 lot)</p>
          <p
            className={`truncate font-mono ${
              swapShort >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatSwap(swapShort)}
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-sm">
          <p className="mb-2 text-xs font-medium text-amber-400/90">
            Bekleyen emirler
          </p>
          <ul className="space-y-2">
            {pending.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-secondary">
                  {formatTradeSide(order.side)} {order.quantity.toLocaleString()}{' '}
                  @ {formatMarketPrice(order.limitPrice, sym)}
                </span>
                <button
                  type="button"
                  onClick={() => void cancelOrder(order.id)}
                  className="cursor-pointer text-red-400 hover:underline"
                >
                  İptal
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p className="text-center text-xs text-muted">{message}</p>
      )}
    </div>
  );
}
