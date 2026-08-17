import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import {
  listCrmAccounts,
  updateCrmAccount,
  buildSingleFieldPayload,
  getCustomerGroupList,
  getIndustryTypeList,
  getSalesTeamUserList,
} from '@/api/crmAccounts';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { flattenGroupedListResults } from '@/utils/list-pagination-utils';
import {
  getCrmAccountsColumnPreferences,
  saveCrmAccountsColumnPreferences,
} from '@/redux/settingSlice';
import CrmAccountsToolbar from '@/components/crm-accounts/crm-accounts-toolbar';
import CrmAccountsTable from '@/components/crm-accounts/crm-accounts-table';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import {
  REACT_TABLE_ID_CP_CONTACT_CRM_ACCOUNTS,
  CP_CONTACT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY,
  CP_CONTACT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY,
  DEFAULT_ACCOUNT_FILTERS,
} from '@/components/crm-accounts/constants';
import { buildCrmAccountApiFilters } from '@/utils/date-utils';
import { normalizeAccount, SORT_FIELD_MAP } from '@/pages/crm/crm-accounts';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { RiErrorWarningLine } from 'react-icons/ri';
import {
  CP_ACCOUNT_CRM_ACCOUNTS_PERSISTED_KEYS,
  getCpContactCrmAccountsFiltersStorageKey,
  mergeStoredCpContactCrmAccountsFilters,
} from './constants';

