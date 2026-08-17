import React, { useCallback, useMemo, useRef } from 'react';

import {
  buildTicketCategoryOptionId,
  searchTicketCategoryOptions,
} from '@/api/ticketCategoryOptions';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import * as Tooltip from '@/components/ui/tooltip';

function getBreadcrumbParts(parts) {
  if (Array.isArray(parts)) return parts.filter(Boolean);
  return String(parts || '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);
}

function CategoryBreadcrumb({ parts }) {
  const breadcrumbParts = getBreadcrumbParts(parts);
  if (breadcrumbParts.length === 0) return null;

  const fullText = breadcrumbParts.join(' > ');

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className='block min-w-0 max-w-full truncate text-paragraph-xs text-text-sub-500'>
          {fullText}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side='bottom' className='z-[700] max-w-sm break-words'>
        {fullText}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function getTicketCategoryOptionId(opt) {
  if (!opt) return '';
  if (opt.id) return opt.id;
  return buildTicketCategoryOptionId(opt.category, opt.sub_category || opt.value);
}

export default function TicketCategorySelect({
  category,
  subCategory,
  onChange,
  hasError,
  disabled,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No categories available',
  noResultsMessage = 'No categories found',
}) {
  const latestOptionsRef = useRef([]);

  const selectedId = useMemo(
    () => buildTicketCategoryOptionId(category, subCategory),
    [category, subCategory],
  );

  const displayParts = useMemo(() => {
    if (!subCategory) return [];
    return [category, subCategory].filter(Boolean);
  }, [category, subCategory]);

  const loadOptions = useCallback(({ search }) => searchTicketCategoryOptions({ search }), []);

  const handleOptionsLoaded = useCallback((options) => {
    latestOptionsRef.current = options;
  }, []);

  const handleChange = useCallback(
    (optionId, pickedOption) => {
      if (!optionId) return;

      const picked =
        pickedOption ??
        latestOptionsRef.current.find((opt) => getTicketCategoryOptionId(opt) === optionId);

      if (!picked) return;

      onChange?.({
        category: picked.category || '',
        sub_category: picked.sub_category || picked.value || '',
        severity: picked.severity || '',
      });
    },
    [onChange],
  );

  return (
    <Tooltip.Provider delayDuration={200}>
      <ProductFormSearchableSelect
        value={selectedId}
        onValueChange={handleChange}
        hasError={hasError}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        noResultsMessage={noResultsMessage}
        size='xsmall'
        variant='borderless'
        getOptionValue={getTicketCategoryOptionId}
        getOptionLabel={(opt) =>
          opt.breadcrumb || (opt.breadcrumb_parts || []).join(' > ') || opt.label || opt.value
        }
        renderOptionLabel={(opt) => (
          <CategoryBreadcrumb parts={opt.breadcrumb_parts || opt.breadcrumb} />
        )}
        renderTriggerValue={({ placeholder: triggerPlaceholder }) =>
          displayParts.length > 0 ? (
            <CategoryBreadcrumb parts={displayParts} />
          ) : (
            <span className='block min-w-0 max-w-full truncate text-text-soft-400'>
              {triggerPlaceholder}
            </span>
          )
        }
        loadOptions={loadOptions}
        onOptionsLoaded={handleOptionsLoaded}
        contentClassName='z-[600]'
      />
    </Tooltip.Provider>
  );
}
