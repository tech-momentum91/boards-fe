import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import {
  EMPTY_STATES,
  PAGE_SIZE,
  SCROLL_LOAD_THRESHOLD,
  DEFAULT_TEAM_DROPDOWN_FILTERS,
  mergeStoredTeamDropdownFilters,
  buildTeamListApiFiltersFromApplied,
} from '@/components/team-management/constants';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import { mergeNavbarIntoLocalFilters } from '@/utils/combined-scope-filter';
import { RiErrorWarningLine, RiUserLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import * as Tooltip from '@/components/ui/tooltip';
import { fetchTeamManagementData } from '@/redux/teamManagementSlice';
import { TeamStats, TeamToolbar } from '@/components/team-management';
import { useDispatch, useSelector } from 'react-redux';
import { showErrorToast } from '@/utils/error-utils';
import { useNavigate } from 'react-router-dom';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

// sessionStorage key for the Centers tab toolbar filter dropdown.
// Kept distinct from core/support so each tab persists its own selection
// (mirrors the Center module's `centers-management-view-filter-dropdown` key).
const TEAM_CENTERS_FILTER_STORAGE_KEY = 'team-management-centers-filter-dropdown';

const MAX_VISIBLE_USER_BADGES = 2;
const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

/** Find the nearest scrollable parent (overflow-y: auto | scroll). PageLayout scrolls a div, not the window. */
function findScrollableParent(el) {
  let p = el?.parentElement;
  while (p) {
    const style = getComputedStyle(p);
    const oy = style.overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return p;
    p = p.parentElement;
  }
  return null;
}

const UserBadgesWithOverflow = ({ items = [], maxVisible = MAX_VISIBLE_USER_BADGES }) => {
  const list = Array.isArray(items) ? items : [];
  const visible = list.slice(0, maxVisible);
  const remaining = list.slice(maxVisible);
  const remainingCount = remaining.length;

  return (
    <div className='flex items-center gap-1 whitespace-nowrap'>
      {visible.map((item, index) => {
        const name = item?.name ?? item ?? '--';
        return (
          <div key={item?.id ?? index}>
            <Badge.Root size='medium' variant='stroke' color='gray'>
              <Badge.Icon>
                <Avatar.Image src={item?.image ?? DEFAULT_AVATAR} alt={name} />
              </Badge.Icon>
              <Tooltip.Root>
                <Tooltip.Trigger>{name.split(' ')[0]}</Tooltip.Trigger>
                <Tooltip.Content>{name}</Tooltip.Content>
              </Tooltip.Root>
            </Badge.Root>
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div className='flex items-center justify-center'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Badge.Root
                size='medium'
                variant='stroke'
                color='gray'
                className=' hover:cursor-pointer cursor-default'
              >
                +{remainingCount}
              </Badge.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div className='flex flex-col gap-0.5'>
                {remaining.map((item, index) => (
                  <span key={item?.id ?? index}>{item?.name ?? item ?? '--'}</span>
                ))}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      )}
    </div>
  );
};

const TeamManagementCenters = ({
  teamMembers = [],
  isLoading = false,
  error = null,
  onRetry,
  onRowSelect,
  onEdit: _onEdit,
  onDelete: _onDelete,
  onAddMember,
  onExport,
  tableVariant,
  onTableVariantToggle,
  widgetVisibility,
  WIDGET_KEYS,
  activeTab,
  noCenters = false,
  headerScope,
  centerAccessLoading = false,
}) => {
  const [filters, setFilters] = useState({ search: '' });
  const [sorting, setSorting] = useState([]);
  const [groupBy, setGroupBy] = useState('');
  // Hydrate the toolbar dropdown selection from sessionStorage so the user's
  // last-applied centre/status/role filters survive tab switches and reloads.
  // Mirrors the Centers module pattern (centers-page.jsx → usePersistedFilters).
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...DEFAULT_TEAM_DROPDOWN_FILTERS,
  }));
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: TEAM_CENTERS_FILTER_STORAGE_KEY,
    defaultFilters: DEFAULT_TEAM_DROPDOWN_FILTERS,
  });
  const teamTableRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [localSorting, setLocalSorting] = useState(sorting);
  const debouncedKeyword = useDebounce(filters.search, 300);

  // 1) Initial hydration from sessionStorage → component state (one-shot).
  useEffect(() => {
    if (filtersInitialized) return;
    setAppliedFilters(mergeStoredTeamDropdownFilters(persistedFilters));
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized]);

  // 2) After hydration, mirror every change back into sessionStorage. Skip
  //    no-op writes by comparing the compact payload to what's already stored.
  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactFiltersForSessionStorage(
      appliedFilters,
      DEFAULT_TEAM_DROPDOWN_FILTERS,
      {},
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, filtersInitialized, persistedFilters, setPersistedFilters]);

  const centerScopeData = useSelector((state) => state.teamManagement.teamManagementData);
  const isActiveTab = activeTab === 'centers';

  const effectiveFilters = useMemo(
    () =>
      mergeNavbarIntoLocalFilters({
        localFilters: appliedFilters,
        navbarFilter: headerScope,
        unionFields: ['center'],
      }),
    [appliedFilters, headerScope],
  );

  const apiFilters = useMemo(
    () => buildTeamListApiFiltersFromApplied(effectiveFilters),
    [effectiveFilters],
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSupportTeamRedirect = useCallback(
    (roleLabel) => {
      if (!roleLabel) return;
      const params = new URLSearchParams();
      params.set('role', roleLabel);
      navigate(`/team-management/support_team?${params.toString()}`);
    },
    [navigate],
  );

  const buildOrderBy = useCallback((sortingState) => {
    let orderBy = 'creation desc';
    if (Array.isArray(sortingState) && sortingState.length > 0) {
      const sortField = sortingState[0].id;
      const sortOrder = sortingState[0].desc ? 'desc' : 'asc';
      const fieldMap = {
        center: 'center_name', // adjust backend field name if needed
        hk: 'HK',
        mst: 'MST',
        security: 'Security',
      };
      const backendField = fieldMap[sortField] || sortField;
      orderBy = `${backendField} ${sortOrder}`;
    }
    return orderBy;
  }, []);

  React.useEffect(() => {
    setLocalSorting(sorting);
  }, [sorting]);

  const handleFetchData = useCallback(
    async (options = {}) => {
      if (!isActiveTab || !filtersInitialized) return;
      if (centerAccessLoading || headerScope === undefined) return;
      try {
        await dispatch(
          fetchTeamManagementData({
            keyword: options.keyword ?? debouncedKeyword,
            filters: options.filters ?? apiFilters,
            page: options.page ?? 1,
            page_size: options.page_size ?? PAGE_SIZE,
            append: options.append ?? false,
            order_by: options.order_by,
            // ...(navbarFilter != null ? { navbar_filter: navbarFilter } : {}),
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error);
      }
    },
    [
      dispatch,
      debouncedKeyword,
      apiFilters,
      isActiveTab,
      filtersInitialized,
      headerScope,
      centerAccessLoading,
    ],
  );

  // Initial load, search (debounced), and sorting — only when Centers tab is active
  useEffect(() => {
    if (!isActiveTab || !filtersInitialized) return;
    if (centerAccessLoading || headerScope === undefined) return;
    const orderBy = buildOrderBy(sorting);
    handleFetchData({
      keyword: debouncedKeyword,
      filters: apiFilters,
      page: 1,
      append: false,
      order_by: orderBy,
    });
  }, [
    debouncedKeyword,
    apiFilters,
    isActiveTab,
    filtersInitialized,
    handleFetchData,
    buildOrderBy,
    sorting,
    headerScope,
    centerAccessLoading,
  ]);

  // Scroll pagination: load more when user scrolls near bottom (only when active tab).
  // Use the actual scroll container (PageLayout's overflow-y div), not window — window doesn't scroll here.
  const handleScroll = useCallback(
    (scrollElement) => {
      if (
        !isActiveTab ||
        !filtersInitialized ||
        centerAccessLoading ||
        headerScope === undefined ||
        centerScopeData.isLoadingMore ||
        !centerScopeData.hasMore
      )
        return;
      if (!scrollElement) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      if (scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD) {
        const orderBy = buildOrderBy(sorting);
        handleFetchData({
          keyword: debouncedKeyword,
          filters: apiFilters,
          page: (centerScopeData.page ?? 1) + 1,
          page_size: centerScopeData.pageSize ?? PAGE_SIZE,
          append: true,
          order_by: orderBy,
        });
      }
    },
    [
      isActiveTab,
      filtersInitialized,
      centerAccessLoading,
      headerScope,
      apiFilters,
      centerScopeData.hasMore,
      centerScopeData.isLoadingMore,
      centerScopeData.page,
      centerScopeData.pageSize,
      debouncedKeyword,
      handleFetchData,
      buildOrderBy,
      sorting,
    ],
  );

  useEffect(() => {
    if (!isActiveTab) return;
    const scrollEl = scrollContainerRef.current
      ? scrollContainerRef.current.querySelector('.overflow-auto')
      : null;
    if (!scrollEl) return;
    const onScroll = () => handleScroll(scrollEl);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [handleScroll, isActiveTab, centerScopeData.data, isLoading]);

  const handleSearchChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;

      setLocalSorting(newSorting);
      setSorting(newSorting);
    },
    [localSorting],
  );

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
  }, []);

  const handleFiltersChange = useCallback((filtersArray, filterValues) => {
    const nextAppliedFilters = filterValues || {};
    setAppliedFilters(nextAppliedFilters);
  }, []);

  // Determine context for empty states
  const context = useMemo(() => {
    // if (noCenters) return 'no_centers';
    const hasSearch = Boolean(filters.search);
    const hasFilters =
      appliedFilters.center?.length > 0 ||
      appliedFilters.status?.length > 0 ||
      appliedFilters.role?.length > 0;

    if (hasSearch || hasFilters) {
      return 'search';
    }

    return 'default';
  }, [filters, appliedFilters, noCenters]);

  // Column definitions for centers table
  const allColumnDefs = useMemo(() => {
    return [
      {
        id: 'center',
        accessorKey: 'center',
        columnLabel: 'Center',
        enableHiding: false,
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Center</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(sortState === 'asc')}
                aria-label={`Sort by Center ${sortState === 'asc' ? 'descending' : 'ascending'}`}
              >
                {Table.getSortingIcon(sortState)}
              </button>
            </div>
          );
        },
        cell: ({ row }) => (
          <Tooltip.Root size='xsmall'>
            <Tooltip.Trigger asChild>
              <span className='block min-w-0 w-full truncate text-paragraph-sm text-text-strong-950'>
                {row.original.center_name || '--'}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='bottom'>{row.original.center_name || '--'}</Tooltip.Content>
          </Tooltip.Root>
        ),
        meta: {
          columnClassName: 'w-[250px] min-w-[250px] max-w-[250px]',
          cellClassName: 'w-[250px] min-w-[250px] max-w-[250px]',
        },
        enableSorting: true,
      },
      {
        id: 'facilityTeam',
        accessorKey: 'facilityTeam',
        columnLabel: 'Facility Team',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Facility Team
              </span>
              {/* <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(sortState === 'asc')}
                aria-label={`Sort by Facility Team ${sortState === 'asc' ? 'descending' : 'ascending'}`}
              >
                {Table.getSortingIcon(sortState)}
              </button> */}
            </div>
          );
        },
        cell: ({ row }) => (
          <UserBadgesWithOverflow items={row?.original?.core_team?.['Facility Team'] ?? []} />
        ),
        enableSorting: true,
      },
      {
        id: 'crmTeam',
        accessorKey: 'crmTeam',
        columnLabel: 'CRM Team',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                CRM Team
              </span>
              {/* <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(sortState === 'asc')}
                aria-label={`Sort by CRM Team ${sortState === 'asc' ? 'descending' : 'ascending'}`}
              >
                {Table.getSortingIcon(sortState)}
              </button> */}
            </div>
          );
        },
        cell: ({ row }) => (
          <UserBadgesWithOverflow items={row?.original?.core_team?.['CRM Team'] ?? []} />
        ),
        enableSorting: true,
      },
      {
        id: 'zonalTeam',
        accessorKey: 'zonalTeam',
        columnLabel: 'Zonal Team',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Zonal Team
              </span>
              {/* <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(sortState === 'asc')}
                aria-label={`Sort by Zonal Team ${sortState === 'asc' ? 'descending' : 'ascending'}`}
              >
                {Table.getSortingIcon(sortState)}
              </button> */}
            </div>
          );
        },
        cell: ({ row }) => (
          <UserBadgesWithOverflow items={row?.original?.core_team?.['Zonal Team'] ?? []} />
        ),
        enableSorting: true,
      },

      {
        id: 'mst',
        accessorKey: 'mst',
        columnLabel: 'MST',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <button
              type='button'
              className='flex items-center gap-0.5 text-paragraph-sm whitespace-nowrap text-text-sub-600 hover:text-primary-base cursor-pointer'
              onClick={() => handleSupportTeamRedirect('MST')}
              aria-label='View MST in Support Team'
            >
              <span>MST</span>
            </button>
          );
        },
        cell: ({ row }) => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-strong-950'>
            {row.original.support_team?.['MST'] || 0}
          </span>
        ),
        enableSorting: true,
      },

      {
        id: 'hk',
        accessorKey: 'hk',
        columnLabel: 'HK',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <button
              type='button'
              className='flex items-center gap-0.5 text-paragraph-sm whitespace-nowrap text-text-sub-600 hover:text-primary-base cursor-pointer'
              onClick={() => handleSupportTeamRedirect('HK Staff')}
              aria-label='View HK Staff in Support Team'
            >
              <span>HK</span>
            </button>
          );
        },
        cell: ({ row }) => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-strong-950'>
            {row?.original?.support_team?.['Housekeeping'] || 0}
          </span>
        ),
        enableSorting: true,
      },

      {
        id: 'security',
        accessorKey: 'security',
        columnLabel: 'Security',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <button
              type='button'
              className='flex items-center gap-0.5 text-paragraph-sm whitespace-nowrap text-text-sub-600 hover:text-primary-base cursor-pointer'
              onClick={() => handleSupportTeamRedirect('Security')}
              aria-label='View Security in Support Team'
            >
              <span>Security</span>
            </button>
          );
        },
        cell: ({ row }) => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-strong-950'>
            {row.original?.support_team?.['Security'] || 0}
          </span>
        ),
        enableSorting: true,
      },
    ];
  }, [handleSupportTeamRedirect]);

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(allColumnDefs),
    [allColumnDefs],
  );

  const columnConfigHook = useColumnConfig(
    'team-management-centers-table',
    defaultColumnConfig,
    (cols) => Promise.resolve(cols),
    () => Promise.resolve(defaultColumnConfig),
    { autoSave: true, debounce: 300 },
  );

  React.useImperativeHandle(teamTableRef, () => ({
    columnConfigHook,
  }));

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
    [allColumnDefs, columnConfigHook.columns],
  );

  const table = useReactTable({
    data: centerScopeData?.data ?? [],
    columns: visibleDefs,
    state: { sorting: localSorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: true,
    manualSorting: true,
  });

  const hasRows = table.getRowModel().rows.length > 0;

  // Error state
  const renderError = () => {
    if (!error) return null;
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
        <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
          <RiErrorWarningLine className='size-6 text-error-base' />
        </div>
        <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Centers</h3>
        <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
          >
            Try Again
          </button>
        )}
      </div>
    );
  };

  // Empty state
  const renderEmpty = () => {
    if (isLoading || error) return null;
    if (hasRows) return null;

    const state = EMPTY_STATES[context] || EMPTY_STATES.default;
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
        <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
      </div>
    );
  };

  // Loading skeleton
  const renderSkeleton = () => {
    if (!isLoading || hasRows) return null;
    const skeletonRows = Array.from({ length: 6 }, (_, index) => index);
    return (
      <Table.Body spacing={8}>
        {skeletonRows.map((rowIndex, _, array) => (
          <React.Fragment key={`skeleton-row-${rowIndex}`}>
            <Table.Row>
              {visibleDefs.map((column) => (
                <Table.Cell key={column.id || column.accessorKey}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {rowIndex < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );
  };

  return (
    <div ref={scrollContainerRef} className='flex py-5 flex-col gap-6 flex-1 min-h-0'>
      <TeamToolbar
        filters={filters}
        onSearchChange={handleSearchChange}
        onAddMember={onAddMember}
        onExport={onExport}
        tableRef={teamTableRef}
        tableVariant={tableVariant}
        onTableVariantToggle={onTableVariantToggle}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
        onFiltersChange={handleFiltersChange}
        appliedFilters={appliedFilters}
        showFilter={false}
        showGroupBy={false}
        showColumnManager={false}
        showAddButton={false}
      />

      {error ? (
        renderError()
      ) : !isLoading && !hasRows ? (
        renderEmpty()
      ) : (
        <div className='flex-1 min-h-0 flex flex-col w-full'>
          <Table.Root
            variant={tableVariant}
            className='min-h-0 flex-1 overflow-auto'
            style={{ minWidth: 1000 }}
          >
            <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Head key={header.id} column={header.column}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>
            {isLoading && !hasRows ? (
              renderSkeleton()
            ) : (
              <Table.Body spacing={8}>
                {table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.original?.center_id ?? row.id}>
                    <Table.Row
                      className={cn('cursor-pointer')}
                      onClick={() => {
                        onRowSelect?.(row.original);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell key={cell.id} column={cell.column}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    <Table.RowDivider />
                  </React.Fragment>
                ))}
                {centerScopeData.isLoadingMore && (
                  <>
                    <Table.Row>
                      <Table.Cell
                        colSpan={visibleDefs.length}
                        className='text-paragraph-sm text-center text-text-sub-600 py-4'
                      >
                        Loading more…
                      </Table.Cell>
                    </Table.Row>
                    <Table.RowDivider />
                  </>
                )}
              </Table.Body>
            )}
          </Table.Root>
        </div>
      )}
    </div>
  );
};

export default TeamManagementCenters;
