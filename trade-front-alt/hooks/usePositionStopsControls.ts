'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatEditableMarketPrice } from '@/lib/price';
import type { Position } from '@/lib/trading/types';

function parseDecimalInput(value: string) {
  if (value === '' || value === '.') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function isDecimalInput(value: string) {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

function draftStop(
  enabled: boolean,
  price: number,
): number | null {
  return enabled && price > 0 ? price : null;
}

export function usePositionStopsControls({
  symbol,
  openPos,
  updatePositionStops,
  onMessage,
}: {
  symbol: string;
  openPos?: Position;
  updatePositionStops: (
    positionId: string,
    stops: { stopLoss?: number | null; takeProfit?: number | null },
  ) => Promise<string | null>;
  onMessage?: (text: string) => void;
}) {
  const positionMode = openPos != null;
  const [useSl, setUseSl] = useState(false);
  const [useTp, setUseTp] = useState(false);
  const [slPrice, setSlPrice] = useState(0);
  const [slPriceInput, setSlPriceInput] = useState('');
  const [tpPrice, setTpPrice] = useState(0);
  const [tpPriceInput, setTpPriceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const slEditing = useRef(false);
  const tpEditing = useRef(false);

  const syncFromPosition = useCallback(() => {
    if (!openPos) return;
    if (!slEditing.current) {
      const hasSl = openPos.stopLoss != null && openPos.stopLoss > 0;
      setUseSl(hasSl);
      if (hasSl) {
        setSlPrice(openPos.stopLoss!);
        setSlPriceInput(formatEditableMarketPrice(openPos.stopLoss!, symbol));
      } else {
        setSlPrice(0);
        setSlPriceInput('');
      }
    }
    if (!tpEditing.current) {
      const hasTp = openPos.takeProfit != null && openPos.takeProfit > 0;
      setUseTp(hasTp);
      if (hasTp) {
        setTpPrice(openPos.takeProfit!);
        setTpPriceInput(formatEditableMarketPrice(openPos.takeProfit!, symbol));
      } else {
        setTpPrice(0);
        setTpPriceInput('');
      }
    }
  }, [openPos, symbol]);

  useEffect(() => {
    if (positionMode) syncFromPosition();
  }, [positionMode, syncFromPosition, openPos?.stopLoss, openPos?.takeProfit]);

  const hasChanges = useMemo(() => {
    if (!positionMode || !openPos) return false;
    const nextSl = draftStop(useSl, slPrice);
    const nextTp = draftStop(useTp, tpPrice);
    return (
      (openPos.stopLoss ?? null) !== nextSl ||
      (openPos.takeProfit ?? null) !== nextTp
    );
  }, [positionMode, openPos, useSl, slPrice, useTp, tpPrice]);

  const applyChanges = useCallback(async () => {
    if (!positionMode || !openPos || !hasChanges) return;
    setSaving(true);
    try {
      const err = await updatePositionStops(openPos.id, {
        stopLoss: draftStop(useSl, slPrice),
        takeProfit: draftStop(useTp, tpPrice),
      });
      if (err) onMessage?.(err);
      else onMessage?.('SL/TP güncellendi');
    } finally {
      setSaving(false);
    }
  }, [
    positionMode,
    openPos,
    hasChanges,
    updatePositionStops,
    symbol,
    useSl,
    slPrice,
    useTp,
    tpPrice,
    onMessage,
  ]);

  const setSlChecked = useCallback((checked: boolean) => {
    setUseSl(checked);
  }, []);

  const setTpChecked = useCallback((checked: boolean) => {
    setUseTp(checked);
  }, []);

  const onSlInputChange = useCallback((raw: string) => {
    const next = raw.replace(',', '.');
    if (!isDecimalInput(next)) return;
    setSlPriceInput(next);
    setSlPrice(parseDecimalInput(next));
  }, []);

  const onTpInputChange = useCallback((raw: string) => {
    const next = raw.replace(',', '.');
    if (!isDecimalInput(next)) return;
    setTpPriceInput(next);
    setTpPrice(parseDecimalInput(next));
  }, []);

  const onSlFocus = useCallback(() => {
    slEditing.current = true;
  }, []);

  const onTpFocus = useCallback(() => {
    tpEditing.current = true;
  }, []);

  const onSlBlur = useCallback(() => {
    slEditing.current = false;
  }, []);

  const onTpBlur = useCallback(() => {
    tpEditing.current = false;
  }, []);

  const fillSlFromPrice = useCallback(
    (price: number) => {
      if (price <= 0) return;
      setSlPrice(price);
      setSlPriceInput(formatEditableMarketPrice(price, symbol));
      setUseSl(true);
    },
    [symbol],
  );

  const fillTpFromPrice = useCallback(
    (price: number) => {
      if (price <= 0) return;
      setTpPrice(price);
      setTpPriceInput(formatEditableMarketPrice(price, symbol));
      setUseTp(true);
    },
    [symbol],
  );

  const stopOpts = () => ({
    stopLoss: useSl && slPrice > 0 ? slPrice : undefined,
    takeProfit: useTp && tpPrice > 0 ? tpPrice : undefined,
  });

  return {
    positionMode,
    useSl,
    useTp,
    slPrice,
    tpPrice,
    slPriceInput,
    tpPriceInput,
    hasChanges,
    saving,
    applyChanges,
    setSlChecked,
    setTpChecked,
    onSlInputChange,
    onTpInputChange,
    onSlFocus,
    onTpFocus,
    onSlBlur,
    onTpBlur,
    fillSlFromPrice,
    fillTpFromPrice,
    stopOpts,
  };
}
