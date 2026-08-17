import { useCallback, useMemo } from 'react';

import {
  fetchProjectProcurementPackagesListPref,
  saveProjectProcurementPackagesListPref,
} from '@/api/projectProcurements';
import {
  PROJECT_PROCUREMENT_PACKAGES_COLUMN_CONFIG_TABLE_ID,
  PROJECT_PROCUREMENT_PACKAGES_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export const useProjectProcurementPackagesColumnConfig = () => {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENT_PACKAGES_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchPackagesColumns = useCallback(async () => {
    try {
      const data = await fetchProjectProcurementPackagesListPref();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [expectedColumnIds]);

  const persistPackagesColumns = useCallback(async (columns) => {
    await saveProjectProcurementPackagesListPref(columns);
  }, []);

  return useColumnConfig(
    PROJECT_PROCUREMENT_PACKAGES_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistPackagesColumns,
    fetchPackagesColumns,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'name' },
  );
};
