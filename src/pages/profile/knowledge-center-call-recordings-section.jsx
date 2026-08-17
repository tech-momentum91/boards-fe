import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiAddLine, RiArrowRightSLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import EmptyIllustration from '@/components/ui/empty-illustration';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import KnowledgeCenterCallRecordingDrawer from '@/pages/profile/knowledge-center-call-recording-drawer';
import KnowledgeCenterCallRecordingViewDrawer from '@/pages/profile/knowledge-center-call-recording-view-drawer';
import KnowledgeCenterCallRecordingsCategorySidebar from '@/pages/profile/knowledge-center-call-recordings-category-sidebar';
import {
  ALL_CALL_TYPES,
  ALL_CENTERS,
  ALL_CLIENTS,
  CALL_RECORDING_DEFAULT_COLUMNS,
  CALL_RECORDING_TABLE_ID,
  CALL_TYPE_FILTER_OPTIONS,
  callRecordingCategoryLabelByValue,
  getAddCallRecordingDefaultCompany,
} from '@/pages/profile/knowledge-center-call-recordings-constants';
import { KNOWLEDGE_CENTER_ROOT } from '@/pages/profile/knowledge-center-paths';
import { CALL_RECORDING_LIST_MAX_PAGE_SIZE } from '@/api/knowledgeCenterCallRecording';
import {
  clearKnowledgeCenterCallRecordingListError,
  fetchKnowledgeCenterCallRecordingCategoryCounts,
  fetchKnowledgeCenterCallRecordingList,
  selectKnowledgeCenterCallRecordingCategoryCounts,
  selectKnowledgeCenterCallRecordingList,
} from '@/redux/knowledgeCenterCallRecordingSlice';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import { useColumnConfig } from '@/hooks/use-column-config';
import { apiEventDatetimeToIso, safeDisplayDateTime } from '@/utils/date-utils';

const LIST_SEARCH_DEBOUNCE_MS = 350;
const NOWRAP_CELL = 'paragraph-small whitespace-nowrap text-text-sub-600';

function CallRecordingTableTextCell({
  value,
  className,
  maxWidthClass = 'max-w-[220px]',
  strong = false,
}) {
  const display = value || '—';
  const textClass = cn(
    'overflow-hidden text-ellipsis whitespace-nowrap',
    maxWidthClass,
    strong ? 'paragraph-small font-medium text-text-strong-950' : NOWRAP_CELL,
    className,
  );

  const textEl = <p className={textClass}>{display}</p>;

  if (display === '—') {
    return textEl;
  }

  return (
    <Tooltip.Root size='xsmall'>
      <Tooltip.Trigger asChild>{textEl}</Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='bottom'>
        {display}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function formatCallDatetimeCell(value) {
  if (!value) return '—';
  const iso = apiEventDatetimeToIso(value);
  if (iso) {
    const formatted = safeDisplayDateTime(iso);
    return formatted || '—';
  }
  return safeDisplayDateTime(value) || String(value);
}

function formatDurationCell(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) {
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  return text || '—';
}

function formatTagsCell(value) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) {
    const labels = value
      .map((tag) => {
        if (typeof tag === 'string') return tag.trim();
        return String(tag?.tag ?? tag?.label ?? tag?.name ?? '').trim();
      })
      .filter(Boolean);
    return labels.length > 0 ? labels.join(', ') : '—';
  }
  const text = String(value).trim();
  return text || '—';
}

export default function KnowledgeCenterCallRecordingsSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    data: listRows,
    status: listStatus,
    error: listError,
  } = useSelector(selectKnowledgeCenterCallRecordingList);
  const categoryCounts = useSelector(selectKnowledgeCenterCallRecordingCategoryCounts);

  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);

  const [activeCategory, setActiveCategory] = useState('all');
  const [centerFilter, setCenterFilter] = useState(ALL_CENTERS);
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [callTypeFilter, setCallTypeFilter] = useState(ALL_CALL_TYPES);
  const [searchValue, setSearchValue] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [sorting, setSorting] = useState([]);

  const skipSearchDebounceOnce = useRef(true);

  const columnConfigHook = useColumnConfig(
    CALL_RECORDING_TABLE_ID,
    CALL_RECORDING_DEFAULT_COLUMNS,
    () => {},
    async () => [],
    { autoSave: true },
  );

  const handleCategoryChange = useCallback((nextCategory) => {
    setActiveCategory(nextCategory);
    setSearchValue('');
    skipSearchDebounceOnce.current = true;
  }, []);

  useEffect(() => {
    dispatch(fetchTicketDropdownData());
    dispatch(fetchCentersForClient(null));
  }, [dispatch]);

  /** Center/client/call type filters — shared by list and sidebar counts. */
  const scopeFilters = useMemo(() => {
    const filters = [];
    if (centerFilter && centerFilter !== ALL_CENTERS) {
      filters.push(['center', '=', centerFilter]);
    }
    if (clientFilter && clientFilter !== ALL_CLIENTS) {
      filters.push(['client', '=', clientFilter]);
    }
    if (callTypeFilter && callTypeFilter !== ALL_CALL_TYPES) {
      filters.push(['call_type', '=', callTypeFilter]);
    }
    return filters;
  }, [centerFilter, clientFilter, callTypeFilter]);

  const listFilters = useMemo(() => {
    const filters = [...scopeFilters];
    if (activeCategory !== 'all') {
      filters.push(['company', '=', activeCategory]);
    }
    return filters;
  }, [scopeFilters, activeCategory]);

  const refetchCategoryCounts = useCallback(() => {
    dispatch(
      fetchKnowledgeCenterCallRecordingCategoryCounts({
        filters: scopeFilters,
      }),
    );
  }, [dispatch, scopeFilters]);

  const refetchList = useCallback(() => {
    dispatch(
      fetchKnowledgeCenterCallRecordingList({
        filters: listFilters,
        keyword: searchValue.trim() || undefined,
        page: 1,
        pageSize: CALL_RECORDING_LIST_MAX_PAGE_SIZE,
        order_by: 'modified desc',
      }),
    );
  }, [dispatch, listFilters, searchValue]);

  useEffect(() => {
    refetchCategoryCounts();
  }, [refetchCategoryCounts]);

  useEffect(() => {
    const keyword = searchValue.trim() || undefined;
    const delay = skipSearchDebounceOnce.current ? 0 : LIST_SEARCH_DEBOUNCE_MS;
    skipSearchDebounceOnce.current = false;

    const requestId = window.setTimeout(() => {
      dispatch(
        fetchKnowledgeCenterCallRecordingList({
          filters: listFilters,
          keyword,
          page: 1,
          pageSize: CALL_RECORDING_LIST_MAX_PAGE_SIZE,
          order_by: 'modified desc',
        }),
      );
    }, delay);

    return () => window.clearTimeout(requestId);
  }, [dispatch, listFilters, searchValue]);

  const countForCategoryItem = useCallback(
    ({ value }) => {
      if (value === 'all') return categoryCounts.total;
      return categoryCounts.byCompany[value] ?? 0;
    },
    [categoryCounts.byCompany, categoryCounts.total],
  );

  const clientOptions = useMemo(() => {
    const raw = ticketDropdown.data?.clients || ticketDropdown.data?.customers || [];
    return Array.isArray(raw) ? raw : [];
  }, [ticketDropdown.data]);

  const centerOptions = useMemo(
    () => (Array.isArray(centersState.data) ? centersState.data : []),
    [centersState.data],
  );

  const centerFilterOptions = useMemo(
    () => [{ value: ALL_CENTERS, label: 'All Centers' }, ...centerOptions],
    [centerOptions],
  );

  const clientFilterOptions = useMemo(
    () => [{ value: ALL_CLIENTS, label: 'All Clients' }, ...clientOptions],
    [clientOptions],
  );

  const handleRetryList = useCallback(() => {
    dispatch(clearKnowledgeCenterCallRecordingListError());
    refetchList();
  }, [dispatch, refetchList]);

  const gotoKnowledgeCenterRoot = useCallback(() => {
    navigate(KNOWLEDGE_CENTER_ROOT);
  }, [navigate]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  const handleSaved = useCallback(() => {
    setDrawerOpen(false);
    refetchCategoryCounts();
    refetchList();
  }, [refetchCategoryCounts, refetchList]);

  const handleOpenAddDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleRowClick = useCallback((row) => {
    const recordId = row?.name;
    if (!recordId) return;
    setSelectedRecordId(recordId);
    setViewDrawerOpen(true);
  }, []);

  const handleViewDrawerOpenChange = useCallback((open) => {
    setViewDrawerOpen(open);
    if (!open) setSelectedRecordId(null);
  }, []);

  const handleViewNavigate = useCallback((nextId) => {
    if (!nextId) return;
    setSelectedRecordId(nextId);
  }, []);

  const handleViewUpdated = useCallback(() => {
    refetchCategoryCounts();
    refetchList();
  }, [refetchCategoryCounts, refetchList]);

  const handleViewDeleted = useCallback(() => {
    setViewDrawerOpen(false);
    setSelectedRecordId(null);
    refetchCategoryCounts();
    refetchList();
  }, [refetchCategoryCounts, refetchList]);

  const handleDrawerOpenChange = useCallback((open) => {
    setDrawerOpen(open);
  }, []);

  const visibleColumns = columnConfigHook.visibleColumns;

  const columns = useMemo(() => {
    const sortableHeader = (column, label) => (
      <Table.SortableHeader column={column} label={label} sortable />
    );

    const defs = {
      call_recording_name: {
        id: 'call_recording_name',
        accessorKey: 'call_recording_name',
        header: ({ column }) => sortableHeader(column, 'Name'),
        cell: ({ row }) => (
          <CallRecordingTableTextCell
            value={row.original.call_recording_name || row.original.name}
            maxWidthClass='max-w-[200px]'
            strong
          />
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      center: {
        id: 'center',
        accessorKey: 'center_name',
        header: ({ column }) => sortableHeader(column, 'Center'),
        cell: ({ row }) => (
          <CallRecordingTableTextCell
            value={row.original.center_name || row.original.center}
            maxWidthClass='max-w-[180px]'
          />
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      client: {
        id: 'client',
        accessorKey: 'client',
        header: ({ column }) => sortableHeader(column, 'Client'),
        cell: ({ row }) => <CallRecordingTableTextCell value={row.original.client} />,
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      duration: {
        id: 'duration',
        accessorKey: 'duration',
        header: ({ column }) => sortableHeader(column, 'Duration'),
        cell: ({ row }) => (
          <span className={NOWRAP_CELL}>{formatDurationCell(row.original.duration)}</span>
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      call_type: {
        id: 'call_type',
        accessorKey: 'call_type',
        header: ({ column }) => sortableHeader(column, 'Call Type'),
        cell: ({ row }) => {
          const callType = row.original.call_type;
          if (!callType) return <span className={NOWRAP_CELL}>—</span>;
          return (
            <Badge.Root size='medium' variant='light' color='gray'>
              {callType}
            </Badge.Root>
          );
        },
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      caller: {
        id: 'caller',
        accessorKey: 'caller',
        header: ({ column }) => sortableHeader(column, 'Caller'),
        cell: ({ row }) => <CallRecordingTableTextCell value={row.original.caller} />,
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      receiver: {
        id: 'receiver',
        accessorKey: 'receiver',
        header: ({ column }) => sortableHeader(column, 'Receiver'),
        cell: ({ row }) => <CallRecordingTableTextCell value={row.original.receiver} />,
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      call_date_time: {
        id: 'call_date_time',
        accessorKey: 'call_date_time',
        header: ({ column }) => sortableHeader(column, 'Date & Time'),
        cell: ({ row }) => (
          <span className={NOWRAP_CELL}>
            {formatCallDatetimeCell(row.original.call_date_time || row.original.call_datetime)}
          </span>
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      tags: {
        id: 'tags',
        accessorKey: 'tags',
        header: ({ column }) => sortableHeader(column, 'Tags'),
        cell: ({ row }) => (
          <CallRecordingTableTextCell
            value={formatTagsCell(row.original.tags)}
            maxWidthClass='max-w-[200px]'
          />
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: false,
      },
      creation: {
        id: 'creation',
        accessorKey: 'creation',
        header: ({ column }) => sortableHeader(column, 'Created at'),
        cell: ({ row }) => (
          <span className={NOWRAP_CELL}>{safeDisplayDateTime(row.original.creation)}</span>
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      modified: {
        id: 'modified',
        accessorKey: 'modified',
        header: ({ column }) => sortableHeader(column, 'Last modified at'),
        cell: ({ row }) => (
          <span className={NOWRAP_CELL}>{safeDisplayDateTime(row.original.modified)}</span>
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
    };

    return visibleColumns.map((col) => defs[col.id]).filter(Boolean);
  }, [visibleColumns]);

  const table = useReactTable({
    data: listRows ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = listRows ?? [];
  const orderedRecordIds = useMemo(() => rows.map((row) => row.name).filter(Boolean), [rows]);
  const isFetchLoading = listStatus === 'loading' && rows.length === 0;
  const showEmptySuccess = listStatus === 'succeeded' && rows.length === 0 && !listError;
  const trimmedSearch = searchValue.trim();
  const activeCategoryLabel = callRecordingCategoryLabelByValue[activeCategory] ?? 'Recordings';
  const hasAnyRecordings = categoryCounts.total > 0;

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <nav
        aria-label='Breadcrumb'
        className='flex h-12 shrink-0 items-center gap-1.5 border-b border-stroke-soft-200 px-3'
      >
        <button
          type='button'
          onClick={gotoKnowledgeCenterRoot}
          className='label-small text-text-sub-500 transition-colors hover:text-text-main-900'
        >
          Knowledge Center
        </button>
        <RiArrowRightSLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
        <p className='label-small text-text-main-900'>Call Recordings</p>
      </nav>

      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <aside className='flex min-h-0 shrink-0 flex-col'>
          <KnowledgeCenterCallRecordingsCategorySidebar
            value={activeCategory}
            onValueChange={handleCategoryChange}
            countForCategoryItem={countForCategoryItem}
          />
        </aside>

        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pl-5 pt-6'>
          <div className='flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 pb-4 pr-5'>
            <div className='w-[240px] shrink-0'>
              <Input.Root size='small' className='w-full'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    placeholder='Search here...'
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    aria-label='Search call recordings'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2'>
              <SearchableSelect
                size='small'
                showArrow
                value={centerFilter}
                onValueChange={setCenterFilter}
                options={centerFilterOptions}
                disabled={centersState.status === 'loading'}
                placeholder='All Centers'
                searchPlaceholder='Search centers...'
                emptyMessage={
                  centersState.status === 'loading' ? 'Loading...' : 'No centers available'
                }
                noResultsMessage='No centers found'
                triggerClassName='w-[118px] shrink-0'
              />

              <SearchableSelect
                size='small'
                showArrow
                value={clientFilter}
                onValueChange={setClientFilter}
                options={clientFilterOptions}
                disabled={ticketDropdown.status === 'loading'}
                placeholder='All Clients'
                searchPlaceholder='Search clients...'
                emptyMessage={
                  ticketDropdown.status === 'loading' ? 'Loading...' : 'No clients available'
                }
                noResultsMessage='No clients found'
                triggerClassName='w-[111px] shrink-0'
              />

              <SearchableSelect
                size='small'
                showArrow
                value={callTypeFilter}
                onValueChange={setCallTypeFilter}
                options={CALL_TYPE_FILTER_OPTIONS}
                placeholder='All Call Types'
                searchPlaceholder='Search...'
                triggerClassName='w-[130px] shrink-0'
              />

              <ColumnManagerDropdown
                open={isColumnManagerOpen}
                onOpenChange={setIsColumnManagerOpen}
                config={columnConfigHook}
                tooltipContent={<p>Manage columns</p>}
                trigger={
                  <Button.Root variant='neutral' mode='stroke' size='small'>
                    <Button.Icon as={RiLayoutColumnLine} />
                  </Button.Root>
                }
              />

              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                className='shrink-0 gap-1'
                onClick={handleOpenAddDrawer}
              >
                <Button.Icon as={RiAddLine} />
                Add
              </Button.Root>
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-auto pr-5 pb-6'>
            {listError ? (
              <div className='flex flex-col items-center gap-3 py-12'>
                <p className='paragraph-small text-text-sub-500'>{listError}</p>
                <Button.Root variant='neutral' mode='stroke' size='small' onClick={handleRetryList}>
                  Retry
                </Button.Root>
              </div>
            ) : null}

            {!listError && isFetchLoading ? (
              <Table.Root variant='compact'>
                <Table.Header>
                  <Table.Row>
                    {visibleColumns.map((col) => (
                      <Table.Head key={col.id}>{col.label}</Table.Head>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {Array.from({ length: 4 }).map((_, rowIdx) => (
                    <Table.Row key={rowIdx}>
                      {visibleColumns.map((col) => (
                        <Table.Cell key={col.id}>
                          <div className='h-4 w-full max-w-[140px] animate-pulse rounded bg-bg-weak-100' />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            ) : null}

            {!listError && !isFetchLoading && showEmptySuccess ? (
              <div
                className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-6 py-14 text-center'
                role='status'
                aria-live='polite'
              >
                <EmptyIllustration className='size-[108px] shrink-0' />
                {!hasAnyRecordings && !trimmedSearch ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>No call recordings yet</h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      Upload and manage call recordings from one place.
                    </p>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='stroke'
                      className='mt-6 gap-2'
                      onClick={handleOpenAddDrawer}
                    >
                      <Button.Icon as={RiAddLine} />
                      Add recording
                    </Button.Root>
                  </>
                ) : null}
                {hasAnyRecordings && trimmedSearch ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>No matching recordings</h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      Nothing matches your search in this category. Try different keywords or clear
                      the search.
                    </p>
                    <div className='mt-6 flex flex-wrap items-center justify-center gap-2'>
                      <Button.Root
                        type='button'
                        size='small'
                        variant='neutral'
                        mode='stroke'
                        onClick={clearSearch}
                      >
                        Clear search
                      </Button.Root>
                      <Button.Root
                        type='button'
                        size='small'
                        className='gap-2'
                        onClick={handleOpenAddDrawer}
                      >
                        <Button.Icon as={RiAddLine} />
                        Add recording
                      </Button.Root>
                    </div>
                  </>
                ) : null}
                {hasAnyRecordings && !trimmedSearch && activeCategory !== 'all' ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>
                      No recordings in this category
                    </h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      {`There are no recordings in “${activeCategoryLabel}”. View all categories or pick another company.`}
                    </p>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='stroke'
                      className='mt-6'
                      onClick={() => handleCategoryChange('all')}
                    >
                      View all categories
                    </Button.Root>
                  </>
                ) : null}
              </div>
            ) : null}

            {!listError && !isFetchLoading && !showEmptySuccess ? (
              <div className='w-full'>
                <Table.Root variant='compact' tableInstance={table}>
                  <Table.Header>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <Table.Row key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <Table.Head
                            key={header.id}
                            column={header.column}
                            className='whitespace-nowrap'
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
                    {table.getRowModel().rows.map((row, i, allRows) => (
                      <React.Fragment key={row.id}>
                        <Table.Row
                          className='cursor-pointer'
                          onClick={() => handleRowClick(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <Table.Cell
                              key={cell.id}
                              column={cell.column}
                              className={cell.column.columnDef.meta?.cellClassName}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Table.Cell>
                          ))}
                        </Table.Row>
                        {i < allRows.length - 1 ? <Table.RowDivider /> : null}
                      </React.Fragment>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <KnowledgeCenterCallRecordingDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        onSaved={handleSaved}
        defaultCompany={getAddCallRecordingDefaultCompany(activeCategory)}
      />

      <KnowledgeCenterCallRecordingViewDrawer
        open={viewDrawerOpen}
        recordingId={selectedRecordId}
        orderedIds={orderedRecordIds}
        onOpenChange={handleViewDrawerOpenChange}
        onNavigate={handleViewNavigate}
        onUpdated={handleViewUpdated}
        onDeleted={handleViewDeleted}
      />
    </div>
  );
}
