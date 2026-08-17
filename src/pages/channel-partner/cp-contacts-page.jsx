import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiUserLine } from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import CpContactsStatusTabs from './cp-contacts-status-tabs';
import CpContactsToolbar from './cp-contacts-toolbar';
import CpContactsTable from './cp-contacts-table';
import CreateNewCpContactModal from './create-new-cp-contact-modal';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useClientPagination } from '@/hooks/use-client-pagination';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCenterAccess, selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  fetchCpContacts,
  deleteCpContactThunk,
  setActiveTab,
  setSearchTerm,
  setSorting,
  setGroupBy,
  setGroupOrder,
  setAppliedFilters,
  selectCpContactsListData,
  selectCpContactsFilters,
  selectCpContactsSorting,
  selectCpContactsGroupBy,
  selectCpContactsGroupOrder,
  selectCpContactsAppliedFilters,
  fetchCpContactFilterOptions,
  selectCpContactFilterOptions,
  selectCpContactFilterOptionsLoading,
} from '@/redux/cpContactSlices';
import { CP_CONTACTS_GROUP_BY_FIELD_MAP } from './constants-cp-contacts';
import { buildCpContactTableUpdatePayload } from './cp-contact-field-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { matchesDatetimeFilter } from '@/utils/date-utils';
import { getCpContactOptions } from '@/api/crmContacts';
import { updateCpContactById } from '@/services/cp-contacts-service';
import {
  adaptGlobalCenterIntent,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

/** Contact belongs to tab if status or lifecycleStage matches (e.g. MQL tab = status or lifecycleStage is MQL). */
function contactMatchesTab(contact, tab) {
  if (tab === 'all') return true;
  const t = tab.toLowerCase();
  const status = (contact.status ?? '').toString().toLowerCase();
  const stage = (contact.lifecycleStage ?? '').toString().toLowerCase();
  return status === t || stage === t;
}

function cpContactMatchesDatetimeFilters(contact, appliedFilters) {
  if (!matchesDatetimeFilter(contact.createdAt, appliedFilters?.created_at)) {
    return false;
  }
  if (
    !matchesDatetimeFilter(contact.modifiedAt || contact.modified, appliedFilters?.last_modified_at)
  ) {
    return false;
  }
  return true;
}

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

const CpContactsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cpContactsTableRef = useRef(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [cpOnlyFilterOptions, setCpOnlyFilterOptions] = useState({
    designation: [],
    department: [],
  });
  const [cpOnlyFilterOptionsLoading, setCpOnlyFilterOptionsLoading] = useState(false);
  const centerAccess = useSelector(selectCenterAccess);
  const listData = useSelector(selectCpContactsListData);
  const filters = useSelector(selectCpContactsFilters);
  const sorting = useSelector(selectCpContactsSorting);
  const groupBy = useSelector(selectCpContactsGroupBy);
  const groupOrder = useSelector(selectCpContactsGroupOrder);
  const appliedFilters = useSelector(selectCpContactsAppliedFilters);
  const filterOptions = useSelector(selectCpContactFilterOptions);
  const filterOptionsLoading = useSelector(selectCpContactFilterOptionsLoading);

  const contacts = listData.data ?? [];
  const isLoading = listData.isLoading;
  const error = listData.error;
  const { activeTab, searchTerm } = filters;

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  // Global centre header normalised through the shared helper.
  // The CP Contacts backend uses `parse_global_center_param` and treats:
  //   - missing `centers` -> no centre restriction
  //   - explicit empty    -> 0 rows
  //   - explicit non-empty -> filter to those centres
  // We send the adapter's array verbatim. For `All` (adapter returns `null`)
  // we omit the param entirely so the backend keeps its broad-list behaviour.
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const adaptedCpCenters = useMemo(
    () => adaptGlobalCenterIntent.cpContact(globalCenterIntent),
    [globalCenterIntent],
  );
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);
  const selectedCenters = useMemo(
    () => (Array.isArray(centerAccess?.selectedCenters) ? centerAccess.selectedCenters : []),
    [centerAccess?.selectedCenters],
  );

  /** Build the `centers` payload field for CP Contacts thunks. Returns
   *  `undefined` to omit the param (All / Loading), `[]` for explicit empty,
   *  or a subset array. */
  const buildCpContactCentersParam = useCallback(() => {
    if (adaptedCpCenters === undefined) return undefined; // Loading
    if (adaptedCpCenters === null) return undefined; // All -> omit
    return adaptedCpCenters; // Subset / Empty
  }, [adaptedCpCenters]);

  useEffect(() => {
    if (centerAccessLoading) return;
    const payloadCenters = buildCpContactCentersParam();
    dispatch(
      fetchCpContacts({
        ...(payloadCenters !== undefined ? { centers: payloadCenters } : {}),
        search: searchTerm,
        searchTerm,
        status: appliedFilters.status,
        cpAccount: appliedFilters.cpAccount,
        salesOwner: appliedFilters.salesOwner,
        designation: appliedFilters.designation,
        department: appliedFilters.department,
        state: appliedFilters.state,
        city: appliedFilters.city,
        lifecycleStage: appliedFilters.lifecycleStage,
        groupBy: groupBy || undefined,
        groupOrder: groupOrder || undefined,
      }),
    );
  }, [
    dispatch,
    buildCpContactCentersParam,
    searchTerm,
    groupBy,
    groupOrder,
    appliedFilters,
    centerAccessLoading,
  ]);

  const tabCounts = useMemo(() => {
    const all = contacts.length;
    const mql = contacts.filter((c) => contactMatchesTab(c, 'mql')).length;
    const sql = contacts.filter((c) => contactMatchesTab(c, 'sql')).length;
    const opportunity = contacts.filter((c) => contactMatchesTab(c, 'opportunity')).length;
    const closure = contacts.filter((c) => contactMatchesTab(c, 'closure')).length;
    const customer = contacts.filter((c) => contactMatchesTab(c, 'customer')).length;
    return { all, mql, sql, opportunity, closure, customer };
  }, [contacts]);

  const filteredData = useMemo(() => {
    let list = contacts.filter((c) => cpContactMatchesDatetimeFilters(c, appliedFilters));
    if (activeTab !== 'all') {
      list = list.filter((c) => contactMatchesTab(c, activeTab));
    }
    if (groupBy && CP_CONTACTS_GROUP_BY_FIELD_MAP[groupBy]) {
      const field = CP_CONTACTS_GROUP_BY_FIELD_MAP[groupBy];
      const dir = groupOrder === 'desc' ? -1 : 1;
      list = [...list].sort((a, b) => {
        const va = a[field] ?? '';
        const vb = b[field] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
        return cmp * dir;
      });
    }
    return list;
  }, [contacts, activeTab, groupBy, groupOrder, appliedFilters]);

  const { paginatedItems: paginatedData, paginationProps } = useClientPagination(filteredData, {
    resetOnChange: [filteredData],
  });

  /** When groupBy is set, group rows by that field for the grouped table UI */
  const groupedData = useMemo(() => {
    if (!groupBy || !CP_CONTACTS_GROUP_BY_FIELD_MAP[groupBy]) return null;
    const field = CP_CONTACTS_GROUP_BY_FIELD_MAP[groupBy];
    const map = {};
    paginatedData.forEach((row) => {
      const key = String(row[field] ?? '—');
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });
    const keys = Object.keys(map);
    const dir = groupOrder === 'desc' ? -1 : 1;
    keys.sort(
      (a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }) * dir,
    );
    const ordered = {};
    keys.forEach((k) => (ordered[k] = map[k]));
    return ordered;
  }, [paginatedData, groupBy, groupOrder]);

  const mergedFilterOptions = useMemo(
    () => ({
      ...filterOptions,
      designation: cpOnlyFilterOptions.designation,
      department: cpOnlyFilterOptions.department,
    }),
    [filterOptions, cpOnlyFilterOptions],
  );

  const handleAddContact = useCallback(() => setIsCreateModalOpen(true), []);

  const handleCreateContactSuccess = useCallback(() => {
    const payloadCenters = buildCpContactCentersParam();
    dispatch(
      fetchCpContacts({
        ...(payloadCenters !== undefined ? { centers: payloadCenters } : {}),
        search: searchTerm,
        searchTerm,
        status: appliedFilters.status,
        cpAccount: appliedFilters.cpAccount,
        salesOwner: appliedFilters.salesOwner,
        designation: appliedFilters.designation,
        department: appliedFilters.department,
        state: appliedFilters.state,
        city: appliedFilters.city,
        lifecycleStage: appliedFilters.lifecycleStage,
        groupBy: groupBy || undefined,
        groupOrder: groupOrder || undefined,
      }),
    );
  }, [dispatch, buildCpContactCentersParam, searchTerm, groupBy, groupOrder, appliedFilters]);

  const handleTabChange = useCallback(
    (value) => {
      dispatch(setActiveTab(value));
    },
    [dispatch],
  );

  const handleSearchChange = useCallback(
    (value) => {
      dispatch(setSearchTerm(value));
    },
    [dispatch],
  );

  const handleCenterSelectionChange = useCallback(
    (nextSelectedCenters) => {
      dispatch(setSelectedCenters(nextSelectedCenters));
    },
    [dispatch],
  );

  const handleGroupByChange = useCallback(
    (value) => {
      dispatch(setGroupBy(value));
    },
    [dispatch],
  );

  const handleGroupOrderChange = useCallback(
    (value) => {
      dispatch(setGroupOrder(typeof value === 'function' ? value(groupOrder) : value));
    },
    [dispatch, groupOrder],
  );

  const handleFiltersChange = useCallback(
    (newAppliedFilters) => {
      dispatch(setAppliedFilters(newAppliedFilters));
    },
    [dispatch],
  );

  const handleOpenFilters = useCallback(() => {
    const payloadCenters = buildCpContactCentersParam();
    dispatch(
      fetchCpContactFilterOptions(payloadCenters !== undefined ? { centers: payloadCenters } : {}),
    );
    setCpOnlyFilterOptionsLoading(true);
    getCpContactOptions()
      .then((options) => {
        setCpOnlyFilterOptions({
          designation: normalizeCpContactOption(options?.designation),
          department: normalizeCpContactOption(options?.department),
        });
      })
      .catch(() => {
        setCpOnlyFilterOptions({ designation: [], department: [] });
      })
      .finally(() => {
        setCpOnlyFilterOptionsLoading(false);
      });
  }, [dispatch, buildCpContactCentersParam]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
      dispatch(setSorting(newSorting));
    },
    [dispatch, sorting],
  );

  const handleDeleteContactClick = useCallback((contact) => {
    setContactToDelete(contact);
  }, []);

  const refetchContacts = useCallback(() => {
    dispatch(
      fetchCpContacts({
        centers: selectedCenters,
        search: searchTerm,
        searchTerm,
        status: appliedFilters.status,
        cpAccount: appliedFilters.cpAccount,
        salesOwner: appliedFilters.salesOwner,
        designation: appliedFilters.designation,
        department: appliedFilters.department,
        state: appliedFilters.state,
        city: appliedFilters.city,
        lifecycleStage: appliedFilters.lifecycleStage,
        groupBy: groupBy || undefined,
        groupOrder: groupOrder || undefined,
      }),
    );
  }, [dispatch, selectedCenters, searchTerm, appliedFilters, groupBy, groupOrder]);

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
        refetchContacts();
      } catch (error_) {
        showErrorToast(error_, { defaultMessage: 'Failed to update contact.' });
      }
    },
    [refetchContacts],
  );

  const handleDeleteContactConfirm = useCallback(
    async (contact) => {
      if (!contact) return;
      const id = contact.id ?? contact.name;
      if (!id) {
        showErrorToast('Contact id is required');
        return;
      }
      setContactToDelete(null);
      try {
        await dispatch(deleteCpContactThunk(id)).unwrap();
        showSuccessToast('CP contact deleted.');
      } catch (error_) {
        const msg =
          typeof error_ === 'string'
            ? error_
            : error_?.message || error_?.toString?.() || 'Failed to delete contact';
        showErrorToast(msg);
      }
    },
    [dispatch],
  );

  return (
    <PageLayout
      pageTitle='CP Contacts'
      pageIcon={<RiUserLine size={24} />}
      pageDescription='Manage all your CP Contacts details from here.'
      contentAreaClassName='!overflow-hidden'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex flex-col flex-1 min-h-0 gap-4 px-8 pt-6 pb-0'>
        <CpContactsToolbar
          filters={{ search: searchTerm }}
          onSearchChange={handleSearchChange}
          onCreateContact={handleAddContact}
          tableRef={cpContactsTableRef}
          onGroupByChange={handleGroupByChange}
          groupBy={groupBy}
          groupOrder={groupOrder}
          onGroupOrderChange={handleGroupOrderChange}
          onFiltersChange={handleFiltersChange}
          appliedFilters={appliedFilters}
          filterOptions={mergedFilterOptions}
          filterOptionsLoading={filterOptionsLoading || cpOnlyFilterOptionsLoading}
          onOpenFilters={handleOpenFilters}
        />

        <PaginatedTableLayout {...paginationProps} grouped={Boolean(groupBy)}>
          <CpContactsTable
            ref={cpContactsTableRef}
            rows={paginatedData}
            groupedData={groupedData}
            groupBy={groupBy}
            isLoading={isLoading && contacts.length === 0}
            error={error && contacts.length === 0 ? error : null}
            variant='compact'
            sorting={sorting}
            onSortingChange={handleSortingChange}
            tableId='cp-contacts-table'
            onDelete={handleDeleteContactClick}
            onFieldUpdate={handleFieldUpdate}
            emptyStateVariant={contacts.length === 0 ? 'default' : 'search'}
          />
        </PaginatedTableLayout>
      </div>
      <CreateNewCpContactModal
        open={isCreateModalOpen}
        setOpen={setIsCreateModalOpen}
        onSuccess={handleCreateContactSuccess}
      />

      <DeleteConfirmModal
        isOpen={Boolean(contactToDelete)}
        onOpenChange={(open) => !open && setContactToDelete(null)}
        title='Delete CP Contact?'
        description='Are you sure you want to delete this contact? This action cannot be undone.'
        item={contactToDelete}
        onConfirm={handleDeleteContactConfirm}
        isLoading={false}
      />
    </PageLayout>
  );
};

export default CpContactsPage;
