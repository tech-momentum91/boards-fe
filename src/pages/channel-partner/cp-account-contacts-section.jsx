import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RiErrorWarningLine } from 'react-icons/ri';
import { selectCenterAccess } from '@/redux/centerSlice';
import { fetchCpAccountDetail } from '@/redux/cpAccountSlices';
import { deleteCpContactThunk } from '@/redux/cpContactSlices';
import { getCpContactOptions } from '@/api/crmContacts';
import { getCpContactsList, updateCpContactById } from '@/services/cp-contacts-service';
import { buildCpContactTableUpdatePayload } from './cp-contact-field-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import CreateNewCpContactModal from './create-new-cp-contact-modal';
import CpAccountContactsToolbar from './cp-account-contacts-toolbar';
import CpContactsTable from './cp-contacts-table';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useClientPagination } from '@/hooks/use-client-pagination';
import { DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';
import {
  DEFAULT_CP_ACCOUNT_CONTACTS_FILTERS,
  CP_ACCOUNT_CONTACTS_PERSISTED_KEYS,
  getCpAccountContactsFiltersStorageKey,
  mergeStoredCpAccountContactsFilters,
} from './constants';

function normalizeCpContactOption(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (item == null) return null;
      if (typeof item === 'string') {
        const value = item.trim();
        return value ? { value, label: value } : null;
      }
      const value = String(item.value ?? item.name ?? '').trim();
      const label = String(item.label ?? item.designation ?? item.department ?? value).trim();
      if (!value && !label) return null;
      const resolvedValue = value || label;
      return { value: resolvedValue, label: label || resolvedValue };
    })
    .filter(Boolean);
}

