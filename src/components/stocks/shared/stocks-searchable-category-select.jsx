import React from 'react';

import StocksFormSearchableSelect from '@/components/stocks/shared/stocks-form-searchable-select';
import { cn } from '@/utils/cn';

/**
 * Flat stock category dropdown (`get_stock_category`).
 */
export default function StocksSearchableCategorySelect({
  value,
  onValueChange,
  options = [],
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
