import React, { useCallback, useRef } from 'react';

import { createProjectLayoutAreaType } from '@/api/projectLayout';
import SearchableCommonAreaTypeSelect from '@/pages/center/searchable-common-area-type-select';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

function optionExists(options, value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return (options ?? []).some((option) => {
    const optionValue = String(option?.value ?? '')
      .trim()
      .toLowerCase();
    const optionLabel = String(option?.label ?? '')
      .trim()
      .toLowerCase();
    return optionValue === normalized || optionLabel === normalized;
  });
}

/**
 * Project layout Area Type field — same UX as Center layout "Common Area Type*":
 * searchable suggestions + free-text create (type a new value; it is saved as Area Type on submit).
 */
export default function ProjectAreaTypeSelect({
  value,
  onValueChange,
  options = [],
  onOptionsChange,
  placeholder = 'Enter or select area type',
  disabled = false,
  hasError = false,
  size = 'small',
  variant,
  triggerClassName,
  commitOnBlurOnly = true,
}) {
  const createInFlightRef = useRef(new Set());

  const handleValueChange = useCallback(
    async (nextValue) => {
      const trimmed = String(nextValue ?? '').trim();

      if (!trimmed || optionExists(options, trimmed) || !onOptionsChange) {
        onValueChange?.(trimmed);
        return;
      }

      if (createInFlightRef.current.has(trimmed.toLowerCase())) {
        onValueChange?.(trimmed);
        return;
      }

      createInFlightRef.current.add(trimmed.toLowerCase());
      try {
        const created = await createProjectLayoutAreaType(trimmed);
        const createdValue = String(created?.value ?? trimmed).trim();
        const createdLabel = String(created?.label ?? createdValue).trim();

        onOptionsChange((previous) => {
          const list = Array.isArray(previous) ? previous : [];
          if (optionExists(list, createdValue)) return list;
          return [...list, { value: createdValue, label: createdLabel }];
        });
        onValueChange?.(createdValue);
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to create area type'));
        onValueChange?.(trimmed);
      } finally {
        createInFlightRef.current.delete(trimmed.toLowerCase());
      }
    },
    [onOptionsChange, onValueChange, options],
  );

  return (
    <SearchableCommonAreaTypeSelect
      value={value || ''}
      onValueChange={handleValueChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      hasError={hasError}
      size={size}
      variant={variant}
      triggerClassName={triggerClassName || 'w-full'}
      commitOnBlurOnly={commitOnBlurOnly}
    />
  );
}
