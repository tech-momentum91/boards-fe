import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useCrmAccountListSaveViewBridge } from '@/hooks/use-crm-account-list-save-view-bridge';
import CrmAccountsToolbar from '@/components/crm-accounts/crm-accounts-toolbar';
import CrmAccountsTable from '@/components/crm-accounts/crm-accounts-table';
import {
  REACT_TABLE_ID_CONTACT_ACCOUNT,
  CONTACT_ACCOUNT_COLUMN_STORAGE_KEY,
  CONTACT_ACCOUNT_RESIZE_ENABLED_KEY,
  DEFAULT_ACCOUNT_FILTERS,
} from '@/components/crm-accounts/constants';
import { listCrmAccounts } from '@/api/crmAccounts';
import { updateCrmContact } from '@/api/crmContacts';
import { normalizeAccount } from '@/pages/crm/crm-accounts';
import { buildCrmAccountApiFilters } from '@/utils/date-utils';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';

function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(CONTACT_ACCOUNT_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(CONTACT_ACCOUNT_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(CONTACT_ACCOUNT_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(CONTACT_ACCOUNT_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

const CrmContactAccountTab = ({ contact, onContactUpdated }) => {
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const contactId = contact?.name || '';

  const [accountRows, setAccountRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [accountToRemove, setAccountToRemove] = useState(null);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(loadWidthOverrides);
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(loadResizeEnabled);
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...DEFAULT_ACCOUNT_FILTERS }));
  const [sorting, setSorting] = useState([]);

  const { viewHydrated, persistColumnConfig, fetchColumnConfig, saveViewMenu } =
    useCrmAccountListSaveViewBridge({
      viewKey: REACT_TABLE_ID_CONTACT_ACCOUNT,
      legacyReactTableId: REACT_TABLE_ID_CONTACT_ACCOUNT,
      appliedFilters,
      setAppliedFilters,
      sorting,
      setSorting,
      searchTerm,
      setSearchTerm,
      tableRef,
    });

  const handleFiltersChange = useCallback((newFilters) => {
    setAppliedFilters((prev) => {
      const merged = { ...prev, ...newFilters };
      if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
      return merged;
    });
  }, []);

  const [pagination, setPagination] = useState({
    page: 1,
    totalCount: 0,
    totalPages: 0,
  });
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  const apiFilters = useMemo(
    () => buildCrmAccountApiFilters(appliedFilters, contactId ? { crm_contact: contactId } : {}),
    [appliedFilters, contactId],
  );

  const fetchAccount = useCallback(
    async (fetchPage, pageSizeParam = undefined) => {
      if (!contactId) {
        setAccountRows([]);
        setPagination({ page: 1, totalCount: 0, totalPages: 0 });
        return;
      }
      setIsLoading(true);
      try {
        const activePageSize = pageSizeParam ?? pageSize;
        const result = await listCrmAccounts({
          keyword: debouncedSearchTerm || undefined,
          filters: Object.keys(apiFilters).length > 0 ? apiFilters : undefined,
          page: fetchPage,
          pageSize: activePageSize,
        });
        const list = Array.isArray(result?.results) ? result.results : [];
        setAccountRows(list.map(normalizeAccount));
        setPagination({
          page: result?.page ?? fetchPage,
          totalCount: result?.total_count ?? list.length,
          totalPages: result?.total_pages ?? (list.length > 0 ? 1 : 0),
        });
      } catch {
        showErrorToast('Failed to load account');
        setAccountRows([]);
        setPagination({ page: 1, totalCount: 0, totalPages: 0 });
      } finally {
        setIsLoading(false);
      }
    },
    [contactId, pageSize, debouncedSearchTerm, apiFilters],
  );

  const filterKey = useMemo(
    () => JSON.stringify({ c: contactId, k: debouncedSearchTerm, f: appliedFilters }),
    [contactId, debouncedSearchTerm, appliedFilters],
  );

  const fetchAccountRef = useRef(fetchAccount);
  fetchAccountRef.current = fetchAccount;

  useEffect(() => {
    if (!viewHydrated) return;
    fetchAccountRef.current(1);
  }, [filterKey, viewHydrated]);

  const handlePageChange = useCallback(
    (page) => {
      fetchAccount(page);
    },
    [fetchAccount],
  );

  const handlePageSizeChange = useCallback(
    (newSize) => {
      setPageSize(newSize);
      fetchAccount(1, newSize);
    },
    [fetchAccount],
  );

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

  const handleRemoveAccountClick = useCallback((account) => {
    setAccountToRemove(account);
  }, []);

  const handleRemoveAccountConfirm = useCallback(
    async (account) => {
      if (!account || !contact?.name) return;
      setAccountToRemove(null);
      try {
        await updateCrmContact(contact.name, { associate_account: '' });
        showSuccessToast('Account unlinked from contact');
        onContactUpdated?.();
        await fetchAccountRef.current(1);
      } catch (error) {
        showErrorToast(error?.response?.data?.message || 'Failed to unlink account');
      }
    },
    [contact?.name, onContactUpdated],
  );

  const tableRows = useMemo(
    () =>
      accountRows.map((r) => ({
        ...r,
        _onDelete: () => handleRemoveAccountClick(r),
      })),
    [accountRows, handleRemoveAccountClick],
  );

  const handleRowClick = useCallback(
    (row) => {
      const id = row.name || row.account_name;
      if (id) navigate(`/crm/accounts/${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const handleSearchChange = useCallback((term) => setSearchTerm(term), []);

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-white'>
      <div className='flex flex-1 flex-col gap-4 px-6 pt-6 pb-0 min-h-0'>
        <CrmAccountsToolbar
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          tableRef={tableRef}
          onFiltersChange={handleFiltersChange}
          appliedFilters={appliedFilters}
          resizeColumnsEnabled={resizeColumnsEnabled}
          onResizeEnabledChange={handleResizeEnabledChange}
          onResetColumnSizes={handleResetColumnSizes}
          showGroupBy={false}
          showAddButton={false}
          saveViewMenu={saveViewMenu}
        />

        <PaginatedTableLayout
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        >
          <CrmAccountsTable
            ref={tableRef}
            rows={tableRows}
            isLoading={isLoading || !viewHydrated}
            variant='compact'
            sorting={sorting}
            onSortingChange={setSorting}
            columnWidths={columnWidths}
            onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            columnConfigId={
              viewHydrated
                ? REACT_TABLE_ID_CONTACT_ACCOUNT
                : `${REACT_TABLE_ID_CONTACT_ACCOUNT}-boot`
            }
            actionAriaLabel='Remove account'
            onRowClick={handleRowClick}
          />
        </PaginatedTableLayout>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(accountToRemove)}
        onOpenChange={(open) => !open && setAccountToRemove(null)}
        title='Remove account?'
        description='Are you sure you want to unlink this account from the contact?'
        item={accountToRemove}
        onConfirm={handleRemoveAccountConfirm}
        isLoading={false}
      />
    </div>
  );
};

export default CrmContactAccountTab;
