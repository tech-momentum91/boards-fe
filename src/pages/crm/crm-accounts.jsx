import React, { useCallback, useMemo, useRef, useState, useEffect, lazy, Suspense } from 'react';
import { RiBuildingLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/page-layout';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import CrmAccountsTable from '@/components/crm-accounts/crm-accounts-table';
import CrmAccountsToolbar from '@/components/crm-accounts/crm-accounts-toolbar';
import CrmAccountsBulkActionsBar from '@/components/crm-accounts/crm-accounts-bulk-actions-bar';
import CrmLeadsSaveViewMenu from '@/components/crm-leads/crm-leads-save-view-menu';
import { useDebounce } from '@/hooks/use-debounce';
import { useCrmAccountSaveView } from '@/hooks/use-crm-account-save-view';
import { useCrmLeadSizeOptions } from '@/hooks/use-crm-lead-size-options';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import { flattenGroupedListResults } from '@/utils/list-pagination-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  DEFAULT_ACCOUNT_FILTERS,
  ACCOUNT_COLUMN_STORAGE_KEY,
  ACCOUNT_RESIZE_ENABLED_KEY,
  ACCOUNT_COLUMN_DEFS,
} from '@/components/crm-accounts/constants';
import { ACCOUNT_VIEW_SAVE_SCOPES } from '@/pages/crm/accounts-view/account-view-settings';
import { buildCrmAccountApiFilters } from '@/utils/date-utils';
import {
  listCrmAccounts,
  updateCrmAccount,
  buildSingleFieldPayload,
  getCustomerGroupList,
  getIndustryTypeList,
  getSalesTeamUserList,
  deleteCrmAccount,
} from '@/api/crmAccounts';
import { getCpAccountOptions, getCpContactLinkOptions } from '@/api/crmLeads';
import { getCpContactById } from '@/services/cp-contacts-service';

const CrmAccountCreateDrawer = lazy(
  () => import('@/components/crm-accounts/crm-account-create-drawer'),
);

const REACT_TABLE_ID = 'crm-accounts-table';
const ACCOUNT_VIEW_KEY = 'default';

// ── Field maps for server-side sort / group ───────────────────────────────────
export const SORT_FIELD_MAP = {
  name: 'customer_name',
  custom_legal_name: 'custom_legal_name',
  created_at: 'creation',
  last_modified_at: 'modified',
  sales_owner: 'sales_owner',
  cp_account: 'cp_account',
  cp_contact: 'cp_contact',
  type_of_organization: 'customer_group',
  year_of_establishment: 'custom_year_of_establishment',
  no_of_employees: 'number_of_employees',
  industry: 'industry',
};

// Frontend groupBy value → backend group_by param
export const GROUP_BY_FIELD_MAP = {
  type_of_organization: 'customer_group',
  industry: 'industry',
  sales_owner: 'sales_owner',
};

// ── Normalize an API row to the shape the table expects ──────────────────────
export function normalizeAccount(row) {
  const so = row.sales_owner || {};
  const salesOwnerName = so.name || so.email || '';

  // year_of_establishment comes back as a date string "YYYY-MM-DD"; extract year only
  const yearRaw = row.year_of_establishment;
  const year = yearRaw ? String(yearRaw).slice(0, 4) : '';

  return {
    name: row.name,
    account_name: row.customer_name || row.name,
    custom_legal_name: row.custom_legal_name || '',
    creation: row.created_at,
    last_modified_at: row.last_modified_at || row.modified || '',
    website: row.website || '',
    related_contacts: Array.isArray(row.related_contacts) ? row.related_contacts : [],
    sales_owner: salesOwnerName,
    sales_owner_email: so.email || '',
    type_of_organization: row.type_of_organization || '',
    industry: row.industry || '',
    year_of_establishment: year,
    no_of_employees:
      row.no_of_employees === null || row.no_of_employees === undefined
        ? ''
        : String(row.no_of_employees),
    cp_account: row.cp_account || '',
    cp_account_name: row.cp_account_name || row.cp_account || '',
    cp_contact: row.cp_contact || '',
    cp_contact_name: row.cp_contact_name || row.cp_contact || '',
  };
}

