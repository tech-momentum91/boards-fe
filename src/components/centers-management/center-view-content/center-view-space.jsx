import React, { useCallback, useMemo, useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import CenterViewCommonLayout from './center-view-common-layout';
import CenterViewLayout from '@/components/centers-management/center-view-layout';
import CenterViewAddLayoutModal from '@/components/centers-management/center-view-content/center-view-add-layout-modal';
import emptyState from '@/assets/images/empty-state.png';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import * as Filter from '@/components/ui/filter';
import * as Switch from '@/components/ui/switch';
import { useSelector, useDispatch } from 'react-redux';
import {
  deleteCenterSpaceThunk,
  editFloorWithFilesThunk,
  getCenterDetailsThunk,
} from '@/redux/centerSlice';
import { showErrorToast } from '@/utils/error-utils';
import CreateNewSpaceModal from '@/components/space-management/create-new-space';
import AllocatedSpaceModal from '@/components/space-management/allocate-space-modal';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiErrorWarningLine,
  RiLayoutMasonryLine,
  RiLayoutColumnLine,
  RiListCheck,
  RiStackLine,
} from 'react-icons/ri';
import { hasModulePermission } from '@/utils/user-role-utils';
import * as ButtonGroup from '@/components/ui/button-group';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useColumnConfig } from '@/hooks/use-column-config';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { fetchFloors } from '@/redux/ticketManagementSlice';
import { getSpaceTypeBadge, getSpaceStatusBadge } from '@/components/space-management/constants';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import {
  CENTER_DETAIL_SPACE_TAB_FILTER_DEFAULTS,
  CENTER_DETAIL_SPACE_TAB_PERSIST_INCLUDE_KEYS,
  CENTER_DETAIL_SPACE_TAB_PERSIST_POSITIVE_NUMERIC_KEYS,
  compactCenterDetailSpaceTabFiltersForStorage,
  buildCenterDetailSpaceTabAppliedFilters,
  computeCenterDetailSpaceTabFilterCount,
} from '@/components/centers-management/constants';
import SpaceCenterFilterDropdown from '@/components/centers-management/center-view-content/center-view-space-dropdown-filter';
import {
  fetchSpaceColumnList,
  updateSpaceColumnList,
  fetchSpaceListData,
  fetchSpaceListWithFilters,
  selectSpaceDetailClientList,
  fetchClientListForSpaceDetailThunk,
  resetSpaceList,
  updateSpaceField,
} from '@/redux/spaceSlice';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { findScrollableParent } from '@/components/event-management/event-participants-utils';
import apiClient from '@/api/axios';

const CENTER_DETAIL_SPACE_VIEW_FILTERS_KEY = 'center-detail-space-view-filter-dropdown';
const CENTER_VIEW_SPACE_TABLE_ID = 'center-view-space-columns';

const persistSpaceViewColumns = async (tableId, payload) => {
  try {
    const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
      doctype: 'Space',
      react_table_id: tableId,
      columns: payload,
    });
    return response?.data?.message ?? payload;
  } catch (error) {
    console.error('Failed to save space column preferences:', error);
    return payload;
  }
};

const readSpaceViewColumns = async (tableId) => {
  try {
    const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
      params: {
        doctype: 'Space',
        react_table_id: tableId,
      },
    });
    const message = response?.data?.message;
    if (!message || (Array.isArray(message) && message.length === 0)) {
      return null;
    }
    return message;
  } catch (error) {
    console.error('Failed to load space column preferences:', error);
    return null;
  }
};

/** URL `view` query: layouts = floor layout tools; spaces = space table (default). Kept in sync so Back from layout editor restores the Layout segment. */
const VIEW_QUERY_LAYOUTS = 'layouts';
const VIEW_QUERY_SPACES = 'spaces';

/** Prefill create modal when exactly one option is selected per facet (Space tab filters). */
function buildSingleOptionPrefillFromFilters(appliedFilters) {
  if (!appliedFilters || typeof appliedFilters !== 'object') return null;
  const next = {};
  if (Array.isArray(appliedFilters.floor) && appliedFilters.floor.length === 1) {
    next.floor = appliedFilters.floor[0];
  }
  if (Array.isArray(appliedFilters.spaceType) && appliedFilters.spaceType.length === 1) {
    next.spaceType = appliedFilters.spaceType[0];
  }
  if (Array.isArray(appliedFilters.status) && appliedFilters.status.length === 1) {
    next.status = appliedFilters.status[0];
  }
  return Object.keys(next).length > 0 ? next : null;
}

