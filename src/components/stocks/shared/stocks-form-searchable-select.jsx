import React from 'react';

import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

export function renderStocksRichOptionLabel(option) {
  if (!option?.primaryLabel && !option?.secondaryLabel) {
    return option?.label ?? '';
  }
  return (
    <span className='flex min-w-0 flex-1 flex-col gap-0.5 text-left'>
      <span className='line-clamp-2 text-paragraph-sm font-medium text-text-strong-950'>
        {option.primaryLabel || option.label}
      </span>
      {option.secondaryLabel ? (
        <span className='line-clamp-1 text-paragraph-xs text-text-soft-400'>
          {option.secondaryLabel}
        </span>
      ) : null}
    </span>
  );
}

export function renderStocksRichTrigger({ selectedOption, placeholder }) {
  const label =
    selectedOption?.triggerLabel ||
    selectedOption?.summaryLabel ||
    selectedOption?.primaryLabel ||
    selectedOption?.label;
  if (!label) return placeholder;
  return <span className='block min-w-0 truncate text-left'>{label}</span>;
}

export function buildGroupedSelectOptions(groups = []) {
  const options = [];
  for (const group of groups) {
    const children = group?.children ?? [];
    if (children.length === 0) continue;
    options.push({
      isGroupLabel: true,
      label: group.label,
      value: `__group_${group.parent}`,
    });
    options.push(...children);
  }
  return options;
}

/**
 * Standard searchable single-select for stock forms (center, vendor, category, etc.).
 */
export default function StocksFormSearchableSelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  noResultsMessage = 'No options found',
  disabled,
  hasError,
  size = 'medium',
  variant = 'default',
  triggerClassName,
  contentClassName,
  matchTriggerWidth = true,
  showArrow = true,
  renderOptionLabel,
  renderTrigger,
  onOpenChange,
  getOptionLabel,
  ...rest
}) {
  return (
    <SearchableSelect
      value={value ?? ''}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      noResultsMessage={noResultsMessage}
      disabled={disabled}
      hasError={hasError}
      size={size}
      variant={variant}
      showArrow={showArrow}
      matchTriggerWidth={matchTriggerWidth}
      triggerClassName={cn('w-full', triggerClassName)}
      contentClassName={contentClassName}
      renderOptionLabel={renderOptionLabel}
      renderTrigger={renderTrigger}
      onOpenChange={onOpenChange}
      getOptionLabel={
        getOptionLabel || ((opt) => opt?.triggerLabel || opt?.label || String(opt?.value ?? ''))
      }
      {...rest}
    />
  );
}
