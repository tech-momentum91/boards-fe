import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { RiContactsLine } from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import { flattenGroupedListResults } from '@/utils/list-pagination-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useCrmContactSaveView } from '@/hooks/use-crm-contact-save-view';
import { CONTACT_VIEW_SAVE_SCOPES } from '@/pages/crm/contacts-view/contact-view-settings';
import CrmContactsToolbar from '@/components/crm-contacts/crm-contacts-toolbar';
import CrmContactsTable from '@/components/crm-contacts/crm-contacts-table';
import CrmContactsBulkActionsBar from '@/components/crm-contacts/crm-contacts-bulk-actions-bar';
import CrmLeadsSaveViewMenu from '@/components/crm-leads/crm-leads-save-view-menu';
import CrmContactCreateDrawer from '@/components/crm-contacts/crm-contact-create-drawer';
import {
  DEFAULT_CONTACT_FILTERS,
  CONTACT_COLUMN_DEFS,
  CONTACT_COLUMN_STORAGE_KEY,
  CONTACT_RESIZE_ENABLED_KEY,
  DEFAULT_CONTACT_COLUMN_WIDTHS,
} from '@/components/crm-contacts/constants';
import {
  getCrmContactOptions,
  listCrmContacts,
  updateCrmContact,
  buildCrmContactSingleFieldPayload,
  deleteCrmContact,
} from '@/api/crmContacts';
import { getSalesOwnerList, getCpAccountOptions, getCpContactLinkOptions } from '@/api/crmLeads';
import { getCrmAccountList } from '@/api/crmAccounts';
import {
  buildCrmContactApiFilters,
  calculateAgeFromDob,
  safeDisplayDateTime,
} from '@/utils/date-utils';
import { getCpContactById } from '@/services/cp-contacts-service';

const REACT_TABLE_ID = 'crm-contacts-table';
const CONTACT_VIEW_KEY = 'default';

// ── Field maps for server-side sort / group ───────────────────────────────────
const SORT_FIELD_MAP = {
  name: 'first_name',
  created_at: 'creation',
  last_modified_at: 'modified',
  account: 'associate_account',
  cp_account: 'cp_account',
  cp_contact: 'cp_contact',
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
    cp_account: row.cp_account || '',
    cp_account_name: row.cp_account_name || row.cp_account || '',
    cp_contact: row.cp_contact || '',
    cp_contact_name: row.cp_contact_name || row.cp_contact || '',
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
    age: calculateAgeFromDob(row.dob) || '',
    city: row.city || '',
    subscription_status: row.subscription_status || '',
    subscription_type: subTypes,
    unsubscribe_reason: row.unsubscribed_reason || '',
  };
}

const CONTACT_COLUMN_WIDTH_FLOOR_IDS = ['dob', 'subscription_status', 'unsubscribe_reason'];

