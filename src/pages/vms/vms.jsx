import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiUserFollowLine } from 'react-icons/ri';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import VmsStats from '@/components/vms/vms-stats';
import VmsStatusTabs from '@/components/vms/vms-status-tabs';
import VmsInviteDrawer from '@/components/vms/vms-invite-drawer';
import VmsViewDrawer from '@/components/vms/vms-view-drawer';

import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { showErrorToast } from '@/utils/error-utils';
import {
  fetchVmsListviewThunk,
  fetchVmsGroupedListviewThunk,
  saveVmsColumnPrefThunk,
  fetchVisitorComments,
  addVisitorComment,
} from '@/redux/vmsSlice';
import { fetchCenterAccess, selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  // GLOBAL_CENTER_STATUS,
  // adaptGlobalCenterIntent,
  applyCenterScopeToFilterArray,
  centerScopeFromIntent,
  deriveGlobalCenterIntent,
  isEmptyCenterScope,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';
import { format } from 'date-fns';
import { resolveVisitorEntryId } from '@/utils/vms-visitor-entry';

const VMS_TAB_KEYS = ['all', 'visitors', 'space-inquiries', 'vendors', 'event-participants'];
const VMS_FILTER_DROPDOWN_SESSION_KEY = 'vms-view-filter-dropdown';
const DEFAULT_VMS_VISITORS_FILTERS = {
  center: [],
  host_company: [],
  status: [],
};
const DEFAULT_VMS_SPACE_FILTERS = {
  type_of_space: [],
  source_category: [],
  sales_owner: [],
  partner_type: [],
  status: [],
};
const DEFAULT_VMS_VENDOR_FILTERS = {
  center: [],
  vendor_type: [],
  assigned_supervisor: [],
  status: [],
};

const SAMPLE_EVENT_PARTICIPANTS = [
  {
    id: 'EVT-00001',
    name: 'EVT-00001',
    first_name: 'Neeraj',
    last_name: 'Shah',
    mobile_number: '9876543201',
    email_id: 'neeraj.shah@example.com',
    visitor_company: 'PixelWave Studio',
    center: 'HQ',
    type: 'Attendee',
    no_of_visitors: 1,
    vehicle_no: 'GJ 01 ZZ 1234',
    badge_no: 'E-101',
    event: 'DevX Product Launch 2026',
    visit_date_time: '2026-03-10 18:00',
    status: 'Checked In',
    check_in_date_time: '2026-03-10 18:05',
    check_out_date_time: '',
    duration: '',
    notes: 'VIP guest, prefers front row seating.',
  },
];

const getTabFromPath = (pathname) => {
  const segments = pathname.split('/').filter(Boolean);
  const maybeTab = segments[1];
  return VMS_TAB_KEYS.includes(maybeTab) ? maybeTab : 'all';
};

const TAB_TO_TYPE = {
  all: 'All',
  visitors: 'Visitor',
  'space-inquiries': 'Space',
  vendors: 'Vendor',
};

const VISITOR_SORT_FIELD_MAP = {
  company_name: 'company_name',
  center: 'center',
  host: 'host',
  host_company_name: 'host_company_name',
  no_of_visitors: 'no_of_visitors',
  visit_date_time: 'visit_date_time',
  status: 'status',
  check_in_date_time: 'check_in_date_time',
  check_out_date_time: 'check_out_date_time',
  duration: 'duration',
};

const SPACE_SORT_FIELD_MAP = {
  company_name: 'company_name',
  center: 'center',
  no_of_visitors: 'no_of_visitors',
  type_of_space: 'type_of_space',
  seats: 'seats',
  source_category: 'source_category',
  sales_person_in_touch: 'sales_person_in_touch',
  cp_type: 'cp_type',
  ipc_name: 'ipc_name',
  cp_contact_name: 'cp_contact_name',
  cp_contact_mobile: 'cp_contact_mobile',
  cp_contact_email: 'cp_contact_email',
  status: 'status',
  visit_date_time: 'visit_date_time',
  check_in_date_time: 'check_in_date_time',
  check_out_date_time: 'check_out_date_time',
  duration: 'duration',
};

const VENDOR_SORT_FIELD_MAP = {
  center: 'center',
  no_of_visitors: 'no_of_visitors',
  vendor_type: 'vendor_type',
  material_carrying: 'material_carrying',
  assigned_supervisor: 'assigned_supervisor',
  visit_date_time: 'visit_date_time',
  status: 'status',
  check_in_date_time: 'check_in_date_time',
  check_out_date_time: 'check_out_date_time',
  duration: 'duration',
};

const buildOrderBy = (sorting, fieldMap) => {
  if (!Array.isArray(sorting) || sorting.length === 0) return '';
  const firstSort = sorting[0];
  if (!firstSort?.id) return '';
  const backendField = fieldMap[firstSort.id];
  if (!backendField) return '';
  return `${backendField} ${firstSort.desc ? 'desc' : 'asc'}`;
};

const parseDateParam = (val) => {
  if (!val) return null;
  // Expect yyyy-MM-dd
  const dt = new Date(`${val}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

/** Remove duplicate `center` clauses when applying navbar `navbar_filter.center` */
// const stripCenterFromFilterArray = (filters) =>
//   (Array.isArray(filters) ? filters : []).filter(
//     (f) => !(Array.isArray(f) && f.length > 0 && f[0] === 'center'),
//   );

const normalizeArrayFilter = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const mergeStoredVmsDropdownFilters = (stored = {}) => ({
  visitorsFilters: {
    ...DEFAULT_VMS_VISITORS_FILTERS,
    center: normalizeArrayFilter(stored?.visitorsFilters?.center),
    host_company: normalizeArrayFilter(stored?.visitorsFilters?.host_company),
    status: normalizeArrayFilter(stored?.visitorsFilters?.status),
  },
  spaceFilters: {
    ...DEFAULT_VMS_SPACE_FILTERS,
    type_of_space: normalizeArrayFilter(stored?.spaceFilters?.type_of_space),
    source_category: normalizeArrayFilter(stored?.spaceFilters?.source_category),
    sales_owner: normalizeArrayFilter(stored?.spaceFilters?.sales_owner),
    partner_type: normalizeArrayFilter(stored?.spaceFilters?.partner_type),
    status: normalizeArrayFilter(stored?.spaceFilters?.status),
  },
  vendorFilters: {
    ...DEFAULT_VMS_VENDOR_FILTERS,
    center: normalizeArrayFilter(stored?.vendorFilters?.center),
    vendor_type: normalizeArrayFilter(stored?.vendorFilters?.vendor_type),
    assigned_supervisor: normalizeArrayFilter(stored?.vendorFilters?.assigned_supervisor),
    status: normalizeArrayFilter(stored?.vendorFilters?.status),
  },
});

const compactVmsFilterGroup = (filters = {}) => {
  const compact = {};
  Object.entries(filters).forEach(([key, value]) => {
    const normalized = normalizeArrayFilter(value);
    if (normalized.length > 0) compact[key] = normalized;
  });
  return compact;
};

const Vms = () => {
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: VMS_FILTER_DROPDOWN_SESSION_KEY,
    defaultFilters: mergeStoredVmsDropdownFilters(),
    compactFilters: (f) => ({
      visitorsFilters: compactVmsFilterGroup(f.visitorsFilters),
      spaceFilters: compactVmsFilterGroup(f.spaceFilters),
      vendorFilters: compactVmsFilterGroup(f.vendorFilters),
    }),
  });

  const [vmsViewFilters, setVmsViewFiltersInternal] = useState(mergeStoredVmsDropdownFilters());

  // 1. Initialize from persistence
  // `persistedFilters` arrives in its compacted form (empty arrays stripped by
  // `compactVmsFilterGroup`), so re-hydrate through `mergeStoredVmsDropdownFilters`
  // to restore every default key (`center`, `host_company`, etc.) as `[]`. Without
  // this, downstream consumers that read e.g. `visitorsFilters.center.length`
  // crash on the very first render after a session restore.
  useEffect(() => {
    if (filtersInitialized) return;
    if (persistedFilters) {
      setVmsViewFiltersInternal(mergeStoredVmsDropdownFilters(persistedFilters));
    }
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!filtersInitialized) return;

    const compact = {
      visitorsFilters: compactVmsFilterGroup(vmsViewFilters.visitorsFilters),
      spaceFilters: compactVmsFilterGroup(vmsViewFilters.spaceFilters),
      vendorFilters: compactVmsFilterGroup(vmsViewFilters.vendorFilters),
    };

    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [vmsViewFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  // Always present a fully-shaped slice to consumers. The persistence layer
  // strips empty arrays in `compactVmsFilterGroup`, so a freshly-loaded
  // `vmsViewFilters` may legitimately be missing keys like `center` or
  // `host_company` — reading `.length` on those undefined values would crash
  // the render. Memoising on the raw slice keeps referential identity stable
  // for downstream `useMemo`/`useEffect` dependency arrays.
  const visitorsFilters = useMemo(
    () => ({
      ...DEFAULT_VMS_VISITORS_FILTERS,
      ...vmsViewFilters.visitorsFilters,
    }),
    [vmsViewFilters.visitorsFilters],
  );
  const spaceFilters = useMemo(
    () => ({
      ...DEFAULT_VMS_SPACE_FILTERS,
      ...vmsViewFilters.spaceFilters,
    }),
    [vmsViewFilters.spaceFilters],
  );
  const vendorFilters = useMemo(
    () => ({
      ...DEFAULT_VMS_VENDOR_FILTERS,
      ...vmsViewFilters.vendorFilters,
    }),
    [vmsViewFilters.vendorFilters],
  );

  const setVisitorsFilters = useCallback(
    (next) =>
      setVmsViewFiltersInternal((prev) => ({
        ...prev,
        visitorsFilters: typeof next === 'function' ? next(prev.visitorsFilters) : next,
      })),
    [],
  );

  const setSpaceFilters = useCallback(
    (next) =>
      setVmsViewFiltersInternal((prev) => ({
        ...prev,
        spaceFilters: typeof next === 'function' ? next(prev.spaceFilters) : next,
      })),
    [],
  );

  const setVendorFilters = useCallback(
    (next) =>
      setVmsViewFiltersInternal((prev) => ({
        ...prev,
        vendorFilters: typeof next === 'function' ? next(prev.vendorFilters) : next,
      })),
    [],
  );

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { visitorId } = useParams();

  // Redux state
  const allListview = useSelector((state) => state.vms.allListview);
  const visitorsListview = useSelector((state) => state.vms.visitorsListview);
  const spaceListview = useSelector((state) => state.vms.spaceListview);
  const vendorsListview = useSelector((state) => state.vms.vendorsListview);
  const centerAccess = useSelector(selectCenterAccess);

  // Table refs
  const allTableRef = useRef(null);
  const visitorsTableRef = useRef(null);
  const spaceInquiriesTableRef = useRef(null);
  const vendorsTableRef = useRef(null);
  const eventParticipantsTableRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));
  const [searchValue, setSearchValue] = useState('');
  const [groupByVisitors, setGroupByVisitors] = useState('');
  const [groupBySpace, setGroupBySpace] = useState('');
  const [groupByVendors, setGroupByVendors] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [allSorting, setAllSorting] = useState([]);
  const [visitorsSorting, setVisitorsSorting] = useState([]);
  const [spaceSorting, setSpaceSorting] = useState([]);
  const [vendorsSorting, setVendorsSorting] = useState([]);
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const params = new URLSearchParams(location.search);
    const fromParam = parseDateParam(params.get('from'));
    const toParam = parseDateParam(params.get('to'));
    if (fromParam && toParam) return { from: fromParam, to: toParam };
    const today = new Date();
    return { from: today, to: today };
  });

  /** Column manager UI sync (refs alone do not update toolbar when table config changes). */
  const [allColumnConfigHook, setAllColumnConfigHook] = useState(null);
  const [visitorsColumnConfigHook, setVisitorsColumnConfigHook] = useState(null);
  const [spaceColumnConfigHook, setSpaceColumnConfigHook] = useState(null);
  const [vendorsColumnConfigHook, setVendorsColumnConfigHook] = useState(null);
  const [eventParticipantsColumnConfigHook, setEventParticipantsColumnConfigHook] = useState(null);

  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  // Single source of truth for the global centre intent (Loading / All /
  // Subset / Empty). Per-tab modal centre chips are layered on top of the
  // header for `Subset` only; the no-overlap sentinel is gone — the backend
  // now uses the shared no-match clause when we send `{center: []}`.
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);

  /** Global header scope intersected with Visitors/Vendors modal centre chips → `filters.center`. */
  const vmsCenterScope = useMemo(() => {
    const modalCenters =
      activeTab === 'visitors'
        ? visitorsFilters.center
        : activeTab === 'vendors'
          ? vendorFilters.center
          : [];
    return centerScopeFromIntent(globalCenterIntent, { modalCenters });
  }, [globalCenterIntent, activeTab, visitorsFilters.center, vendorFilters.center]);

  const handleCenterAccessChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
    },
    [dispatch],
  );

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const syncDateRangeToUrl = useCallback(
    (range) => {
      if (!range?.from || !range?.to) return;
      const params = new URLSearchParams(location.search);
      const nextFrom = format(range.from, 'yyyy-MM-dd');
      const nextTo = format(range.to, 'yyyy-MM-dd');
      const prevFrom = params.get('from');
      const prevTo = params.get('to');
      if (prevFrom === nextFrom && prevTo === nextTo) return;
      params.set('from', nextFrom);
      params.set('to', nextTo);
      const nextSearch = params.toString();
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true },
      );
    },
    [location.pathname, location.search, navigate],
  );

  // Keep state in sync with back/forward or manual URL edits.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromParam = parseDateParam(params.get('from'));
    const toParam = parseDateParam(params.get('to'));
    if (!fromParam || !toParam) return;
    const currentFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const currentTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
    const nextFrom = format(fromParam, 'yyyy-MM-dd');
    const nextTo = format(toParam, 'yyyy-MM-dd');
    if (currentFrom === nextFrom && currentTo === nextTo) return;
    setDateRange({ from: fromParam, to: toParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const dateFilters = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    return [['visit_date_time', 'between', [fromStr, toStr]]];
  }, [dateRange]);

  const visitorsFilterArray = useMemo(() => {
    const filters = [...(dateFilters || [])];
    if (visitorsFilters.center.length > 0) {
      if (visitorsFilters.center.length === 1) {
        filters.push(['center', '=', visitorsFilters.center[0]]);
      } else {
        filters.push(['center', 'in', visitorsFilters.center]);
      }
    }
    if (visitorsFilters.host_company.length > 0) {
      if (visitorsFilters.host_company.length === 1) {
        filters.push(['host_company_name', '=', visitorsFilters.host_company[0]]);
      } else {
        filters.push(['host_company_name', 'in', visitorsFilters.host_company]);
      }
    }
    if (visitorsFilters.status.length > 0) {
      if (visitorsFilters.status.length === 1) {
        filters.push(['status', '=', visitorsFilters.status[0]]);
      } else {
        filters.push(['status', 'in', visitorsFilters.status]);
      }
    }
    return filters;
  }, [dateFilters, visitorsFilters]);

  const spaceFilterArray = useMemo(() => {
    const filters = [...(dateFilters || [])];
    if (spaceFilters.type_of_space.length > 0) {
      filters.push([
        'type_of_space',
        spaceFilters.type_of_space.length === 1 ? '=' : 'in',
        spaceFilters.type_of_space.length === 1
          ? spaceFilters.type_of_space[0]
          : spaceFilters.type_of_space,
      ]);
    }
    if (spaceFilters.source_category.length > 0) {
      filters.push([
        'source_category',
        spaceFilters.source_category.length === 1 ? '=' : 'in',
        spaceFilters.source_category.length === 1
          ? spaceFilters.source_category[0]
          : spaceFilters.source_category,
      ]);
    }
    if (spaceFilters.sales_owner.length > 0) {
      filters.push([
        'sales_owner',
        spaceFilters.sales_owner.length === 1 ? '=' : 'in',
        spaceFilters.sales_owner.length === 1
          ? spaceFilters.sales_owner[0]
          : spaceFilters.sales_owner,
      ]);
    }
    if (spaceFilters.partner_type.length > 0) {
      const selected = new Set(spaceFilters.partner_type);
      const selectedCpTypes = [];
      if (selected.has('digital')) selectedCpTypes.push('Digital');
      if (selected.has('ipc')) selectedCpTypes.push('IPC');
      if (selected.has('dpc')) selectedCpTypes.push('DPC');

      const spaceInquiryTypes = [];
      if (selected.has('direct')) spaceInquiryTypes.push('Direct');
      if (selected.has('channel_partner') || selectedCpTypes.length > 0) {
        spaceInquiryTypes.push('Channel Partner');
      }
      if (spaceInquiryTypes.length > 0) {
        filters.push(['space_inquiry_type', 'in', spaceInquiryTypes]);
      }
      if (selectedCpTypes.length > 0 && !selected.has('direct')) {
        filters.push(['cp_type', 'in', selectedCpTypes]);
      }
    }
    if (spaceFilters.status.length > 0) {
      filters.push([
        'status',
        spaceFilters.status.length === 1 ? '=' : 'in',
        spaceFilters.status.length === 1 ? spaceFilters.status[0] : spaceFilters.status,
      ]);
    }
    return filters;
  }, [dateFilters, spaceFilters]);

  const vendorFilterArray = useMemo(() => {
    const filters = [...(dateFilters || [])];
    if (vendorFilters.center.length > 0) {
      filters.push([
        'center',
        vendorFilters.center.length === 1 ? '=' : 'in',
        vendorFilters.center.length === 1 ? vendorFilters.center[0] : vendorFilters.center,
      ]);
    }
    if (vendorFilters.vendor_type.length > 0) {
      filters.push([
        'vendor_type',
        vendorFilters.vendor_type.length === 1 ? '=' : 'in',
        vendorFilters.vendor_type.length === 1
          ? vendorFilters.vendor_type[0]
          : vendorFilters.vendor_type,
      ]);
    }
    if (vendorFilters.assigned_supervisor.length > 0) {
      filters.push([
        'assigned_supervisor',
        vendorFilters.assigned_supervisor.length === 1 ? '=' : 'in',
        vendorFilters.assigned_supervisor.length === 1
          ? vendorFilters.assigned_supervisor[0]
          : vendorFilters.assigned_supervisor,
      ]);
    }
    if (vendorFilters.status.length > 0) {
      filters.push([
        'status',
        vendorFilters.status.length === 1 ? '=' : 'in',
        vendorFilters.status.length === 1 ? vendorFilters.status[0] : vendorFilters.status,
      ]);
    }
    return filters;
  }, [dateFilters, vendorFilters]);

  const getGroupByForTab = useCallback(
    (tab) => {
      if (tab === 'visitors') return groupByVisitors;
      if (tab === 'space-inquiries') return groupBySpace;
      if (tab === 'vendors') return groupByVendors;
      return '';
    },
    [groupByVisitors, groupBySpace, groupByVendors],
  );

  const getOrderByForTab = useCallback(
    (tab) => {
      if (tab === 'visitors') return buildOrderBy(visitorsSorting, VISITOR_SORT_FIELD_MAP);
      if (tab === 'space-inquiries') return buildOrderBy(spaceSorting, SPACE_SORT_FIELD_MAP);
      if (tab === 'vendors') return buildOrderBy(vendorsSorting, VENDOR_SORT_FIELD_MAP);
      if (tab === 'all') return buildOrderBy(allSorting, VISITOR_SORT_FIELD_MAP);
      return '';
    },
    [visitorsSorting, spaceSorting, vendorsSorting, allSorting],
  );

  const resolveFiltersWithCenterScope = useCallback(
    (type, opts = {}) => {
      const scope = opts.centerScope !== undefined ? opts.centerScope : vmsCenterScope;
      if (scope === undefined || isEmptyCenterScope(scope)) return null;

      const baseFilters =
        type === 'Visitor'
          ? (opts.filters ?? visitorsFilterArray)
          : type === 'Space'
            ? (opts.filters ?? spaceFilterArray)
            : type === 'Vendor'
              ? (opts.filters ?? vendorFilterArray)
              : type === 'All'
                ? (opts.filters ?? dateFilters)
                : (opts.filters ?? dateFilters);

      return applyCenterScopeToFilterArray(baseFilters, scope);
    },
    [dateFilters, visitorsFilterArray, spaceFilterArray, vendorFilterArray, vmsCenterScope],
  );

  const fetchData = useCallback(
    async (type, opts = {}) => {
      try {
        const filtersForType = resolveFiltersWithCenterScope(type, opts);
        if (!filtersForType) return;

        await dispatch(
          fetchVmsListviewThunk({
            type,
            keyword: opts.keyword ?? '',
            page: opts.page ?? 1,
            filters: filtersForType,
            order_by: opts.order_by ?? '',
            append: opts.append ?? false,
            // navbar_filter: navbarFilter,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, resolveFiltersWithCenterScope],
  );

  const fetchGroupedData = useCallback(
    async (type, opts = {}) => {
      try {
        const filtersForType = resolveFiltersWithCenterScope(type, opts);
        if (!filtersForType) return;

        await dispatch(
          fetchVmsGroupedListviewThunk({
            type,
            keyword: opts.keyword ?? '',
            filters: filtersForType,
            group_by: opts.group_by ?? '',
            order_by:
              !opts.group_by || opts.group_by === 'vendor_type'
                ? undefined
                : `${opts.group_by} ${opts.group_order ?? 'asc'}`,
            group_page: opts.group_page ?? 1,
            append: opts.append ?? false,
            // navbar_filter: navbarFilter,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, resolveFiltersWithCenterScope],
  );

  // ── Tab change ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname);
    setActiveTab(tabFromPath);
    setSearchValue('');
  }, [location.pathname]);

  /**
   * Single fetch path for list / grouped list.
   * `get_visitor_entries_listview` already calls `get_list_pref` server-side — do not prefetch prefs separately.
   * Includes `activeTab` so switching tabs refetches once (previously overlapped with a second effect).
   */
  useEffect(() => {
    const type = TAB_TO_TYPE[activeTab];
    if (!type || !filtersInitialized) return;
    // Wait for centerAccess to resolve so the very first request carries the
    // correct global centre intent (rather than a "no filter" placeholder).
    if (centerAccessLoading || noCenters || isEmptyCenterScope(vmsCenterScope)) return;

    const groupBy = getGroupByForTab(activeTab);
    const orderBy = getOrderByForTab(activeTab);

    if (groupBy) {
      fetchGroupedData(type, {
        keyword: debouncedSearch,
        group_by: groupBy,
        group_order: groupOrder,
        order_by: orderBy,
        group_page: 1,
        append: false,
      });
    } else {
      fetchData(type, {
        keyword: debouncedSearch,
        page: 1,
        order_by: orderBy,
        append: false,
      });
    }
  }, [
    activeTab,
    debouncedSearch,
    visitorsFilterArray,
    spaceFilterArray,
    vendorFilterArray,
    groupByVisitors,
    groupBySpace,
    groupByVendors,
    groupOrder,
    visitorsSorting,
    spaceSorting,
    vendorsSorting,
    allSorting,
    dateFilters,
    fetchData,
    fetchGroupedData,
    getGroupByForTab,
    getOrderByForTab,
    vmsCenterScope,
    centerAccessLoading,
    noCenters,
    filtersInitialized,
  ]);

  // ── Load more (scroll pagination) ─────────────────────────────────────────
  // Regular listview: page-based. Grouped: group_page-based.

  const handleVisitorsLoadMore = useCallback(() => {
    const isGrouped = Boolean(groupByVisitors);
    if (isGrouped) {
      if (
        !visitorsListview.hasMoreGroups ||
        visitorsListview.isLoadingMoreGroups ||
        visitorsListview.isLoading
      )
        return;
      fetchGroupedData('Visitor', {
        keyword: debouncedSearch,
        group_by: groupByVisitors,
        group_order: groupOrder,
        order_by: getOrderByForTab('visitors'),
        group_page: (visitorsListview.groupPage ?? 1) + 1,
        append: true,
      });
    } else {
      if (!visitorsListview.hasMore || visitorsListview.isLoadingMore) return;
      fetchData('Visitor', {
        keyword: debouncedSearch,
        page: (visitorsListview.page ?? 1) + 1,
        order_by: getOrderByForTab('visitors'),
        append: true,
      });
    }
  }, [
    groupByVisitors,
    groupOrder,
    visitorsListview,
    debouncedSearch,
    fetchData,
    fetchGroupedData,
    getOrderByForTab,
  ]);

  const handleSpaceLoadMore = useCallback(() => {
    const isGrouped = Boolean(groupBySpace);
    if (isGrouped) {
      if (
        !spaceListview.hasMoreGroups ||
        spaceListview.isLoadingMoreGroups ||
        spaceListview.isLoading
      )
        return;
      fetchGroupedData('Space', {
        keyword: debouncedSearch,
        group_by: groupBySpace,
        group_order: groupOrder,
        order_by: getOrderByForTab('space-inquiries'),
        group_page: (spaceListview.groupPage ?? 1) + 1,
        append: true,
      });
    } else {
      if (!spaceListview.hasMore || spaceListview.isLoadingMore) return;
      fetchData('Space', {
        keyword: debouncedSearch,
        page: (spaceListview.page ?? 1) + 1,
        order_by: getOrderByForTab('space-inquiries'),
        append: true,
      });
    }
  }, [
    groupBySpace,
    groupOrder,
    spaceListview,
    debouncedSearch,
    fetchData,
    fetchGroupedData,
    getOrderByForTab,
  ]);

  const handleVendorsLoadMore = useCallback(() => {
    const isGrouped = Boolean(groupByVendors);
    if (isGrouped) {
      if (
        !vendorsListview.hasMoreGroups ||
        vendorsListview.isLoadingMoreGroups ||
        vendorsListview.isLoading
      )
        return;
      fetchGroupedData('Vendor', {
        keyword: debouncedSearch,
        group_by: groupByVendors,
        group_order: groupOrder,
        group_page: (vendorsListview.groupPage ?? 1) + 1,
        append: true,
      });
    } else {
      if (!vendorsListview.hasMore || vendorsListview.isLoadingMore) return;
      fetchData('Vendor', {
        keyword: debouncedSearch,
        page: (vendorsListview.page ?? 1) + 1,
        order_by: getOrderByForTab('vendors'),
        append: true,
      });
    }
  }, [
    groupByVendors,
    groupOrder,
    vendorsListview,
    debouncedSearch,
    fetchData,
    fetchGroupedData,
    getOrderByForTab,
  ]);

  const handleAllLoadMore = useCallback(() => {
    if (!allListview.hasMore || allListview.isLoadingMore) return;
    fetchData('All', {
      keyword: debouncedSearch,
      page: (allListview.page ?? 1) + 1,
      order_by: getOrderByForTab('all'),
      append: true,
    });
  }, [allListview, debouncedSearch, fetchData, getOrderByForTab]);

  // ── Column persistence ─────────────────────────────────────────────────────

  const handleColumnsChange = useCallback(
    async (type, columns) => {
      try {
        await dispatch(saveVmsColumnPrefThunk({ type, columns })).unwrap();
        /** Redux merges prefs in saveVmsColumnPrefThunk.fulfilled — no extra get_list_pref / listview round-trip */
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch],
  );

  const handleAllColumnsChange = useCallback(
    (columns) => handleColumnsChange('All', columns),
    [handleColumnsChange],
  );

  const handleVisitorsColumnsChange = useCallback(
    (columns) => handleColumnsChange('Visitor', columns),
    [handleColumnsChange],
  );

  const handleSpaceColumnsChange = useCallback(
    (columns) => handleColumnsChange('Space', columns),
    [handleColumnsChange],
  );

  const handleVendorsColumnsChange = useCallback(
    (columns) => handleColumnsChange('Vendor', columns),
    [handleColumnsChange],
  );

  // ── Retry handlers ─────────────────────────────────────────────────────────

  const handleAllRetry = useCallback(() => {
    fetchData('All', { keyword: debouncedSearch, order_by: getOrderByForTab('all') });
  }, [fetchData, debouncedSearch, getOrderByForTab]);

  const handleVisitorsRetry = useCallback(() => {
    if (groupByVisitors) {
      fetchGroupedData('Visitor', {
        keyword: debouncedSearch,
        group_by: groupByVisitors,
        group_order: groupOrder,
        order_by: getOrderByForTab('visitors'),
      });
    } else {
      fetchData('Visitor', { keyword: debouncedSearch, order_by: getOrderByForTab('visitors') });
    }
  }, [groupByVisitors, groupOrder, fetchData, fetchGroupedData, debouncedSearch, getOrderByForTab]);

  const handleSpaceRetry = useCallback(() => {
    if (groupBySpace) {
      fetchGroupedData('Space', {
        keyword: debouncedSearch,
        group_by: groupBySpace,
        group_order: groupOrder,
        order_by: getOrderByForTab('space-inquiries'),
      });
    } else {
      fetchData('Space', {
        keyword: debouncedSearch,
        order_by: getOrderByForTab('space-inquiries'),
      });
    }
  }, [groupBySpace, groupOrder, fetchData, fetchGroupedData, debouncedSearch, getOrderByForTab]);

  const handleVendorsRetry = useCallback(() => {
    if (groupByVendors) {
      fetchGroupedData('Vendor', {
        keyword: debouncedSearch,
        group_by: groupByVendors,
        group_order: groupOrder,
      });
    } else {
      fetchData('Vendor', { keyword: debouncedSearch, order_by: getOrderByForTab('vendors') });
    }
  }, [groupByVendors, groupOrder, fetchData, fetchGroupedData, debouncedSearch, getOrderByForTab]);

  // ── UI handlers ────────────────────────────────────────────────────────────

  const handleTabChange = useCallback(
    (val) => {
      setActiveTab(val);
      setSearchValue('');
      setIsViewDrawerOpen(false);
      setSelectedRecord(null);
      // Preserve query params (e.g. date filter) across tabs.
      navigate(`/vms/${val}${location.search || ''}`);
    },
    [navigate, location.search],
  );

  const handleSearchChange = useCallback((val) => {
    setSearchValue(val);
  }, []);

  const handleInvite = useCallback(() => {
    setIsInviteDrawerOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (row) => {
      const isVisitor =
        activeTab === 'visitors' || (activeTab === 'all' && row?.type === 'Visitor');
      if (isVisitor) {
        const recordId = String(row?.name ?? row?.id ?? '').trim();
        if (recordId) {
          navigate(`/vms/visitors/${encodeURIComponent(recordId)}${location.search || ''}`);
        }
        return;
      }

      setSelectedRecord(row);
      setIsViewDrawerOpen(true);
    },
    [activeTab, navigate, location.search],
  );

  // Keep drawer open/closed in sync with `/vms/visitors/:visitorId` (same pattern as ticket management).
  useEffect(() => {
    if (activeTab !== 'visitors' && activeTab !== 'all') {
      return;
    }

    if (visitorId) {
      const decodedVisitorId = decodeURIComponent(visitorId);
      const rowFromList = Array.isArray(visitorsListview.data)
        ? visitorsListview.data.find(
            (row) => String(row?.name ?? row?.id ?? '') === decodedVisitorId,
          )
        : null;
      const rowFromAllList = Array.isArray(allListview.data)
        ? allListview.data.find((row) => String(row?.name ?? row?.id ?? '') === decodedVisitorId)
        : null;

      const matchedRow = rowFromList || rowFromAllList;

      setSelectedRecord((previous) => {
        if (matchedRow) return matchedRow;
        if (String(previous?.name ?? previous?.id ?? '') === decodedVisitorId) {
          return previous;
        }
        return { name: decodedVisitorId, id: decodedVisitorId, type: 'Visitor' };
      });
      setIsViewDrawerOpen(true);
    } else {
      setSelectedRecord(null);
      setIsViewDrawerOpen(false);
    }
  }, [activeTab, visitorId, visitorsListview.data, allListview.data]);

  const handleGroupByChange = useCallback(
    (val) => {
      if (activeTab === 'visitors') setGroupByVisitors(val);
      else if (activeTab === 'space-inquiries') setGroupBySpace(val);
      else if (activeTab === 'vendors') setGroupByVendors(val);
    },
    [activeTab],
  );
  const handleGroupOrderChange = useCallback((val) => setGroupOrder(val), []);
  const handleVisitorsSortingChange = useCallback((nextSorting) => {
    setVisitorsSorting(Array.isArray(nextSorting) ? nextSorting : []);
  }, []);
  const handleSpaceSortingChange = useCallback((nextSorting) => {
    setSpaceSorting(Array.isArray(nextSorting) ? nextSorting : []);
  }, []);
  const handleVendorsSortingChange = useCallback((nextSorting) => {
    setVendorsSorting(Array.isArray(nextSorting) ? nextSorting : []);
  }, []);
  const handleDateRangeChange = useCallback(
    (range) => {
      if (!range?.from || !range?.to) return;
      setDateRange(range);
      syncDateRangeToUrl(range);
    },
    [syncDateRangeToUrl],
  );

  const handleVisitorsFiltersChange = useCallback((filtersArray, filterValues) => {
    setVisitorsFilters(filterValues || { center: [], host_company: [], status: [] });
  }, []);

  const handleSpaceFiltersChange = useCallback((filtersArray, filterValues) => {
    setSpaceFilters(
      filterValues || {
        type_of_space: [],
        source_category: [],
        sales_owner: [],
        partner_type: [],
        status: [],
      },
    );
  }, []);

  const handleVendorsFiltersChange = useCallback((filtersArray, filterValues) => {
    setVendorFilters(
      filterValues || {
        center: [],
        vendor_type: [],
        assigned_supervisor: [],
        status: [],
      },
    );
  }, []);

  const getInviteTitle = () => {
    switch (activeTab) {
      case 'space-inquiries':
        return 'Invite for Space Inquiry';
      case 'vendors':
        return 'Invite Vendor';
      case 'event-participants':
        return 'Invite Event Participant';
      default:
        return 'Invite Visitor';
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  // Use stats from whichever type is currently active (or visitors as fallback)
  const activeStats =
    activeTab === 'space-inquiries'
      ? spaceListview.stats
      : activeTab === 'vendors'
        ? vendorsListview.stats
        : activeTab === 'all'
          ? allListview.stats
          : visitorsListview.stats;

  // ── Tab counts (from API total_count) ─────────────────────────────────────
  const resolvedTabCounts = useMemo(() => {
    const activeCounts =
      activeTab === 'space-inquiries'
        ? spaceListview?.tab_counts
        : activeTab === 'vendors'
          ? vendorsListview?.tab_counts
          : activeTab === 'all'
            ? allListview?.tab_counts
            : visitorsListview?.tab_counts;

    if (activeCounts && Object.keys(activeCounts).length > 0) {
      return activeCounts;
    }

    // Fallbacks to any loaded tab count data
    if (allListview?.tab_counts && Object.keys(allListview.tab_counts).length > 0) {
      return allListview.tab_counts;
    }
    if (visitorsListview?.tab_counts && Object.keys(visitorsListview.tab_counts).length > 0) {
      return visitorsListview.tab_counts;
    }
    if (spaceListview?.tab_counts && Object.keys(spaceListview.tab_counts).length > 0) {
      return spaceListview.tab_counts;
    }
    if (vendorsListview?.tab_counts && Object.keys(vendorsListview.tab_counts).length > 0) {
      return vendorsListview.tab_counts;
    }
    return null;
  }, [
    activeTab,
    allListview?.tab_counts,
    visitorsListview?.tab_counts,
    spaceListview?.tab_counts,
    vendorsListview?.tab_counts,
  ]);

  const tabCounts = {
    all:
      (resolvedTabCounts?.Visitor ?? 0) +
      (resolvedTabCounts?.Space ?? 0) +
      (resolvedTabCounts?.Vendor ?? 0),
    visitors: resolvedTabCounts?.Visitor ?? 0,
    'space-inquiries': resolvedTabCounts?.Space ?? 0,
    vendors: resolvedTabCounts?.Vendor ?? 0,
    'event-participants': SAMPLE_EVENT_PARTICIPANTS.length,
  };

  const visitorCommentsState = useSelector((state) => state.vms.visitorComments);

  const selectedVisitorEntryId = useMemo(() => {
    if ((activeTab === 'visitors' || activeTab === 'all') && visitorId) {
      return decodeURIComponent(visitorId);
    }
    return resolveVisitorEntryId(selectedRecord, null);
  }, [activeTab, visitorId, selectedRecord]);

  const {
    data: visitorCommentsData = {
      comments: [],
      history: [],
      communications: [],
      views: [],
      calls: [],
    },
    status: visitorCommentsStatus = 'idle',
  } = visitorCommentsState || {};

  const visitorCommentsLoading = visitorCommentsStatus === 'loading';

  useEffect(() => {
    if (!isViewDrawerOpen || !selectedVisitorEntryId) return;
    dispatch(fetchVisitorComments({ visitorEntry: selectedVisitorEntryId }));
  }, [dispatch, isViewDrawerOpen, selectedVisitorEntryId]);

  const handleAddVisitorComment = useCallback(
    async (visitorEntry, content, attachments, parentCommentId, _visibleToClient) => {
      if (!visitorEntry) return;
      try {
        await dispatch(
          addVisitorComment({
            visitorEntry,
            content,
            attachments,
            parentCommentId,
          }),
        ).unwrap();
        await dispatch(fetchVisitorComments({ visitorEntry })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add comment. Please try again.' });
      }
    },
    [dispatch],
  );

  const handleRefreshVisitorComments = useCallback(() => {
    if (!selectedVisitorEntryId) return;
    dispatch(fetchVisitorComments({ visitorEntry: selectedVisitorEntryId }));
  }, [dispatch, selectedVisitorEntryId]);

  const handleViewDrawerClose = useCallback(() => {
    if (activeTab === 'visitors') {
      navigate(`/vms/visitors${location.search || ''}`);
      return;
    }
    if (activeTab === 'all' && visitorId) {
      navigate(`/vms/all${location.search || ''}`);
      return;
    }

    setIsViewDrawerOpen(false);
    setSelectedRecord(null);

    const type = TAB_TO_TYPE[activeTab];
    if (!type) return;

    const groupBy = getGroupByForTab(activeTab);
    const orderBy = getOrderByForTab(activeTab);
    if (groupBy) {
      fetchGroupedData(type, {
        keyword: debouncedSearch,
        group_by: groupBy,
        group_order: groupOrder,
        order_by: orderBy,
        group_page: 1,
        append: false,
      });
    } else {
      fetchData(type, {
        keyword: debouncedSearch,
        page: 1,
        order_by: orderBy,
        append: false,
      });
    }
  }, [
    activeTab,
    debouncedSearch,
    fetchData,
    fetchGroupedData,
    getGroupByForTab,
    groupOrder,
    getOrderByForTab,
    navigate,
    location.search,
  ]);

  // if(visitorsListview.isLoading || spaceListview.isLoading || vendorsListview.isLoading){
  //   return <div>Loading...</div>
  // }

  return (
    <PageLayout
      pageTitle='VMS'
      pageIcon={<RiUserFollowLine size={24} />}
      pageDescription='Manage visitors, vendors, space inquiries, and event participants.'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterAccessChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex flex-col gap-6 px-4 sm:px-6 lg:px-8'>
        <VmsStats stats={activeStats} />

        <VmsStatusTabs
          value={activeTab}
          noCenters={noCenters || isEmptyCenterScope(vmsCenterScope)}
          counts={tabCounts}
          onValueChange={handleTabChange}
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          onInvite={handleInvite}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          visitorsAppliedFilters={visitorsFilters}
          onVisitorsFiltersChange={handleVisitorsFiltersChange}
          spaceAppliedFilters={spaceFilters}
          onSpaceFiltersChange={handleSpaceFiltersChange}
          vendorsAppliedFilters={vendorFilters}
          onVendorsFiltersChange={handleVendorsFiltersChange}
          visitorsFilterCount={
            visitorsFilters.center.length +
            visitorsFilters.host_company.length +
            visitorsFilters.status.length
          }
          spaceFilterCount={
            spaceFilters.type_of_space.length +
            spaceFilters.source_category.length +
            spaceFilters.sales_owner.length +
            spaceFilters.partner_type.length +
            spaceFilters.status.length
          }
          vendorsFilterCount={
            vendorFilters.center.length +
            vendorFilters.vendor_type.length +
            vendorFilters.assigned_supervisor.length +
            vendorFilters.status.length
          }
          onRowClick={handleRowClick}
          allTableRef={allTableRef}
          visitorsTableRef={visitorsTableRef}
          spaceInquiriesTableRef={spaceInquiriesTableRef}
          vendorsTableRef={vendorsTableRef}
          eventParticipantsTableRef={eventParticipantsTableRef}
          groupByVisitors={groupByVisitors}
          groupBySpace={groupBySpace}
          groupByVendors={groupByVendors}
          groupOrder={groupOrder}
          onGroupByChange={handleGroupByChange}
          onGroupOrderChange={handleGroupOrderChange}
          allSorting={allSorting}
          onAllSortingChange={setAllSorting}
          visitorsSorting={visitorsSorting}
          onVisitorsSortingChange={handleVisitorsSortingChange}
          spaceSorting={spaceSorting}
          onSpaceSortingChange={handleSpaceSortingChange}
          vendorsSorting={vendorsSorting}
          onVendorsSortingChange={handleVendorsSortingChange}
          // All
          all={allListview.data}
          isAllLoading={allListview.isLoading}
          allError={allListview.error}
          allApiColumns={allListview.columns}
          onAllColumnsChange={handleAllColumnsChange}
          allColumnConfigHook={allColumnConfigHook}
          onAllColumnConfigHookChange={setAllColumnConfigHook}
          allHasMore={allListview.hasMore}
          allIsLoadingMore={allListview.isLoadingMore}
          onAllLoadMore={handleAllLoadMore}
          onAllRetry={handleAllRetry}
          // Visitors
          visitors={groupByVisitors ? [] : visitorsListview.data}
          visitorsGroups={groupByVisitors ? visitorsListview.groups : []}
          isVisitorsGrouped={Boolean(groupByVisitors)}
          isVisitorsLoading={visitorsListview.isLoading}
          visitorsError={visitorsListview.error}
          visitorsApiColumns={visitorsListview.columns}
          onVisitorsColumnsChange={handleVisitorsColumnsChange}
          visitorsColumnConfigHook={visitorsColumnConfigHook}
          onVisitorsColumnConfigHookChange={setVisitorsColumnConfigHook}
          visitorsHasMore={
            groupByVisitors ? visitorsListview.hasMoreGroups : visitorsListview.hasMore
          }
          visitorsIsLoadingMore={
            groupByVisitors ? visitorsListview.isLoadingMoreGroups : visitorsListview.isLoadingMore
          }
          onVisitorsLoadMore={handleVisitorsLoadMore}
          onVisitorsRetry={handleVisitorsRetry}
          // Space inquiries
          spaceInquiries={groupBySpace ? [] : spaceListview.data}
          spaceInquiriesGroups={groupBySpace ? spaceListview.groups : []}
          isSpaceInquiriesGrouped={Boolean(groupBySpace)}
          isSpaceInquiriesLoading={spaceListview.isLoading}
          spaceInquiriesError={spaceListview.error}
          spaceInquiriesApiColumns={spaceListview.columns}
          onSpaceInquiriesColumnsChange={handleSpaceColumnsChange}
          spaceInquiriesColumnConfigHook={spaceColumnConfigHook}
          onSpaceInquiriesColumnConfigHookChange={setSpaceColumnConfigHook}
          spaceInquiriesHasMore={groupBySpace ? spaceListview.hasMoreGroups : spaceListview.hasMore}
          spaceInquiriesIsLoadingMore={
            groupBySpace ? spaceListview.isLoadingMoreGroups : spaceListview.isLoadingMore
          }
          onSpaceInquiriesLoadMore={handleSpaceLoadMore}
          onSpaceInquiriesRetry={handleSpaceRetry}
          // Vendors
          vendors={groupByVendors ? [] : vendorsListview.data}
          vendorsGroups={groupByVendors ? vendorsListview.groups : []}
          isVendorsGrouped={Boolean(groupByVendors)}
          isVendorsLoading={vendorsListview.isLoading}
          vendorsError={vendorsListview.error}
          vendorsApiColumns={vendorsListview.columns}
          onVendorsColumnsChange={handleVendorsColumnsChange}
          vendorsColumnConfigHook={vendorsColumnConfigHook}
          onVendorsColumnConfigHookChange={setVendorsColumnConfigHook}
          vendorsHasMore={groupByVendors ? vendorsListview.hasMoreGroups : vendorsListview.hasMore}
          vendorsIsLoadingMore={
            groupByVendors ? vendorsListview.isLoadingMoreGroups : vendorsListview.isLoadingMore
          }
          onVendorsLoadMore={handleVendorsLoadMore}
          onVendorsRetry={handleVendorsRetry}
          // Event participants (static for now)
          eventParticipants={SAMPLE_EVENT_PARTICIPANTS}
          isEventParticipantsLoading={false}
          eventParticipantsColumnConfigHook={eventParticipantsColumnConfigHook}
          onEventParticipantsColumnConfigHookChange={setEventParticipantsColumnConfigHook}
        />
      </div>

      <VmsInviteDrawer
        open={isInviteDrawerOpen}
        onOpenChange={setIsInviteDrawerOpen}
        inviteTitle={getInviteTitle()}
        activeTab={activeTab}
        onSuccess={async () => {
          const type = TAB_TO_TYPE[activeTab];
          if (!type) return;
          const groupBy = getGroupByForTab(activeTab);
          if (groupBy) {
            await fetchGroupedData(type, {
              keyword: debouncedSearch,
              group_by: groupBy,
              group_order: groupOrder,
              group_page: 1,
              append: false,
            });
          } else {
            await fetchData(type, {
              keyword: debouncedSearch,
              page: 1,
              append: false,
            });
          }
        }}
      />

      <VmsViewDrawer
        isOpen={isViewDrawerOpen}
        onClose={handleViewDrawerClose}
        visitorEntryId={selectedVisitorEntryId || null}
        record={selectedRecord}
        onAddComment={handleAddVisitorComment}
        onRefreshComments={handleRefreshVisitorComments}
        commentsData={visitorCommentsData}
        commentsLoading={visitorCommentsLoading}
        commentsFetchStatus={visitorCommentsStatus}
      />
    </PageLayout>
  );
};

export default Vms;
