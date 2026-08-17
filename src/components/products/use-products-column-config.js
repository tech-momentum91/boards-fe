import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import {
  PRODUCTS_COLUMN_CONFIG_BY_TAB,
  getProductsColumnConfigTableId,
} from '@/components/products/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import { fetchProductsListPref, saveProductsListPref } from '@/redux/productsSlice';

export function useProductsColumnConfig(tabId) {
  const dispatch = useDispatch();
  const reactTableId = getProductsColumnConfigTableId(tabId);

  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PRODUCTS_COLUMN_CONFIG_BY_TAB[tabId] ?? []).map((column, index) => ({
        ...column,
        order: index,
      })),
    [tabId],
  );

  const listPrefCustomColumns = useMemo(
    () => defaultColumnConfig.map(({ id, label }) => ({ id, label })),
    [defaultColumnConfig],
  );

  const fetchColumns = useCallback(async () => {
    try {
      const data = await dispatch(
        fetchProductsListPref({
          react_table_id: reactTableId,
          custom_columns: listPrefCustomColumns,
        }),
      ).unwrap();
      if (!Array.isArray(data) || data.length === 0) return null;

      const knownIds = new Set(defaultColumnConfig.map((column) => column.id));
      const saved = data.filter((column) => knownIds.has(column.id));
      if (saved.length === 0) return null;

      // Return partial saved prefs; useColumnConfig merges in any newly added default columns.
      return saved;
    } catch {
      return null;
    }
  }, [defaultColumnConfig, dispatch, listPrefCustomColumns, reactTableId]);

  const persistColumns = useCallback(
    async (columns) => {
      await dispatch(saveProductsListPref({ react_table_id: reactTableId, columns })).unwrap();
    },
    [dispatch, reactTableId],
  );

  return useColumnConfig(reactTableId, defaultColumnConfig, persistColumns, fetchColumns, {
    autoSave: true,
    debounce: 300,
  });
}
