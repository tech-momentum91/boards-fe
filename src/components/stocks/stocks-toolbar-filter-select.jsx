import React, { memo, useCallback, useMemo } from 'react';

import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/utils/cn';

/**
 * Normalize multi-select changes so "All" is exclusive:
 * - Selecting "All" clears other values.
 * - Selecting anything else while "All" is active removes "All".
 */
function normalizeToolbarFilterSelection(nextValues, previousValues, allValue) {
  const next = Array.isArray(nextValues) ? nextValues : [];
  const prev = Array.isArray(previousValues) ? previousValues : [];

  if (next.length === 0) {
    return [allValue];
  }

  const added = next.filter((value) => !prev.includes(value));

  if (added.includes(allValue)) {
    return [allValue];
  }

  if (prev.includes(allValue) && next.length > 1) {
    return next.filter((value) => value !== allValue);
  }

  return next;
}

function resolveSingleToolbarValue(value, allValue) {
  const active = (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
  if (active.length === 0 || active.includes(allValue)) {
    return '';
  }
  return String(active[0]);
}

/**
 * Stock list toolbar filter — MultiSelect when `multiple` (default), SearchableSelect when single.
 */
const StocksToolbarFilterSelect = memo(
  ({
    value,
    onValueChange,
    options = [],
    placeholder,
    className,
    multiple = true,
    allValue = STOCKS_FILTER_VALUE_ALL,
    size = 'medium',
    variant = 'default',
    disabled = false,
    searchPlaceholder = 'Search...',
  }) => {
    const filterOptions = useMemo(
      () => options.filter((option) => option?.value && option.value !== allValue),
      [options, allValue],
    );

    const allLabel = useMemo(
      () => options.find((option) => option.value === allValue)?.label || placeholder || 'All',
      [options, allValue, placeholder],
    );

    const handleSingleChange = useCallback(
      (next) => {
        onValueChange?.(next ? [next] : [allValue]);
      },
      [onValueChange, allValue],
    );

    const selected = Array.isArray(value) ? value : value ? [value] : [allValue];

    const handleMultiChange = useCallback(
      (arr) => {
        const next = normalizeToolbarFilterSelection(arr, selected, allValue);
        onValueChange(next);
      },
      [onValueChange, selected, allValue],
    );

    if (!multiple) {
      return (
        <div className={cn('w-full min-w-0', className)}>
          <SearchableSelect
            value={resolveSingleToolbarValue(value, allValue)}
            onValueChange={handleSingleChange}
            options={filterOptions}
            placeholder={allLabel}
            searchPlaceholder={searchPlaceholder}
            size={size}
            variant={variant}
            disabled={disabled}
            showArrow
            matchTriggerWidth
            triggerClassName='w-full'
          />
        </div>
      );
    }

    return (
      <div className={cn('w-full min-w-0', className)}>
        <MultiSelect
          options={options}
          value={selected}
          onValueChange={handleMultiChange}
          placeholder={placeholder}
          className='w-full'
          size={size}
          variant={variant}
          disabled={disabled}
          enableSearch
          searchPlaceholder={searchPlaceholder}
        />
      </div>
    );
  },
);

StocksToolbarFilterSelect.displayName = 'StocksToolbarFilterSelect';

export default StocksToolbarFilterSelect;
