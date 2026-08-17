import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CrmLeadsSaveViewMenu from '@/components/crm-leads/crm-leads-save-view-menu';
import { useCrmAccountSaveView } from '@/hooks/use-crm-account-save-view';
import { ACCOUNT_COLUMN_DEFS, DEFAULT_ACCOUNT_FILTERS } from '@/components/crm-accounts/constants';
import { ACCOUNT_VIEW_SAVE_SCOPES } from '@/pages/crm/accounts-view/account-view-settings';

/**
 * Shared Save View + column bridge for CRM Accounts list hosts
 * (main page, CP embeds, contact/lead account tabs).
 */
export function useCrmAccountListSaveViewBridge({
  viewKey,
  legacyReactTableId,
  appliedFilters,
  setAppliedFilters,
  sorting,
  setSorting,
  groupBy = '',
  setGroupBy,
  groupOrder = 'asc',
  setGroupOrder,
  searchTerm,
  setSearchTerm,
  tableRef,
  enabled = true,
}) {
  const columnsForViewRef = useRef([]);
  const [liveColumnConfig, setLiveColumnConfig] = useState([]);

  const handleApplyViewSettings = useCallback(
    (settings) => {
      const nextFilters = settings?.filters ?? DEFAULT_ACCOUNT_FILTERS;
      const nextGrouping = settings?.grouping ?? { groupBy: '', groupOrder: 'asc' };
      const nextSettings = settings?.settings ?? {};
      const nextColumns = Array.isArray(settings?.columns) ? settings.columns : [];

      setAppliedFilters({
        ...DEFAULT_ACCOUNT_FILTERS,
        ...nextFilters,
      });
      setSorting(Array.isArray(settings?.sorting) ? settings.sorting : []);
      if (typeof setGroupBy === 'function') {
        setGroupBy(typeof nextGrouping.groupBy === 'string' ? nextGrouping.groupBy : '');
      }
      if (typeof setGroupOrder === 'function') {
        setGroupOrder(nextGrouping.groupOrder === 'desc' ? 'desc' : 'asc');
      }
      setSearchTerm(typeof nextSettings.search === 'string' ? nextSettings.search : '');
      columnsForViewRef.current = nextColumns;
      setLiveColumnConfig(nextColumns);
    },
    [setAppliedFilters, setGroupBy, setGroupOrder, setSearchTerm, setSorting],
  );

  const {
    viewHydrated,
    isViewDirty,
    hasPersonalView,
    canSaveViewForAll,
    isAutosaveEnabled,
    isSavingView,
    savedColumns,
    handleSaveView,
    handleRevertView,
    handleResetToDefault,
    handleToggleAutosave,
    reportColumnsChange,
  } = useCrmAccountSaveView({
    appliedFilters,
    sorting,
    groupBy,
    groupOrder,
    searchTerm,
    viewKey,
    legacyReactTableId,
    columnsRef: columnsForViewRef,
    onApplyViewSettings: handleApplyViewSettings,
    enabled,
  });

  useEffect(() => {
    if (Array.isArray(savedColumns) && savedColumns.length > 0) {
      columnsForViewRef.current = savedColumns;
      setLiveColumnConfig(savedColumns);
    }
  }, [savedColumns]);

  const persistColumnConfig = useCallback(
    async (cols) => {
      const next = Array.isArray(cols) ? cols : [];
      columnsForViewRef.current = next;
      setLiveColumnConfig(next);
      reportColumnsChange(cols);
    },
    [reportColumnsChange],
  );

  const fetchColumnConfig = useCallback(async () => {
    return Array.isArray(savedColumns) ? savedColumns : [];
  }, [savedColumns]);

  const applyColumnsToTable = useCallback(
    (cols) => {
      tableRef?.current?.columnConfigHook?.applyExternalConfig?.(Array.isArray(cols) ? cols : []);
    },
    [tableRef],
  );

  const syncColumnsFromTable = useCallback(() => {
    const liveColumns = tableRef?.current?.columnConfigHook?.columns;
    if (Array.isArray(liveColumns) && liveColumns.length > 0) {
      columnsForViewRef.current = liveColumns.map((col, index) => ({
        id: col.id,
        visible: col.visible !== false,
        order: typeof col.order === 'number' ? col.order : index,
        label: typeof col.label === 'string' ? col.label : col.id,
        enableHiding: col.enableHiding !== false,
      }));
    }
  }, [tableRef]);

  const handleSaveViewForMe = useCallback(() => {
    syncColumnsFromTable();
    return handleSaveView({ scope: ACCOUNT_VIEW_SAVE_SCOPES.ME });
  }, [handleSaveView, syncColumnsFromTable]);

  const handleSaveViewForAll = useCallback(() => {
    syncColumnsFromTable();
    return handleSaveView({ scope: ACCOUNT_VIEW_SAVE_SCOPES.ALL });
  }, [handleSaveView, syncColumnsFromTable]);

  const handleRevertChanges = useCallback(() => {
    handleRevertView();
    requestAnimationFrame(() => {
      applyColumnsToTable(columnsForViewRef.current);
    });
  }, [applyColumnsToTable, handleRevertView]);

  const handleResetViewToDefault = useCallback(
    async (args) => {
      await handleResetToDefault(args);
      requestAnimationFrame(() => {
        applyColumnsToTable(columnsForViewRef.current);
      });
    },
    [applyColumnsToTable, handleResetToDefault],
  );

  const visibleColumnIds = useMemo(() => {
    const source =
      Array.isArray(liveColumnConfig) && liveColumnConfig.length > 0
        ? liveColumnConfig
        : ACCOUNT_COLUMN_DEFS;
    return source
      .filter((col) => col && col.visible !== false)
      .map((col) => col.id)
      .filter(Boolean);
  }, [liveColumnConfig]);

  const saveViewMenu = (
    <CrmLeadsSaveViewMenu
      isDirty={isViewDirty}
      hasPersonalView={hasPersonalView}
      canSaveViewForAll={canSaveViewForAll}
      isAutosaveEnabled={isAutosaveEnabled}
      isSaving={isSavingView}
      onSaveForMe={handleSaveViewForMe}
      onSaveForAll={handleSaveViewForAll}
      onResetToDefault={handleResetViewToDefault}
      onToggleAutosave={handleToggleAutosave}
      onRevertChanges={handleRevertChanges}
    />
  );

  return {
    viewHydrated,
    persistColumnConfig,
    fetchColumnConfig,
    visibleColumnIds,
    saveViewMenu,
  };
}
