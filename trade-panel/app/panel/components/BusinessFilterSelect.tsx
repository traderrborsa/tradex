'use client';

import { useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';

interface Props {
  value: string;
  onChange: (businessId: string) => void;
  className?: string;
  allowAll?: boolean;
  alwaysShow?: boolean;
  label?: string;
  /** Form modu: boş seçenek + zorunlu seçim (allowAll=false) */
  required?: boolean;
}

export function BusinessFilterSelect({
  value,
  onChange,
  className = 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900',
  allowAll = true,
  alwaysShow = false,
  label = 'İşletme filtresi',
  required = false,
}: Props) {
  const { businesses, activeBusinessId } = useBusiness();
  const singleBusiness = businesses.length === 1;
  const isPicker = required || !allowAll;

  useEffect(() => {
    if (value) return;
    if (singleBusiness) {
      onChange(businesses[0]!.id);
      return;
    }
    if (activeBusinessId) {
      onChange(activeBusinessId);
    }
  }, [value, singleBusiness, businesses, activeBusinessId, onChange]);

  if (businesses.length === 0) {
    return null;
  }

  if (singleBusiness && !alwaysShow && !isPicker) {
    return null;
  }

  const allowAllEffective = allowAll && !singleBusiness && !required;
  const showSelect = alwaysShow || allowAllEffective || businesses.length > 1;

  if (!showSelect && !alwaysShow) {
    return null;
  }

  const selectValue = singleBusiness ? businesses[0]!.id : value;

  return (
    <div className={alwaysShow || isPicker ? '' : 'mb-4'}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <select
        className={className}
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={singleBusiness && !allowAllEffective}
        required={required && !singleBusiness}
      >
        {isPicker && !singleBusiness && (
          <option value="" disabled>
            İşletme seçin
          </option>
        )}
        {allowAllEffective && <option value="">Tüm işletmeler</option>}
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
