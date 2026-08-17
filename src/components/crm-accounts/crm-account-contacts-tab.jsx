import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import { DEFAULT_LIST_PAGE_SIZE, flattenGroupedListResults } from '@/utils/list-pagination-utils';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  getCrmContactsColumnPreferences,
  saveCrmContactsColumnPreferences,
} from '@/redux/settingSlice';
import CrmContactsToolbar from '@/components/crm-contacts/crm-contacts-toolbar';
import CrmContactsTable from '@/components/crm-contacts/crm-contacts-table';
import CrmContactCreateDrawer from '@/components/crm-contacts/crm-contact-create-drawer';
import {
  DEFAULT_CONTACT_FILTERS,
  DEFAULT_CONTACT_COLUMN_WIDTHS,
  REACT_TABLE_ID_ACCOUNT_CONTACTS,
  ACCOUNT_CONTACTS_COLUMN_STORAGE_KEY,
  ACCOUNT_CONTACTS_RESIZE_ENABLED_KEY,
} from '@/components/crm-contacts/constants';
import {
  getCrmContactOptions,
  listCrmContacts,
  updateCrmContact,
  buildCrmContactSingleFieldPayload,
} from '@/api/crmContacts';
import { getSalesOwnerList } from '@/api/crmLeads';
import { getCrmAccountList } from '@/api/crmAccounts';
import {
  buildCrmContactApiFilters,
  normalizeDatetimeFilter,
  safeDisplayDateTime,
} from '@/utils/date-utils';

const CRM_ACCOUNT_CONTACTS_FILTER_SESSION_KEY_PREFIX =
  'crm-account-detail-contacts-view-filter-dropdown';
const SORT_FIELD_MAP = {
  name: 'first_name',
  created_at: 'creation',
  last_modified_at: 'modified',
  account: 'associate_account',
  sales_owner: 'sales_owner',
  email: 'email_id',
  designation: 'designation',
  department: 'department',
  city: 'city',
  subscription_status: 'subscription_status',
  mobile_number: 'mobile_number',
  alt_mobile_number: 'alt_mobile_number',
  dob: 'dob',
};

const GROUP_BY_FIELD_MAP = {
  account: 'associate_account',
  sales_owner: 'sales_owner',
  designation: 'designation',
  department: 'department',
  city: 'city',
  subscription_status: 'subscription_status',
};

function normalizeContact(row) {
  const so = row.sales_owner || {};
  const salesOwnerName = so.name || so.email || '';
  const subTypes = Array.isArray(row.subscription_type) ? row.subscription_type : [];
  return {
    id: row.name,
    name: row.full_name || row.name,
    account: row.account || '',
    created_at: row.created_at ? safeDisplayDateTime(row.created_at) : '-',
    last_modified_at: row.last_modified_at
      ? safeDisplayDateTime(row.last_modified_at)
      : row.modified
        ? safeDisplayDateTime(row.modified)
        : '-',
    sales_owner: salesOwnerName,
    email: row.email || '',
    designation: row.designation || '',
    department: row.department || '',
    mobile_number: row.mobile_number || '',
    alt_mobile_number: row.alt_mobile_number || '',
    dob: row.dob || '',
    age: row.age ?? '',
    city: row.city || '',
    subscription_status: row.subscription_status || '',
    subscription_type: subTypes,
    unsubscribe_reason: row.unsubscribed_reason || '',
  };
}