const CpAccountContactsSection = ({ account }) => {
  const dispatch = useDispatch();
  const [contacts, setContacts] = useState(account?.contacts || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  // Per-cpAccount sessionStorage slot. `cpAccount` itself is excluded from
  // the persisted shape — `fetchContacts` always forces it to `[account.id]`,
  // so storing it would be redundant and could leak the id into other states.
  const contactsFiltersStorageKey = useMemo(
    () => getCpAccountContactsFiltersStorageKey(account?.id),
    [account?.id],
  );
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: contactsFiltersStorageKey,
    defaultFilters: DEFAULT_CP_ACCOUNT_CONTACTS_FILTERS,
    persistIncludeKeys: CP_ACCOUNT_CONTACTS_PERSISTED_KEYS,
    persistTrimStringArrays: true,
  });
  // Normalise hydrated snapshots back into the canonical shape so downstream
  // `.length` / spread reads can never see `undefined`.
  const normalizedAppliedFilters = useMemo(
    () => mergeStoredCpAccountContactsFilters(appliedFilters),
    [appliedFilters],
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cpOnlyFilterOptions, setCpOnlyFilterOptions] = useState({
    designation: [],
    department: [],
  });
  const [cpOnlyFilterOptionsLoading, setCpOnlyFilterOptionsLoading] = useState(false);
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'cp-account-contacts-table',
    'compact',
  );

  const centerAccess = useSelector(selectCenterAccess);
  const centers = useMemo(
    () => (Array.isArray(centerAccess?.selectedCenters) ? centerAccess.selectedCenters : []),
    [centerAccess?.selectedCenters],
  );

  useEffect(() => {
    let isMounted = true;
    setCpOnlyFilterOptionsLoading(true);
    getCpContactOptions()
      .then((options) => {
        if (!isMounted) return;
        setCpOnlyFilterOptions({
          designation: normalizeCpContactOption(options?.designation),
          department: normalizeCpContactOption(options?.department),
        });
      })
      .catch(() => {
        if (isMounted) {
          setCpOnlyFilterOptions({ designation: [], department: [] });
        }
      })
      .finally(() => {
        if (isMounted) setCpOnlyFilterOptionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!account?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCpContactsList({
        centers,
        search,
        cpAccount: [account.id],
        salesOwner: normalizedAppliedFilters.salesOwner,
        designation: normalizedAppliedFilters.designation,
        department: normalizedAppliedFilters.department,
        state: normalizedAppliedFilters.state,
        city: normalizedAppliedFilters.city,
        reportingManager: normalizedAppliedFilters.reportingManager,
        // Map sorting to groupOrder if needed, or implement full sorting support
        groupOrder: sorting?.[0]?.desc ? 'desc' : 'asc',
      });
      if (result.error) {
        setError(result.error);
        setContacts([]);
      } else {
        setContacts(result.data ?? []);
      }
    } catch (error_) {
      setError(error_.message || 'Failed to fetch contacts');
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [account?.id, centers, search, normalizedAppliedFilters, sorting]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const rows = contacts;

  const { paginatedItems: paginatedRows, paginationProps } = useClientPagination(rows, {
    initialPageSize: DEFAULT_LIST_PAGE_SIZE,
    resetOnChange: [rows],
  });

  const toolbarFilterOptions = useMemo(
    () => ({
      designation: cpOnlyFilterOptions.designation,
      department: cpOnlyFilterOptions.department,
    }),
    [cpOnlyFilterOptions],
  );

  const handleFieldUpdate = useCallback(
    async (contactId, field, value) => {
      if (!contactId) return;
      const payload = buildCpContactTableUpdatePayload(field, value);
      if (!payload) return;
      try {
        const result = await updateCpContactById(contactId, payload);
        if (result?.error) {
          showErrorToast(result.error, { defaultMessage: 'Failed to update contact.' });
          return;
        }
        showSuccessToast('Contact updated.');
        fetchContacts();
      } catch (error_) {
        showErrorToast(error_, { defaultMessage: 'Failed to update contact.' });
      }
    },
    [fetchContacts],
  );

  const handleDeleteClick = (row) => {
    setContactToDelete(row);
    setIsDeleteModalOpen(true);
  };

  const handleSortingChange = useCallback((updaterOrValue) => {
    setSorting((prev) =>
      typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue,
    );
  }, []);

  const handleConfirmDelete = async () => {
    if (!contactToDelete?.id) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteCpContactThunk(contactToDelete.id)).unwrap();
      setIsDeleteModalOpen(false);
      setContactToDelete(null);
      fetchContacts();
      if (account?.id) dispatch(fetchCpAccountDetail(account.id));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = (open) => {
    if (!open) {
      setIsDeleteModalOpen(false);
      setContactToDelete(null);
    }
  };

  return (
    <div className='flex flex-col h-full min-h-0 gap-4 px-6 pt-4 pb-0'>
      <CpAccountContactsToolbar
        search={search}
        onSearchChange={setSearch}
        tableVariant={tableVariant}
        onTableVariantToggle={toggleTableVariant}
        onAddContact={() => setIsCreateOpen(true)}
        appliedFilters={normalizedAppliedFilters}
        onFiltersChange={setAppliedFilters}
        filterOptions={toolbarFilterOptions}
        filterOptionsLoading={cpOnlyFilterOptionsLoading}
      />

      <PaginatedTableLayout
        className='flex-1 min-h-0 rounded-xl border border-stroke-soft-200 bg-bg-white-0 overflow-hidden flex flex-col'
        {...paginationProps}
      >
        <CpContactsTable
          rows={paginatedRows}
          groupedData={null}
          groupBy=''
          isLoading={isLoading}
          error={error}
          variant={tableVariant}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          tableId='cp-account-contacts-table'
          onDelete={handleDeleteClick}
          onFieldUpdate={handleFieldUpdate}
          emptyStateVariant={contacts.length === 0 ? 'default' : 'search'}
        />
      </PaginatedTableLayout>

      <CreateNewCpContactModal
        open={isCreateOpen}
        setOpen={setIsCreateOpen}
        defaultCpAccountId={account?.id}
        defaultCpAccountLabel={account?.legalName || account?.brandName || account?.id}
        lockCpAccount
        onSuccess={() => {
          fetchContacts();
          if (account?.id) {
            dispatch(fetchCpAccountDetail(account.id));
          }
        }}
      />

      {/* Remove CP Contact confirmation modal – design from Figma */}
      <Modal.Root open={isDeleteModalOpen} onOpenChange={handleCloseDeleteModal}>
        <Modal.Content
          className='max-w-[400px] rounded-2xl shadow-[0px_16px_32px_-12px_rgba(88,92,95,0.1)]'
          showClose={false}
        >
          <div className='flex flex-col gap-4 items-center px-5 py-8'>
            <div className='flex items-center justify-center p-2 rounded-[10px] bg-warning-lighter'>
              <RiErrorWarningLine className='size-6 text-warning-base' aria-hidden />
            </div>
            <div className='flex flex-col gap-1 items-center w-full text-center'>
              <h2 className='label-medium text-text-sub-600'>Remove CP Contact?</h2>
              <p className='paragraph-small text-text-sub-600'>
                Are you sure you want to remove this CP Contact?
              </p>
            </div>
          </div>
          <Modal.Footer className='justify-center gap-3 px-8 py-6 border-t border-stroke-soft-200'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => handleCloseDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='size-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                  Removing...
                </span>
              ) : (
                'Confirm'
              )}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default CpAccountContactsSection;
