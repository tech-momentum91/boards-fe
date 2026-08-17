import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiAddLine, RiArrowRightSLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import EmptyIllustration from '@/components/ui/empty-illustration';
import * as Input from '@/components/ui/input';
import { KnowledgeCenterCityPopover } from '@/components/ui/knowledge-center-city-popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import KnowledgeCenterCaseStudyCreateDrawer from '@/pages/profile/knowledge-center-case-study-create-drawer';
import KnowledgeCenterCaseStudyViewDrawer from '@/pages/profile/knowledge-center-case-study-view-drawer';
import {
  ALL_CENTERS,
  ALL_CITIES,
  ALL_SPACE_TYPES,
  CASE_STUDY_DEFAULT_COLUMNS,
  CASE_STUDY_TABLE_ID,
  SPACE_TYPE_FILTER_OPTIONS,
} from '@/pages/profile/knowledge-center-case-studies-constants';
import {
  KNOWLEDGE_CENTER_CASE_STUDIES,
  KNOWLEDGE_CENTER_ROOT,
  knowledgeCenterCaseStudyDetailPath,
} from '@/pages/profile/knowledge-center-paths';
import {
  clearKnowledgeCenterCaseStudyListError,
  fetchKnowledgeCenterCaseStudyList,
  selectKnowledgeCenterCaseStudyList,
} from '@/redux/knowledgeCenterCaseStudySlice';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import { useColumnConfig } from '@/hooks/use-column-config';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { getKnowledgeCenterCityOptionForValue } from '@/utils/knowledge-center-city-options';

const LIST_SEARCH_DEBOUNCE_MS = 350;

const NOWRAP_CELL = 'paragraph-small whitespace-nowrap text-text-sub-600';

