import React, { useMemo } from 'react';

import StocksFormSearchableSelect, {
  buildGroupedSelectOptions,
} from '@/components/stocks/shared/stocks-form-searchable-select';
import { cn } from '@/utils/cn';

/**
 * Product Master category dropdown (`get_product_master_category`) with group headers.
 */
export default function StocksGroupedCategorySelect({
  value,
  onValueChange,
  groups = [],
  placeholder = 'Select category',
  emptyMessage = 'No categories available',
  size = 'medium',
  variant = 'default',
  hasError,
  disabled,
  triggerClassName,
  contentClassName,
  isLoading = false,
  loadingMessage = 'Loading categories...',
  errorMessage = '',
}) {
  const options = useMemo(() => buildGroupedSelectOptions(groups), [groups]);
  const resolvedEmptyMessage = errorMessage || (isLoading ? loadingMessage : emptyMessage);

  return (
    <StocksFormSearchableSelect
      value={value ?? ''}
      onValueChange={onValueChange}
      options={isLoading || errorMessage ? [] : options}
      placeholder={placeholder}
      emptyMessage={resolvedEmptyMessage}
      size={size}
      variant={variant}
      hasError={hasError}
      disabled={disabled || isLoading || Boolean(errorMessage)}
      triggerClassName={cn(triggerClassName)}
      contentClassName={cn('min-w-[280px]', contentClassName)}
    />
  );
}
