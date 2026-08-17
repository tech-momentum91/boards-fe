import { useMemo } from 'react';

import {
  MASTER_PAYMENT_SHEETS_LIST_COLUMN_TABLE_ID,
  MASTER_PAYMENT_SHEETS_LIST_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export function getStoredMasterPaymentSheetsListColumnConfig() {
  try {
    const raw = localStorage.getItem(`column-config:${MASTER_PAYMENT_SHEETS_LIST_COLUMN_TABLE_ID}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredMasterPaymentSheetsListColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${MASTER_PAYMENT_SHEETS_LIST_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useMasterPaymentSheetsListColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(MASTER_PAYMENT_SHEETS_LIST_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  return useColumnConfig(
    MASTER_PAYMENT_SHEETS_LIST_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredMasterPaymentSheetsListColumnConfig,
    getStoredMasterPaymentSheetsListColumnConfig,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'sheet_name' },
  );
}