function CaseStudyTableTextCell({
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

const cityFilterValueForApi = (stored) => {
  if (!stored || stored === ALL_CITIES) return undefined;
  const opt = getKnowledgeCenterCityOptionForValue(stored);
  const label = opt?.label ?? stored;
  const cityName = String(label).split(',')[0]?.trim();
  return cityName || undefined;
};

export default function KnowledgeCenterCaseStudiesSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { caseStudyId } = useParams();

  const {
    data: listRows,
    status: listStatus,
    error: listError,
  } = useSelector(selectKnowledgeCenterCaseStudyList);

  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);

  const [searchValue, setSearchValue] = useState('');
  const [centerFilter, setCenterFilter] = useState(ALL_CENTERS);
  const [spaceTypeFilter, setSpaceTypeFilter] = useState(ALL_SPACE_TYPES);
  const [cityFilter, setCityFilter] = useState(ALL_CITIES);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [sorting, setSorting] = useState([]);

  const skipSearchDebounceOnce = useRef(true);

  const columnConfigHook = useColumnConfig(
    CASE_STUDY_TABLE_ID,
    CASE_STUDY_DEFAULT_COLUMNS,
    () => {},
    async () => [],
    { autoSave: true },
  );

  useEffect(() => {
    dispatch(fetchTicketDropdownData());
    dispatch(fetchCentersForClient(null));
  }, [dispatch]);

  const listFilters = useMemo(() => {
    const filters = [];
    if (centerFilter && centerFilter !== ALL_CENTERS) {
      filters.push(['center', '=', centerFilter]);
    }
    if (spaceTypeFilter && spaceTypeFilter !== ALL_SPACE_TYPES) {
      filters.push(['space_type', '=', spaceTypeFilter]);
    }
    return filters;
  }, [centerFilter, spaceTypeFilter]);

  const refetchList = useCallback(() => {
    dispatch(
      fetchKnowledgeCenterCaseStudyList({
        filters: listFilters,
        keyword: searchValue.trim() || undefined,
        city: cityFilterValueForApi(cityFilter),
        limit_start: 0,
        limit_page_length: 200,
        order_by: 'modified desc',
      }),
    );
  }, [dispatch, listFilters, searchValue, cityFilter]);

  useEffect(() => {
    const keyword = searchValue.trim() || undefined;
    const delay = skipSearchDebounceOnce.current ? 0 : LIST_SEARCH_DEBOUNCE_MS;
    skipSearchDebounceOnce.current = false;

    const requestId = window.setTimeout(() => {
      dispatch(
        fetchKnowledgeCenterCaseStudyList({
          filters: listFilters,
          keyword,
          city: cityFilterValueForApi(cityFilter),
          limit_start: 0,
          limit_page_length: 200,
          order_by: 'modified desc',
        }),
      );
    }, delay);

    return () => window.clearTimeout(requestId);
  }, [dispatch, listFilters, searchValue, cityFilter]);

  const centerOptions = useMemo(() => {
    const rows = centersState?.data ?? [];
    return rows.map((c) => ({
      value: c.value ?? c.name ?? c.center_name,
      label: c.label ?? c.center_name ?? c.name,
    }));
  }, [centersState?.data]);

  const centerFilterOptions = useMemo(
    () => [{ value: ALL_CENTERS, label: 'All Centers' }, ...centerOptions],
    [centerOptions],
  );

  const orderedRowIds = useMemo(
    () => (listRows ?? []).map((row) => row.name).filter(Boolean),
    [listRows],
  );

  const handleRowClick = useCallback(
    (name) => {
      if (!name) return;
      navigate(knowledgeCenterCaseStudyDetailPath(name));
    },
    [navigate],
  );

  const handleViewDrawerOpenChange = useCallback(
    (next) => {
      if (!next) navigate(KNOWLEDGE_CENTER_CASE_STUDIES);
    },
    [navigate],
  );

  const handleNavigateCaseStudy = useCallback(
    (name) => {
      if (!name) return;
      navigate(knowledgeCenterCaseStudyDetailPath(name));
    },
    [navigate],
  );

  const handleCreateSaved = useCallback(() => {
    setCreateDrawerOpen(false);
    refetchList();
  }, [refetchList]);

  const handleDeleted = useCallback(() => {
    navigate(KNOWLEDGE_CENTER_CASE_STUDIES);
    refetchList();
  }, [navigate, refetchList]);

  const gotoKnowledgeCenterRoot = useCallback(() => {
    navigate(KNOWLEDGE_CENTER_ROOT);
  }, [navigate]);

  const handleRetryList = useCallback(() => {
    dispatch(clearKnowledgeCenterCaseStudyListError());
    refetchList();
  }, [dispatch, refetchList]);

  const visibleColumns = columnConfigHook.visibleColumns;

  const columns = useMemo(() => {
    const sortableHeader = (column, label) => (
      <Table.SortableHeader column={column} label={label} sortable />
    );

    const defs = {
      case_study_name: {
        id: 'case_study_name',
        accessorKey: 'case_study_name',
        header: ({ column }) => sortableHeader(column, 'Name'),
        cell: ({ row }) => (
          <CaseStudyTableTextCell
            value={row.original.case_study_name || row.original.name}
            maxWidthClass='max-w-[200px]'
            strong
          />
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      client: {
        id: 'client',
        accessorKey: 'client',
        header: ({ column }) => sortableHeader(column, 'Client'),
        cell: ({ row }) => <CaseStudyTableTextCell value={row.original.client} />,
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      center: {
        id: 'center',
        accessorKey: 'center_name',
        header: ({ column }) => sortableHeader(column, 'Center'),
        cell: ({ row }) => (
          <CaseStudyTableTextCell
            value={row.original.center_name || row.original.center}
            maxWidthClass='max-w-[180px]'
          />
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      industry: {
        id: 'industry',
        accessorKey: 'industry',
        header: ({ column }) => sortableHeader(column, 'Industry'),
        cell: ({ row }) => (
          <CaseStudyTableTextCell value={row.original.industry} maxWidthClass='max-w-[240px]' />
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      creation: {
        id: 'creation',
        accessorKey: 'creation',
        header: ({ column }) => sortableHeader(column, 'Created Date'),
        cell: ({ row }) => (
          <span className={NOWRAP_CELL}>{safeDisplayDateTime(row.original.creation)}</span>
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      modified: {
        id: 'modified',
        accessorKey: 'modified',
        header: ({ column }) => sortableHeader(column, 'Last Modified'),
        cell: ({ row }) => (
          <span className={NOWRAP_CELL}>{safeDisplayDateTime(row.original.modified)}</span>
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      space_type: {
        id: 'space_type',
        accessorKey: 'space_type',
        header: ({ column }) => sortableHeader(column, 'Space Type'),
        cell: ({ row }) => <span className={NOWRAP_CELL}>{row.original.space_type || '—'}</span>,
        meta: { cellClassName: 'whitespace-nowrap' },
        enableSorting: true,
      },
      no_of_seats: {
        id: 'no_of_seats',
        accessorKey: 'no_of_seats',
        header: ({ column }) => sortableHeader(column, 'No. of Seats'),
        cell: ({ row }) => (
          <span className={NOWRAP_CELL}>
            {row.original.no_of_seats != null && row.original.no_of_seats !== ''
              ? row.original.no_of_seats
              : '—'}
          </span>
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

  const isFetchLoading = listStatus === 'loading' && (listRows ?? []).length === 0;
  const showEmptySuccess =
    listStatus === 'succeeded' && (listRows ?? []).length === 0 && !listError;

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
        <p className='label-small text-text-main-900'>Case Studies</p>
      </nav>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden pl-5 pt-6'>
        <div className='flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 pb-4 pr-5'>
          <div className='w-[240px] shrink-0'>
            <Input.Root size='small' className='w-full'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  placeholder='Search here...'
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  aria-label='Search case studies'
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
              value={spaceTypeFilter}
              onValueChange={setSpaceTypeFilter}
              options={SPACE_TYPE_FILTER_OPTIONS}
              placeholder='All Space Types'
              searchPlaceholder='Search...'
              triggerClassName='w-[151px] shrink-0'
            />

            <KnowledgeCenterCityPopover
              value={cityFilter === ALL_CITIES ? '' : cityFilter}
              onValueChange={(next) => setCityFilter(next || ALL_CITIES)}
              placeholder='All Cities'
              triggerClassName='w-[103px] shrink-0 h-9 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 text-paragraph-sm'
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
              variant='primary'
              mode='filled'
              size='xsmall'
              type='button'
              className='gap-2 px-[10px]'
              onClick={() => setCreateDrawerOpen(true)}
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
              className='flex flex-col items-center justify-center py-16 text-center'
              aria-live='polite'
            >
              <EmptyIllustration className='size-[108px] shrink-0' />
              <h3 className='mt-5 label-medium text-text-main-900'>No case studies yet</h3>
              <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                Create your first case study to showcase client success stories.
              </p>
              <Button.Root
                type='button'
                size='small'
                variant='neutral'
                mode='stroke'
                className='mt-6 gap-2'
                onClick={() => setCreateDrawerOpen(true)}
              >
                <Button.Icon as={RiAddLine} />
                Add Case Study
              </Button.Root>
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
                  {table.getRowModel().rows.map((row, i, rows) => (
                    <React.Fragment key={row.id}>
                      <Table.Row
                        className='cursor-pointer'
                        onClick={() => handleRowClick(row.original.name)}
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
                      {i < rows.length - 1 ? <Table.RowDivider /> : null}
                    </React.Fragment>
                  ))}
                </Table.Body>
              </Table.Root>
            </div>
          ) : null}
        </div>
      </div>

      <KnowledgeCenterCaseStudyCreateDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        onSaved={handleCreateSaved}
      />

      <KnowledgeCenterCaseStudyViewDrawer
        open={Boolean(caseStudyId)}
        caseStudyId={caseStudyId}
        orderedIds={orderedRowIds}
        onOpenChange={handleViewDrawerOpenChange}
        onNavigate={handleNavigateCaseStudy}
        onDeleted={handleDeleted}
        onUpdated={refetchList}
      />
    </div>
  );
}
