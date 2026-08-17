import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  buildFrozenColumnPinning,
  getFrozenHeaderTableProps,
  getFrozenLeftColumnExtras,
  getFrozenRootTableProps,
  getFrozenTanStackColumnProp,
  getFrozenWrapperClassName,
} from '@/lib/frozen-table-columns';
import { findScrollableParent } from '@/components/event-management/event-participants-utils';
import { RiArrowRightSLine, RiCheckLine, RiCloseLine, RiSearchLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { useDispatch, useSelector } from 'react-redux';
import emptyState from '@/assets/images/empty-state.png';
import { useDebounce } from '@/hooks/use-debounce';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { fetchClientOpexSubCategoryMatrix, fetchOpexCenterOptions } from '@/redux/opexSlice';

const PINNED_CENTER_COLUMN_ID = 'center';
// ---------------------------------------------------------------------------
// Settings > Opex Categories > Configure tab — filter dropdown persistence
// ---------------------------------------------------------------------------
// `filters` is the applied state that drives fetches; `localFilters` is the
// staging buffer that the popover edits and commits on close. Only `filters`
// is persisted — that way refresh restores the result set, while staged-but-
// not-applied edits are intentionally discarded across sessions.
const OPEX_CONFIGURE_FILTERS_STORAGE_KEY = 'settings-opex-configure-view-filter-dropdown';
const OPEX_CONFIGURE_FILTER_KEYS = ['center'];
const DEFAULT_OPEX_CONFIGURE_FILTERS = Object.freeze({ center: [] });

const trimOpexConfigureList = (values) =>
  Array.isArray(values) ? values.map((v) => String(v).trim()).filter(Boolean) : [];

const mergeStoredOpexConfigureFilters = (stored) => {
  const merged = { ...DEFAULT_OPEX_CONFIGURE_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of OPEX_CONFIGURE_FILTER_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimOpexConfigureList(stored[key]);
  }
  return merged;
};

const ConfigureClientOpex = ({ slotBeforeToolbar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('center');
  const [persistedFilters, setFilters] = usePersistedFilters({
    storageKey: OPEX_CONFIGURE_FILTERS_STORAGE_KEY,
    defaultFilters: DEFAULT_OPEX_CONFIGURE_FILTERS,
    persistTrimStringArrays: true,
  });
  const filters = useMemo(
    () => mergeStoredOpexConfigureFilters(persistedFilters),
    [persistedFilters],
  );
  // Seed the popover staging buffer from the persisted (already hydrated)
  // value so the first time the popover opens it shows what's actually applied.
  const [localFilters, setLocalFilters] = useState(() => filters);
  const [filterSearchText, setFilterSearchText] = useState('');
  const dispatch = useDispatch();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const matrixState = useSelector((state) => state.opex.clientOpexMatrix || {});
  const centerOptionsState = useSelector((state) => state.opex.centerOptions || {});
  const matrixRowsRaw = matrixState.rows || [];
  const matrixSubcategoriesFromState = matrixState.subcategories || [];
  const centerOptionsData = centerOptionsState.rows || [];
  const isMatrixLoading = matrixState.status === 'loading';
  const hasMore = Boolean(matrixState.hasMore);
  const isLoadingMore = Boolean(matrixState.isLoadingMore);
  const currentPage = matrixState.page || 1;

  const tableRows = useMemo(
    () =>
      (matrixRowsRaw || []).map((r) => ({
        center: r.center,
        center_name: r.center_name || r.center,
        categories: r.sub_categories || {},
      })),
    [matrixRowsRaw],
  );

  const opexSubCategoryNames = useMemo(() => {
    if (Array.isArray(matrixSubcategoriesFromState) && matrixSubcategoriesFromState.length > 0)
      return matrixSubcategoriesFromState;
    const setNames = new Set();
    tableRows.forEach((row) => Object.keys(row.categories || {}).forEach((n) => setNames.add(n)));
    return [...setNames];
  }, [matrixSubcategoriesFromState, tableRows]);

  const centerFilterOptions = useMemo(() => {
    return centerOptionsData;
  }, [centerOptionsData]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    if (searchTerm !== debouncedSearchTerm) return;
    dispatch(
      fetchClientOpexSubCategoryMatrix({
        keyword: debouncedSearchTerm,
        center: filters.center,
        page: currentPage + 1,
        pageSize: 20,
        append: true,
      }),
    );
  }, [
    dispatch,
    searchTerm,
    debouncedSearchTerm,
    filters.center,
    currentPage,
    isLoadingMore,
    hasMore,
  ]);

  const tableAreaRef = useRef(null);
  const [scrollContainerEl, setScrollContainerEl] = useState(null);

  useEffect(() => {
    const next = tableAreaRef.current ? findScrollableParent(tableAreaRef.current) : null;
    setScrollContainerEl(next);
  }, [matrixRowsRaw.length, isMatrixLoading, isLoadingMore]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 200,
    scrollContainer: scrollContainerEl,
    enabled: Boolean(scrollContainerEl && debouncedSearchTerm === searchTerm),
  });

  // Apply localFilters to filters when filterOpen closes
  useEffect(() => {
    if (!filterOpen) {
      setFilters(localFilters);
    } else {
      setLocalFilters(filters);
    }
  }, [filterOpen]);

  // fetch matrix on mount / search / filters change
  useEffect(() => {
    dispatch(fetchOpexCenterOptions());
  }, [dispatch]);

  useEffect(() => {
    if (debouncedSearchTerm || filters.center.length > 0) {
      dispatch(
        fetchClientOpexSubCategoryMatrix({
          keyword: debouncedSearchTerm,
          center: filters.center,
          page: 1,
          pageSize: 20,
          append: false,
        }),
      );
    } else {
      dispatch(
        fetchClientOpexSubCategoryMatrix({
          keyword: '',
          center: [],
          page: 1,
          pageSize: 20,
          append: false,
        }),
      );
    }
  }, [dispatch, debouncedSearchTerm, filters.center]);

  // opexSubCategoryNames and centerFilterOptions computed above from matrix state

  const filteredFilterOptions = useMemo(() => {
    if (!filterSearchText) return centerFilterOptions;
    return centerFilterOptions.filter((option) =>
      option.label.toLowerCase().includes(filterSearchText.toLowerCase()),
    );
  }, [centerFilterOptions, filterSearchText]);

  const filteredRows = useMemo(() => {
    if (filters.center.length === 0) return tableRows;
    return tableRows.filter((row) => filters.center.includes(row.center));
  }, [tableRows, filters.center]);

  const opexConfigurationTableColumns = useMemo(() => {
    const centerColumn = {
      id: PINNED_CENTER_COLUMN_ID,
      accessorKey: 'center_name',
      header: () => <span>Center</span>,
      ...getFrozenLeftColumnExtras(true),
      cell: ({ row }) => {
        const name = row.original.center_name ?? '-';
        return (
          <Tooltip.Root size='xsmall'>
            <Tooltip.Trigger asChild>
              <span className='block max-w-[280px] label-small text-[var(--color-text-main-900)] whitespace-nowrap overflow-hidden text-ellipsis'>
                {name}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='bottom'>{name}</Tooltip.Content>
          </Tooltip.Root>
        );
      },
      meta: {
        headClassName: 'min-w-[180px] whitespace-nowrap',
        cellClassName: 'min-w-[180px] max-w-[280px] whitespace-nowrap',
      },
      enableSorting: false,
    };

    const categoryColumns = opexSubCategoryNames.map((categoryName) => ({
      id: `category-${categoryName}`,
      accessorKey: `categories.${categoryName}`,
      accessorFn: (row) => row.categories?.[categoryName],
      header: () => (
        <span className='whitespace-nowrap' title={categoryName}>
          {categoryName}
        </span>
      ),
      cell: ({ row }) => {
        const value = row.original.categories?.[categoryName];
        const isActive = value === 1;
        return (
          <div className='w-full flex items-center justify-center'>
            {isActive ? (
              <RiCheckLine size={18} className='text-success-base shrink-0' />
            ) : (
              <RiCloseLine size={18} className='text-error-base shrink-0' />
            )}
          </div>
        );
      },
      meta: {
        headClassName: 'min-w-[120px] whitespace-nowrap text-center',
        cellClassName: 'min-w-[120px] text-center',
      },
      enableSorting: false,
    }));

    return [centerColumn, ...categoryColumns];
  }, [opexSubCategoryNames]);

  const configurationTable = useReactTable({
    data: filteredRows,
    columns: opexConfigurationTableColumns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnPinning: true,
    state: {
      columnPinning:
        buildFrozenColumnPinning({
          enabled: true,
          leftColumnId: PINNED_CENTER_COLUMN_ID,
          hideActionsColumn: true,
          columns: opexConfigurationTableColumns,
        }) ?? {},
    },
  });

  const handleFilterToggle = useCallback((value) => {
    setLocalFilters((previous) => {
      const currentList = previous.center || [];
      const isSelected = currentList.includes(value);
      const newValues = isSelected
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];
      return { ...previous, center: newValues };
    });
  }, []);

  const handleFilterClear = useCallback(() => {
    setLocalFilters({ center: [] });
    setFilterSearchText('');
  }, []);

  const filterCount = filters.center.length;

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col gap-5'>
      <div className='flex w-full shrink-0 items-center justify-between gap-[16px]'>
        {slotBeforeToolbar}
        <div className='flex items-center justify-end gap-3'>
          <div className='w-64'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  type='text'
                  placeholder='Search here...'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <Popover.Root open={filterOpen} onOpenChange={setFilterOpen}>
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleFilterClear}
              ariaLabel='Filter OPEX Configure'
            />

            <Filter.Root>
              <Filter.Header title='FILTERS' onClear={handleFilterClear} />

              <Filter.Body>
                <Filter.Sidebar width='180px'>
                  <TabMenuVertical.Root value={activeFilterTab} onValueChange={setActiveFilterTab}>
                    <TabMenuVertical.List className='p-2 border-r-0'>
                      <TabMenuVertical.Trigger
                        className='w-full flex items-center justify-between'
                        value='center'
                      >
                        Center
                        {localFilters.center.length > 0 ? (
                          <Badge.Root
                            size='medium'
                            variant='filled'
                            className='shrink-0 rounded-full bg-black text-white'
                          >
                            {localFilters.center.length}
                          </Badge.Root>
                        ) : (
                          <RiArrowRightSLine size={16} />
                        )}
                      </TabMenuVertical.Trigger>
                    </TabMenuVertical.List>
                  </TabMenuVertical.Root>
                </Filter.Sidebar>

                <Filter.Content width='300px'>
                  <Filter.List
                    options={filteredFilterOptions}
                    selectedValues={localFilters.center}
                    onToggle={handleFilterToggle}
                    searchValue={filterSearchText}
                    onSearchChange={setFilterSearchText}
                  />
                </Filter.Content>
              </Filter.Body>
            </Filter.Root>
          </Popover.Root>
        </div>
      </div>
      <div ref={tableAreaRef} className={getFrozenWrapperClassName(true)}>
        {isMatrixLoading ? (
          <div className='w-full min-h-[160px]' />
        ) : matrixRowsRaw.length > 0 ? (
          <Table.Root
            variant='compact'
            {...getFrozenRootTableProps(true, { tableInstance: configurationTable })}
          >
            <Table.Header {...getFrozenHeaderTableProps(true)}>
              {configurationTable.getHeaderGroups().map((hg) => (
                <Table.Row key={hg.id}>
                  {hg.headers.map((header) => (
                    <Table.Head
                      key={header.id}
                      {...getFrozenTanStackColumnProp(true, header.column)}
                      className={`whitespace-nowrap ${header.column.columnDef.meta?.headClassName || ''}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>
            <Table.Body>
              {configurationTable.getRowModel().rows.map((row, index, array) => (
                <React.Fragment key={row.id}>
                  <Table.Row>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        {...getFrozenTanStackColumnProp(true, cell.column)}
                        className={`text-text-sub-500 text-paragraph-sm ${cell.column.columnDef.meta?.cellClassName || ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext()) ||
                          cell.renderValue()}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {index < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
              {hasMore && (
                <Table.Row ref={sentinelRef}>
                  <Table.Cell
                    colSpan={configurationTable.getHeaderGroups()[0]?.headers.length || 1}
                    className='h-1 p-0'
                  />
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        ) : (
          <div className='w-full flex flex-col items-center justify-center gap-4 py-10'>
            <img className='object-contain' src={emptyState} alt='no results' />
            <span className='label-medium text-[var(--color-text-soft-400)]'>
              No results found for your search.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigureClientOpex;
