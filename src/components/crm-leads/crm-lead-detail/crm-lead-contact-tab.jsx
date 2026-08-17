import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  getCrmContactsColumnPreferences,
  saveCrmContactsColumnPreferences,
} from '@/redux/settingSlice';
import CrmContactsToolbar from '@/components/crm-contacts/crm-contacts-toolbar';
import CrmContactsTable from '@/components/crm-contacts/crm-contacts-table';
import CrmContactCreateDrawer from '@/components/crm-contacts/crm-contact-create-drawer';
import CrmLeadLinkContactModal from './crm-lead-link-contact-modal';
import {
  REACT_TABLE_ID_LEAD_CONTACT,
  LEAD_CONTACT_COLUMN_STORAGE_KEY,
  LEAD_CONTACT_RESIZE_ENABLED_KEY,
  DEFAULT_CONTACT_FILTERS,
} from '@/components/crm-contacts/constants';
import { getCrmContactOptions, listCrmContacts } from '@/api/crmContacts';
import {
  addCrmLeadContact,
  getCrmLeadContacts,
  getLeadLinkedContactIds,
  getSalesOwnerList,
  removeCrmLeadContact,
} from '@/api/crmLeads';
import { getCrmAccountList } from '@/api/crmAccounts';
import {
  buildCrmContactApiFilters,
  calculateAgeFromDob,
  safeDisplayDateTime,
} from '@/utils/date-utils';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';

const LEAD_CONTACT_FILTER_SESSION_KEY_PREFIX = 'crm-lead-detail-contact-tab-filters';

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
    age: calculateAgeFromDob(row.dob) || '',
    city: row.city || '',
    subscription_status: row.subscription_status || '',
    subscription_type: subTypes,
    unsubscribe_reason: row.unsubscribed_reason || '',
  };
}