function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(ACCOUNT_CONTACTS_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(ACCOUNT_CONTACTS_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(ACCOUNT_CONTACTS_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(ACCOUNT_CONTACTS_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Contact list + create drawer for a single CRM Account (Contacts tab inside account detail).
 * Reuses CrmContactsToolbar, CrmContactsTable, CrmContactCreateDrawer with:
 * - Default filter: associate_account = [account.name]
 * - Account filter hidden; create drawer has no account field (fixedAccount).
 * - Separate column preferences and column widths (react_table_id and localStorage keys).
 */
const CrmAccountContactsTab = ({ account }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const defaultFilters = useMemo(
    () => ({
      ...DEFAULT_CONTACT_FILTERS,
      account: account?.name ? [account.name] : [],
    }),
    [account?.name],
  );

  const [contacts, setContacts] = useState([]);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, paginationProps, fetchRef } =
    useOffsetPagination({ initialPageSize: DEFAULT_LIST_PAGE_SIZE, initialPage: 0 });
  const [contactOptions, setContactOptions] = useState({});
  const CONTACTS_FILTER_SESSION_KEY = `${CRM_ACCOUNT_CONTACTS_FILTER_SESSION_KEY_PREFIX}-${account?.name}`;
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: CONTACTS_FILTER_SESSION_KEY,
    defaultFilters,
    persistIncludeKeys: [
      'sales_owner',
      'designation',
      'department',
      'city',
      'subscription_status',
      'created_at',
      'last_modified_at',
    ],
    persistObjectSubkeysTruthyKeys: {
      created_at: ['preset', 'date', 'from', 'to'],
      last_modified_at: ['preset', 'date', 'from', 'to'],
    },
  });

  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() => loadWidthOverrides());
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() => loadResizeEnabled());

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // 1. Initialize from persistence
  useEffect(() => {
    if (filtersInitialized) return;
    if (persistedFilters) {
      setAppliedFilters({
        ...defaultFilters,
        ...persistedFilters,
        created_at: normalizeDatetimeFilter(
          persistedFilters.created_at ?? defaultFilters.created_at,
        ),
        last_modified_at: normalizeDatetimeFilter(
          persistedFilters.last_modified_at ?? defaultFilters.last_modified_at,
        ),
      });
    }
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized, defaultFilters]);

  // 2. Persist to storage
  useEffect(() => {
    if (!filtersInitialized) return;

    const compact = compactFiltersForSessionStorage(appliedFilters, defaultFilters, {
      includeKeys: [
        'sales_owner',
        'designation',
        'department',
        'city',
        'subscription_status',
        'created_at',
        'last_modified_at',
      ],
      objectSubkeysTruthyKeys: {
        created_at: ['preset', 'date', 'from', 'to'],
        last_modified_at: ['preset', 'date', 'from', 'to'],
      },
    });

    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  // Keep appliedFilters.account in sync with defaultFilters when account changes
  useEffect(() => {
    if (!filtersInitialized) return;
    setAppliedFilters((prev) => ({
      ...prev,
      account: defaultFilters.account,
    }));
  }, [defaultFilters.account, filtersInitialized, setAppliedFilters]);

  useEffect(() => {
    Promise.all([getCrmContactOptions(), getSalesOwnerList(), getCrmAccountList()])
      .then(([options, salesOwner, accounts]) => {
        setContactOptions({
          ...options,
          sales_owner: Array.isArray(salesOwner) ? salesOwner : [],
          account: Array.isArray(accounts) ? accounts : [],
        });
      })
      .catch(() => setContactOptions({}));
  }, []);

  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';

    const filters = buildCrmContactApiFilters(appliedFilters);

    const apiGroupBy = GROUP_BY_FIELD_MAP[groupBy] || groupBy || null;
    return { orderBy, orderDirection, filters, apiGroupBy };
  }, [sorting, appliedFilters, groupBy]);

  const fetchContacts = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
      if (!account?.name) return;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const { orderBy, orderDirection, filters, apiGroupBy } = apiParams;
        const result = await listCrmContacts({
          keyword: debouncedSearchTerm || undefined,
          page: fetchPage,
          pageSize: pageSizeParam ?? pageSize,
          orderBy,
          orderDir: orderDirection,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          groupBy: apiGroupBy || undefined,
          groupOrder: apiGroupBy ? groupOrder : undefined,
        });

        const flatRows = flattenGroupedListResults(result, normalizeContact);

        if (append) {
          setContacts((previous) => [...previous, ...flatRows]);
        } else {
          setContacts(flatRows);
        }
        applyPaginationMeta(result, fetchPage);
      } catch (error_) {
        setError(error_);
        showErrorToast('Failed to load contacts');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [apiParams, debouncedSearchTerm, groupOrder, account?.name, pageSize, applyPaginationMeta],
  );

  fetchRef.current = fetchContacts;

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

  const fetchContactsRef = useRef(fetchContacts);
  fetchContactsRef.current = fetchContacts;

  useEffect(() => {
    if (account?.name && filtersInitialized) {
      fetchContactsRef.current(1, false);
    }
  }, [filterKey, account?.name, filtersInitialized]);

  const columnWidths = useMemo(
    () => ({ ...DEFAULT_CONTACT_COLUMN_WIDTHS, ...columnWidthOverrides }),
    [columnWidthOverrides],
  );

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

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmContactsColumnPreferences({
          columns: cols,
          react_table_id: REACT_TABLE_ID_ACCOUNT_CONTACTS,
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmContactsColumnPreferences({ react_table_id: REACT_TABLE_ID_ACCOUNT_CONTACTS }),
    ).unwrap();
    return result?.message ?? result?.data ?? result ?? [];
  }, [dispatch]);

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setAppliedFilters((previous) => ({
        ...previous,
        ...newFilters,
        account: account?.name ? [account.name] : newFilters.account || [],
      }));
    },
    [account?.name],
  );

  const handleRowClick = useCallback(
    (row) => {
      const rowId = encodeURIComponent(row.id || row.name || '');
      navigate(`/crm/contacts/${rowId}`);
    },
    [navigate],
  );

  const handleRemoveContactClick = useCallback((contact) => {
    setContactToDelete(contact);
  }, []);

  const handleRemoveContactConfirm = useCallback(
    async (contact) => {
      if (!contact) return;
      const contactName = contact.id ?? contact.name;
      if (!contactName) {
        showErrorToast('Contact name is required');
        return;
      }
      setContactToDelete(null);
      try {
        await updateCrmContact(contactName, { associate_account: '' });
        showSuccessToast('Contact removed from account.');
        await fetchContacts(1, false);
      } catch (error_) {
        const msg =
          error_?.response?.data?.message ||
          error_?.response?.data?.exception ||
          'Failed to remove contact from account';
        showErrorToast(msg);
      }
    },
    [fetchContacts],
  );

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleFieldUpdate = useCallback(
    async (contactName, field, value) => {
      if (!contactName) return;
      try {
        const payload = buildCrmContactSingleFieldPayload(field, value);
        await updateCrmContact(contactName, payload);
        showSuccessToast('Contact updated.');
        await fetchContacts(1, false);
      } catch (error_) {
        const msg =
          error_?.response?.data?.message ||
          error_?.response?.data?.exception ||
          'Failed to update contact';
        showErrorToast(msg);
      }
    },
    [fetchContacts],
  );

  const handleCreateContact = useCallback(async () => {
    await fetchContacts(1, false);
  }, [fetchContacts]);

  const tableRows = useMemo(
    () =>
      contacts.map((c) => ({
        ...c,
        _onDelete: () => handleRemoveContactClick(c),
      })),
    [contacts, handleRemoveContactClick],
  );

  // ── Page pagination ─────────────────────────────────────────────────────
  if (!account?.name) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden bg-white p-6'>
        <p className='text-paragraph-sm text-text-sub-600'>No account selected.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-white'>
      <div className='flex flex-1 flex-col gap-4 px-6 pt-6 pb-0 min-h-0'>
        <CrmContactsToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onAddContact={() => setIsCreateDrawerOpen(true)}
          onFiltersChange={handleFiltersChange}
          appliedFilters={appliedFilters}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOrder={groupOrder}
          onGroupOrderChange={setGroupOrder}
          tableRef={tableRef}
          resizeColumnsEnabled={resizeColumnsEnabled}
          onResizeEnabledChange={handleResizeEnabledChange}
          onResetColumnSizes={handleResetColumnSizes}
          contactOptions={contactOptions}
          hideAccountFilter
        />

        <PaginatedTableLayout scrollable={false} grouped={Boolean(groupBy)} {...paginationProps}>
          <CrmContactsTable
            ref={tableRef}
            rows={tableRows}
            isLoading={isLoading}
            error={error}
            onRetry={() => fetchContacts(1, false)}
            variant='compact'
            groupBy={groupBy}
            groupOrder={groupOrder}
            sorting={sorting}
            onRowClick={handleRowClick}
            onSortingChange={handleSortingChange}
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            onDeleteContact={handleRemoveContactClick}
            removeFromAccountMode
            onFieldUpdate={handleFieldUpdate}
            contactOptions={contactOptions}
            columnWidths={columnWidths}
            onColumnResize={handleColumnResize}
            resizeEnabled={resizeColumnsEnabled}
            freezeColumns
          />
        </PaginatedTableLayout>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(contactToDelete)}
        onOpenChange={(open) => !open && setContactToDelete(null)}
        title='Remove contact?'
        description='Are you sure you want to remove this contact from this account? The contact will be unlinked from the account but not deleted.'
        item={contactToDelete}
        onConfirm={handleRemoveContactConfirm}
        isLoading={false}
      />

      <CrmContactCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        contactOptions={contactOptions}
        onSuccess={handleCreateContact}
        fixedAccount={account.name}
      />
    </div>
  );
};

export default CrmAccountContactsTab;
