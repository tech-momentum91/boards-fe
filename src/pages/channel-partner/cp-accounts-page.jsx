import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiStackLine } from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import CpAccountsStatusTabs from '@/pages/channel-partner/cp-accounts-status-tabs';
import CpAccountsToolbar from '@/pages/channel-partner/cp-accounts-toolbar';
import CpAccountsTable from '@/pages/channel-partner/cp-accounts-table';
import CreateNewCpAccountModal from '@/pages/channel-partner/create-new-cp-account-modal';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useClientPagination } from '@/hooks/use-client-pagination';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCenterAccess, selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  fetchCpAccounts,
  fetchCpAccountTypeOptions,
  deleteCpAccountThunk,
  setActiveTab,
  setSearchTerm,
  setSorting,
  setGroupBy,
  setGroupOrder,
  setAppliedFilters,
  patchCpAccountInList,
  cpAccountListRowPatch,
  selectCpAccountsListData,
  selectCpAccountsFilters,
  selectCpAccountsSorting,
  selectCpAccountsGroupBy,
  selectCpAccountsGroupOrder,
  selectCpAccountsAppliedFilters,
  selectCpAccountTypeOptions,
} from '@/redux/cpAccountSlices';
import { CP_ACCOUNTS_GROUP_BY_FIELD_MAP } from '@/pages/channel-partner/constants';
import { getIndustryTypeList, getSalesTeamUserList } from '@/api/crmAccounts';
import { getCpAccountById, updateCpAccountById } from '@/services/cp-accounts-service';
import { matchesDatetimeFilter } from '@/utils/date-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import CpAccountEditAddressModal from '@/pages/channel-partner/cp-account-edit-address-modal';
import {
  mapCpAddressRowToModalShape,
  pickCpBillingAddressRow,
  pickCpPrimaryAddressRow,
} from '@/pages/channel-partner/cp-account-address-utils';
import {
  adaptGlobalCenterIntent,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';
import {
  buildOperationalLocationPayload,
  listRowPatchFromOperationalCities,
} from '@/pages/channel-partner/cp-operational-location-utils';

function cpAccountMatchesDatetimeFilters(account, appliedFilters) {
  if (!matchesDatetimeFilter(account.createdAt, appliedFilters?.created_at)) {
    return false;
  }
  if (
    !matchesDatetimeFilter(
      account.modifiedAt || account.last_modified_at || account.modified,
      appliedFilters?.last_modified_at,
    )
  ) {
    return false;
  }
  return true;
}

const CpAccountsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cpAccountsTableRef = useRef(null);
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'cp-accounts-table',
    'compact',
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [industryGroups, setIndustryGroups] = useState([]);
  const centerAccess = useSelector(selectCenterAccess);
  const listData = useSelector(selectCpAccountsListData);
  const filters = useSelector(selectCpAccountsFilters);
  const sorting = useSelector(selectCpAccountsSorting);
  const groupBy = useSelector(selectCpAccountsGroupBy);
  const groupOrder = useSelector(selectCpAccountsGroupOrder);
  const appliedFilters = useSelector(selectCpAccountsAppliedFilters);
  const typeOptions = useSelector(selectCpAccountTypeOptions);

  const accounts = listData.data ?? [];
  const isLoading = listData.isLoading;
  const error = listData.error;
  const { activeTab, searchTerm } = filters;

  const statusTabs = useMemo(() => [{ value: 'all', label: 'All' }, ...typeOptions], [typeOptions]);

  // Drop stale tab ids if type options change (e.g. backend removed a type).
  useEffect(() => {
    if (activeTab === 'all') return;
    if (!typeOptions.some((o) => o.value === activeTab)) {
      dispatch(setActiveTab('all'));
    }
  }, [activeTab, typeOptions, dispatch]);

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  useEffect(() => {
    dispatch(fetchCpAccountTypeOptions());
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;

    const loadSalesOwners = async () => {
      try {
        const response = await getSalesTeamUserList();
        if (!mounted) return;
        const normalized = Array.isArray(response)
          ? response
              .map((opt) => {
                if (typeof opt === 'string') {
                  return { value: opt, label: opt };
                }
                const value = opt?.value ?? opt?.name ?? opt?.email ?? '';
                const label = opt?.label ?? opt?.full_name ?? value;
                const email =
                  typeof opt?.email === 'string' && opt.email.trim() ? opt.email.trim() : '';
                return value ? { value, label, email } : null;
              })
              .filter(Boolean)
          : [];
        setSalesOwnerOptions(normalized);
      } catch {
        if (mounted) setSalesOwnerOptions([]);
      }
    };

    loadSalesOwners();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadIndustryOptions = async () => {
      try {
        const options = await getIndustryTypeList({ grouped: true, scope: 'cp' });
        if (!mounted) return;
        const groups = Array.isArray(options?.industry_type)
          ? options.industry_type.filter(
              (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
            )
          : [];
        setIndustryGroups(groups);
      } catch {
        if (mounted) setIndustryGroups([]);
      }
    };

    loadIndustryOptions();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadIndustryOptions = async () => {
      try {
        const options = await getIndustryTypeList({ grouped: true, scope: 'cp' });
        if (!mounted) return;
        const groups = Array.isArray(options?.industry_type)
          ? options.industry_type.filter(
              (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
            )
          : [];
        setIndustryGroups(groups);
      } catch {
        if (mounted) setIndustryGroups([]);
      }
    };

    loadIndustryOptions();
    return () => {
      mounted = false;
    };
  }, []);

  // Global centre header normalised through the shared helper.
  // `cpAccountCenters` is the array we send to the backend:
  //   - All selected -> the full centre list (backend treats missing/empty as 0 rows)
  //   - Subset       -> the selected subset
  //   - Empty        -> [] (backend short-circuits to 0 rows)
  //   - Loading      -> undefined (we gate the dispatch below)
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const adaptedCpCenters = useMemo(
    () => adaptGlobalCenterIntent.cpAccount(globalCenterIntent),
    [globalCenterIntent],
  );
  // The CP backend does not omit a missing centre filter, so the "All" case
  // (`null` from the adapter) must still be expressed as the full centre list.
  const cpAccountCenters = useMemo(() => {
    if (adaptedCpCenters === undefined) return undefined;
    if (adaptedCpCenters === null) {
      return Array.isArray(centerAccess?.data)
        ? centerAccess.data.map((c) => c?.name ?? c?.value).filter(Boolean)
        : [];
    }
    return adaptedCpCenters;
  }, [adaptedCpCenters, centerAccess?.data]);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);

  const cpCentersKey = useMemo(
    () => (cpAccountCenters === undefined ? 'loading' : JSON.stringify(cpAccountCenters)),
    [cpAccountCenters],
  );
  const appliedFiltersKey = useMemo(() => JSON.stringify(appliedFilters ?? {}), [appliedFilters]);

  useEffect(() => {
    if (centerAccessLoading || cpAccountCenters === undefined) return;
    dispatch(
      fetchCpAccounts({
        centers: cpAccountCenters,
        search: searchTerm,
        type: 'all',
        types: appliedFilters?.type ?? [],
        industry: appliedFilters?.industry ?? [],
        city: appliedFilters?.city ?? [],
        state: appliedFilters?.state ?? [],
        salesOwner: appliedFilters?.salesOwner ?? [],
      }),
    );
  }, [
    dispatch,
    cpCentersKey,
    cpAccountCenters,
    searchTerm,
    appliedFiltersKey,
    centerAccessLoading,
  ]);

  // Tab counts reflect the user's *current* slice of the data, ignoring the
  // Type chip / active tab itself so each tab still shows how many records of
  // its type exist within the rest of the filters (industry, city, state,
  // salesOwner, search). Without this, the badges always show the unfiltered
  // totals which is misleading once any filter is applied.
  const countableAccounts = useMemo(() => {
    let list = accounts;
    if (Array.isArray(appliedFilters?.industry) && appliedFilters.industry.length > 0) {
      const set = new Set(appliedFilters.industry);
      list = list.filter((a) => a.industry && set.has(a.industry));
    }
    if (Array.isArray(appliedFilters?.city) && appliedFilters.city.length > 0) {
      const set = new Set(appliedFilters.city);
      list = list.filter((a) => a.city && set.has(a.city));
    }
    if (Array.isArray(appliedFilters?.state) && appliedFilters.state.length > 0) {
      const set = new Set(appliedFilters.state);
      list = list.filter((a) => a.state && set.has(a.state));
    }
    if (Array.isArray(appliedFilters?.salesOwner) && appliedFilters.salesOwner.length > 0) {
      const set = new Set(appliedFilters.salesOwner);
      list = list.filter((a) => a.salesOwner && set.has(a.salesOwner));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.legalName?.toLowerCase().includes(q) ||
          a.brandName?.toLowerCase().includes(q) ||
          a.city?.toLowerCase().includes(q) ||
          a.state?.toLowerCase().includes(q),
      );
    }
    list = list.filter((a) => cpAccountMatchesDatetimeFilters(a, appliedFilters));
    return list;
  }, [
    accounts,
    searchTerm,
    appliedFilters?.industry,
    appliedFilters?.city,
    appliedFilters?.state,
    appliedFilters?.salesOwner,
    appliedFilters?.created_at,
    appliedFilters?.last_modified_at,
  ]);

  const tabCounts = useMemo(() => {
    const counts = { all: countableAccounts.length };
    typeOptions.forEach((opt) => {
      counts[opt.value] = countableAccounts.filter((a) => {
        const t = a.type;
        return t === opt.value || t === opt.label;
      }).length;
    });
    return counts;
  }, [countableAccounts, typeOptions]);

  const filterOptions = useMemo(() => {
    const citySet = new Set();
    const stateSet = new Set();
    accounts.forEach((a) => {
      if (a.city?.trim()) citySet.add(a.city.trim());
      if (a.state?.trim()) stateSet.add(a.state.trim());
    });
    return {
      type: typeOptions,
      city: [...citySet].sort().map((v) => ({ value: v, label: v })),
      state: [...stateSet].sort().map((v) => ({ value: v, label: v })),
      salesOwner: salesOwnerOptions,
    };
  }, [accounts, salesOwnerOptions, typeOptions]);

  const filteredData = useMemo(() => {
    let list = accounts;
    if (Array.isArray(appliedFilters?.type) && appliedFilters.type.length > 0) {
      const typeSet = new Set(appliedFilters.type);
      list = list.filter((a) => {
        if (!a.type) return false;
        if (typeSet.has(a.type)) return true;
        return typeOptions.some((o) => typeSet.has(o.value) && a.type === o.label);
      });
    } else if (activeTab !== 'all') {
      const opt = typeOptions.find((o) => o.value === activeTab);
      list = list.filter((a) => a.type === activeTab || (opt && a.type === opt.label));
    }
    if (Array.isArray(appliedFilters?.industry) && appliedFilters.industry.length > 0) {
      const set = new Set(appliedFilters.industry);
      list = list.filter((a) => a.industry && set.has(a.industry));
    }
    if (Array.isArray(appliedFilters?.city) && appliedFilters.city.length > 0) {
      const set = new Set(appliedFilters.city);
      list = list.filter((a) => a.city && set.has(a.city));
    }
    if (Array.isArray(appliedFilters?.state) && appliedFilters.state.length > 0) {
      const set = new Set(appliedFilters.state);
      list = list.filter((a) => a.state && set.has(a.state));
    }
    if (Array.isArray(appliedFilters?.salesOwner) && appliedFilters.salesOwner.length > 0) {
      const set = new Set(appliedFilters.salesOwner);
      list = list.filter((a) => a.salesOwner && set.has(a.salesOwner));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.legalName?.toLowerCase().includes(q) ||
          a.brandName?.toLowerCase().includes(q) ||
          a.city?.toLowerCase().includes(q) ||
          a.state?.toLowerCase().includes(q),
      );
    }
    list = list.filter((a) => cpAccountMatchesDatetimeFilters(a, appliedFilters));
    if (groupBy && CP_ACCOUNTS_GROUP_BY_FIELD_MAP[groupBy]) {
      const field = CP_ACCOUNTS_GROUP_BY_FIELD_MAP[groupBy];
      const dir = groupOrder === 'desc' ? -1 : 1;
      list = [...list].sort((a, b) => {
        const va = a[field] ?? '';
        const vb = b[field] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
        return cmp * dir;
      });
    }
    return list;
  }, [
    accounts,
    activeTab,
    searchTerm,
    groupBy,
    groupOrder,
    typeOptions,
    appliedFilters?.type,
    appliedFilters?.industry,
    appliedFilters?.city,
    appliedFilters?.state,
    appliedFilters?.salesOwner,
    appliedFilters?.created_at,
    appliedFilters?.last_modified_at,
  ]);

  const { paginatedItems: paginatedData, paginationProps } = useClientPagination(filteredData, {
    resetOnChange: [filteredData],
  });

  /** When groupBy is set, group rows by that field for the grouped table UI */
  const groupedData = useMemo(() => {
    if (!groupBy || !CP_ACCOUNTS_GROUP_BY_FIELD_MAP[groupBy]) return null;
    const field = CP_ACCOUNTS_GROUP_BY_FIELD_MAP[groupBy];
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

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
      dispatch(setSorting(newSorting));
    },
    [dispatch, sorting],
  );

  const handleDeleteCpAccountClick = useCallback((account) => {
    setAccountToDelete(account);
  }, []);

  const handleDeleteCpAccountConfirm = useCallback(
    async (account) => {
      if (!account) return;
      const id = account.id ?? account.name;
      if (!id) {
        showErrorToast('Account id is required');
        return;
      }
      setAccountToDelete(null);
      try {
        await dispatch(deleteCpAccountThunk(id)).unwrap();
        showSuccessToast('CP account deleted.');
      } catch (error_) {
        const msg =
          typeof error_ === 'string'
            ? error_
            : error_?.message || error_?.toString?.() || 'Failed to delete account';
        showErrorToast(msg);
      }
    },
    [dispatch],
  );

  const handleAddCpAccount = useCallback(() => setIsCreateModalOpen(true), []);

  const refetchCpAccounts = useCallback(() => {
    const centers = Array.isArray(centerAccess?.selectedCenters)
      ? centerAccess.selectedCenters
      : [];
    dispatch(
      fetchCpAccounts({
        centers,
        search: searchTerm,
        type: 'all',
        types: appliedFilters?.type ?? [],
        industry: appliedFilters?.industry ?? [],
        city: appliedFilters?.city ?? [],
        state: appliedFilters?.state ?? [],
        salesOwner: appliedFilters?.salesOwner ?? [],
      }),
    );
  }, [dispatch, centerAccess?.selectedCenters, searchTerm, appliedFilters]);

  const handleCreateCpAccountSuccess = useCallback(() => {
    refetchCpAccounts();
  }, [refetchCpAccounts]);

  const handleFieldUpdate = useCallback(
    async (accountId, field, value) => {
      if (!accountId) return;
      try {
        const result = await updateCpAccountById(accountId, { [field]: value });
        if (result?.error) {
          showErrorToast(result.error);
          return;
        }
        showSuccessToast('Updated successfully.');
        dispatch(
          patchCpAccountInList({
            id: accountId,
            updates: cpAccountListRowPatch(field, value),
          }),
        );
      } catch (error_) {
        showErrorToast(error_?.message || 'Failed to update account');
      }
    },
    [dispatch],
  );

  const handleYearsOfEstablishmentUpdate = useCallback(
    (accountId, value) => handleFieldUpdate(accountId, 'yearOfEst', value),
    [handleFieldUpdate],
  );

  const handleOperationalLocationUpdate = useCallback(
    async (accountId, cities) => {
      if (!accountId) return;
      const nextCities = Array.isArray(cities) ? cities : [];
      try {
        const result = await updateCpAccountById(accountId, {
          operationalLocation: buildOperationalLocationPayload(nextCities),
        });
        if (result?.error) {
          showErrorToast(result.error);
          return;
        }
        showSuccessToast('Updated successfully.');
        dispatch(
          patchCpAccountInList({
            id: accountId,
            updates: listRowPatchFromOperationalCities(nextCities),
          }),
        );
      } catch (error_) {
        showErrorToast(error_?.message || 'Failed to update account');
      }
    },
    [dispatch],
  );

  const handleRelatedCpContactsClick = useCallback(
    (account) => {
      const accountId = account?.id ?? account?.name;
      if (!accountId) return;
      navigate(`/channel-partner/accounts/${encodeURIComponent(accountId)}?tabs=cpcontacts`);
    },
    [navigate],
  );

  const [addressEditOpen, setAddressEditOpen] = useState(false);
  const [addressEditAccountId, setAddressEditAccountId] = useState(null);
  const [addressEditPrimary, setAddressEditPrimary] = useState(null);
  const [addressEditBilling, setAddressEditBilling] = useState(null);
  const [addressEditLoading, setAddressEditLoading] = useState(false);

  const handlePrimaryCityClick = useCallback(async (account) => {
    const accountId = account?.id ?? account?.name;
    if (!accountId) return;

    setAddressEditAccountId(accountId);
    setAddressEditOpen(true);
    setAddressEditLoading(true);
    setAddressEditPrimary(null);
    setAddressEditBilling(null);

    try {
      const result = await getCpAccountById(accountId);
      if (result?.error) {
        showErrorToast(result.error);
        setAddressEditOpen(false);
        setAddressEditAccountId(null);
        return;
      }

      const detail = result.data ?? {};
      const primaryRow = pickCpPrimaryAddressRow(detail.addresses);
      const billingRow = pickCpBillingAddressRow(detail.addresses, detail.billingAddress);
      const primaryAddress = mapCpAddressRowToModalShape(primaryRow);
      const billingAddress = mapCpAddressRowToModalShape(billingRow);

      if (!primaryAddress) {
        showErrorToast('No primary address found for this account.');
        setAddressEditOpen(false);
        setAddressEditAccountId(null);
        return;
      }

      setAddressEditPrimary(primaryAddress);
      setAddressEditBilling(billingAddress);
    } catch (error_) {
      showErrorToast(error_?.message || 'Failed to load address details.');
      setAddressEditOpen(false);
      setAddressEditAccountId(null);
    } finally {
      setAddressEditLoading(false);
    }
  }, []);

  const handleAddressEditSuccess = useCallback(async () => {
    const accountId = addressEditAccountId;
    if (!accountId) return;

    try {
      const result = await getCpAccountById(accountId);
      if (result?.error || !result?.data) return;

      const primaryRow = pickCpPrimaryAddressRow(result.data.addresses);
      dispatch(
        patchCpAccountInList({
          id: accountId,
          updates: {
            city: primaryRow?.city ?? '',
            state: primaryRow?.state ?? '',
          },
        }),
      );
    } catch {
      /* list patch is best-effort; detail modal already saved */
    }
  }, [addressEditAccountId, dispatch]);

  const handleAddressEditOpenChange = useCallback((open) => {
    if (!open) {
      setAddressEditOpen(false);
      setAddressEditAccountId(null);
      setAddressEditPrimary(null);
      setAddressEditBilling(null);
      setAddressEditLoading(false);
    }
  }, []);

  const handleExport = useCallback(() => {
    // Placeholder for Export CP accounts
  }, []);

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
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
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

  // Keep status tab in sync with a single Type filter selection (uses API type ids).
  const handleFiltersChange = useCallback(
    (newAppliedFilters) => {
      dispatch(setAppliedFilters(newAppliedFilters));
      const nextTypes = Array.isArray(newAppliedFilters?.type) ? newAppliedFilters.type : [];
      const nextTab = nextTypes.length === 1 ? nextTypes[0] : 'all';
      if (nextTab !== activeTab) {
        dispatch(setActiveTab(nextTab));
      }
    },
    [activeTab, dispatch],
  );

  return (
    <>
      <PageLayout
        contentAreaClassName='overflow-hidden'
        pageTitle='CP Accounts'
        pageIcon={<RiStackLine size={24} />}
        pageDescription='Manage all your CP Accounts details from here.'
        headerActions={
          <CenterAccessDropdown
            centers={centerAccess.data}
            selectedCenters={centerAccess.selectedCenters}
            onChange={handleCenterSelectionChange}
            isLoading={centerAccess.status === 'loading'}
          />
        }
      >
        <div className='flex flex-col flex-1 min-h-0 gap-6 px-8 pb-0'>
          <CpAccountsStatusTabs
            value={activeTab}
            counts={tabCounts}
            tabs={statusTabs}
            onValueChange={handleTabChange}
          />

          <CpAccountsToolbar
            filters={{ search: searchTerm }}
            onSearchChange={handleSearchChange}
            onCreateCpAccount={handleAddCpAccount}
            onExport={handleExport}
            tableRef={cpAccountsTableRef}
            tableVariant={tableVariant}
            onTableVariantToggle={toggleTableVariant}
            onGroupByChange={handleGroupByChange}
            groupBy={groupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            onFiltersChange={handleFiltersChange}
            appliedFilters={appliedFilters}
            filterOptions={filterOptions}
          />

          <PaginatedTableLayout {...paginationProps} grouped={Boolean(groupBy)}>
            <CpAccountsTable
              ref={cpAccountsTableRef}
              rows={paginatedData}
              groupedData={groupedData}
              groupBy={groupBy}
              isLoading={isLoading && accounts.length === 0}
              error={error && accounts.length === 0 ? error : null}
              variant={tableVariant}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              tableId='cp-accounts-table'
              onDelete={handleDeleteCpAccountClick}
              emptyStateVariant={
                noCenters ? 'no_centers' : accounts.length === 0 ? 'default' : 'search'
              }
              salesOwnerOptions={salesOwnerOptions}
              onFieldUpdate={handleFieldUpdate}
              onYearsOfEstablishmentUpdate={handleYearsOfEstablishmentUpdate}
              onOperationalLocationUpdate={handleOperationalLocationUpdate}
              onRelatedCpContactsClick={handleRelatedCpContactsClick}
              onPrimaryCityClick={handlePrimaryCityClick}
              industryGroups={industryGroups}
            />
          </PaginatedTableLayout>
        </div>
      </PageLayout>

      <CreateNewCpAccountModal
        open={isCreateModalOpen}
        setOpen={setIsCreateModalOpen}
        onSuccess={handleCreateCpAccountSuccess}
      />

      <DeleteConfirmModal
        isOpen={Boolean(accountToDelete)}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
        title='Delete CP Account?'
        description='Are you sure you want to delete this account? This action cannot be undone.'
        item={accountToDelete}
        onConfirm={handleDeleteCpAccountConfirm}
        isLoading={false}
      />

      {!addressEditLoading && addressEditPrimary && addressEditAccountId ? (
        <CpAccountEditAddressModal
          open={addressEditOpen}
          onOpenChange={handleAddressEditOpenChange}
          primaryAddress={addressEditPrimary}
          billingAddress={addressEditBilling}
          addressType='primary'
          cpAccountName={addressEditAccountId}
          onSuccess={handleAddressEditSuccess}
        />
      ) : null}
    </>
  );
};

export default CpAccountsPage;