function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(LEAD_CONTACT_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(LEAD_CONTACT_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(LEAD_CONTACT_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(LEAD_CONTACT_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Contact list for lead detail (Contacts tab).
 * Supports multiple contacts linked to the lead; all must belong to the lead account.
 */
const CrmLeadContactTab = ({ lead, onLeadUpdated }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tableRef = useRef(null);

  const accountId = String(lead?.account || '').trim();
  const filterSessionKey = `${LEAD_CONTACT_FILTER_SESSION_KEY_PREFIX}-${lead?.name || ''}`;

  const [linkedContactIds, setLinkedContactIds] = useState(() => getLeadLinkedContactIds(lead));
  const [contactRows, setContactRows] = useState([]);
  const [contactOptions, setContactOptions] = useState({});
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [contactToRemove, setContactToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [pendingLinkContactId, setPendingLinkContactId] = useState(null);
  const [isRetryingLink, setIsRetryingLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(loadWidthOverrides);
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(loadResizeEnabled);

  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: filterSessionKey,
    defaultFilters: DEFAULT_CONTACT_FILTERS,
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

  const refreshLinkedContactIds = useCallback(async () => {
    if (!lead?.name) {
      setLinkedContactIds([]);
      return [];
    }
    try {
      const result = await getCrmLeadContacts(lead.name);
      const ids = Array.isArray(result?.contact_ids) ? result.contact_ids : [];
      setLinkedContactIds(ids);
      return ids;
    } catch {
      const fallback = getLeadLinkedContactIds(lead);
      setLinkedContactIds(fallback);
      return fallback;
    }
  }, [lead]);

  useEffect(() => {
    refreshLinkedContactIds();
  }, [refreshLinkedContactIds]);

  const apiFilters = useMemo(
    () =>
      buildCrmContactApiFilters(
        appliedFilters,
        linkedContactIds.length > 0 ? { name: ['in', linkedContactIds] } : {},
      ),
    [appliedFilters, linkedContactIds],
  );

  const fetchContacts = useCallback(
    async (fetchPage, pageSizeParam = undefined, contactIds = linkedContactIds) => {
      if (contactIds.length === 0) {
        setContactRows([]);
        setPagination({ page: 1, totalCount: 0, totalPages: 0 });
        return;
      }
      setIsLoading(true);
      try {
        const activePageSize = pageSizeParam ?? pageSize;
        const filtersForFetch = buildCrmContactApiFilters(appliedFilters, {
          name: ['in', contactIds],
        });
        const result = await listCrmContacts({
          keyword: debouncedSearchTerm || undefined,
          filters: Object.keys(filtersForFetch).length > 0 ? filtersForFetch : undefined,
          page: fetchPage,
          pageSize: activePageSize,
        });
        const list = Array.isArray(result?.results) ? result.results : [];
        setContactRows(list.map(normalizeContact));
        setPagination({
          page: result?.page ?? fetchPage,
          totalCount: result?.total_count ?? list.length,
          totalPages: result?.total_pages ?? (list.length > 0 ? 1 : 0),
        });
      } catch {
        showErrorToast('Failed to load contacts');
        // Keep prior rows so a transient failure does not look like "no contacts linked"
      } finally {
        setIsLoading(false);
      }
    },
    [linkedContactIds, pageSize, debouncedSearchTerm, appliedFilters],
  );

  const filterKey = useMemo(
    () => JSON.stringify({ c: linkedContactIds, k: debouncedSearchTerm, f: appliedFilters }),
    [linkedContactIds, debouncedSearchTerm, appliedFilters],
  );

  const fetchContactsRef = useRef(fetchContacts);
  fetchContactsRef.current = fetchContacts;

  useEffect(() => {
    fetchContactsRef.current(1);
  }, [filterKey]);

  const handlePageChange = useCallback(
    (page) => {
      fetchContacts(page);
    },
    [fetchContacts],
  );

  const handlePageSizeChange = useCallback(
    (newSize) => {
      setPageSize(newSize);
      fetchContacts(1, newSize);
    },
    [fetchContacts],
  );

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmContactsColumnPreferences({
          columns: cols,
          react_table_id: REACT_TABLE_ID_LEAD_CONTACT,
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmContactsColumnPreferences({ react_table_id: REACT_TABLE_ID_LEAD_CONTACT }),
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
      const id = row.id || row.name;
      if (id) navigate(`/crm/contacts/${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const handleSearchChange = useCallback((term) => setSearchTerm(term), []);

  const handleAddContactClick = useCallback(() => {
    if (!accountId) {
      showErrorToast('Link an account to this lead before adding contacts');
      return;
    }
    setIsLinkModalOpen(true);
  }, [accountId]);

  const linkContactToLead = useCallback(
    async (contactId, { showLinkedToast = true } = {}) => {
      if (!lead?.name || !contactId) return false;
      try {
        await addCrmLeadContact(lead.name, contactId);
        if (showLinkedToast) showSuccessToast('Contact linked to lead.');
        setPendingLinkContactId(null);
        setIsLinkModalOpen(false);
        const ids = await refreshLinkedContactIds();
        await onLeadUpdated?.();
        await fetchContacts(1, undefined, ids);
        return true;
      } catch (error) {
        setPendingLinkContactId(contactId);
        showErrorToast(
          error?.response?.data?.message ||
            error?.message ||
            `Failed to link contact ${contactId} to the lead.`,
        );
        return false;
      }
    },
    [lead?.name, onLeadUpdated, refreshLinkedContactIds, fetchContacts],
  );

  const handleLinkExistingContact = useCallback(
    async (contactId) => {
      setIsLinking(true);
      try {
        await linkContactToLead(contactId);
      } finally {
        setIsLinking(false);
      }
    },
    [linkContactToLead],
  );

  const handleCreateContact = useCallback(
    async (contact) => {
      const createdContactId = contact?.name;
      if (!createdContactId) return;
      await linkContactToLead(createdContactId, { showLinkedToast: false });
    },
    [linkContactToLead],
  );

  const handleRetryLinkContact = useCallback(async () => {
    if (!pendingLinkContactId) return;
    setIsRetryingLink(true);
    try {
      await linkContactToLead(pendingLinkContactId, { showLinkedToast: true });
    } finally {
      setIsRetryingLink(false);
    }
  }, [linkContactToLead, pendingLinkContactId]);

  const handleRemoveContactClick = useCallback((contact) => {
    setContactToRemove(contact);
  }, []);

  const handleRemoveContactConfirm = useCallback(async () => {
    if (!lead?.name || !contactToRemove) return;
    const contactId = contactToRemove.id || contactToRemove.name;
    if (!contactId) return;
    setIsRemoving(true);
    try {
      await removeCrmLeadContact(lead.name, contactId);
      setContactToRemove(null);
      showSuccessToast('Contact unlinked from lead.');
      const ids = await refreshLinkedContactIds();
      await onLeadUpdated?.();
      await fetchContacts(1, undefined, ids);
    } catch (error) {
      showErrorToast(error?.response?.data?.message || 'Failed to unlink contact from lead');
    } finally {
      setIsRemoving(false);
    }
  }, [lead?.name, contactToRemove, onLeadUpdated, refreshLinkedContactIds, fetchContacts]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-white'>
      <div className='flex flex-1 flex-col gap-4 px-6 pt-6 pb-0 min-h-0'>
        <CrmContactsToolbar
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          tableRef={tableRef}
          onFiltersChange={handleFiltersChange}
          appliedFilters={appliedFilters}
          contactOptions={contactOptions}
          resizeColumnsEnabled={resizeColumnsEnabled}
          onResizeEnabledChange={handleResizeEnabledChange}
          onResetColumnSizes={handleResetColumnSizes}
          showGroupBy={false}
          onAddContact={handleAddContactClick}
        />

        <PaginatedTableLayout
          scrollable={false}
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        >
          <CrmContactsTable
            ref={tableRef}
            rows={contactRows}
            isLoading={isLoading}
            variant='compact'
            emptyStateTitle='No contacts linked'
            emptyStateDescription={
              accountId
                ? 'Link or create contacts from this lead’s account.'
                : 'Link an account to this lead before adding contacts.'
            }
            columnWidths={columnWidths}
            onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            columnConfigId={REACT_TABLE_ID_LEAD_CONTACT}
            onDeleteContact={handleRemoveContactClick}
            removeFromAccountMode
            onRowClick={handleRowClick}
            freezeColumns
          />
        </PaginatedTableLayout>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(contactToRemove)}
        onOpenChange={(open) => !open && setContactToRemove(null)}
        title='Remove contact?'
        description='Are you sure you want to unlink this contact from the lead? The contact will remain but will no longer be associated with this lead.'
        item={contactToRemove}
        onConfirm={handleRemoveContactConfirm}
        isLoading={isRemoving}
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingLinkContactId)}
        onOpenChange={(open) => !open && setPendingLinkContactId(null)}
        title='Link contact failed'
        description={`Contact ${pendingLinkContactId} could not be linked to this lead. Retry linking?`}
        onConfirm={handleRetryLinkContact}
        isLoading={isRetryingLink}
        confirmLabel='Retry'
        loadingLabel='Linking...'
      />

      <CrmLeadLinkContactModal
        open={isLinkModalOpen}
        onOpenChange={setIsLinkModalOpen}
        accountId={accountId}
        linkedContactIds={linkedContactIds}
        onLink={handleLinkExistingContact}
        onCreateNew={() => setIsCreateDrawerOpen(true)}
        isSubmitting={isLinking}
      />

      <CrmContactCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        contactOptions={contactOptions}
        onSuccess={handleCreateContact}
        fixedAccount={accountId}
      />
    </div>
  );
};

export default CrmLeadContactTab;
