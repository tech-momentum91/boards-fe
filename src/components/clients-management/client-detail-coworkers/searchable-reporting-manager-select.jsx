import React, { useEffect, useMemo, useState } from 'react';

import { fetchCoworkerList, mapCoworkerRowsToManagerOptions } from '@/api/coworker-list';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useDebounce } from '@/hooks/use-debounce';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

/**
 * Server-searchable reporting manager select.
 * Calls get_coworker_list with `keyword` (+ optional `client_id`).
 *
 * @param {{
 *   value: string,
 *   onValueChange: (value: string) => void,
 *   clientId?: string,
 *   hasError?: boolean,
 *   disabled?: boolean,
 *   placeholder?: string,
 *   size?: 'xsmall' | 'small' | 'medium' | 'large',
 * }} props
 */
export default function SearchableReportingManagerSelect({
  value = '',
  onValueChange,
  clientId = '',
  hasError = false,
  disabled = false,
  placeholder = 'Select manager',
  size = 'small',
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      if (!String(clientId ?? '').trim()) {
        if (!cancelled) setOptions([]);
        return;
      }
      if (!cancelled) setIsLoading(true);
      try {
        const { rows } = await fetchCoworkerList({
          keyword: debouncedSearch,
          client_id: clientId,
          page: 1,
          limitPageLength: PAGE_SIZE,
        });
        if (!cancelled) {
          setOptions(mapCoworkerRowsToManagerOptions(rows));
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, clientId]);

  const resolvedOptions = useMemo(() => {
    const current = String(value ?? '').trim();
    if (!current) return options;
    if (options.some((opt) => opt.value === current)) return options;
    return [{ value: current, label: current }, ...options];
  }, [options, value]);

  const isDebouncing = searchQuery.trim() !== debouncedSearch.trim();
  const emptyMessage = (() => {
    if (!String(clientId ?? '').trim()) return 'Client not available';
    if (isLoading || isDebouncing) return 'Loading…';
    return 'No managers available';
  })();
  const noResultsMessage = isLoading || isDebouncing ? 'Loading…' : 'No managers found';

  return (
    <SearchableSelect
      value={value || ''}
      onValueChange={onValueChange}
      options={resolvedOptions}
      placeholder={placeholder}
      searchPlaceholder='Search manager…'
      emptyMessage={emptyMessage}
      noResultsMessage={noResultsMessage}
      hasError={hasError}
      disabled={disabled}
      size={size}
      showArrow
      matchTriggerWidth
      triggerClassName='w-full'
      isolateSearchKeyboard
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearchQuery('');
      }}
      onSearchQueryChange={setSearchQuery}
    />
  );
}
