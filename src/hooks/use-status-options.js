import { useEffect, useMemo, useState } from 'react';
import { getStatusOptions } from '@/api/dynamic-status';
import { buildStatusScope } from '@/constants/status-field-key';
import { getProgressPercentageForStatusCategory } from '@/components/customize-status/status-lifecycle-constants';

/**
 * Load dynamic status options for any Status Configuration scope.
 * @param {{ doctype: string, field: string, context?: string, enabled?: boolean }} scope
 */
export function useStatusOptions({ doctype, field, context, enabled = true, refreshKey = 0 } = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && doctype && field));

  useEffect(() => {
    if (!enabled || !doctype || !field) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const opts = await getStatusOptions(buildStatusScope({ doctype, field, context }));
        if (!cancelled) setOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [context, doctype, enabled, field, refreshKey]);

  return { options, loading };
}

export async function fetchStatusOptions(scope) {
  if (!scope?.doctype || !scope?.field) return [];
  return getStatusOptions(buildStatusScope(scope));
}

export function buildStatusMetaMap(options = []) {
  return Object.fromEntries(
    (options ?? [])
      .map((option, index) => {
        const value = String(option?.value ?? option?.label ?? '').trim();
        if (!value) return null;
        const order = Number(option?.order ?? index);
        const percentage = getProgressPercentageForStatusCategory(option?.category, order);
        // Lowercase keys so getStatusMetaForOption lookups match.
        return [value.toLowerCase(), { percentage, color: option?.color || 'blue' }];
      })
      .filter(Boolean),
  );
}

/** Map Status Master options into filter / multi-select option shape. */
export function toStatusFilterOptions(statusOptions = []) {
  return (statusOptions ?? [])
    .map((option) => {
      const value = String(option?.value ?? option?.label ?? '').trim();
      if (!value) return null;
      return {
        value,
        label: String(option?.label ?? option?.value ?? value).trim() || value,
      };
    })
    .filter(Boolean);
}

/**
 * When Status Master options load on create, default empty status to the first configured value.
 * Does not overwrite an existing form value (edit / reopen / legacy labels).
 */
export function useSyncDefaultStatusOption({
  open,
  options = [],
  currentStatus,
  setValue,
  fieldName = 'status',
}) {
  useEffect(() => {
    if (!open || options.length === 0 || typeof setValue !== 'function') return;
    const values = options.map((option) => option?.value ?? option?.label).filter(Boolean);
    if (values.length === 0) return;
    const hasValue = currentStatus != null && String(currentStatus).trim() !== '';
    if (hasValue) return;
    setValue(fieldName, values[0], { shouldValidate: true });
  }, [currentStatus, fieldName, open, options, setValue]);
}

/**
 * Task / ACL Task status options from Status Configuration, with static fallback.
 * Prefer Status Master labels when available; otherwise keep the hardcoded list.
 */
export function useScopedTaskStatusOptions({
  doctype = 'Task',
  field = 'status',
  context,
  fallback = [],
  enabled = true,
  refreshKey = 0,
} = {}) {
  const { options, loading } = useStatusOptions({
    doctype,
    field,
    context,
    enabled,
    refreshKey,
  });

  const resolved = useMemo(() => {
    if (options.length > 0) {
      return options.map((option, index) => {
        const value = String(option?.value ?? option?.label ?? '').trim();
        return {
          value,
          label: String(option?.label ?? value).trim() || value,
          color: option?.color || 'blue',
          category: option?.category || null,
          percentage: getProgressPercentageForStatusCategory(option?.category, index),
        };
      });
    }
    return Array.isArray(fallback) ? fallback : [];
  }, [fallback, options]);

  return { options: resolved, loading, fromStatusMaster: options.length > 0 };
}
