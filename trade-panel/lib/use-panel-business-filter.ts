'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';

function resolveDefaultBusinessId(
  businesses: { id: string }[],
  activeBusinessId: string | null,
  initialOverride?: string,
): string {
  if (initialOverride?.trim()) return initialOverride.trim();
  if (businesses.length === 1) return businesses[0]!.id;
  if (activeBusinessId && businesses.some((b) => b.id === activeBusinessId)) {
    return activeBusinessId;
  }
  return '';
}

/** Liste filtreleri — tek işletmede otomatik seçim, çoklu işletmede navbar ile senkron. */
export function usePanelBusinessFilter(initialOverride?: string) {
  const { businesses, activeBusinessId, setActiveBusinessId } = useBusiness();
  const singleBusiness = businesses.length === 1;
  const defaultId = useMemo(
    () => resolveDefaultBusinessId(businesses, activeBusinessId, initialOverride),
    [businesses, activeBusinessId, initialOverride],
  );

  const [businessId, setBusinessIdLocal] = useState(defaultId);

  useEffect(() => {
    setBusinessIdLocal((prev) => {
      const next = resolveDefaultBusinessId(
        businesses,
        activeBusinessId,
        initialOverride,
      );
      if (singleBusiness) return next;
      if (prev && businesses.some((b) => b.id === prev)) return prev;
      return next || prev;
    });
  }, [businesses, activeBusinessId, initialOverride, singleBusiness]);

  useEffect(() => {
    if (singleBusiness && businessId) {
      setActiveBusinessId(businessId);
    }
  }, [singleBusiness, businessId, setActiveBusinessId]);

  const setBusinessId = useCallback(
    (id: string) => {
      setBusinessIdLocal(id);
      setActiveBusinessId(id || null);
    },
    [setActiveBusinessId],
  );

  const effectiveBusinessId = singleBusiness
    ? businesses[0]!.id
    : businessId;

  return {
    businessId: effectiveBusinessId,
    setBusinessId,
    singleBusiness,
    businesses,
  };
}

/** Form alanları — yerel seçim, navbar ile senkron ama tek işletmede de güncellenebilir. */
export function useBusinessPicker(initialBusinessId?: string) {
  const { businesses, activeBusinessId, setActiveBusinessId } = useBusiness();
  const [businessId, setBusinessIdLocal] = useState('');

  useEffect(() => {
    if (initialBusinessId?.trim()) {
      setBusinessIdLocal(initialBusinessId.trim());
      return;
    }
    if (activeBusinessId && businesses.some((b) => b.id === activeBusinessId)) {
      setBusinessIdLocal(activeBusinessId);
      return;
    }
    if (businesses.length === 1) {
      setBusinessIdLocal(businesses[0]!.id);
    }
  }, [initialBusinessId, activeBusinessId, businesses]);

  const setBusinessId = useCallback(
    (id: string) => {
      setBusinessIdLocal(id);
      if (id) setActiveBusinessId(id);
    },
    [setActiveBusinessId],
  );

  return {
    businessId,
    setBusinessId,
    businesses,
    singleBusiness: businesses.length === 1,
  };
}
