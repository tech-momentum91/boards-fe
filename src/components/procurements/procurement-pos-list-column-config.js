import { useCallback, useMemo } from 'react';

import { fetchProcurementPosListPref, saveProcurementPosListPref } from '@/api/projectProcurements';
import {
  PROCUREMENT_POS_COLUMN_TABLE_ID,
  PROCUREMENT_POS_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export function useProcurementPosColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROCUREMENT_POS_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchProcurementPosColumns = useCallback(async () => {
    try {
      const data = await fetchProcurementPosListPref();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [expectedColumnIds]);

  const persistProcurementPosColumns = useCallback(async (columns) => {
    await saveProcurementPosListPref(columns);
  }, []);

  return useColumnConfig(
    PROCUREMENT_POS_COLUMN_TABLE_ID,
    defaultColumnConfig,
    persistProcurementPosColumns,
    fetchProcurementPosColumns,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'po_number' },
  );
}
