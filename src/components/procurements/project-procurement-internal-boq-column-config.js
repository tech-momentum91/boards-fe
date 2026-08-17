import { useMemo } from 'react';

import { BOQ_COLUMN_PREF_DEBOUNCE_MS } from '@/components/boq/constants';
import { PROJECT_PROCUREMENT_INTERNAL_BOQ_PRODUCTS_COLUMN_CONFIG } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

export const PROJECT_PROCUREMENT_INTERNAL_BOQ_COLUMN_TABLE_ID =
  'project-procurement-internal-boq-products-v2';

export function getStoredProjectProcurementInternalBoqColumnConfig() {
  try {
    const raw = localStorage.getItem(
      `column-config:${PROJECT_PROCUREMENT_INTERNAL_BOQ_COLUMN_TABLE_ID}`,
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredProjectProcurementInternalBoqColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${PROJECT_PROCUREMENT_INTERNAL_BOQ_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useProjectProcurementInternalBoqColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENT_INTERNAL_BOQ_PRODUCTS_COLUMN_CONFIG).map(
        (column, index) => ({
          ...column,
          order: index,
        }),
      ),
    [],
  );

  return useColumnConfig(
    PROJECT_PROCUREMENT_INTERNAL_BOQ_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredProjectProcurementInternalBoqColumnConfig,
    getStoredProjectProcurementInternalBoqColumnConfig,
    { autoSave: true, debounce: BOQ_COLUMN_PREF_DEBOUNCE_MS },
  );
}
