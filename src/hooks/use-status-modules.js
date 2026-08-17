import { useEffect, useState } from 'react';
import { getStatusModules } from '@/api/dynamic-status';
import { getStatusFieldKey } from '@/constants/status-field-key';

export function normalizeStatusModuleFields(fields = []) {
  return fields.map((fieldSpec) => ({
    ...fieldSpec,
    configKey: fieldSpec.configKey || getStatusFieldKey(fieldSpec),
  }));
}

export function normalizeStatusModules(modules = []) {
  return (modules ?? []).map((module) => ({
    ...module,
    fields: normalizeStatusModuleFields(module.fields),
  }));
}

/**
 * Load the Status Master module registry from the API (single source of truth).
 */
export function useStatusModules({ enabled = true } = {}) {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setModules([]);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const rows = await getStatusModules();
        if (!cancelled && Array.isArray(rows)) {
          setModules(normalizeStatusModules(rows));
        }
      } catch {
        if (!cancelled) setModules([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { modules, isLoading };
}
