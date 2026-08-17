import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { PageLayout, ComingSoonMessage } from '@/components';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { RiFileList2Line } from 'react-icons/ri';
import {
  AgreementsTable,
  AgreementsToolbar,
  AgreementsViewTabs,
  AgreementsCalendarToolbar,
  AgreementsCalendar,
  AGREEMENTS_TABLE_ID,
} from '@/components/agreements';
import AgreementsListPage from '@/pages/Agreements/agreements-list-page';
import CreateAmendment from '@/components/agreements/create-amendment';
import CreateNewAgreementDrawer from '@/components/agreements/create-new-agreement';
import AgreementViewDrawer from '@/components/agreements/agreement-view-drawer';
import CreateNewLandlordAgreementDrawer from '@/components/agreements/landlord/create-new-landlord-agreement';
import CreateLandlordAmendment from '@/components/agreements/landlord/create-landlord-amendment';
import LandlordAgreementViewDrawer from '@/components/agreements/landlord/landlord-agreement-view-drawer';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getLandlordListThunk } from '@/redux/landlordSlice';
import {
  getAgreementsClientListThunk,
  getAgreementsListViewThunk,
  getAgreementEntriesGroupedThunk,
  getAgreementCalendarViewThunk,
  getAgreementByIdThunk,
  getAgreementPendingSpaceAllocationListThunk,
  updateAgreementThunk,
  fetchAgreementComments,
  addAgreementComment,
  selectAgreementComments,
} from '@/redux/agreementsSlice';
import { selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  AGREEMENTS_FILTER_MEMBERSHIP_PLAN_OPTIONS,
  AGREEMENTS_FILTER_TYPE_OPTIONS,
  AGREEMENTS_DEFAULT_FILTERS,
  AGREEMENTS_GROUP_BY_API_PARAM_MAP,
  AGREEMENTS_SORT_FIELD_MAP,
  buildAgreementsFilterStorageKey,
  mergeStoredAgreementsFilters,
} from '@/components/agreements/constants';
import {
  adaptGlobalCenterIntent,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
  GLOBAL_CENTER_STATUS,
} from '@/utils/global-center-filter';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { showErrorToast } from '@/utils/error-utils';
import { getModulePermissions } from '@/utils/user-role-utils';
import { getStatusOptions } from '@/api/dynamic-status';

/** Build PUT payload from an API field name (snake_case). */
function buildAgreementUpdatePayload(apiKey, value) {
  const num = (v) => (v === '' || v == null ? undefined : Number(v));
  const str = (v) => (v === '' || v == null ? undefined : String(v));
  const stripMonths = (v) => (typeof v === 'string' ? v.replaceAll(/\s*months?/gi, '').trim() : v);
  const stripPct = (v) => (typeof v === 'string' ? v.replaceAll('%', '').trim() : v);
  const transforms = {
    status: str,
    no_of_monthly_deposit: num,
    sec_deposit_amount: num,
    agreement_start_date: str,
    rent_start_date: str,
    agreement_end_date: str,
    lock_in_period: (v) => num(stripMonths(v)),
    lock_in_end_date: str,
    landlord_rent_start_date: str,
    landlord_agreement_end_date: str,
    landlord_lock_in_period: (v) => num(stripMonths(v)),
    landlord_lock_in_end_date: str,
    increment_date: str,
    payment_due_day: num,
    annual_escalation: (v) => num(stripPct(v)),
    escalation_years: num,
    notice_period_of_client: (v) => num(stripMonths(v)),
    notice_period_of_devx: (v) => num(stripMonths(v)),
    roc: (v) => (v === true || String(v).toLowerCase() === 'yes' ? 'Yes' : ''),
    change_type: str,
    amenities_details: (v) => v,
    no_of_seats: num,
    area: num,
    price_per_seat: num,
    monthly_revenue: num,
    space: (v) => (Array.isArray(v) ? v : undefined),
    space_details: (v) => (Array.isArray(v) ? v : undefined),
    notes: (v) => (typeof v === 'string' ? v.trim() : ''),
  };

  const transform = transforms[apiKey];
  if (!transform) return null;
  const apiValue = transform(value);
  if (apiValue === undefined) return null;
  return { [apiKey]: apiValue };
}

