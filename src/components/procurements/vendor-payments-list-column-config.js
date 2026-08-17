import { useMemo } from 'react';

import {
  VENDOR_PAYMENTS_LIST_COLUMN_TABLE_ID,
  VENDOR_PAYMENTS_LIST_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export function getStoredVendorPaymentsListColumnConfig() {
  try {
    const raw = localStorage.getItem(`column-config:${VENDOR_PAYMENTS_LIST_COLUMN_TABLE_ID}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredVendorPaymentsListColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${VENDOR_PAYMENTS_LIST_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useVendorPaymentsListColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(VENDOR_PAYMENTS_LIST_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  return useColumnConfig(
    VENDOR_PAYMENTS_LIST_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredVendorPaymentsListColumnConfig,
    getStoredVendorPaymentsListColumnConfig,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'vendor_name' },
  );
}
