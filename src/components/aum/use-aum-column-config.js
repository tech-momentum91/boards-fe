import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import {
  AUM_ASSET_LIST_COLUMN_CONFIG,
  AUM_ASSET_IN_LIST_TABLE_ID,
  AUM_ASSET_LIST_TABLE_ID,
  AUM_ASSET_OUT_LIST_TABLE_ID,
  AUM_IN_COLUMN_CONFIG,
  AUM_LIST_PREF_DOCTYPE,
  AUM_MAINTENANCE_TASK_LIST_TABLE_ID,
  AUM_OUT_COLUMN_CONFIG,
  AUM_PINNED_COLUMN_ID,
  AUM_PREVENTIVE_CHECKS_LIST_TABLE_ID,
} from '@/components/aum/constants';
import {
  MWQ_PREVENTIVE_COLUMN_CONFIG,
  MWQ_TASK_COLUMN_CONFIG,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import { fetchAumListPref, saveAumListPref } from '@/redux/aumListPrefSlice';

function useAumColumnConfig({ reactTableId, doctype, columnDefs }) {
  const dispatch = useDispatch();
  const pinnedColumnId = AUM_PINNED_COLUMN_ID[reactTableId] ?? null;

  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(columnDefs).map((column, index) => ({
        ...column,
        order: index,
      })),
    [columnDefs],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchColumns = useCallback(async () => {
    try {
      const data = await dispatch(
        fetchAumListPref({
          doctype,
          react_table_id: reactTableId,
        }),
      ).unwrap();
      if (!Array.isArray(data) || data.length === 0) return null;

      const savedIds = new Set(data.map((column) => column.id));
      const saved = data.filter((column) => expectedColumnIds.has(column.id));
      if (saved.length === 0) return null;

      // Ignore stale prefs that reference removed column ids (e.g. legacy `product`).
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? saved : null;
    } catch {
      return null;
    }
  }, [dispatch, doctype, expectedColumnIds, reactTableId]);

  const persistColumns = useCallback(
    async (columns) => {
      await dispatch(
        saveAumListPref({
          doctype,
          react_table_id: reactTableId,
          columns,
        }),
      ).unwrap();
    },
    [dispatch, doctype, reactTableId],
  );

  const columnConfig = useColumnConfig(
    reactTableId,
    defaultColumnConfig,
    persistColumns,
    fetchColumns,
    {
      autoSave: true,
      debounce: 300,
      pinnedColumnId,
    },
  );

  return {
    ...columnConfig,
    pinnedColumnId,
  };
}

export function useAumAssetListColumnConfig() {
  return useAumColumnConfig({
    reactTableId: AUM_ASSET_LIST_TABLE_ID,
    doctype: AUM_LIST_PREF_DOCTYPE.ASSET,
    columnDefs: AUM_ASSET_LIST_COLUMN_CONFIG,
  });
}

export function useAumAssetInListColumnConfig() {
  return useAumColumnConfig({
    reactTableId: AUM_ASSET_IN_LIST_TABLE_ID,
    doctype: AUM_LIST_PREF_DOCTYPE.ASSET_IN,
    columnDefs: AUM_IN_COLUMN_CONFIG,
  });
}

export function useAumAssetOutListColumnConfig() {
  return useAumColumnConfig({
    reactTableId: AUM_ASSET_OUT_LIST_TABLE_ID,
    doctype: AUM_LIST_PREF_DOCTYPE.ASSET_OUT,
    columnDefs: AUM_OUT_COLUMN_CONFIG,
  });
}

export function useAumPreventiveChecksColumnConfig() {
  return useAumColumnConfig({
    reactTableId: AUM_PREVENTIVE_CHECKS_LIST_TABLE_ID,
    doctype: AUM_LIST_PREF_DOCTYPE.MAINTENANCE_LOG,
    columnDefs: MWQ_PREVENTIVE_COLUMN_CONFIG,
  });
}

export function useAumMaintenanceTaskColumnConfig() {
  return useAumColumnConfig({
    reactTableId: AUM_MAINTENANCE_TASK_LIST_TABLE_ID,
    doctype: AUM_LIST_PREF_DOCTYPE.MAINTENANCE_LOG,
    columnDefs: MWQ_TASK_COLUMN_CONFIG,
  });
}