/** Returns true if the new payload value is the same as the current value (skip API call). */
function isAgreementFieldValueEqual(apiValue, currentVal) {
  if (apiValue === currentVal) return true;
  if (apiValue == null && currentVal == null) return true;
  if (apiValue == null || currentVal == null) return false;
  if (typeof apiValue === 'number' && typeof currentVal === 'number') {
    return (
      Number(apiValue) === Number(currentVal) ||
      (Number.isNaN(apiValue) && Number.isNaN(currentVal))
    );
  }
  if (typeof apiValue === 'number' || typeof currentVal === 'number') {
    return Number(apiValue) === Number(currentVal);
  }
  if (typeof apiValue === 'string' && typeof currentVal === 'string') {
    return String(apiValue).trim() === String(currentVal).trim();
  }
  if (Array.isArray(apiValue) && Array.isArray(currentVal)) {
    if (apiValue.length !== currentVal.length) return false;
    return JSON.stringify(apiValue) === JSON.stringify(currentVal);
  }
  if (typeof apiValue === 'object' && typeof currentVal === 'object') {
    return JSON.stringify(apiValue) === JSON.stringify(currentVal);
  }
  return false;
}

const mapMembershipPlanToBackendValue = (value) => {
  // UI uses MEMBERSHIP options like 'RESOURCE', but backend expects title-case labels like 'Resource'
  const opt = (AGREEMENTS_FILTER_MEMBERSHIP_PLAN_OPTIONS || []).find((o) => o.value === value);
  return opt?.label ?? value;
};

/**
 * Build backend filter array in frappe format.
 *
 * Examples:
 * - Center: [["center","in",["CTR-05","CTR-219"]]]
 * - Status: [["status","=","Active"]]
 * - Client: [["client","=","M99"]]
 * - Type: [["roc","=","Price Change"]]
 * - Membership Plan: [["membership_plan","=","Resource"]]
 */
const buildApiFiltersFromApplied = (applied) => {
  const filters = [];
  const src = applied || {};

  if (Array.isArray(src.center) && src.center.length > 0) {
    filters.push(['center', 'in', [...src.center]]);
  }

  if (Array.isArray(src.status) && src.status.length > 0) {
    if (src.status.length === 1) {
      filters.push(['status', '=', src.status[0]]);
    } else {
      filters.push(['status', 'in', [...src.status]]);
    }
  }

  if (Array.isArray(src.client) && src.client.length > 0) {
    if (src.client.length === 1) {
      filters.push(['client', '=', src.client[0]]);
    } else {
      filters.push(['client', 'in', [...src.client]]);
    }
  }

  // NOTE: per backend mapping requirement, UI "Type" maps to backend field "roc"
  if (Array.isArray(src.type) && src.type.length > 0) {
    if (src.type.length === 1) {
      filters.push(['roc', '=', src.type[0]]);
    } else {
      filters.push(['roc', 'in', [...src.type]]);
    }
  }

  if (Array.isArray(src.membershipPlan) && src.membershipPlan.length > 0) {
    const mapped = src.membershipPlan.map(mapMembershipPlanToBackendValue).filter(Boolean);
    if (mapped.length === 1) {
      filters.push(['membership_plan', '=', mapped[0]]);
    } else if (mapped.length > 1) {
      filters.push(['membership_plan', 'in', mapped]);
    }
  }

  return filters;
};

