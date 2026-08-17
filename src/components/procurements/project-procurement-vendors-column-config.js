import { useMemo } from 'react';

import {
  PROJECT_PROCUREMENT_VENDORS_COLUMN_TABLE_ID,
  PROJECT_PROCUREMENT_VENDORS_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export function getStoredProjectProcurementVendorsColumnConfig() {
  try {
    const raw = localStorage.getItem(
      `column-config:${PROJECT_PROCUREMENT_VENDORS_COLUMN_TABLE_ID}`,
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredProjectProcurementVendorsColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${PROJECT_PROCUREMENT_VENDORS_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useProjectProcurementVendorsColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENT_VENDORS_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  return useColumnConfig(
    PROJECT_PROCUREMENT_VENDORS_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredProjectProcurementVendorsColumnConfig,
    getStoredProjectProcurementVendorsColumnConfig,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'vendor_name' },
  );
}
