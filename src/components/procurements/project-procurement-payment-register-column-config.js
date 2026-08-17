import { useMemo } from 'react';

import {
  PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_TABLE_ID,
  PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export function getStoredProjectProcurementPaymentRegisterColumnConfig() {
  try {
    const raw = localStorage.getItem(
      `column-config:${PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_TABLE_ID}`,
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredProjectProcurementPaymentRegisterColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useProjectProcurementPaymentRegisterColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMNS).map(
        (column, index) => ({
          ...column,
          order: index,
        }),
      ),
    [],
  );

  return useColumnConfig(
    PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredProjectProcurementPaymentRegisterColumnConfig,
    getStoredProjectProcurementPaymentRegisterColumnConfig,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'vendor' },
  );
}