const CenterViewSpace = () => {
  const dispatch = useDispatch();
  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const {
    data: spaceData,
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    pageSize,
  } = useSelector((state) => state.space.spaceListData);
  const floors = useSelector((state) => state.ticketManagement.floors);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const [scrollContainerEl, setScrollContainerEl] = useState(null);

  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWrite = hasModulePermission(userSideBarPerm, 'Space', 'write');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const [spaceToAllocate, setSpaceToAllocate] = useState(null);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const spaceDetailClientList = useSelector(selectSpaceDetailClientList);
  const clientsList = spaceDetailClientList?.data ?? [];

  useEffect(() => {
    if (isAllocateModalOpen) {
      dispatch(fetchClientListForSpaceDetailThunk());
    }
  }, [isAllocateModalOpen, dispatch]);

  const handleAllocateClick = useCallback((space) => {
    setSpaceToAllocate(space);
    setIsAllocateModalOpen(true);
  }, []);

  /** `grid` = space table + search; `list` = layout tools view */
  const [toolbarSegment, setToolbarSegment] = useState(() =>
    searchParams.get('view') === VIEW_QUERY_LAYOUTS ? 'list' : 'grid',
  );

  const setToolbarSegmentFromUrl = useCallback(
    (segment) => {
      setToolbarSegment(segment);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (segment === 'list') {
            next.set('view', VIEW_QUERY_LAYOUTS);
          } else {
            next.set('view', VIEW_QUERY_SPACES);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const v = searchParams.get('view');
    if (v === VIEW_QUERY_LAYOUTS) {
      setToolbarSegment('list');
    } else {
      setToolbarSegment('grid');
    }
  }, [searchParams]);
  const [openAddLayoutModal, setOpenAddLayoutModal] = useState(false);
  const [isAddingLayout, setIsAddingLayout] = useState(false);
  const [pendingLayoutFloorRef, setPendingLayoutFloorRef] = useState('');

  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue, 400);

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState(() =>
    buildCenterDetailSpaceTabAppliedFilters({}),
  );
  const filterDropdownRef = useRef(null);
  const skipFilterPersistRef = useRef(false);
  /** Only after user changes filters this session — avoids prefilling create form from restored session filters after refresh. */
  const userAdjustedFiltersSinceMountRef = useRef(false);
  const [createModalFilterPrefill, setCreateModalFilterPrefill] = useState(null);

  const centerIdForSession = centerDetails?.name;

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: centerIdForSession
      ? `${CENTER_DETAIL_SPACE_VIEW_FILTERS_KEY}-${centerIdForSession}`
      : null,
    defaultFilters: CENTER_DETAIL_SPACE_TAB_FILTER_DEFAULTS,
    persistIncludeKeys: CENTER_DETAIL_SPACE_TAB_PERSIST_INCLUDE_KEYS,
    persistTrimStringArrays: true,
    persistPositiveNumericKeys: CENTER_DETAIL_SPACE_TAB_PERSIST_POSITIVE_NUMERIC_KEYS,
  });

  // 1. Hydrate applied filters when session snapshot or center changes (matches Document tab).
  useEffect(() => {
    if (!centerIdForSession) {
      setFiltersInitialized(false);
      return;
    }

    skipFilterPersistRef.current = true;
    const next = buildCenterDetailSpaceTabAppliedFilters(persistedFilters);
    setAppliedFilters(next);
    setFilterCount(computeCenterDetailSpaceTabFilterCount(next));
    setFiltersInitialized(true);
  }, [centerIdForSession, persistedFilters]);

  // 2. Persist to storage (skip one cycle after hydrate to avoid wiping session).
  useEffect(() => {
    if (!centerIdForSession || !filtersInitialized) return;
    if (skipFilterPersistRef.current) {
      skipFilterPersistRef.current = false;
      return;
    }

    const compact = compactCenterDetailSpaceTabFiltersForStorage(appliedFilters);
    const persistedCompact = compactCenterDetailSpaceTabFiltersForStorage(
      buildCenterDetailSpaceTabAppliedFilters(persistedFilters),
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedCompact)) {
      setPersistedFilters(compact);
    }
  }, [
    centerIdForSession,
    appliedFilters,
    persistedFilters,
    filtersInitialized,
    setPersistedFilters,
  ]);

  /**
   * Floor filter options. `value` is `block_floor_id` — matches `Space.floor` and
   * `get_floors` / create-space. `floorRef` is the Center Floor Detail row id for
   * layout upload APIs.
   */
  const floorOptions = useMemo(() => {
    const rows = centerDetails?.floor_details;
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((row) => {
        const floorRef = row?.name != null ? String(row.name) : '';
        const blockFloorId =
          String(row?.block_floor_id || '').trim() ||
          (row?.block != null && row?.floor != null
            ? `${String(row.block).trim()} - ${String(row.floor).trim()}`
            : '') ||
          floorRef;
        return {
          value: blockFloorId,
          label: blockFloorId || floorRef,
          floorRef,
        };
      });
    }
    const fetched = floors.data?.[centerDetails?.name];
    if (!Array.isArray(fetched)) return [];
    return fetched.map((opt) => ({
      value: String(opt.value ?? opt.label ?? ''),
      label: String(opt.label ?? opt.value ?? ''),
      floorRef: opt.name != null ? String(opt.name) : '',
    }));
  }, [centerDetails?.floor_details, centerDetails?.name, floors.data]);

  /** Map legacy persisted row ids to `block_floor_id` for API filtering. */
  const resolveFloorFilterValues = useCallback(
    (floorValues) => {
      if (!Array.isArray(floorValues) || floorValues.length === 0) return [];
      if (floorOptions.length === 0) return floorValues;
      return floorValues.map((f) => {
        const raw = String(f);
        if (floorOptions.some((o) => o.value === raw)) return raw;
        const byRef = floorOptions.find((o) => o.floorRef === raw);
        return byRef?.value ?? raw;
      });
    },
    [floorOptions],
  );

  // Normalize legacy floor row ids (session) to block_floor_id once floor options load.
  useEffect(() => {
    if (!filtersInitialized || floorOptions.length === 0) return;
    if (!Array.isArray(appliedFilters.floor) || appliedFilters.floor.length === 0) return;
    const normalized = resolveFloorFilterValues(appliedFilters.floor);
    if (JSON.stringify(normalized) !== JSON.stringify(appliedFilters.floor)) {
      setAppliedFilters((prev) => ({ ...prev, floor: normalized }));
    }
  }, [filtersInitialized, floorOptions, appliedFilters.floor, resolveFloorFilterValues]);

  /** Floors without an uploaded layout — for Add Layout modal only. */
  const floorOptionsWithoutLayout = useMemo(() => {
    const rows = centerDetails?.floor_details;
    if (!Array.isArray(rows) || rows.length === 0) return floorOptions;
    const withoutLayout = rows.filter((row) => {
      if (row?.layout_image) return false;
      const attachments = row?.attachments;
      if (!Array.isArray(attachments) || attachments.length === 0) return true;
      return !attachments.some((a) => a && (a.is_layout_image === 1 || a.is_layout_image === true));
    });
    if (withoutLayout.length === 0) return [];
    return withoutLayout.map((row) => {
      const id = row?.name != null ? String(row.name) : '';
      const label =
        String(row?.block_floor_id || '').trim() ||
        (row?.block != null && row?.floor != null
          ? `${String(row.block).trim()} - ${String(row.floor).trim()}`
          : '') ||
        id;
      return { value: id, label: label || id };
    });
  }, [centerDetails?.floor_details, floorOptions]);

  const layoutListFromFloors = useMemo(() => {
    const fd = centerDetails?.floor_details;
    if (!Array.isArray(fd)) return [];
    return fd
      .filter((row) => row?.layout_image)
      .map((row) => ({
        name: row.name,
        floor: row.floor,
        block_floor_id: row.block_floor_id,
        image: row.layout_image,
        thumbnail: row.layout_image,
        layout_image: row.layout_image,
      }));
  }, [centerDetails?.floor_details]);

  useEffect(() => {
    if (!pendingLayoutFloorRef) return;
    const hasLayout = layoutListFromFloors.some(
      (layout) => String(layout?.name ?? '').trim() === pendingLayoutFloorRef,
    );
    if (!hasLayout) return;
    setOpenAddLayoutModal(false);
    setPendingLayoutFloorRef('');
    setIsAddingLayout(false);
  }, [layoutListFromFloors, pendingLayoutFloorRef]);

  const { variant: tableVariant } = useTableVariant('center-view-space-table', 'compact');

  const buildSpaceListFilters = useCallback(() => {
    if (!centerDetails?.name) return [];
    const filters = [['center', '=', centerDetails.name]];

    const floorFilterValues = resolveFloorFilterValues(appliedFilters.floor);
    if (floorFilterValues.length > 0) {
      filters.push(['floor', 'in', floorFilterValues]);
    }
    if (appliedFilters.status?.length > 0) {
      filters.push(['status', 'in', appliedFilters.status]);
    }
    if (appliedFilters.spaceType?.length > 0) {
      filters.push(['inventory_type', 'in', appliedFilters.spaceType]);
    }
    if (appliedFilters.seats > 0) {
      filters.push(['total_seats', '<=', appliedFilters.seats]);
    }
    return filters;
  }, [centerDetails?.name, appliedFilters, resolveFloorFilterValues]);

  const getData = useCallback(() => {
    if (!centerDetails?.name || !filtersInitialized) return;

    dispatch(resetSpaceList());
    dispatch(
      fetchSpaceListData({
        filters: buildSpaceListFilters(),
        keyword: debouncedSearch.trim(),
        order_by: 'creation desc',
        page: 1,
        pageSize: 10,
        append: false,
      }),
    );
  }, [dispatch, centerDetails?.name, filtersInitialized, buildSpaceListFilters, debouncedSearch]);

  const handleLoadMore = useCallback(() => {
    if (!centerDetails?.name || isLoading || isLoadingMore || !hasMore) return;

    dispatch(
      fetchSpaceListData({
        filters: buildSpaceListFilters(),
        keyword: debouncedSearch.trim(),
        order_by: 'creation desc',
        page: currentPage + 1,
        pageSize,
        append: true,
      }),
    );
  }, [
    dispatch,
    centerDetails?.name,
    isLoading,
    isLoadingMore,
    hasMore,
    buildSpaceListFilters,
    debouncedSearch,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    if (!centerDetails?.name) return;
    const hasFetchedFloorsForCenter = Object.prototype.hasOwnProperty.call(
      floors?.data || {},
      centerDetails.name,
    );
    if (!hasFetchedFloorsForCenter) {
      dispatch(fetchFloors(centerDetails.name));
    }
  }, [centerDetails?.name, dispatch, floors?.data]);

  const handleDeleteClick = (id) => {
    setSelectedSpaceId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedSpaceId) {
      setIsDeleting(true);
      try {
        await dispatch(deleteCenterSpaceThunk(selectedSpaceId)).unwrap();
        getData();
        setDeleteModalOpen(false);
        setSelectedSpaceId(null);
      } catch (error) {
        console.error('Error deleting space:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleFiltersChange = (newFilters) => {
    userAdjustedFiltersSinceMountRef.current = true;
    setAppliedFilters(newFilters);
  };

  const handleClearAllFilters = (e) => {
    e.stopPropagation();
    userAdjustedFiltersSinceMountRef.current = true;
    setAppliedFilters({});
    setFilterCount(0);
    setIsFilterDropdownOpen(false);
  };

  const openCreateSpaceModal = useCallback(() => {
    if (userAdjustedFiltersSinceMountRef.current) {
      setCreateModalFilterPrefill(buildSingleOptionPrefillFromFilters(appliedFilters));
    } else {
      setCreateModalFilterPrefill(null);
    }
    setOpen(true);
  }, [appliedFilters]);

  const handleCreateSpaceOpenChange = useCallback((next) => {
    setOpen(next);
    if (!next) setCreateModalFilterPrefill(null);
  }, []);

  const hasActiveQuery = useMemo(() => {
    if (debouncedSearch.trim()) return true;
    if (appliedFilters.floor?.length) return true;
    if (appliedFilters.spaceType?.length) return true;
    if (appliedFilters.status?.length) return true;
    if (appliedFilters.seats > 0) return true;
    return false;
  }, [debouncedSearch, appliedFilters]);

  useEffect(() => {
    if (!centerDetails?.name) return;
    getData();
  }, [centerDetails?.name, getData]);

  useEffect(() => {
    return () => {
      dispatch(resetSpaceList());
    };
  }, [dispatch]);

  const data = useMemo(() => {
    // Check if spaceData is an array or an object with a data property (Frappe response)
    const list = Array.isArray(spaceData)
      ? spaceData
      : Array.isArray(spaceData?.data)
        ? spaceData.data
        : [];

    return list.map((item, index) => {
      // Handle both transformed data (from spaceSlice) and raw API response
      const spaceName = item.spaceName || item.inventory_name || item.name || '--';
      const spaceId = item.id || item.name || index;
      const spaceType = item.spaceType || item.inventory_type || '--';
      const isResourceType = String(spaceType).trim() === 'Resource';
      const seatValue = isResourceType
        ? (item.pax ?? item.totalSeats ?? item.total_seats ?? item.no_of_seats ?? 0)
        : (item.totalSeats ?? item.total_seats ?? item.no_of_seats ?? 0);

      return {
        id: spaceId,
        name: spaceName,
        floor: item.floor || '--',
        type: spaceType,
        status: item.status || '--',
        seats: seatValue,
        cost: item.seatRate || item.expected_per_seat_cost || 0,
        _original: item,
        bookable: item.bookable,
      };
    });
  }, [spaceData]);

  const filteredData = useMemo(() => {
    let result = data || [];

    // Client-side filtering for seats
    if (appliedFilters.seats > 0) {
      result = result.filter((item) => (item.seats || 0) <= appliedFilters.seats);
    }

    const floorFilterValues = resolveFloorFilterValues(appliedFilters.floor);
    if (floorFilterValues.length > 0) {
      result = result.filter((item) => floorFilterValues.includes(item.floor));
    }

    // Client-side filtering for space type
    if (appliedFilters.spaceType && appliedFilters.spaceType.length > 0) {
      result = result.filter((item) => appliedFilters.spaceType.includes(item.type));
    }

    // Client-side filtering for status
    if (appliedFilters.status && appliedFilters.status.length > 0) {
      result = result.filter((item) => appliedFilters.status.includes(item.status));
    }

    return result;
  }, [data, appliedFilters, resolveFloorFilterValues]);

  useLayoutEffect(() => {
    const next = tableWrapperRef.current ? findScrollableParent(tableWrapperRef.current) : null;
    setScrollContainerEl(next || null);
  }, [filteredData.length, isLoading, isLoadingMore, toolbarSegment]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore || isLoading,
    threshold: 200,
    scrollContainer: scrollContainerEl,
    enabled: toolbarSegment === 'grid' && Boolean(scrollContainerEl && hasMore),
  });

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        label: 'Name',
        enableHiding: false,
        cell: (info) => (
          <Tooltip.Root size='xsmall'>
            <Tooltip.Trigger asChild>
              <div className='flex items-center gap-0.5 '>
                <span className='paragraph-small block max-w-[440px] whitespace-nowrap overflow-hidden text-ellipsis text-text-sub-500'>
                  {info.getValue() || '--'}
                </span>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content side='bottom'>{info.getValue() || '--'}</Tooltip.Content>
          </Tooltip.Root>
        ),
      },
      {
        id: 'floor',
        accessorKey: 'floor',
        header: 'Floor',
        label: 'Floor',
        cell: (info) => (
          <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
            {info.getValue()}
          </span>
        ),
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: 'Space Type',
        label: 'Space Type',
        cell: (info) => {
          const badge = getSpaceTypeBadge(info.getValue());
          return (
            <Badge.Root variant='light' color={badge.color} className='whitespace-nowrap'>
              {badge.label}
            </Badge.Root>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        label: 'Status',
        cell: (info) => {
          const row = info.row.original;
          const value = info.getValue();
          const statusColorRaw = row.status_color || row.statusColor;
          if (hasStatusBadgeColor(statusColorRaw)) {
            return (
              <StatusColorPill
                value={value || '—'}
                color={statusColorRaw}
                className='max-w-[140px]'
              />
            );
          }
          const badge = getSpaceStatusBadge(info.getValue());
          return (
            <Badge.Root variant='light' color={badge.color} className='whitespace-nowrap'>
              {badge.label}
            </Badge.Root>
          );
        },
      },
      {
        id: 'seats',
        accessorKey: 'seats',
        header: 'Seats',
        label: 'Seats',
        cell: (info) => (
          <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
            {info.getValue()}
          </span>
        ),
      },
      {
        id: 'bookable',
        accessorKey: 'bookable',
        header: 'Bookable',
        label: 'Bookable',
        cell: ({ row }) => {
          const spaceId = row.original.id;
          const spaceType = String(row.original.type || '').trim();
          const isResource = spaceType === 'Resource';
          const bookableVal = row.original.bookable;
          const isBookable = bookableVal === 'Yes' || bookableVal === true;
          return (
            <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
              {isResource && (
                <Switch.Root
                  checked={isBookable}
                  onCheckedChange={(checked) => {
                    dispatch(
                      updateSpaceField({
                        spaceId,
                        fieldname: 'bookable',
                        value: checked ? 'Yes' : 'No',
                      }),
                    );
                  }}
                />
              )}
              <span className='paragraph-small text-text-sub-500'>
                {bookableVal === 'Yes' || bookableVal === true
                  ? 'Yes'
                  : bookableVal === 'No' || bookableVal === false
                    ? 'No'
                    : '--'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'cost',
        accessorKey: 'cost',
        header: 'Cost/Seat',
        label: 'Cost/Seat',
        cell: (info) => (
          <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
            {Number(info.getValue() || 0).toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 0,
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const isAvailable = String(row.original.status).toLowerCase() === 'available';
          const isResource = ['resource', 'resources'].includes(
            String(row.original.type || '')
              .toLowerCase()
              .trim(),
          );
          return (
            <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
              {isAvailable && !isResource && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='ghost'
                      size='medium'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAllocateClick(row.original._original);
                      }}
                      aria-label='Allocate client'
                      className='inline-flex items-center justify-center rounded-full text-text-sub-500 hover:text-primary-base transition-colors duration-200'
                    >
                      <Button.Icon as={RiAddLine} />
                    </Button.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>Allocate Client</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              )}
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='medium'
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/spaces/${row.original.id}`);
                }}
                aria-label='View space details'
              >
                <Button.Icon as={RiPencilLine} />
              </Button.Root>
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='medium'
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(row.original.id);
                }}
                aria-label='Delete space'
              >
                <Button.Icon as={RiDeleteBinLine} />
              </Button.Root>
            </div>
          );
        },
      },
    ],
    [navigate, handleAllocateClick],
  );

  const persistSpaceColumnPrefs = useCallback(
    async (payload) => persistSpaceViewColumns(CENTER_VIEW_SPACE_TABLE_ID, payload),
    [],
  );

  const readSpaceColumnPrefs = useCallback(async () => {
    return readSpaceViewColumns(CENTER_VIEW_SPACE_TABLE_ID);
  }, []);

  const columnConfig = useColumnConfig(
    CENTER_VIEW_SPACE_TABLE_ID,
    columns,
    persistSpaceColumnPrefs,
    readSpaceColumnPrefs,
    { autoSave: true, debounce: 300 },
  );

  const table = useReactTable({
    data: filteredData,
    columns: columnConfig.visibleColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (tableRef) {
    tableRef.current = { columnConfigHook: columnConfig };
  }

  return (
    <>
      <div className='w-full h-full  justify-center gap-[20px]'>
        {isLoading && !isLoadingMore && filteredData.length === 0 ? (
          <div className='w-full h-full flex items-center justify-center p-10'>
            <div className='text-paragraph-md text-text-sub-500'>Loading...</div>
          </div>
        ) : (
          <CenterViewCommonLayout
            title={toolbarSegment === 'list' ? 'Layout' : 'Search Spaces'}
            showSearch={toolbarSegment === 'grid'}
            showButton
            buttonName={toolbarSegment === 'list' ? 'Add Layout' : 'Add Space'}
            onButtonClick={() => {
              if (toolbarSegment === 'list') {
                setOpenAddLayoutModal(true);
              } else {
                openCreateSpaceModal();
              }
            }}
            headerActions={
              <div className='flex w-full items-center gap-3'>
                <ButtonGroup.Root>
                  <ButtonGroup.Item
                    type='button'
                    aria-label='Spaces list view'
                    title='Spaces'
                    data-state={toolbarSegment === 'grid' ? 'on' : 'off'}
                    onClick={() => setToolbarSegmentFromUrl('grid')}
                    className='data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon as={RiListCheck} />
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    type='button'
                    aria-label='Floor layout view'
                    title='Layout'
                    data-state={toolbarSegment === 'list' ? 'on' : 'off'}
                    onClick={() => setToolbarSegmentFromUrl('list')}
                    className='data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon as={RiLayoutMasonryLine} />
                  </ButtonGroup.Item>
                </ButtonGroup.Root>

                {toolbarSegment === 'grid' ? (
                  <>
                    <Popover.Root
                      open={isFilterDropdownOpen}
                      onOpenChange={(v) => {
                        const wasOpen = isFilterDropdownOpen;
                        setIsFilterDropdownOpen(v);
                        if (wasOpen && !v && filterDropdownRef.current) {
                          filterDropdownRef.current.handleClose();
                        }
                      }}
                    >
                      <Filter.TriggerButton
                        filterCount={filterCount}
                        onClear={handleClearAllFilters}
                        tooltipContent='Filter'
                      />
                      <SpaceCenterFilterDropdown
                        ref={filterDropdownRef}
                        open={isFilterDropdownOpen}
                        setFilterCount={setFilterCount}
                        onFiltersChange={handleFiltersChange}
                        appliedFilters={appliedFilters}
                        floorOptions={floorOptions}
                        // maxSeats={maxSeats}
                      />
                    </Popover.Root>

                    <ColumnManagerDropdown
                      open={isColumnManagerOpen}
                      onOpenChange={setIsColumnManagerOpen}
                      config={columnConfig}
                      tooltipContent={<p>Column Manager</p>}
                      trigger={
                        <Button.Root variant='neutral' mode='stroke' size='small'>
                          <Button.Icon as={RiLayoutColumnLine} />
                        </Button.Root>
                      }
                    />
                  </>
                ) : null}
              </div>
            }
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          >
            {toolbarSegment === 'list' ? (
              <CenterViewLayout
                layouts={layoutListFromFloors}
                isLoading={false}
                error={null}
                centerId={centerDetails?.name || ''}
              />
            ) : filteredData.length > 0 ? (
              <div
                ref={tableWrapperRef}
                className='w-full border-stroke-soft-200 rounded-lg border'
              >
                <Table.Root variant={tableVariant}>
                  <Table.Header>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <Table.Row key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const isAction = header.column.id === 'actions';
                          return (
                            <Table.Head
                              key={header.id}
                              className={
                                isAction
                                  ? 'sticky right-0 top-0 z-10 bg-bg-weak-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]'
                                  : 'text-left label-small text-text-sub-600 font-medium whitespace-nowrap'
                              }
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </Table.Head>
                          );
                        })}
                      </Table.Row>
                    ))}
                  </Table.Header>
                  <Table.Body>
                    {table.getRowModel().rows.map((row, index) => {
                      const isLastRow = index === table.getRowModel().rows.length - 1;
                      return (
                        <Table.Row
                          key={row.id}
                          className={`cursor-pointer group/row ${isLastRow ? 'border-b-0' : 'border-b border-stroke-soft-200'} hover:bg-bg-weak-50 transition-colors`}
                          onClick={() => navigate(`/spaces/${row.original.id}`)}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const isAction = cell.column.id === 'actions';
                            return (
                              <Table.Cell
                                key={cell.id}
                                className={
                                  isAction
                                    ? 'sticky right-0 z-10 bg-white group-hover/row:bg-bg-weak-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]'
                                    : ''
                                }
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </Table.Cell>
                            );
                          })}
                        </Table.Row>
                      );
                    })}
                    {hasMore ? (
                      <Table.Row ref={sentinelRef} data-scroll-sentinel>
                        <Table.Cell
                          colSpan={columnConfig.visibleColumns.length}
                          className='h-1 p-0'
                        />
                      </Table.Row>
                    ) : null}
                    {isLoadingMore ? (
                      <Table.Row>
                        <Table.Cell
                          colSpan={columnConfig.visibleColumns.length}
                          className='py-4 text-center'
                        >
                          <span className='text-paragraph-sm text-text-sub-600'>
                            Loading more spaces...
                          </span>
                        </Table.Cell>
                      </Table.Row>
                    ) : null}
                  </Table.Body>
                </Table.Root>
              </div>
            ) : hasActiveQuery ? (
              <div className='w-full flex flex-col items-center justify-center gap-3 py-16 px-4'>
                <span className='label-medium text-[var(--color-text-soft-400)] text-center'>
                  No record for the selected filter option.
                </span>
                {canWrite && (
                  <Button.Root
                    variant='neutral'
                    onClick={openCreateSpaceModal}
                    mode='stroke'
                    size='small'
                    className='gap-2'
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Space
                  </Button.Root>
                )}
              </div>
            ) : (
              <div className='w-full flex flex-col items-center justify-center gap-[20px] py-10'>
                <img className='object-contain' src={emptyState} alt='no data' />
                <span className='label-medium text-[var(--color-text-soft-400)] text-center'>
                  No spaces found. Start by adding one.
                </span>
                {canWrite && (
                  <Button.Root
                    variant='neutral'
                    onClick={openCreateSpaceModal}
                    mode='stroke'
                    size='small'
                    className='gap-2'
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Space
                  </Button.Root>
                )}
              </div>
            )}
          </CenterViewCommonLayout>
        )}
      </div>

      <Modal.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Modal.Content className='max-w-[450px]'>
          <Modal.Header
            variant='center'
            title='Remove Space?'
            description='Are you sure you want to remove this space? This action cannot be undone.'
            icon={
              <span className='p-2 bg-warning-base/10 rounded-lg'>
                <RiErrorWarningLine size={24} className='text-warning-base' />
              </span>
            }
          />
          <Modal.Footer>
            <Button.Root
              variant='neutral'
              onClick={() => setDeleteModalOpen(false)}
              mode='stroke'
              size='small'
              className='w-full'
              disabled={isDeleting}
            >
              Cancel
            </Button.Root>
            <Button.Root
              variant='primary'
              onClick={handleConfirmDelete}
              mode='filled'
              size='small'
              className='w-full'
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                  Removing...
                </span>
              ) : (
                'Remove'
              )}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* <EditSpaceModal
        isOpen={editModalOpen}
        handleOpenChange={setEditModalOpen}
        handleSave={handleSaveEdit}
        spaceData={editingSpace}
        allSpaces={data}
        isLoading={false}
      /> */}

      <CenterViewAddLayoutModal
        open={openAddLayoutModal}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isAddingLayout) return;
          setOpenAddLayoutModal(nextOpen);
          if (!nextOpen) {
            setPendingLayoutFloorRef('');
            setIsAddingLayout(false);
          }
        }}
        floorOptions={floorOptionsWithoutLayout}
        isFloorsLoading={
          Array.isArray(centerDetails?.floor_details) && centerDetails.floor_details.length > 0
            ? false
            : floors?.status === 'loading'
        }
        isSaving={isAddingLayout}
        onContinueToAnnotate={null}
        onSave={async ({ floor: floorRowRef, file }) => {
          if (!centerDetails?.name || !floorRowRef || !file || isAddingLayout) return;
          const floorRef = String(floorRowRef).trim();
          setIsAddingLayout(true);
          setPendingLayoutFloorRef(floorRef);
          try {
            await dispatch(
              editFloorWithFilesThunk({
                floor_ref: floorRef,
                file,
              }),
            ).unwrap();
            await dispatch(getCenterDetailsThunk(centerDetails.name)).unwrap();
          } catch (error) {
            setPendingLayoutFloorRef('');
            setIsAddingLayout(false);
            showErrorToast(error, { defaultMessage: 'Failed to save layout image.' });
          }
        }}
      />

      <CreateNewSpaceModal
        centerDetails={centerDetails}
        disabledCenter={true}
        open={open}
        setOpen={handleCreateSpaceOpenChange}
        initialFloorId={createModalFilterPrefill?.floor}
        initialSpaceType={createModalFilterPrefill?.spaceType}
        initialStatus={createModalFilterPrefill?.status}
        onSuccess={() => {
          setCreateModalFilterPrefill(null);
          getData();
          setSearchValue('');
        }}
      />

      {spaceToAllocate && (
        <AllocatedSpaceModal
          isOpen={isAllocateModalOpen}
          onOpenChange={setIsAllocateModalOpen}
          spaceData={spaceToAllocate}
          clientsList={clientsList}
          onAllocateSuccess={() => {
            getData();
          }}
        />
      )}
    </>
  );
};

export default CenterViewSpace;