// ── localStorage helpers for column widths ────────────────────────────────────
function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(ACCOUNT_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(ACCOUNT_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(ACCOUNT_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(ACCOUNT_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
const CrmAccounts = () => {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const columnsForViewRef = useRef([]);
  const isBulkApplyingRef = useRef(false);
  const bulkOpGenerationRef = useRef(0);

  // ── Data state ───────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState([]);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, paginationProps, fetchRef } =
    useOffsetPagination({ initialPageSize: 50, initialPage: 0 });

  // ── UI state (Save View owns filters/search/sort/group after hydrate) ────
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...DEFAULT_ACCOUNT_FILTERS }));
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() => loadWidthOverrides());
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() => loadResizeEnabled());
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [typeOfOrgOptions, setTypeOfOrgOptions] = useState([]);
  const [industryGroups, setIndustryGroups] = useState([]);
  const [cpAccountOptions, setCpAccountOptions] = useState([]);
  const [cpContactOptions, setCpContactOptions] = useState([]);
  const [liveColumnConfig, setLiveColumnConfig] = useState([]);
  const employeeOptions = useCrmLeadSizeOptions();

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const handleFiltersChange = useCallback((newFilters) => {
    setAppliedFilters((prev) => {
      const merged = { ...prev, ...newFilters };
      if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
      return merged;
    });
  }, []);

  const handleApplyViewSettings = useCallback((settings) => {
    const nextFilters = settings?.filters ?? DEFAULT_ACCOUNT_FILTERS;
    const nextGrouping = settings?.grouping ?? { groupBy: '', groupOrder: 'asc' };
    const nextSettings = settings?.settings ?? {};
    const nextColumns = Array.isArray(settings?.columns) ? settings.columns : [];

    setAppliedFilters({
      ...DEFAULT_ACCOUNT_FILTERS,
      ...nextFilters,
    });
    setSorting(Array.isArray(settings?.sorting) ? settings.sorting : []);
    setGroupBy(typeof nextGrouping.groupBy === 'string' ? nextGrouping.groupBy : '');
    setGroupOrder(nextGrouping.groupOrder === 'desc' ? 'desc' : 'asc');
    setSearchTerm(typeof nextSettings.search === 'string' ? nextSettings.search : '');
    columnsForViewRef.current = nextColumns;
    setLiveColumnConfig(nextColumns);
  }, []);

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
    viewKey: ACCOUNT_VIEW_KEY,
    legacyReactTableId: REACT_TABLE_ID,
    columnsRef: columnsForViewRef,
    onApplyViewSettings: handleApplyViewSettings,
  });

  useEffect(() => {
    if (Array.isArray(savedColumns) && savedColumns.length > 0) {
      columnsForViewRef.current = savedColumns;
      setLiveColumnConfig(savedColumns);
    }
  }, [savedColumns]);

  // ── Build API params ──────────────────────────────────────────────────────
  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';
    const filters = buildCrmAccountApiFilters(appliedFilters);
    const apiGroupBy = GROUP_BY_FIELD_MAP[groupBy] || null;
    return { orderBy, orderDirection, filters, apiGroupBy };
  }, [sorting, appliedFilters, groupBy]);

  // ── Fetch accounts ────────────────────────────────────────────────────────
  const fetchAccounts = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const { orderBy, orderDirection, filters, apiGroupBy } = apiParams;
        const result = await listCrmAccounts({
          keyword: debouncedSearchTerm || undefined,
          page: fetchPage,
          pageSize: pageSizeParam ?? pageSize,
          orderBy,
          orderDir: orderDirection,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          groupBy: apiGroupBy || undefined,
          groupOrder: apiGroupBy ? groupOrder : undefined,
        });

        const flatRows = flattenGroupedListResults(result, normalizeAccount);

        if (append) {
          setAccounts((previous) => [...previous, ...flatRows]);
        } else {
          setAccounts(flatRows);
        }
        applyPaginationMeta(result, fetchPage);
      } catch (error_) {
        setError(error_);
        showErrorToast('Failed to load accounts');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [apiParams, debouncedSearchTerm, groupOrder, pageSize, applyPaginationMeta],
  );

  fetchRef.current = fetchAccounts;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        k: debouncedSearchTerm,
        f: appliedFilters,
        s: sorting,
        g: groupBy,
        go: groupOrder,
      }),
    [debouncedSearchTerm, appliedFilters, sorting, groupBy, groupOrder],
  );

  const fetchAccountsRef = useRef(fetchAccounts);
  fetchAccountsRef.current = fetchAccounts;

  useEffect(() => {
    if (!viewHydrated) return;
    setSelectedAccountIds([]);
    fetchAccountsRef.current(1, false);
  }, [filterKey, viewHydrated]);

  // ── Column preference callbacks (Save View owns persist) ─────────────────
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

  const applyColumnsToTable = useCallback((cols) => {
    tableRef.current?.columnConfigHook?.applyExternalConfig?.(Array.isArray(cols) ? cols : []);
  }, []);

  const syncColumnsFromTable = useCallback(() => {
    const liveColumns = tableRef.current?.columnConfigHook?.columns;
    if (Array.isArray(liveColumns) && liveColumns.length > 0) {
      columnsForViewRef.current = liveColumns.map((col, index) => ({
        id: col.id,
        visible: col.visible !== false,
        order: typeof col.order === 'number' ? col.order : index,
        label: typeof col.label === 'string' ? col.label : col.id,
        enableHiding: col.enableHiding !== false,
      }));
    }
  }, []);

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

  // ── Column resizing ──────────────────────────────────────────────────────
  const handleColumnResize = useCallback((columnId, width) => {
    setColumnWidthOverrides((previous) => {
      const next = { ...previous, [columnId]: width };
      saveWidthOverrides(next);
      return next;
    });
  }, []);

  const handleResizeEnabledChange = useCallback((enabled) => {
    setResizeColumnsEnabled(enabled);
    saveResizeEnabled(enabled);
  }, []);

  const handleResetColumnSizes = useCallback(() => {
    setColumnWidthOverrides({});
    saveWidthOverrides({});
  }, []);

  const columnWidths = useMemo(() => columnWidthOverrides, [columnWidthOverrides]);

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

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
  }, []);

  const handleGroupOrderChange = useCallback((value) => {
    setGroupOrder(value);
  }, []);

  const handleCreateAccount = useCallback(
    async (contactsLinkError) => {
      if (contactsLinkError) {
        showErrorToast('Account created, but failed to link CRM Contacts');
      } else {
        showSuccessToast('Account created successfully');
      }
      await fetchAccounts(1, false);
    },
    [fetchAccounts],
  );

  const handleRowClick = useCallback(
    (row) => {
      const rowId = encodeURIComponent(row.name || row.account_name || '');
      navigate(`/crm/accounts/${rowId}`);
    },
    [navigate],
  );

  const handleRelatedContactsClick = useCallback(
    (row) => {
      const rowId = encodeURIComponent(row?.name || row?.account_name || '');
      if (rowId) navigate(`/crm/accounts/${rowId}?tab=contacts`);
    },
    [navigate],
  );

  const handleRetry = useCallback(() => {
    fetchAccounts(1, false);
  }, [fetchAccounts]);

  const handleToggleAccountSelection = useCallback((accountId) => {
    const id = String(accountId || '').trim();
    if (!id) return;
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleToggleSelectAllAccounts = useCallback(() => {
    const visibleIds = accounts.map((row) => String(row?.name || '').trim()).filter(Boolean);
    setSelectedAccountIds((prev) => {
      const prevSet = new Set(prev);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prevSet.has(id));
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return [...next];
    });
  }, [accounts]);

  const handleClearSelection = useCallback(() => {
    setSelectedAccountIds([]);
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getSalesTeamUserList(),
      getCustomerGroupList(),
      getIndustryTypeList({ grouped: true, scope: 'crm' }),
      getCpAccountOptions(),
      getCpContactLinkOptions(),
    ]).then(([sales, typeOfOrg, indOptions, cpAccounts, cpContacts]) => {
      if (isMounted) {
        setSalesOwnerOptions(Array.isArray(sales) ? sales : []);
        setTypeOfOrgOptions(Array.isArray(typeOfOrg) ? typeOfOrg : []);
        const groups = Array.isArray(indOptions?.industry_type)
          ? indOptions.industry_type.filter(
              (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
            )
          : [];
        setIndustryGroups(groups);
        setCpAccountOptions(Array.isArray(cpAccounts) ? cpAccounts : []);
        setCpContactOptions(Array.isArray(cpContacts) ? cpContacts : []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFieldUpdate = useCallback(
    async (accountName, fieldName, value) => {
      try {
        let payload = buildSingleFieldPayload(fieldName, value);
        if (fieldName === 'cp_account') {
          payload = { ...payload, cp_contact: '' };
        }
        await updateCrmAccount(accountName, payload);
        showSuccessToast('Saved');
        await fetchAccounts(Math.max(1, pagination.page), false);
      } catch (error_) {
        showErrorToast(error_?.response?.data?.message || 'Failed to update account');
      }
    },
    [fetchAccounts, pagination.page],
  );

  const handleCpAccountUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'cp_account', value),
    [handleFieldUpdate],
  );

  const handleCpContactUpdate = useCallback(
    async (accountName, value, currentCpAccount) => {
      try {
        let payload = buildSingleFieldPayload('cp_contact', value);
        if (value && !currentCpAccount) {
          try {
            const res = await getCpContactById(value);
            const acc = res?.data?.cpAccountId;
            if (acc) payload = { ...payload, cp_account: acc };
          } catch {
            // keep cp_contact-only update
          }
        }
        await updateCrmAccount(accountName, payload);
        showSuccessToast('Saved');
        await fetchAccounts(Math.max(1, pagination.page), false);
      } catch (error_) {
        showErrorToast(error_?.response?.data?.message || 'Failed to update account');
      }
    },
    [fetchAccounts, pagination.page],
  );

  const handleSalesOwnerUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'sales_owner', value),
    [handleFieldUpdate],
  );
  const handleTypeOfOrganizationUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'type_of_organization', value),
    [handleFieldUpdate],
  );
  const handleIndustryUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'industry', value),
    [handleFieldUpdate],
  );
  const handleNoOfEmployeesUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'no_of_employees', value),
    [handleFieldUpdate],
  );
  const handleCustomLegalNameUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'custom_legal_name', value),
    [handleFieldUpdate],
  );
  const handleLegalNameUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'legal_name', value),
    [handleFieldUpdate],
  );
  const handleYearsOfEstablishmentUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'year_of_establishment', value),
    [handleFieldUpdate],
  );
  const handleWebsiteUpdate = useCallback(
    (accountName, value) => handleFieldUpdate(accountName, 'website', value),
    [handleFieldUpdate],
  );

  const runBulkAccountUpdate = useCallback(
    async (buildPayload) => {
      const ids = [...selectedAccountIds];
      if (ids.length === 0 || isBulkApplyingRef.current) return;

      const generation = ++bulkOpGenerationRef.current;
      isBulkApplyingRef.current = true;
      setIsBulkApplying(true);
      const succeeded = new Set();
      let firstError = null;

      try {
        for (const accountId of ids) {
          if (generation !== bulkOpGenerationRef.current) return;
          try {
            const payload = await buildPayload(accountId);
            if (!payload || Object.keys(payload).length === 0) continue;
            await updateCrmAccount(accountId, payload);
            succeeded.add(accountId);
          } catch (error_) {
            firstError ??= error_;
          }
        }

        if (generation !== bulkOpGenerationRef.current) return;

        if (firstError) {
          showErrorToast(
            firstError?.response?.data?.message ||
              (succeeded.size > 0
                ? `Updated ${succeeded.size} of ${ids.length} accounts. Some updates failed.`
                : 'Failed to update accounts'),
          );
        } else if (succeeded.size > 0) {
          showSuccessToast(
            succeeded.size === 1
              ? 'Account updated successfully'
              : `${succeeded.size} accounts updated successfully`,
          );
        }

        if (succeeded.size > 0) {
          await fetchAccounts(Math.max(1, pagination.page), false);
        }
      } finally {
        if (generation === bulkOpGenerationRef.current) {
          // Generation gate ensures only the active bulk op clears the lock.
          // eslint-disable-next-line require-atomic-updates -- intentional after sequential awaits
          isBulkApplyingRef.current = false;
          setIsBulkApplying(false);
        }
      }
    },
    [selectedAccountIds, fetchAccounts, pagination.page],
  );

  const handleBulkApplyField = useCallback(
    async (fieldKey, value) => {
      if (!fieldKey || isBulkApplying) return;
      await runBulkAccountUpdate(async (_accountId) => {
        let payload = buildSingleFieldPayload(fieldKey, value);
        if (fieldKey === 'cp_account') {
          payload = { ...payload, cp_contact: '' };
        } else if (fieldKey === 'cp_contact' && value) {
          try {
            const res = await getCpContactById(value);
            const acc = res?.data?.cpAccountId;
            if (acc) payload = { ...payload, cp_account: acc };
          } catch {
            // keep cp_contact-only update
          }
        }
        return payload;
      });
    },
    [isBulkApplying, runBulkAccountUpdate],
  );

  const handleDeleteAccountClick = useCallback((account) => {
    setAccountToDelete(account);
  }, []);

  const handleDeleteAccountConfirm = useCallback(
    async (account) => {
      if (!account) return;
      const accountName = account.name || account.account_name;
      if (!accountName) {
        showErrorToast('Account name is required');
        return;
      }
      setAccountToDelete(null);
      try {
        await deleteCrmAccount(accountName);
        showSuccessToast('Account and related contacts and leads have been deleted.');
        setSelectedAccountIds((prev) => prev.filter((id) => id !== accountName));
        await fetchAccounts(1, false);
      } catch (error_) {
        const message =
          error_?.response?.data?.message ||
          error_?.response?.data?.exception ||
          'Failed to delete account';
        showErrorToast(message);
      }
    },
    [fetchAccounts],
  );

  const tableRows = useMemo(
    () =>
      accounts.map((a) => ({
        ...a,
        _onDelete: () => handleDeleteAccountClick(a),
      })),
    [accounts, handleDeleteAccountClick],
  );

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

  return (
    <PageLayout showDefaultHeader={false} borderDivClassName='hidden'>
      <div className='flex flex-col h-full'>
        <div className='w-full flex items-center justify-between px-7 py-5 gap-4'>
          <div className='flex items-center gap-[14px]'>
            <div className='p-3 text-text-sub-500 bg-bg-weak-100 rounded-full flex items-center justify-center'>
              <RiBuildingLine size={20} />
            </div>
            <div className='flex flex-col'>
              <span className='label-large text-text-main-900'>Account</span>
              <span className='paragraph-small text-text-sub-500'>
                Manage all your accounts details from here.
              </span>
            </div>
          </div>
        </div>
        <div className='w-[calc(100%-64px)] h-px bg-stroke-soft-200 mx-8' />

        <div className='flex flex-1 min-h-0 overflow-hidden px-7 pt-6 pb-0 flex flex-col gap-4'>
          <CrmAccountsToolbar
            searchValue={searchTerm}
            onSearchChange={handleSearchChange}
            tableRef={tableRef}
            onAddAccount={() => setIsCreateDrawerOpen(true)}
            onFiltersChange={handleFiltersChange}
            appliedFilters={appliedFilters}
            groupBy={groupBy}
            onGroupByChange={handleGroupByChange}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            resizeColumnsEnabled={resizeColumnsEnabled}
            onResizeEnabledChange={handleResizeEnabledChange}
            onResetColumnSizes={handleResetColumnSizes}
            saveViewMenu={saveViewMenu}
          />

          <PaginatedTableLayout grouped={Boolean(groupBy)} {...paginationProps}>
            <CrmAccountsTable
              ref={tableRef}
              rows={tableRows}
              isLoading={isLoading || !viewHydrated}
              error={error}
              onRetry={handleRetry}
              variant='compact'
              sorting={sorting}
              onSortingChange={handleSortingChange}
              columnWidths={columnWidths}
              onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
              persistColumnConfig={persistColumnConfig}
              fetchColumnConfig={fetchColumnConfig}
              columnConfigId={viewHydrated ? REACT_TABLE_ID : `${REACT_TABLE_ID}-boot`}
              groupBy={groupBy}
              groupOrder={groupOrder}
              onGroupByChange={handleGroupByChange}
              onRowClick={handleRowClick}
              onRelatedContactsClick={handleRelatedContactsClick}
              onSalesOwnerUpdate={handleSalesOwnerUpdate}
              onTypeOfOrganizationUpdate={handleTypeOfOrganizationUpdate}
              onIndustryUpdate={handleIndustryUpdate}
              onNoOfEmployeesUpdate={handleNoOfEmployeesUpdate}
              onCustomLegalNameUpdate={handleCustomLegalNameUpdate}
              onLegalNameUpdate={handleLegalNameUpdate}
              onYearsOfEstablishmentUpdate={handleYearsOfEstablishmentUpdate}
              onWebsiteUpdate={handleWebsiteUpdate}
              onCpAccountUpdate={handleCpAccountUpdate}
              onCpContactUpdate={handleCpContactUpdate}
              salesOwnerOptions={salesOwnerOptions}
              typeOfOrgOptions={typeOfOrgOptions}
              industryGroups={industryGroups}
              cpAccountOptions={cpAccountOptions}
              cpContactOptions={cpContactOptions}
              enableSelection
              selectedAccountIds={selectedAccountIds}
              onToggleAccountSelection={handleToggleAccountSelection}
              onToggleSelectAll={handleToggleSelectAllAccounts}
            />
          </PaginatedTableLayout>
        </div>
      </div>

      <CrmAccountsBulkActionsBar
        selectedCount={selectedAccountIds.length}
        visibleColumnIds={visibleColumnIds}
        salesOwnerOptions={salesOwnerOptions}
        typeOfOrgOptions={typeOfOrgOptions}
        industryGroups={industryGroups}
        employeeOptions={employeeOptions}
        cpAccountOptions={cpAccountOptions}
        cpContactOptions={cpContactOptions}
        onClear={handleClearSelection}
        onApplyField={handleBulkApplyField}
        disabled={isBulkApplying}
      />

      <Suspense fallback={null}>
        <CrmAccountCreateDrawer
          open={isCreateDrawerOpen}
          onOpenChange={setIsCreateDrawerOpen}
          onSuccess={handleCreateAccount}
        />
      </Suspense>

      <DeleteConfirmModal
        isOpen={Boolean(accountToDelete)}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
        title='Delete Account?'
        description='Are you sure you want to delete this account? This action cannot be undone.'
        item={accountToDelete}
        onConfirm={handleDeleteAccountConfirm}
        isLoading={false}
      />
    </PageLayout>
  );
};

export default CrmAccounts;
