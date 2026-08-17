import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import {
  listCrmAccounts,
  updateCrmAccount,
  buildSingleFieldPayload,
  getCustomerGroupList,
  getIndustryTypeList,
  getSalesTeamUserList,
} from '@/api/crmAccounts';
import { getCrmContactsByCpAccount } from '@/api/crmContacts';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { flattenGroupedListResults, DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';
import { useClientPagination } from '@/hooks/use-client-pagination';
import { useCrmAccountListSaveViewBridge } from '@/hooks/use-crm-account-list-save-view-bridge';
import { useCrmLeadSizeOptions } from '@/hooks/use-crm-lead-size-options';
import CrmAccountsToolbar from '@/components/crm-accounts/crm-accounts-toolbar';
import CrmAccountsTable from '@/components/crm-accounts/crm-accounts-table';
import CrmAccountsBulkActionsBar from '@/components/crm-accounts/crm-accounts-bulk-actions-bar';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import {
  REACT_TABLE_ID_CP_ACCOUNT_CRM_ACCOUNTS,
  CP_ACCOUNT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY,
  CP_ACCOUNT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY,
  DEFAULT_ACCOUNT_FILTERS,
} from '@/components/crm-accounts/constants';
import { buildCrmAccountApiFilters } from '@/utils/date-utils';
import { normalizeAccount, SORT_FIELD_MAP } from '@/pages/crm/crm-accounts';
import CpAccountCrmContactsToolbar from './cp-account-crm-contacts-toolbar';
import CpAccountCrmContactsTable from './cp-account-crm-contacts-table';

function loadCpAccountCrmWidthOverrides() {
  try {
    const raw = localStorage.getItem(CP_ACCOUNT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveCpAccountCrmWidthOverrides(overrides) {
  try {
    localStorage.setItem(CP_ACCOUNT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadCpAccountCrmResizeEnabled() {
  try {
    const raw = localStorage.getItem(CP_ACCOUNT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveCpAccountCrmResizeEnabled(enabled) {
  try {
    localStorage.setItem(CP_ACCOUNT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/** CRM accounts for this CP Account — same list UX as CP Contact tab (`listCrmAccounts` + `cp_account`). */
function CpAccountLinkedCrmAccountsPanel({ cpAccountId }) {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const isBulkApplyingRef = useRef(false);
  const bulkOpGenerationRef = useRef(0);

  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, resetPagination, paginationProps, fetchRef } =
    useOffsetPagination({ initialPage: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...DEFAULT_ACCOUNT_FILTERS }));
  const [sorting, setSorting] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const [columnWidthOverrides, setColumnWidthOverrides] = useState(loadCpAccountCrmWidthOverrides);
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(loadCpAccountCrmResizeEnabled);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [typeOfOrgOptions, setTypeOfOrgOptions] = useState([]);
  const [industryGroups, setIndustryGroups] = useState([]);
  const employeeOptions = useCrmLeadSizeOptions();

  const { viewHydrated, persistColumnConfig, fetchColumnConfig, visibleColumnIds, saveViewMenu } =
    useCrmAccountListSaveViewBridge({
      viewKey: REACT_TABLE_ID_CP_ACCOUNT_CRM_ACCOUNTS,
      legacyReactTableId: REACT_TABLE_ID_CP_ACCOUNT_CRM_ACCOUNTS,
      appliedFilters,
      setAppliedFilters,
      sorting,
      setSorting,
      searchTerm,
      setSearchTerm,
      tableRef,
    });

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';

    const filters = buildCrmAccountApiFilters(
      appliedFilters,
      cpAccountId ? { cp_account: cpAccountId } : {},
    );

    return { orderBy, orderDirection, filters };
  }, [sorting, appliedFilters, cpAccountId]);

  const fetchAccounts = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
      if (!cpAccountId) {
        setAccounts([]);
        resetPagination(0);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const { orderBy, orderDirection, filters } = apiParams;
        const result = await listCrmAccounts({
          keyword: debouncedSearchTerm || undefined,
          page: fetchPage,
          pageSize: pageSizeParam ?? pageSize,
          orderBy,
          orderDir: orderDirection,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
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
    [apiParams, debouncedSearchTerm, cpAccountId, pageSize, applyPaginationMeta, resetPagination],
  );

  fetchRef.current = fetchAccounts;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        ca: cpAccountId || '',
        k: debouncedSearchTerm,
        f: appliedFilters,
        s: sorting,
      }),
    [cpAccountId, debouncedSearchTerm, appliedFilters, sorting],
  );

  const fetchAccountsRef = useRef(fetchAccounts);
  fetchAccountsRef.current = fetchAccounts;

  useEffect(() => {
    if (!cpAccountId) {
      setAccounts([]);
      setError(null);
      setIsLoading(false);
      resetPagination(0);
      return;
    }
    if (!viewHydrated) return;
    setSelectedAccountIds([]);
    fetchAccountsRef.current(1, false);
  }, [filterKey, cpAccountId, resetPagination, viewHydrated]);

  const handleColumnResize = useCallback((columnId, width) => {
    setColumnWidthOverrides((prev) => {
      const next = { ...prev, [columnId]: width };
      saveCpAccountCrmWidthOverrides(next);
      return next;
    });
  }, []);

  const handleResizeEnabledChange = useCallback((enabled) => {
    setResizeColumnsEnabled(enabled);
    saveCpAccountCrmResizeEnabled(enabled);
  }, []);

  const handleResetColumnSizes = useCallback(() => {
    setColumnWidthOverrides({});
    saveCpAccountCrmWidthOverrides({});
  }, []);

  const columnWidths = useMemo(() => columnWidthOverrides, [columnWidthOverrides]);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setAppliedFilters((previous) => ({ ...previous, ...newFilters }));
  }, []);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getSalesTeamUserList(),
      getCustomerGroupList(),
      getIndustryTypeList({ grouped: true, scope: 'crm' }),
    ]).then(([sales, typeOfOrg, indOptions]) => {
      if (!isMounted) return;
      setSalesOwnerOptions(Array.isArray(sales) ? sales : []);
      setTypeOfOrgOptions(Array.isArray(typeOfOrg) ? typeOfOrg : []);
      const groups = Array.isArray(indOptions?.industry_type)
        ? indOptions.industry_type.filter(
            (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
          )
        : [];
      setIndustryGroups(groups);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFieldUpdate = useCallback(
    async (accountName, fieldName, value) => {
      try {
        const payload = buildSingleFieldPayload(fieldName, value);
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
            const payload = buildPayload(accountId);
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
      await runBulkAccountUpdate(() => buildSingleFieldPayload(fieldKey, value));
    },
    [isBulkApplying, runBulkAccountUpdate],
  );

  const tableRows = useMemo(() => accounts.map((a) => ({ ...a })), [accounts]);

  const handleRowClick = useCallback(
    (row) => {
      const id = row.name || row.account_name;
      if (id) navigate(`/crm/accounts/${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const handleRetry = useCallback(() => {
    fetchAccounts(1, false);
  }, [fetchAccounts]);

  return (
    <div className='flex flex-col h-full min-h-0 gap-4 px-6 pt-4 pb-0'>
      <CrmAccountsToolbar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        tableRef={tableRef}
        onFiltersChange={handleFiltersChange}
        appliedFilters={appliedFilters}
        showGroupBy={false}
        resizeColumnsEnabled={resizeColumnsEnabled}
        onResizeEnabledChange={handleResizeEnabledChange}
        onResetColumnSizes={handleResetColumnSizes}
        showAddButton={false}
        saveViewMenu={saveViewMenu}
      />

      <PaginatedTableLayout
        className='flex-1 min-h-0 rounded-xl border border-stroke-soft-200 bg-bg-white-0 overflow-hidden flex flex-col'
        {...paginationProps}
      >
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
          columnConfigId={
            viewHydrated
              ? REACT_TABLE_ID_CP_ACCOUNT_CRM_ACCOUNTS
              : `${REACT_TABLE_ID_CP_ACCOUNT_CRM_ACCOUNTS}-boot`
          }
          hideActionsColumn
          onRowClick={handleRowClick}
          onSalesOwnerUpdate={handleSalesOwnerUpdate}
          onTypeOfOrganizationUpdate={handleTypeOfOrganizationUpdate}
          onIndustryUpdate={handleIndustryUpdate}
          onNoOfEmployeesUpdate={handleNoOfEmployeesUpdate}
          salesOwnerOptions={salesOwnerOptions}
          typeOfOrgOptions={typeOfOrgOptions}
          industryGroups={industryGroups}
          emptyStateTitle='No CRM accounts'
          emptyStateDescription='CRM accounts linked to this CP account will appear here.'
          enableSelection
          selectedAccountIds={selectedAccountIds}
          onToggleAccountSelection={handleToggleAccountSelection}
          onToggleSelectAll={handleToggleSelectAllAccounts}
        />
      </PaginatedTableLayout>

      <CrmAccountsBulkActionsBar
        selectedCount={selectedAccountIds.length}
        visibleColumnIds={visibleColumnIds}
        salesOwnerOptions={salesOwnerOptions}
        typeOfOrgOptions={typeOfOrgOptions}
        industryGroups={industryGroups}
        employeeOptions={employeeOptions}
        onClear={() => setSelectedAccountIds([])}
        onApplyField={handleBulkApplyField}
        disabled={isBulkApplying}
      />
    </div>
  );
}

const CpAccountCrmAccountsSection = ({ cpAccountId, mode = 'accounts' }) => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const isContactsMode = mode === 'contacts';

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    isContactsMode ? 'cp-account-crm-contacts-table' : 'cp-account-crm-accounts-table',
    'compact',
  );

  const fetchContacts = useCallback(() => {
    if (!cpAccountId) return;
    setIsLoading(true);
    setError(null);
    getCrmContactsByCpAccount(cpAccountId)
      .then((list) => {
        setContacts(Array.isArray(list) ? list : []);
        setError(null);
      })
      .catch((error_) => {
        setError(error_?.message || 'Failed to load contacts.');
        setContacts([]);
      })
      .finally(() => setIsLoading(false));
  }, [cpAccountId]);

  useEffect(() => {
    if (!cpAccountId) {
      setContacts([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (isContactsMode) {
      fetchContacts();
    }
  }, [cpAccountId, fetchContacts, isContactsMode]);

  const contactRows = useMemo(() => {
    const list = Array.isArray(contacts) ? contacts : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.account || '').toLowerCase().includes(q) ||
        (c.cp_contact_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const { paginatedItems: paginatedContactRows, paginationProps: contactPaginationProps } =
    useClientPagination(contactRows, {
      initialPageSize: DEFAULT_LIST_PAGE_SIZE,
      resetOnChange: [contactRows],
    });

  if (!isContactsMode) {
    return <CpAccountLinkedCrmAccountsPanel cpAccountId={cpAccountId} />;
  }

  return (
    <div className='flex flex-col h-full min-h-0 gap-4 px-6 pt-4 pb-0'>
      <CpAccountCrmContactsToolbar
        search={search}
        onSearchChange={setSearch}
        tableVariant={tableVariant}
        onTableVariantToggle={toggleTableVariant}
      />

      <PaginatedTableLayout
        className='flex-1 min-h-0 rounded-xl border border-stroke-soft-200 bg-bg-white-0 overflow-hidden flex flex-col'
        {...contactPaginationProps}
      >
        <CpAccountCrmContactsTable
          rows={paginatedContactRows}
          isLoading={isLoading}
          error={error}
          variant={tableVariant}
        />
      </PaginatedTableLayout>
    </div>
  );
};

export default CpAccountCrmAccountsSection;
