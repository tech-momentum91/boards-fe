import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  getCrmAccountsColumnPreferences,
  saveCrmAccountsColumnPreferences,
} from '@/redux/settingSlice';
import CrmAccountsToolbar from '@/components/crm-accounts/crm-accounts-toolbar';
import CrmAccountsTable from '@/components/crm-accounts/crm-accounts-table';
import CrmAccountCreateDrawer from '@/components/crm-accounts/crm-account-create-drawer';
import {
  REACT_TABLE_ID_LEAD_ACCOUNT,
  LEAD_ACCOUNT_COLUMN_STORAGE_KEY,
  LEAD_ACCOUNT_RESIZE_ENABLED_KEY,
  DEFAULT_ACCOUNT_FILTERS,
} from '@/components/crm-accounts/constants';
import { listCrmAccounts } from '@/api/crmAccounts';
import { updateCrmLead } from '@/api/crmLeads';
import { normalizeAccount } from '@/pages/crm/crm-accounts';
import { buildCrmAccountApiFilters } from '@/utils/date-utils';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';

const LEAD_ACCOUNT_FILTER_SESSION_KEY_PREFIX = 'crm-lead-detail-account-tab-filters';

function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(LEAD_ACCOUNT_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(LEAD_ACCOUNT_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(LEAD_ACCOUNT_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(LEAD_ACCOUNT_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Account list for lead detail (Account tab). Shows the lead's linked account (one row).
 * Search + filter + column manager; Remove action unlinks account and contact from lead.
 */
const CrmLeadAccountTab = ({ lead, onLeadUpdated }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tableRef = useRef(null);

  const accountId = lead?.account || '';
  const filterSessionKey = `${LEAD_ACCOUNT_FILTER_SESSION_KEY_PREFIX}-${lead?.name || ''}`;

  const [accountRows, setAccountRows] = useState([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [pendingLinkAccountId, setPendingLinkAccountId] = useState(null);
  const [pendingContactsLinkError, setPendingContactsLinkError] = useState(false);
  const [isRetryingLink, setIsRetryingLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(loadWidthOverrides);
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(loadResizeEnabled);

  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: filterSessionKey,
    defaultFilters: DEFAULT_ACCOUNT_FILTERS,
    persistObjectSubkeysTruthyKeys: {
      created_at: ['preset', 'date', 'from', 'to'],
      last_modified_at: ['preset', 'date', 'from', 'to'],
    },
  });

  const handleFiltersChange = useCallback(
    (newFilters) => {
      const merged = { ...appliedFilters, ...newFilters };
      if (JSON.stringify(merged) !== JSON.stringify(appliedFilters)) {
        setAppliedFilters(merged);
      }
    },
    [appliedFilters, setAppliedFilters],
  );

  const [pagination, setPagination] = useState({
    page: 1,
    totalCount: 0,
    totalPages: 0,
  });
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  const apiFilters = useMemo(
    () => buildCrmAccountApiFilters(appliedFilters, accountId ? { name: ['in', [accountId]] } : {}),
    [appliedFilters, accountId],
  );

  const fetchAccount = useCallback(
    async (fetchPage, pageSizeParam = undefined) => {
      if (!accountId) {
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
    [accountId, pageSize, debouncedSearchTerm, apiFilters],
  );

  const filterKey = useMemo(
    () => JSON.stringify({ a: accountId, k: debouncedSearchTerm, f: appliedFilters }),
    [accountId, debouncedSearchTerm, appliedFilters],
  );

  const fetchAccountRef = useRef(fetchAccount);
  fetchAccountRef.current = fetchAccount;

  useEffect(() => {
    fetchAccountRef.current(1);
  }, [filterKey]);

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

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmAccountsColumnPreferences({
          columns: cols,
          react_table_id: REACT_TABLE_ID_LEAD_ACCOUNT,
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmAccountsColumnPreferences({ react_table_id: REACT_TABLE_ID_LEAD_ACCOUNT }),
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

  const handleRowClick = useCallback(
    (row) => {
      const id = row.name || row.account_name;
      if (id) navigate(`/crm/accounts/${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const handleSearchChange = useCallback((term) => setSearchTerm(term), []);

  const linkAccountToLead = useCallback(
    async (createdAccountId, { contactsLinkError = false, showLinkedToast = true } = {}) => {
      if (!lead?.name || !createdAccountId) return false;
      try {
        await updateCrmLead(lead.name, { account: createdAccountId });
        if (contactsLinkError) {
          showErrorToast('Account linked to lead, but failed to link selected contacts.');
        } else if (showLinkedToast) {
          showSuccessToast('Account created and linked to lead.');
        }
        await onLeadUpdated?.();
        setPendingLinkAccountId(null);
        setPendingContactsLinkError(false);
        return true;
      } catch (error) {
        setPendingLinkAccountId(createdAccountId);
        setPendingContactsLinkError(Boolean(contactsLinkError));
        showErrorToast(
          error?.response?.data?.message ||
            `Account created (${createdAccountId}), but failed to link it to the lead.`,
        );
        return false;
      }
    },
    [lead?.name, onLeadUpdated],
  );

  const handleCreateAccount = useCallback(
    async (contactsLinkError, account) => {
      const createdAccountId = account?.name;
      if (!createdAccountId) return;
      await linkAccountToLead(createdAccountId, { contactsLinkError });
    },
    [linkAccountToLead],
  );

  const handleRetryLinkAccount = useCallback(async () => {
    if (!pendingLinkAccountId) return;
    setIsRetryingLink(true);
    try {
      await linkAccountToLead(pendingLinkAccountId, {
        contactsLinkError: pendingContactsLinkError,
        showLinkedToast: true,
      });
    } finally {
      setIsRetryingLink(false);
    }
  }, [linkAccountToLead, pendingContactsLinkError, pendingLinkAccountId]);

  const handleRemoveAccountClick = useCallback((account) => {
    setAccountToRemove(account);
  }, []);

  const handleRemoveAccountConfirm = useCallback(async () => {
    if (!lead?.name) return;
    setAccountToRemove(null);
    setIsRemoving(true);
    try {
      await updateCrmLead(lead.name, { account: '', is_primary: 0, contacts: [] });
      showSuccessToast('Account and contact unlinked from lead.');
      onLeadUpdated?.();
      setAccountRows([]);
    } catch (error) {
      showErrorToast(error?.response?.data?.message || 'Failed to unlink account from lead');
    } finally {
      setIsRemoving(false);
    }
  }, [lead?.name, onLeadUpdated]);

  const tableRows = useMemo(
    () =>
      accountRows.map((r) => ({
        ...r,
        _onDelete: () => handleRemoveAccountClick(r),
      })),
    [accountRows, handleRemoveAccountClick],
  );

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
          onAddAccount={() => setIsCreateDrawerOpen(true)}
          disableAddButton={Boolean(accountId)}
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
            isLoading={isLoading}
            variant='compact'
            emptyStateTitle='No account linked'
            emptyStateDescription='This lead has no account linked yet.'
            columnWidths={columnWidths}
            onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            columnConfigId={REACT_TABLE_ID_LEAD_ACCOUNT}
            actionAriaLabel='Remove account'
            onRowClick={handleRowClick}
          />
        </PaginatedTableLayout>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(accountToRemove)}
        onOpenChange={(open) => !open && setAccountToRemove(null)}
        title='Remove account?'
        description='Are you sure you want to unlink this account from the lead? Both account and contact will be cleared and the lead will be set to non-primary.'
        item={accountToRemove}
        onConfirm={handleRemoveAccountConfirm}
        isLoading={isRemoving}
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingLinkAccountId)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLinkAccountId(null);
            setPendingContactsLinkError(false);
          }
        }}
        title='Link account failed'
        description={`Account ${pendingLinkAccountId} was created but could not be linked to this lead. Retry linking?`}
        onConfirm={handleRetryLinkAccount}
        isLoading={isRetryingLink}
        confirmLabel='Retry'
        loadingLabel='Linking...'
      />

      <CrmAccountCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={handleCreateAccount}
      />
    </div>
  );
};

export default CrmLeadAccountTab;