function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(CP_CONTACT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(CP_CONTACT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(CP_CONTACT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(CP_CONTACT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

const CpContactAccountsSection = ({ cpContactId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cpContactCrmAccountsTableRef = useRef(null);

  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, resetPagination, paginationProps, fetchRef } =
    useOffsetPagination({ initialPage: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const crmAccountsFiltersStorageKey = useMemo(
    () => getCpContactCrmAccountsFiltersStorageKey(cpContactId),
    [cpContactId],
  );
  const [persistedAppliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: crmAccountsFiltersStorageKey,
    defaultFilters: DEFAULT_ACCOUNT_FILTERS,
    persistIncludeKeys: CP_ACCOUNT_CRM_ACCOUNTS_PERSISTED_KEYS,
    persistTrimStringArrays: true,
  });
  const appliedFilters = useMemo(
    () => mergeStoredCpContactCrmAccountsFilters(DEFAULT_ACCOUNT_FILTERS, persistedAppliedFilters),
    [persistedAppliedFilters],
  );
  const [sorting, setSorting] = useState([]);

  const [accountToUnlink, setAccountToUnlink] = useState(null);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const [columnWidthOverrides, setColumnWidthOverrides] = useState(loadWidthOverrides);
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(loadResizeEnabled);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [typeOfOrgOptions, setTypeOfOrgOptions] = useState([]);
  const [industryGroups, setIndustryGroups] = useState([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';

    const filters = buildCrmAccountApiFilters(
      appliedFilters,
      cpContactId ? { cp_contact: cpContactId } : {},
    );

    return { orderBy, orderDirection, filters };
  }, [sorting, appliedFilters, cpContactId]);

  const fetchAccounts = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
      if (!cpContactId) {
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
    [apiParams, debouncedSearchTerm, cpContactId, pageSize, applyPaginationMeta, resetPagination],
  );

  fetchRef.current = fetchAccounts;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        cp: cpContactId || '',
        k: debouncedSearchTerm,
        f: appliedFilters,
        s: sorting,
      }),
    [cpContactId, debouncedSearchTerm, appliedFilters, sorting],
  );

  const fetchAccountsRef = useRef(fetchAccounts);
  fetchAccountsRef.current = fetchAccounts;

  useEffect(() => {
    if (!cpContactId) {
      setAccounts([]);
      setError(null);
      setIsLoading(false);
      resetPagination(0);
      return;
    }
    fetchAccountsRef.current(1, false);
  }, [filterKey, cpContactId, resetPagination]);

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmAccountsColumnPreferences({
          columns: cols,
          react_table_id: REACT_TABLE_ID_CP_CONTACT_CRM_ACCOUNTS,
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmAccountsColumnPreferences({ react_table_id: REACT_TABLE_ID_CP_CONTACT_CRM_ACCOUNTS }),
    ).unwrap();
    return result?.message ?? result?.data ?? result ?? [];
  }, [dispatch]);

  const handleColumnResize = useCallback((columnId, width) => {
    setColumnWidthOverrides((prev) => {
      const next = { ...prev, [columnId]: width };
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

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setAppliedFilters((previous) => ({ ...previous, ...newFilters }));
    },
    [setAppliedFilters],
  );

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

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

  const handleUnlinkClick = useCallback((account) => {
    setAccountToUnlink(account);
    setIsUnlinkModalOpen(true);
  }, []);

  const tableRows = useMemo(
    () =>
      accounts.map((a) => ({
        ...a,
        _onDelete: () => handleUnlinkClick(a),
      })),
    [accounts, handleUnlinkClick],
  );

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

  const handleConfirmUnlink = async () => {
    if (!accountToUnlink?.name) return;
    setIsUnlinking(true);
    try {
      await updateCrmAccount(accountToUnlink.name, { cp_contact: '' });
      showSuccessToast('CRM account unlinked.');
      setIsUnlinkModalOpen(false);
      setAccountToUnlink(null);
      await fetchAccounts(1, false);
    } catch (error_) {
      showErrorToast(error_?.message || 'Failed to unlink account.', {
        defaultMessage: 'Failed to unlink CRM account.',
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleCloseUnlinkModal = (open) => {
    if (!open) {
      setIsUnlinkModalOpen(false);
      setAccountToUnlink(null);
    }
  };

  const unlinkDisplayName =
    accountToUnlink?.account_name || accountToUnlink?.brand_name || accountToUnlink?.name;

  return (
    <div className='flex flex-col h-full min-h-0 gap-4 px-6 pt-4 pb-0'>
      <CrmAccountsToolbar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        tableRef={cpContactCrmAccountsTableRef}
        onFiltersChange={handleFiltersChange}
        appliedFilters={appliedFilters}
        showGroupBy={false}
        resizeColumnsEnabled={resizeColumnsEnabled}
        onResizeEnabledChange={handleResizeEnabledChange}
        onResetColumnSizes={handleResetColumnSizes}
        showAddButton={false}
      />

      <PaginatedTableLayout
        className='flex-1 min-h-0 rounded-xl border border-stroke-soft-200 bg-bg-white-0 overflow-hidden flex flex-col'
        {...paginationProps}
      >
        <CrmAccountsTable
          ref={cpContactCrmAccountsTableRef}
          rows={tableRows}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          variant='compact'
          sorting={sorting}
          onSortingChange={handleSortingChange}
          columnWidths={columnWidths}
          onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
          persistColumnConfig={persistColumnConfig}
          fetchColumnConfig={fetchColumnConfig}
          columnConfigId={REACT_TABLE_ID_CP_CONTACT_CRM_ACCOUNTS}
          onRowClick={handleRowClick}
          onSalesOwnerUpdate={handleSalesOwnerUpdate}
          onTypeOfOrganizationUpdate={handleTypeOfOrganizationUpdate}
          onIndustryUpdate={handleIndustryUpdate}
          onNoOfEmployeesUpdate={handleNoOfEmployeesUpdate}
          salesOwnerOptions={salesOwnerOptions}
          typeOfOrgOptions={typeOfOrgOptions}
          industryGroups={industryGroups}
          actionAriaLabel='Unlink CRM account'
          emptyStateTitle='No CRM accounts linked'
          emptyStateDescription='CRM accounts linked to this CP contact will appear here.'
        />
      </PaginatedTableLayout>

      <Modal.Root open={isUnlinkModalOpen} onOpenChange={handleCloseUnlinkModal}>
        <Modal.Content
          className='max-w-[400px] rounded-2xl shadow-[0px_16px_32px_-12px_rgba(88,92,95,0.1)]'
          showClose={false}
        >
          <div className='flex flex-col gap-4 items-center px-5 py-8'>
            <div className='flex items-center justify-center p-2 rounded-[10px] bg-warning-lighter'>
              <RiErrorWarningLine className='size-6 text-warning-base' aria-hidden />
            </div>
            <div className='flex flex-col gap-1 items-center w-full text-center'>
              <h2 className='label-medium text-text-sub-600'>Unlink CRM Account?</h2>
              <p className='paragraph-small text-text-sub-600'>
                This will remove the link between this CP contact and the CRM account &quot;
                {unlinkDisplayName}&quot;. The CRM account will not be deleted.
              </p>
            </div>
          </div>
          <Modal.Footer className='justify-center gap-3 px-8 py-6 border-t border-stroke-soft-200'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => handleCloseUnlinkModal(false)}
              disabled={isUnlinking}
            >
              Cancel
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleConfirmUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='size-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                  Unlinking...
                </span>
              ) : (
                'Unlink'
              )}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default CpContactAccountsSection;
