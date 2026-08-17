import { useState, useEffect, useRef } from 'react';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

/**
 * Custom hook to handle filter persistence in sessionStorage.
 *
 * When `compactFilters` is omitted, persisted JSON is built with `compactFiltersForSessionStorage`
 * from `defaultFilters` plus optional `persist*` tuning (exclude / include keys, numeric fields, etc.).
 *
 * @param {Object} options
 * @param {string} options.storageKey - Unique key for this feature
 * @param {Object} options.defaultFilters - Default filter values
 * @param {Function} [options.compactFilters] - Custom picker (overrides built-in compaction)
 * @param {string[]} [options.persistExcludeKeys] - Keys to skip when using built-in compaction
 * @param {string[]} [options.persistIncludeKeys] - If set, only these keys are considered
 * @param {string[]} [options.persistTruthyObjectKeys] - Values persisted when truthy (date-range objects or non-empty strings, e.g. ISO dates)
 * @param {string[]} [options.persistNumericKeys] - Keys coerced with `Number` when present
 * @param {string[]} [options.persistPositiveNumericKeys] - Numbers persisted only when finite and &gt; 0
 * @param {string[]} [options.persistPositiveNumberStringKeys] - Trimmed string persisted when `Number` is finite and &gt; 0
 * @param {string[]} [options.persistScalarDiffKeys] - Persist when value differs from `defaultFilters` (stringified), skipping nullish
 * @param {boolean} [options.persistTrimStringArrays] - Trim / drop empty strings in array filters
 * @param {Record<string, string[]>} [options.persistIgnoreStringValuesByKey] - For string keys, skip persisting when trimmed value is in the list (e.g. month `All`)
 * @param {Record<string, string[]>} [options.persistObjectSubkeysTruthyKeys] - Persist plain objects when any listed sub-key is set (e.g. date range `from` / `to`)
 * @param {Record<string, string>} [options.persistArrayOrStringDefaultEquivalence] - String or array field matches default single string (case-insensitive) → omit
 * @returns {[Object, Function]} [filters, setFilters]
 */
export function usePersistedFilters({
  storageKey,
  defaultFilters,
  compactFilters,
  persistExcludeKeys,
  persistIncludeKeys,
  persistTruthyObjectKeys,
  persistNumericKeys,
  persistPositiveNumericKeys,
  persistPositiveNumberStringKeys,
  persistScalarDiffKeys,
  persistTrimStringArrays,
  persistIgnoreStringValuesByKey,
  persistObjectSubkeysTruthyKeys,
  persistArrayOrStringDefaultEquivalence,
}) {
  // Use a ref to keep track of whether we're currently initializing or updating from within the hook
  // to avoid unnecessary session storage writes during the very first render cycle.
  const isInitialMount = useRef(true);

  const compactFiltersRef = useRef(compactFilters);
  const defaultFiltersRef = useRef(defaultFilters);
  const persistOptsRef = useRef({});

  compactFiltersRef.current = compactFilters;
  defaultFiltersRef.current = defaultFilters;
  persistOptsRef.current = {
    excludeKeys: persistExcludeKeys,
    includeKeys: persistIncludeKeys,
    truthyObjectKeys: persistTruthyObjectKeys,
    numericKeys: persistNumericKeys,
    positiveNumericKeys: persistPositiveNumericKeys,
    positiveNumberStringKeys: persistPositiveNumberStringKeys,
    scalarDiffKeys: persistScalarDiffKeys,
    trimStringArrayElements: Boolean(persistTrimStringArrays),
    ignoreStringValuesByKey: persistIgnoreStringValuesByKey || {},
    objectSubkeysTruthyKeys: persistObjectSubkeysTruthyKeys || {},
    arrayOrStringDefaultEquivalence: persistArrayOrStringDefaultEquivalence || {},
  };

  const [filters, setFilters] = useState(() => {
    if (!storageKey) {
      return defaultFilters;
    }
    try {
      const raw = sessionStorage.getItem(storageKey);

      if (raw) {
        const parsed = JSON.parse(raw);
        // Handle nested storage structures like { vendorListFilters: {...} } or { pnlViewFilters: {...} }
        // by looking for common keys or the object itself.
        const storedValue =
          parsed.vendorListFilters ?? parsed.appliedFilters ?? parsed.pnlViewFilters ?? parsed;

        return {
          ...defaultFilters,
          ...(storedValue && typeof storedValue === 'object' ? storedValue : {}),
        };
      }
    } catch {
      // Silent fail as per requirements
    }
    return defaultFilters;
  });

  // Re-initialize when key changes (e.g. navigation between different centers)
  useEffect(() => {
    if (!storageKey) {
      setFilters(defaultFilters);
      return;
    }
    try {
      const raw = sessionStorage.getItem(storageKey);

      if (raw) {
        const parsed = JSON.parse(raw);
        const storedValue =
          parsed.vendorListFilters ?? parsed.appliedFilters ?? parsed.pnlViewFilters ?? parsed;

        setFilters({
          ...defaultFilters,
          ...(storedValue && typeof storedValue === 'object' ? storedValue : {}),
        });
        return;
      }
    } catch {
      /* ignore */
    }
    setFilters(defaultFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-hydrate when the storage slot changes
  }, [storageKey]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!storageKey) {
      return;
    }

    try {
      const customCompact = compactFiltersRef.current;
      const compact = customCompact
        ? customCompact(filters)
        : compactFiltersForSessionStorage(
            filters,
            defaultFiltersRef.current,
            persistOptsRef.current,
          );
      if (!compact || Object.keys(compact).length === 0) {
        sessionStorage.removeItem(storageKey);
      } else {
        // We store the object directly. The reader handles nested shapes (e.g. vendorListFilters).
        sessionStorage.setItem(storageKey, JSON.stringify(compact));
      }
    } catch {
      // Silent fail as per requirements
    }
  }, [filters, storageKey]);

  return [filters, setFilters];
}
