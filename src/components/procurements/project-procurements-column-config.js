import { useCallback, useMemo } from 'react';

import {
  fetchProjectProcurementsListPref,
  saveProjectProcurementsListPref,
} from '@/api/projectProcurements';
import {
  PROJECT_PROCUREMENTS_COLUMN_CONFIG_TABLE_ID,
  PROJECT_PROCUREMENTS_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export const useProjectProcurementsColumnConfig = () => {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENTS_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchProjectProcurementColumns = useCallback(async () => {
    try {
      const data = await fetchProjectProcurementsListPref();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [expectedColumnIds]);

  const persistProjectProcurementColumns = useCallback(async (columns) => {
    await saveProjectProcurementsListPref(columns);
  }, []);

  return useColumnConfig(
    PROJECT_PROCUREMENTS_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistProjectProcurementColumns,
    fetchProjectProcurementColumns,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'name' },
  );
};
