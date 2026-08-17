import { useMemo } from 'react';

import {
  BILL_AND_INVOICE_LIST_COLUMN_TABLE_ID,
  BILL_AND_INVOICE_LIST_COLUMNS,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const COLUMN_PREF_DEBOUNCE_MS = 300;

export function getStoredBillAndInvoiceListColumnConfig() {
  try {
    const raw = localStorage.getItem(`column-config:${BILL_AND_INVOICE_LIST_COLUMN_TABLE_ID}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredBillAndInvoiceListColumnConfig(config) {
  try {
    localStorage.setItem(
      `column-config:${BILL_AND_INVOICE_LIST_COLUMN_TABLE_ID}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage errors
  }
}

export function useBillAndInvoiceListColumnConfig() {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(BILL_AND_INVOICE_LIST_COLUMNS).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  return useColumnConfig(
    BILL_AND_INVOICE_LIST_COLUMN_TABLE_ID,
    defaultColumnConfig,
    saveStoredBillAndInvoiceListColumnConfig,
    getStoredBillAndInvoiceListColumnConfig,
    { autoSave: true, debounce: COLUMN_PREF_DEBOUNCE_MS, pinnedColumnId: 'invoice_no' },
  );
}
