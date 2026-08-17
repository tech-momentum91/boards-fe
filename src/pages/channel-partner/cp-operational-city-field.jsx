import React, { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';
import { cn } from '@/utils/cn';
import {
  buildOperationalCitySelectOptions,
  deriveOperationalStatesDisplay,
} from './cp-operational-location-utils';

/** Truncate overflowing text; full value on hover via native title (agreement-space-detail-card pattern). */
export function TextCellWithTooltip({ text, className = '' }) {
  const raw = text == null || text === '' ? '' : String(text).trim();
  const display = raw || '–';

  return (
    <span
      className={cn(
        'block min-w-0 w-full truncate text-left paragraph-small text-text-sub-600',
        className,
      )}
      title={raw || undefined}
    >
      {display}
    </span>
  );
}

export function CpOperationalCityField({
  selectedCities,
  onChange,
  disabled = false,
  className = 'min-w-0 w-full',
}) {
  const cities = Array.isArray(selectedCities) ? selectedCities : [];
  const cityOptions = useMemo(
    () => buildOperationalCitySelectOptions(cities, INDIA_CITY_OPTIONS),
    [cities],
  );

  if (!onChange) {
    const label = cities.length > 0 ? cities.join(', ') : '';
    return <TextCellWithTooltip text={label} />;
  }

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <SearchableSelect
        multiple
        variant='borderless'
        size='xsmall'
        matchTriggerWidth={false}
        showArrow={false}
        value={cities}
        onValueChange={(nextCities) => {
          const prevKey = cities.join('\x1F');
          const nextKey = (nextCities ?? []).join('\x1F');
          if (prevKey === nextKey) return;
          onChange(nextCities ?? []);
        }}
        options={cityOptions}
        placeholder='Select cities'
        searchPlaceholder='Search cities...'
        minSearchLength={3}
        minSearchMessage='Type at least 3 letters to search cities.'
        noResultsMessage='No cities found'
        emptyMessage='No cities available'
        disabled={disabled}
        triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0 -ml-2'
        contentClassName='min-w-[280px]'
        renderTrigger={({ selectedOptions, placeholder }) => {
          const label = selectedOptions?.length
            ? selectedOptions.map((opt) => opt.label).join(', ')
            : '';
          if (!label) {
            return <span className='text-label-sm text-text-soft-400'>{placeholder}</span>;
          }
          return <TextCellWithTooltip text={label} className='text-label-sm text-text-main-900' />;
        }}
      />
    </div>
  );
}

export function CpOperationalStateDisplay({ operationalState, selectedCities, className = '' }) {
  const display =
    String(operationalState ?? '').trim() || deriveOperationalStatesDisplay(selectedCities);
  return <TextCellWithTooltip text={display} className={className} />;
}