const Agreements = ({ mode = 'client' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLandlord = mode === 'landlord';
  const isVendor = mode === 'vendor';
  const agreementType = isLandlord ? 'Landlord' : isVendor ? 'Vendor' : 'Client';
  const [activeView, setActiveView] = useState('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarDateFields, setCalendarDateFields] = useState(['agreement_start_date']);
  const [filters, setFilters] = useState({ search: '' });
  // Per-mode (client/landlord/vendor) sessionStorage slot for the toolbar
  // dropdown selections. Same persistence convention used by the Clients
  // module — see `pages/clients.jsx` + `compactClientListFiltersForStorage`.
  const activeFilterStorageKey = useMemo(
    () => buildAgreementsFilterStorageKey(mode, 'active'),
    [mode],
  );
  const pendingFilterStorageKey = useMemo(
    () => buildAgreementsFilterStorageKey(mode, 'pending'),
    [mode],
  );
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: activeFilterStorageKey,
    defaultFilters: AGREEMENTS_DEFAULT_FILTERS,
    persistTrimStringArrays: true,
  });
  const [pendingFilters, setPendingFilters] = useState({ search: '' });
  const [pendingAppliedFilters, setPendingAppliedFilters] = usePersistedFilters({
    storageKey: pendingFilterStorageKey,
    defaultFilters: AGREEMENTS_DEFAULT_FILTERS,
    persistTrimStringArrays: true,
  });
  const [sorting, setSorting] = useState([]);
  const [listGroupBy, setListGroupBy] = useState('');
  const [listGroupOrder, setListGroupOrder] = useState('asc');
  const tableRef = useRef(null);

  const [isCreateAmendmentOpen, setIsCreateAmendmentOpen] = useState(false);
  const [selectedAgreementForAmendment, setSelectedAgreementForAmendment] = useState(null);
  const [amendmentCustomerSpacesStatus, setAmendmentCustomerSpacesStatus] = useState(null);
  const [amendmentAssignSpaceStatusById, setAmendmentAssignSpaceStatusById] = useState(null);
  const [amendmentPendingSpaceDetailsById, setAmendmentPendingSpaceDetailsById] = useState(null);
  const [isCreateAgreementOpen, setIsCreateAgreementOpen] = useState(false);
  const [createAgreementInitialValues, setCreateAgreementInitialValues] = useState(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const dispatch = useDispatch();
  const {
    agreementsClientList,
    agreementsListView,
    agreementsListViewLoading,
    agreementsListViewError,
    agreementCalendarView,
  } = useSelector((state) => state.agreements);
  const activeCount =
    agreementsListView?.total_count ??
    agreementsListView?.count ??
    agreementsListView?.results?.length ??
    0;
  const pendingCount = useSelector(
    (state) =>
      state.agreements?.pendingSpaceAllocations?.data?.total_count ??
      state.agreements?.pendingSpaceAllocations?.data?.count ??
      0,
  );
  const agreementCommentsState = useSelector(selectAgreementComments);
  const centerAccess = useSelector(selectCenterAccess);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);

  const agreementModulePermissions = useMemo(
    () => getModulePermissions(userSideBarPerm, 'Agreement'),
    [userSideBarPerm],
  );

  const normalizeCenters = useCallback((centers) => {
    if (!Array.isArray(centers)) return [];
    return centers.filter(Boolean);
  }, []);

  const areSameCenters = useCallback(
    (a, b) => {
      const left = [...normalizeCenters(a)].sort();
      const right = [...normalizeCenters(b)].sort();
      if (left.length !== right.length) return false;
      return left.every((value, index) => value === right[index]);
    },
    [normalizeCenters],
  );

  // Tracks whether the user has just explicitly cleared every centre in the
  // header dropdown. Without this flag the bidirectional sync below sees an
  // empty `appliedFilters.center` and treats it as "show everything", which
  // re-selects every centre on focus-out and undoes the user's intent. Same
  // pattern as ticket-management.
  const userExplicitDeselectAllRef = useRef(false);

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      const normalizedSelection = normalizeCenters(selectedCenters);
      const intent = deriveGlobalCenterIntent({
        ...centerAccess,
        selectedCenters: normalizedSelection,
      });

      // Persist intent for the sync effect below: only "explicit empty" should
      // suppress the empty-filter -> all-centres fallback.
      userExplicitDeselectAllRef.current = isExplicitlyEmptyIntent(intent);

      dispatch(setSelectedCenters(normalizedSelection));

      // Map the intent back into the toolbar's `center` filter:
      //   - All     -> [] (legacy "no restriction" semantics for downstream filter UI)
      //   - Subset  -> the explicit subset
      //   - Empty   -> [] (filter UI mirrors the deselect; the `noCenters` flag
      //                    derived from centerAccess drives the no-data state)
      const nextFilterCenters =
        intent.status === GLOBAL_CENTER_STATUS.Subset ? normalizedSelection : [];

      setAppliedFilters((prev) => {
        if (areSameCenters(nextFilterCenters, prev.center)) {
          return prev;
        }
        return { ...prev, center: nextFilterCenters };
      });
    },
    [areSameCenters, centerAccess, dispatch, normalizeCenters],
  );

  // Keep header CenterAccessDropdown in sync when center filter changes from the toolbar / filter UI.
  // Skip the "filter empty == all centres" fallback when the user just
  // explicitly cleared every centre — otherwise focus-out would silently
  // re-select all centres and override the user's intent.
  useEffect(() => {
    const centersData = Array.isArray(centerAccess.data) ? centerAccess.data : [];
    if (centersData.length === 0) return;

    const filterCenters = normalizeCenters(appliedFilters.center);

    if (filterCenters.length === 0 && userExplicitDeselectAllRef.current) {
      return;
    }

    const desiredSelection =
      filterCenters.length === 0
        ? centersData.map((c) => c?.name ?? c?.value).filter(Boolean)
        : filterCenters;

    const currentSelection = normalizeCenters(centerAccess.selectedCenters);
    if (!areSameCenters(desiredSelection, currentSelection)) {
      // A non-empty filter coming from the toolbar/modal supersedes any prior
      // explicit-empty state in the header.
      if (filterCenters.length > 0) {
        userExplicitDeselectAllRef.current = false;
      }
      dispatch(setSelectedCenters(desiredSelection));
    }
  }, [
    appliedFilters.center,
    areSameCenters,
    centerAccess.data,
    centerAccess.selectedCenters,
    dispatch,
    normalizeCenters,
  ]);

  const defaultPermissions = useMemo(
    () => ({
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      canViewAll: false,
    }),
    [],
  );

  const permissions = useMemo(() => {
    if (!agreementModulePermissions) {
      return {
        ...defaultPermissions,
      };
    }
    return {
      ...defaultPermissions,
      canCreate: agreementModulePermissions.create === true,
      canEdit: agreementModulePermissions.write === true,
      canDelete: agreementModulePermissions.delete === true,
      canExport: agreementModulePermissions.export === true,
      canViewAll: agreementModulePermissions.read === true,
    };
  }, [agreementModulePermissions, defaultPermissions]);
  const handleAgreementCreated = useCallback(
    (formData) => {
      const form = new FormData();
      form.append('doc', JSON.stringify(formData));
    },
    [agreementsClientList],
  );

  // Fetch supporting dropdown lists based on agreement type when landing on the listview.
  useEffect(() => {
    if (isLandlord) {
      // Landlord agreements: preload landlord list (used by filters, drawers, etc.).
      dispatch(
        getLandlordListThunk({
          status: 'Active',
          page: 1,
          pageSize: 9999,
          append: false,
        }),
      );
    } else {
      // Client agreements: preload client list for filters/drawers.
      dispatch(getAgreementsClientListThunk());
    }
  }, [dispatch, isLandlord]);

  // Server-driven list: table consumes list API; calendar uses dedicated calendar API.
  const rows = agreementsListView?.results || [];
  const hasMore = useMemo(() => {
    if (agreementsListView?.has_more != null) return Boolean(agreementsListView.has_more);
    const page = Number(agreementsListView?.page || 1);
    const totalPages = Number(agreementsListView?.total_pages || 0);
    return totalPages ? page < totalPages : false;
  }, [agreementsListView?.has_more, agreementsListView?.page, agreementsListView?.total_pages]);

  // Calendar view: fetch dedicated calendar API (month + date field filters) so we get full month data.
  const calendarMonthKey = useMemo(
    () =>
      calendarMonth instanceof Date
        ? format(calendarMonth, 'yyyy-MM')
        : String(calendarMonth).slice(0, 7),
    [calendarMonth],
  );

  // Single source of truth for the global centre header. The shared adapter
  // returns:
  //   - undefined while centerAccess is loading -> callers gate their fetch
  //   - null when "all" centres are selected    -> omit `navbar_filter`
  //   - {center: []} for explicit empty         -> backend short-circuits to 0 rows
  //   - {center: [...]} for a non-empty subset  -> normal IN filter
  // NOTE: must be declared above any effect/memo that reads `navbarFilter` /
  // `centerAccessLoading` (e.g. the calendar fetch below) to avoid TDZ errors.
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const navbarFilter = useMemo(
    () => adaptGlobalCenterIntent.agreement(globalCenterIntent),
    [globalCenterIntent],
  );
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);

  useEffect(() => {
    if (activeView !== 'calendar') return;
    if (centerAccessLoading) return;
    const filter =
      Array.isArray(calendarDateFields) && calendarDateFields.length > 0
        ? calendarDateFields
        : ['agreement_start_date'];
    dispatch(
      getAgreementCalendarViewThunk({
        month: calendarMonthKey,
        filter,
        agreement_type: agreementType,
        // navbar_filter: navbarFilter,
      }),
    );
  }, [
    activeView,
    calendarMonthKey,
    calendarDateFields,
    agreementType,
    dispatch,
    navbarFilter,
    centerAccessLoading,
  ]);

  /** Transform calendar API date_wise into list of { name, date_type, [date_type]: dateStr } for the calendar grid. */
  const calendarAgreements = useMemo(() => {
    if (activeView !== 'calendar' || !agreementCalendarView?.data?.data_by_month) return [];
    const byMonth = agreementCalendarView.data.data_by_month[calendarMonthKey];
    if (!byMonth?.date_wise || typeof byMonth.date_wise !== 'object') return [];
    const list = [];
    for (const [dateStr, events] of Object.entries(byMonth.date_wise)) {
      if (!Array.isArray(events)) continue;
      for (const ev of events) {
        const dateType = ev?.date_type;
        const name = ev?.name;
        if (!name) continue;
        list.push({
          name,
          date_type: dateType,
          ...(dateType ? { [dateType]: dateStr } : {}),
        });
      }
    }
    return list;
  }, [activeView, agreementCalendarView?.data?.data_by_month, calendarMonthKey]);

  const apiFilters = useMemo(() => buildApiFiltersFromApplied(appliedFilters), [appliedFilters]);

  const orderBy = useMemo(() => {
    if (!Array.isArray(sorting) || sorting.length === 0) return 'creation desc';
    const clauses = sorting
      .filter((s) => s && s.id)
      .map((s) => {
        const backendField = AGREEMENTS_SORT_FIELD_MAP[s.id] || s.id;
        return `${backendField} ${s.desc ? 'desc' : 'asc'}`;
      })
      .join(', ');
    return clauses || 'creation desc';
  }, [sorting]);

  const fetchAgreementsListPage = useCallback(
    ({ page = 1, append = false } = {}) => {
      const keyword = (filters.search || '').trim();
      if (listGroupBy && (agreementType === 'Client' || agreementType === 'Landlord')) {
        return dispatch(
          getAgreementEntriesGroupedThunk({
            keyword,
            filters: apiFilters,
            order_by: orderBy,
            item_order_by: orderBy,
            agreement_type: agreementType,
            group_by: AGREEMENTS_GROUP_BY_API_PARAM_MAP[listGroupBy] || listGroupBy,
            append: false,
          }),
        );
      }
      return dispatch(
        getAgreementsListViewThunk({
          keyword,
          page,
          page_size: 20,
          filters: apiFilters,
          order_by: orderBy,
          agreement_type: agreementType,
          append,
        }),
      );
    },
    [dispatch, filters.search, apiFilters, orderBy, agreementType, listGroupBy],
  );

  useEffect(() => {
    fetchAgreementsListPage({ page: 1, append: false });
  }, [fetchAgreementsListPage]);

  /** Pending badge uses `pendingSpaceAllocations` (filled when Pending list mounts). Prefetch on list view so both tab counts load immediately. */
  useEffect(() => {
    if (activeView !== 'list' || isLandlord || isVendor) return;
    dispatch(
      getAgreementPendingSpaceAllocationListThunk({
        keyword: '',
        page: 1,
        page_size: 20,
      }),
    );
  }, [dispatch, activeView, isLandlord, isVendor]);

  const handleLoadMore = useCallback(() => {
    if (agreementsListViewLoading || !hasMore) return;
    const nextPage = Number(agreementsListView?.page || 1) + 1;
    fetchAgreementsListPage({ page: nextPage, append: true });
  }, [agreementsListViewLoading, hasMore, agreementsListView?.page, fetchAgreementsListPage]);

  const hasActiveFilters = useMemo(
    () =>
      (appliedFilters.client?.length || 0) +
        (appliedFilters.center?.length || 0) +
        (appliedFilters.membershipPlan?.length || 0) +
        (appliedFilters.type?.length || 0) +
        (appliedFilters.status?.length || 0) >
      0,
    [appliedFilters],
  );

  const context = useMemo(() => {
    if (noCenters) return 'no_centers';
    return (filters.search || '').trim() || hasActiveFilters ? 'search' : 'default';
  }, [filters.search, hasActiveFilters, noCenters]);

  const handleSearchChange = (value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  };

  const handleSortingChange = (newSorting) => {
    setSorting(newSorting);
  };

  const handleCreateAmendmentOpenChange = (open) => {
    setIsCreateAmendmentOpen(open);
    if (!open) {
      setSelectedAgreementForAmendment(null);
      setAmendmentCustomerSpacesStatus(null);
      setAmendmentAssignSpaceStatusById(null);
      setAmendmentPendingSpaceDetailsById(null);
    }
  };

  const handleCreateAgreementOpenChange = (open) => {
    setIsCreateAgreementOpen(open);
    if (!open) setCreateAgreementInitialValues(null);
  };

  const clientFilterOptions = useMemo(
    () =>
      (agreementsClientList || []).map((c) => ({
        value: c.customer_id,
        label: c.client_name,
      })),
    [agreementsClientList],
  );

  const centerFilterOptions = useMemo(
    () =>
      (centerAccess.data || []).map((c) => ({
        value: c.name,
        label: c.center_name || c.name,
      })),
    [centerAccess.data],
  );

  const membershipPlanFilterOptions = AGREEMENTS_FILTER_MEMBERSHIP_PLAN_OPTIONS;
  // const typeFilterOptions = AGREEMENTS_FILTER_TYPE_OPTIONS;
  const [dynamicAgreementStatusOptions, setDynamicAgreementStatusOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Agreement', field: 'status' });
        if (!cancelled) setDynamicAgreementStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicAgreementStatusOptions([]);
      }
    };

    fetchLatest();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusFilterOptions = dynamicAgreementStatusOptions;

  const handleRowSelect = useCallback(
    (agreement) => {
      const id = agreement?.name || agreement?.id;
      if (id) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('agreement', id);
        setSearchParams(newParams);
      }
    },
    [searchParams, setSearchParams],
  );

  /** Load full agreement via get_agreement_details (space as string or child rows) before opening amendment. */
  const handleCreateAmendment = useCallback(
    async (agreement) => {
      const name = agreement?.name ?? agreement?.id;
      if (!name) return;
      if (!agreement?.customerSpacesStatus) {
        setAmendmentCustomerSpacesStatus(null);
      }
      if (!agreement?.assignSpaceStatusById) {
        setAmendmentAssignSpaceStatusById(null);
      }
      if (!agreement?.spaceDetailsById) {
        setAmendmentPendingSpaceDetailsById(null);
      }
      try {
        const full = await dispatch(getAgreementByIdThunk(name)).unwrap();
        setSelectedAgreementForAmendment(full);
        setIsCreateAmendmentOpen(true);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not load agreement. Please try again.' });
      }
    },
    [dispatch],
  );

  const handlePendingCreateAmendment = useCallback(
    async ({ name, customerSpacesStatus, assignSpaceStatusById, spaceDetailsById }) => {
      if (!name) return;
      setAmendmentCustomerSpacesStatus(customerSpacesStatus ?? null);
      setAmendmentAssignSpaceStatusById(assignSpaceStatusById ?? null);
      setAmendmentPendingSpaceDetailsById(spaceDetailsById ?? null);
      await handleCreateAmendment({
        name,
        customerSpacesStatus,
        assignSpaceStatusById,
        spaceDetailsById,
      });
    },
    [handleCreateAmendment],
  );

  useEffect(() => {
    const agreementId = searchParams.get('agreement');
    if (agreementId) {
      setSelectedAgreement({ name: agreementId, id: agreementId });
      setViewDrawerOpen(true);
    } else {
      setViewDrawerOpen(false);
      setSelectedAgreement(null);
    }
  }, [searchParams]);

  // Fetch comments + activity whenever drawer opens for a specific agreement
  useEffect(() => {
    const agreementId = selectedAgreement?.id ?? selectedAgreement?.name;
    if (!viewDrawerOpen || !agreementId) return;
    dispatch(fetchAgreementComments({ agreementId }));
  }, [dispatch, viewDrawerOpen, selectedAgreement]);

  const handleFieldUpdate = useCallback(
    async (agreement, apiKey, value) => {
      const name = agreement?.name ?? agreement?.id;
      if (!name) return;
      const payload = buildAgreementUpdatePayload(apiKey, value);
      if (!payload) return;
      const payloadKey = Object.keys(payload)[0];
      const apiValue = payload[payloadKey];
      const currentVal = agreement?.[payloadKey];
      if (isAgreementFieldValueEqual(apiValue, currentVal)) return;
      try {
        await dispatch(updateAgreementThunk({ name, payload })).unwrap();
        await dispatch(getAgreementByIdThunk(name)).unwrap();
        await dispatch(fetchAgreementComments({ agreementId: name })).unwrap();
        await fetchAgreementsListPage({ page: 1, append: false }).unwrap();
      } catch (error) {
        console.error('Agreement update failed:', error);
        showErrorToast(error, { defaultMessage: 'Failed to update agreement. Please try again.' });
      }
    },
    [dispatch, fetchAgreementsListPage],
  );

  const handleAddAgreementComment = useCallback(
    async (agreementId, content, attachments, isVisibleToClient, parentCommentId) => {
      if (!agreementId) return;
      try {
        await dispatch(
          addAgreementComment({
            agreementId,
            content,
            attachments,
            visibleToClient: false,
            parentCommentId,
          }),
        ).unwrap();
        await dispatch(fetchAgreementComments({ agreementId })).unwrap();
      } catch (error) {
        console.error('Failed to add agreement comment:', error);
        showErrorToast(error, { defaultMessage: 'Failed to add comment. Please try again.' });
      }
    },
    [dispatch],
  );

  const handleRefreshAgreementComments = useCallback(() => {
    const agreementId = selectedAgreement?.id ?? selectedAgreement?.name;
    if (!agreementId) return;
    dispatch(fetchAgreementComments({ agreementId }));
  }, [dispatch, selectedAgreement]);

  const {
    data: agreementCommentsData = {
      comments: [],
      history: [],
      communications: [],
      views: [],
      calls: [],
    },
    status: agreementCommentsStatus = 'idle',
  } = agreementCommentsState || {};

  const agreementCommentsLoading = agreementCommentsStatus === 'loading';

  return (
    <PageLayout
      contentAreaClassName='overflow-hidden'
      pageTitle={
        isLandlord ? 'Landlord Agreements' : isVendor ? 'Vendor Agreements' : 'Client Agreements'
      }
      pageIcon={<RiFileList2Line />}
      pageDescription={
        isLandlord
          ? 'Manage all your landlord agreements from here.'
          : isVendor
            ? 'Manage all your vendor agreements from here.'
            : 'Manage all your client agreements from here.'
      }
      showDefaultHeader={true}
      borderDivClassName='w-full mx-0'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex flex-col gap-6 px-8 pb-6 flex-1 min-h-0 h-full'>
        <AgreementsViewTabs value={activeView} onValueChange={setActiveView} />

        {activeView === 'list' && !isLandlord && !isVendor && (
          <AgreementsListPage
            activeTabCount={activeCount}
            pendingTabCount={pendingCount}
            clientListProps={{
              toolbarProps: {
                mode,
                filters,
                onSearchChange: handleSearchChange,
                onFiltersChange: setAppliedFilters,
                appliedFilters,
                clientOptions: clientFilterOptions,
                centerOptions: centerFilterOptions,
                membershipPlanOptions: membershipPlanFilterOptions,
                statusOptions: statusFilterOptions,
                tableRef,
                onCreateAgreement: (initialValues) => {
                  setCreateAgreementInitialValues(initialValues ?? null);
                  setIsCreateAgreementOpen(true);
                },
                permissions,
                groupBy: listGroupBy,
                onGroupByChange: setListGroupBy,
                groupOrder: listGroupOrder,
                onGroupOrderChange: setListGroupOrder,
              },
              tableProps: {
                mode,
                ref: tableRef,
                rows,
                variant: 'default',
                isLoading: agreementsListViewLoading,
                isLoadingMore: agreementsListViewLoading && rows.length > 0,
                error: agreementsListViewError,
                onRetry: () => fetchAgreementsListPage({ page: 1, append: false }),
                context,
                sorting,
                onSortingChange: handleSortingChange,
                tableId: AGREEMENTS_TABLE_ID,
                selectedRow: selectedAgreement,
                onRowSelect: handleRowSelect,
                enableScrollPagination: true,
                onLoadMore: handleLoadMore,
                hasMore,
                permissions,
                onCreateAmendment: handleCreateAmendment,
                groupBy: listGroupBy,
                groupOrder: listGroupOrder,
              },
            }}
            pendingListProps={{
              filters: pendingFilters,
              onSearchChange: (v) => setPendingFilters((p) => ({ ...p, search: v })),
              appliedFilters: pendingAppliedFilters,
              onFiltersChange: setPendingAppliedFilters,
              clientOptions: clientFilterOptions,
              centerOptions: centerFilterOptions,
              membershipPlanOptions: membershipPlanFilterOptions,
              statusOptions: statusFilterOptions,
              onCreateAgreement: (initialValues) => {
                setCreateAgreementInitialValues(initialValues);
                setIsCreateAgreementOpen(true);
              },
              onCreateAmendment: handlePendingCreateAmendment,
            }}
          />
        )}

        {activeView === 'list' && (isLandlord || isVendor) && (
          <div className='flex-1 min-h-0 flex flex-col gap-5 w-full h-full'>
            <AgreementsToolbar
              mode={mode}
              filters={filters}
              onSearchChange={handleSearchChange}
              onFiltersChange={setAppliedFilters}
              appliedFilters={appliedFilters}
              clientOptions={clientFilterOptions}
              centerOptions={centerFilterOptions}
              membershipPlanOptions={membershipPlanFilterOptions}
              statusOptions={statusFilterOptions}
              tableRef={tableRef}
              onCreateAgreement={
                isVendor
                  ? null
                  : () => {
                      setCreateAgreementInitialValues(null);
                      setIsCreateAgreementOpen(true);
                    }
              }
              permissions={permissions}
              {...(isLandlord
                ? {
                    groupBy: listGroupBy,
                    onGroupByChange: setListGroupBy,
                    groupOrder: listGroupOrder,
                    onGroupOrderChange: setListGroupOrder,
                  }
                : {})}
            />

            <AgreementsTable
              mode={mode}
              ref={tableRef}
              rows={rows}
              variant='default'
              isLoading={agreementsListViewLoading}
              isLoadingMore={agreementsListViewLoading && rows.length > 0}
              error={agreementsListViewError}
              onRetry={() => fetchAgreementsListPage({ page: 1, append: false })}
              context={context}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              tableId={
                isLandlord
                  ? 'landlord-agreements-table'
                  : isVendor
                    ? 'vendor-agreements-table'
                    : AGREEMENTS_TABLE_ID
              }
              selectedRow={selectedAgreement}
              onRowSelect={handleRowSelect}
              enableScrollPagination={true}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              permissions={permissions}
              onCreateAmendment={handleCreateAmendment}
              {...(isLandlord ? { groupBy: listGroupBy, groupOrder: listGroupOrder } : {})}
            />
          </div>
        )}

        {activeView === 'calendar' && (
          <div className='flex flex-col border border-stroke-soft-200 rounded-lg flex-1 min-h-0 overflow-auto'>
            <AgreementsCalendarToolbar
              value={calendarMonth}
              onMonthChange={setCalendarMonth}
              dateFields={calendarDateFields}
              onDateFieldsChange={setCalendarDateFields}
              onCreateAgreement={
                isVendor
                  ? null
                  : () => {
                      setCreateAgreementInitialValues(null);
                      setIsCreateAgreementOpen(true);
                    }
              }
              className={'px-4 py-3 '}
              permissions={permissions}
            />
            <AgreementsCalendar
              month={calendarMonth}
              agreements={calendarAgreements}
              dateFields={calendarDateFields}
              onAgreementClick={handleRowSelect}
              isLoading={agreementCalendarView.isLoading}
              error={agreementCalendarView.error}
              onRetry={() =>
                dispatch(
                  getAgreementCalendarViewThunk({
                    month: calendarMonthKey,
                    filter:
                      Array.isArray(calendarDateFields) && calendarDateFields.length > 0
                        ? calendarDateFields
                        : ['agreement_start_date'],
                    agreement_type: agreementType,
                  }),
                )
              }
            />
          </div>
        )}

        {activeView !== 'list' && activeView !== 'calendar' && (
          <ComingSoonMessage message='This view is coming soon. For now, use the List or Calendar view to manage agreements.' />
        )}
        {isLandlord ? (
          <CreateLandlordAmendment
            open={isCreateAmendmentOpen}
            onOpenChange={handleCreateAmendmentOpenChange}
            baseAgreement={selectedAgreementForAmendment}
            permissions={permissions}
          />
        ) : (
          <CreateAmendment
            open={isCreateAmendmentOpen}
            onOpenChange={handleCreateAmendmentOpenChange}
            baseAgreement={selectedAgreementForAmendment}
            customerSpacesStatus={amendmentCustomerSpacesStatus}
            assignSpaceStatusById={amendmentAssignSpaceStatusById}
            pendingSpaceDetailsById={amendmentPendingSpaceDetailsById}
            permissions={permissions}
          />
        )}
        {isLandlord ? (
          <CreateNewLandlordAgreementDrawer
            open={isCreateAgreementOpen}
            setOpen={handleCreateAgreementOpenChange}
            onSuccess={handleAgreementCreated}
            permissions={permissions}
          />
        ) : (
          <CreateNewAgreementDrawer
            open={isCreateAgreementOpen}
            setOpen={handleCreateAgreementOpenChange}
            onSuccess={handleAgreementCreated}
            initialValues={createAgreementInitialValues}
            permissions={permissions}
          />
        )}

        {isLandlord ? (
          <LandlordAgreementViewDrawer
            isOpen={viewDrawerOpen}
            onClose={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('agreement');
              setSearchParams(newParams);
            }}
            agreementId={selectedAgreement?.id ?? selectedAgreement?.name}
            onCreateAmendment={(agreement) => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('agreement');
              setSearchParams(newParams);
              void handleCreateAmendment(agreement);
            }}
            onFieldUpdate={handleFieldUpdate}
            onAddComment={handleAddAgreementComment}
            onRefreshComments={handleRefreshAgreementComments}
            commentsData={agreementCommentsData}
            commentsLoading={agreementCommentsLoading}
            commentsFetchStatus={agreementCommentsStatus}
            permissions={permissions}
          />
        ) : (
          <AgreementViewDrawer
            mode={mode}
            isOpen={viewDrawerOpen}
            onClose={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('agreement');
              setSearchParams(newParams);
            }}
            agreementId={selectedAgreement?.id ?? selectedAgreement?.name}
            onCreateAmendment={(agreement) => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('agreement');
              setSearchParams(newParams);
              void handleCreateAmendment(agreement);
            }}
            onFieldUpdate={handleFieldUpdate}
            onAddComment={handleAddAgreementComment}
            onRefreshComments={handleRefreshAgreementComments}
            commentsData={agreementCommentsData}
            commentsLoading={agreementCommentsLoading}
            commentsFetchStatus={agreementCommentsStatus}
            permissions={permissions}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default Agreements;
