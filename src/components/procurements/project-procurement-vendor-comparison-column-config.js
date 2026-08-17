import { useMemo } from 'react';

import { BOQ_COLUMN_PREF_DEBOUNCE_MS } from '@/components/boq/constants';
import {
  PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_CONFIG,
  PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_TABLE_ID,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

export function getStoredProjectProcurementVendorComparisonColumnConfig() {
  try {
    const raw = localStorage.getItem(
      `column-config:${PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_TABLE_ID}`,
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredProjectProcurementVendorComparisonColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useProjectProcurementVendorComparisonColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_CONFIG).map(
        (column, index) => ({
          ...column,
          order: index,
        }),
      ),
    [],
  );

  return useColumnConfig(
    PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredProjectProcurementVendorComparisonColumnConfig,
    getStoredProjectProcurementVendorComparisonColumnConfig,
    {
      autoSave: true,
      debounce: BOQ_COLUMN_PREF_DEBOUNCE_MS,
      pinnedColumnId: 'item',
    },
  );
}
