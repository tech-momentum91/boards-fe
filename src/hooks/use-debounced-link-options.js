import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export const LINK_OPTIONS_PAGE_SIZE = 500;
export const LINK_OPTIONS_SEARCH_DEBOUNCE_MS = 300;

/**
 * Ensure the currently selected value(s) remain visible in searchable option lists.
 * @param {Array<{ value: string, label: string }>} options
 * @param {string|string[]|null|undefined} currentValue
 * @param {{
 *   noneItem?: { value: string, label: string } | null,
 *   currentLabels?: Record<string, string> | null,
 * }} [opts]
 */
export function mergeCurrentLinkOptions(
  options,
  currentValue,
  { noneItem = null, currentLabels = null } = {},
) {
  const opts = Array.isArray(options) ? options : [];
  const values = Array.isArray(currentValue)
    ? currentValue.map((v) => String(v ?? '').trim()).filter(Boolean)
    : [String(currentValue ?? '').trim()].filter(Boolean);

  const byValue = new Map();
  for (const value of values) {
    if (!opts.some((o) => String(o.value) === value)) {
      const known = currentLabels?.[value];
      byValue.set(value, {
        value,
        label: String(known || value).trim() || value,
      });
    }
  }
  for (const opt of opts) {
    const value = String(opt?.value ?? '').trim();
    if (!value) continue;
    byValue.set(value, {
      value,
      label: String(opt?.label || value).trim() || value,
    });
  }

  const merged = [...byValue.values()];
  return noneItem ? [noneItem, ...merged] : merged;
}

/**
 * Debounced server search for CRM link dropdowns (page_size 500 by default).
 *
 * @param {(args: { keyword?: string, pageSize: number }) => Promise<Array<{ value: string, label: string }>>} fetcher
 * @param {{
 *   enabled?: boolean,
 *   pageSize?: number,
 *   debounceMs?: number,
 *   deps?: unknown[],
 * }} [options]
 */
export function useDebouncedLinkOptions(
  fetcher,
  {
    enabled = true,
    pageSize = LINK_OPTIONS_PAGE_SIZE,
    debounceMs = LINK_OPTIONS_SEARCH_DEBOUNCE_MS,
    deps = [],
  } = {},
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, debounceMs);

  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      setIsLoading(false);
      setHasError(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    const keyword = debouncedSearch.trim();

    Promise.resolve(
      fetcher({
        keyword: keyword || undefined,
        pageSize,
      }),
    )
      .then((list) => {
        if (cancelled) return;
        setHasError(false);
        setOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        // Keep last-good options; surface error separately from empty results.
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // fetcher identity is caller-controlled via deps / useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: deps + debounce drive refetch
  }, [enabled, pageSize, debouncedSearch, ...deps]);

  const isDebouncing = searchQuery.trim() !== debouncedSearch.trim();
  const loadingMessage = useMemo(() => {
    if (isLoading || isDebouncing) return 'Loading…';
    if (hasError) return 'Failed to load options';
    return null;
  }, [hasError, isDebouncing, isLoading]);

  return {
    options,
    searchQuery,
    setSearchQuery,
    isLoading,
    hasError,
    loadingMessage,
    debouncedSearch,
  };
}
