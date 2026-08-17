import { useMemo } from 'react';

import {
  PROJECT_PROCUREMENT_POS_COLUMN_TABLE_ID,
  PROJECT_PROCUREMENT_POS_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export function getStoredProjectProcurementPosColumnConfig() {
  try {
    const raw = localStorage.getItem(`column-config:${PROJECT_PROCUREMENT_POS_COLUMN_TABLE_ID}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredProjectProcurementPosColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${PROJECT_PROCUREMENT_POS_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useProjectProcurementPosColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENT_POS_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  return useColumnConfig(
    PROJECT_PROCUREMENT_POS_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredProjectProcurementPosColumnConfig,
    getStoredProjectProcurementPosColumnConfig,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'po_number' },
  );
}
