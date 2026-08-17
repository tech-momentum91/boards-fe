import { useMemo } from 'react';

import { BOQ_COLUMN_PREF_DEBOUNCE_MS } from '@/components/boq/constants';
import { PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_CONFIG } from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

export const PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_TABLE_ID =
  'project-procurement-purchase-boq-products';

export function getStoredProjectProcurementPurchaseBoqColumnConfig() {
  try {
    const raw = localStorage.getItem(
      `column-config:${PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_TABLE_ID}`,
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredProjectProcurementPurchaseBoqColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useProjectProcurementPurchaseBoqColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_CONFIG).map(
        (column, index) => ({
          ...column,
          order: index,
        }),
      ),
    [],
  );

  return useColumnConfig(
    PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredProjectProcurementPurchaseBoqColumnConfig,
    getStoredProjectProcurementPurchaseBoqColumnConfig,
    { autoSave: true, debounce: BOQ_COLUMN_PREF_DEBOUNCE_MS },
  );
}