function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(CONTACT_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out = { ...parsed };
    for (const colId of CONTACT_COLUMN_WIDTH_FLOOR_IDS) {
      const floor = DEFAULT_CONTACT_COLUMN_WIDTHS[colId];
      if (typeof floor === 'number' && typeof out[colId] === 'number' && out[colId] < floor) {
        out[colId] = floor;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(CONTACT_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(CONTACT_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(CONTACT_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
const CrmContacts = () => {
  const tableRef = useRef(null);
  const columnsForViewRef = useRef([]);
  const navigate = useNavigate();
  const bulkOpGenerationRef = useRef(0);
  const isBulkApplyingRef = useRef(false);

  // ── Data state ───────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState([]);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, paginationProps, fetchRef } =
    useOffsetPagination({ initialPageSize: 50, initialPage: 0 });

  // ── UI state (Save View owns filters/search/sort/group after hydrate) ────
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...DEFAULT_CONTACT_FILTERS }));
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [contactOptions, setContactOptions] = useState({});
  const [liveColumnConfig, setLiveColumnConfig] = useState([]);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() => loadWidthOverrides());
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() => loadResizeEnabled());

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const handleFiltersChange = useCallback((newFilters) => {
    setAppliedFilters((prev) => {
      const merged = { ...prev, ...newFilters };
      if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
      return merged;
    });
  }, []);

  const handleApplyViewSettings = useCallback((settings) => {
    const nextFilters = settings?.filters ?? DEFAULT_CONTACT_FILTERS;
    const nextGrouping = settings?.grouping ?? { groupBy: '', groupOrder: 'asc' };
    const nextSettings = settings?.settings ?? {};
    const nextColumns = Array.isArray(settings?.columns) ? settings.columns : [];

    setAppliedFilters({
      ...DEFAULT_CONTACT_FILTERS,
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
  } = useCrmContactSaveView({
    appliedFilters,
    sorting,
    groupBy,
    groupOrder,
    searchTerm,
    viewKey: CONTACT_VIEW_KEY,
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

  // ── Load contact options ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getCrmContactOptions(),
      getSalesOwnerList(),
      getCrmAccountList(),
      getCpAccountOptions(),
      getCpContactLinkOptions(),
    ])
      .then(([options, salesOwner, accounts, cpAccounts, cpContacts]) => {
        setContactOptions({
          ...options,
          sales_owner: Array.isArray(salesOwner) ? salesOwner : [],
          account: Array.isArray(accounts) ? accounts : [],
          cp_account: Array.isArray(cpAccounts) ? cpAccounts : [],
          cp_contact: Array.isArray(cpContacts) ? cpContacts : [],
        });
      })
      .catch(() => setContactOptions({}));
  }, []);

  // ── Build API params ─────────────────────────────────────────────────────
  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';
    const filters = buildCrmContactApiFilters(appliedFilters);
    const apiGroupBy = GROUP_BY_FIELD_MAP[groupBy] || groupBy || null;
    return { orderBy, orderDirection, filters, apiGroupBy };
  }, [sorting, appliedFilters, groupBy]);

  // ── Fetch contacts ───────────────────────────────────────────────────────
  const fetchContacts = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
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
    [apiParams, debouncedSearchTerm, groupOrder, pageSize, applyPaginationMeta],
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
    if (!viewHydrated) return;
    setSelectedContactIds([]);
    fetchContactsRef.current(1, false);
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
    return handleSaveView({ scope: CONTACT_VIEW_SAVE_SCOPES.ME });
  }, [handleSaveView, syncColumnsFromTable]);

  const handleSaveViewForAll = useCallback(() => {
    syncColumnsFromTable();
    return handleSaveView({ scope: CONTACT_VIEW_SAVE_SCOPES.ALL });
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

  const columnWidths = useMemo(
    () => ({ ...DEFAULT_CONTACT_COLUMN_WIDTHS, ...columnWidthOverrides }),
    [columnWidthOverrides],
  );

  const visibleColumnIds = useMemo(() => {
    const source =
      Array.isArray(liveColumnConfig) && liveColumnConfig.length > 0
        ? liveColumnConfig
        : CONTACT_COLUMN_DEFS;
    return source
      .filter((col) => col && col.visible !== false)
      .map((col) => col.id)
      .filter(Boolean);
  }, [liveColumnConfig]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddContactClick = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCreateContact = useCallback(async () => {
    await fetchContacts(1, false);
  }, [fetchContacts]);

  const handleRowClick = useCallback(
    (row) => {
      const rowId = encodeURIComponent(row.id || row.name || '');
      navigate(`/crm/contacts/${rowId}`);
    },
    [navigate],
  );

  const handleRetry = useCallback(() => {
    fetchContacts(1, false);
  }, [fetchContacts]);

  const handleDeleteContactClick = useCallback((contact) => {
    setContactToDelete(contact);
  }, []);

  const handleDeleteContactConfirm = useCallback(
    async (contact) => {
      if (!contact) return;
      const contactName = contact.id ?? contact.name;
      if (!contactName) {
        showErrorToast('Contact name is required');
        return;
      }
      setContactToDelete(null);
      try {
        await deleteCrmContact(contactName);
        showSuccessToast('Contact and related leads have been deleted.');
        setSelectedContactIds((prev) => prev.filter((id) => id !== contactName));
        await fetchContacts(1, false);
      } catch (error_) {
        const msg =
          error_?.response?.data?.message ||
          error_?.response?.data?.exception ||
          'Failed to delete contact';
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
        let payload = buildCrmContactSingleFieldPayload(field, value);
        if (field === 'cp_account') {
          payload = { ...payload, cp_contact: '' };
        }
        if (field === 'cp_contact' && value) {
          const contact = contacts.find((c) => (c.id ?? c.name) === contactName);
          if (!contact?.cp_account) {
            try {
              const res = await getCpContactById(value);
              const acc = res?.data?.cpAccountId;
              if (acc) payload = { ...payload, cp_account: acc };
            } catch {
              // keep cp_contact-only update
            }
          }
        }
        await updateCrmContact(contactName, payload);
        showSuccessToast('Contact updated.');
        await fetchContacts(Math.max(1, pagination.page), false);
      } catch (error_) {
        const msg =
          error_?.response?.data?.message ||
          error_?.response?.data?.exception ||
          'Failed to update contact';
        showErrorToast(msg);
      }
    },
    [contacts, fetchContacts, pagination.page],
  );

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
  }, []);

  const handleGroupOrderChange = useCallback((value) => {
    setGroupOrder(value);
  }, []);

  const handleToggleContactSelection = useCallback((contactId) => {
    const id = String(contactId || '').trim();
    if (!id) return;
    setSelectedContactIds((prev) => {
      const set = new Set(prev.map(String));
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return [...set];
    });
  }, []);

  const handleToggleSelectAllContacts = useCallback(() => {
    const visibleIds = contacts
      .map((row) => String(row?.id || row?.name || '').trim())
      .filter(Boolean);
    setSelectedContactIds((prev) => {
      const selected = new Set(prev.map(String));
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
      if (allSelected) {
        visibleIds.forEach((id) => selected.delete(id));
        return [...selected];
      }
      visibleIds.forEach((id) => selected.add(id));
      return [...selected];
    });
  }, [contacts]);

  const handleClearSelection = useCallback(() => {
    setSelectedContactIds([]);
  }, []);

  const runBulkContactUpdate = useCallback(
    async (buildPayload) => {
      const ids = [...selectedContactIds];
      if (ids.length === 0 || isBulkApplyingRef.current) return;

      const generation = ++bulkOpGenerationRef.current;
      isBulkApplyingRef.current = true;
      setIsBulkApplying(true);
      const succeeded = new Set();
      let firstError = null;

      try {
        for (const contactId of ids) {
          if (generation !== bulkOpGenerationRef.current) return;
          try {
            const payload = await buildPayload(contactId);
            if (!payload || Object.keys(payload).length === 0) continue;
            await updateCrmContact(contactId, payload);
            succeeded.add(contactId);
          } catch (error_) {
            firstError ??= error_;
          }
        }

        if (generation !== bulkOpGenerationRef.current) return;

        if (firstError) {
          showErrorToast(
            firstError?.response?.data?.message ||
              (succeeded.size > 0
                ? `Updated ${succeeded.size} of ${ids.length} contacts. Some updates failed.`
                : 'Failed to update contacts'),
          );
        } else if (succeeded.size > 0) {
          showSuccessToast(
            succeeded.size === 1
              ? 'Contact updated successfully'
              : `${succeeded.size} contacts updated successfully`,
          );
        }

        if (succeeded.size > 0) {
          await fetchContacts(Math.max(1, pagination.page), false);
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
    [selectedContactIds, fetchContacts, pagination.page],
  );

  const handleBulkApplyField = useCallback(
    async (fieldKey, value) => {
      if (!fieldKey || isBulkApplying) return;
      await runBulkContactUpdate(async (_contactId) => {
        let payload = buildCrmContactSingleFieldPayload(fieldKey, value);
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
    [isBulkApplying, runBulkContactUpdate],
  );

  const tableRows = useMemo(
    () =>
      contacts.map((c) => ({
        ...c,
        _onDelete: () => handleDeleteContactClick(c),
      })),
    [contacts, handleDeleteContactClick],
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
            <div className='p-3 text-text-sub-500 bg-bg-weak-100 rounded-full flex items-center justify-center shrink-0'>
              <RiContactsLine size={20} />
            </div>
            <div className='flex flex-col'>
              <span className='label-large text-text-main-900'>Contacts</span>
              <span className='paragraph-small text-text-sub-500'>
                Manage all your contacts details from here.
              </span>
            </div>
          </div>
        </div>
        <div className='w-[calc(100%-64px)] h-px bg-stroke-soft-200 mx-8' />

        <div className='flex flex-1 min-h-0 overflow-hidden px-7 pt-6 pb-0 flex flex-col gap-4'>
          <CrmContactsToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onAddContact={handleAddContactClick}
            onFiltersChange={handleFiltersChange}
            appliedFilters={appliedFilters}
            groupBy={groupBy}
            onGroupByChange={handleGroupByChange}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            tableRef={tableRef}
            resizeColumnsEnabled={resizeColumnsEnabled}
            onResizeEnabledChange={handleResizeEnabledChange}
            onResetColumnSizes={handleResetColumnSizes}
            contactOptions={contactOptions}
            saveViewMenu={saveViewMenu}
          />

          <PaginatedTableLayout scrollable={false} grouped={Boolean(groupBy)} {...paginationProps}>
            <CrmContactsTable
              ref={tableRef}
              rows={tableRows}
              isLoading={isLoading || !viewHydrated}
              error={error}
              onRetry={handleRetry}
              variant='compact'
              groupBy={groupBy}
              groupOrder={groupOrder}
              onGroupByChange={handleGroupByChange}
              sorting={sorting}
              onRowClick={handleRowClick}
              onSortingChange={handleSortingChange}
              persistColumnConfig={persistColumnConfig}
              fetchColumnConfig={fetchColumnConfig}
              columnConfigId={viewHydrated ? REACT_TABLE_ID : `${REACT_TABLE_ID}-boot`}
              onDeleteContact={handleDeleteContactClick}
              onFieldUpdate={handleFieldUpdate}
              contactOptions={contactOptions}
              columnWidths={columnWidths}
              onColumnResize={handleColumnResize}
              resizeEnabled={resizeColumnsEnabled}
              freezeColumns
              enableSelection
              selectedContactIds={selectedContactIds}
              onToggleContactSelection={handleToggleContactSelection}
              onToggleSelectAll={handleToggleSelectAllContacts}
            />
          </PaginatedTableLayout>
        </div>
      </div>

      <CrmContactsBulkActionsBar
        selectedCount={selectedContactIds.length}
        visibleColumnIds={visibleColumnIds}
        contactOptions={contactOptions}
        onClear={handleClearSelection}
        onApplyField={handleBulkApplyField}
        disabled={isBulkApplying}
      />

      <DeleteConfirmModal
        isOpen={Boolean(contactToDelete)}
        onOpenChange={(open) => !open && setContactToDelete(null)}
        title='Delete Contact?'
        description='Are you sure you want to delete this contact? This action cannot be undone.'
        item={contactToDelete}
        onConfirm={handleDeleteContactConfirm}
        isLoading={false}
      />

      <CrmContactCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        contactOptions={contactOptions}
        onSuccess={handleCreateContact}
      />
    </PageLayout>
  );
};

export default CrmContacts;
