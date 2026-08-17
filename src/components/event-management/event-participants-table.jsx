import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useDispatch, useSelector } from 'react-redux';
import {
  PARTICIPANTS_COLUMN_IDS,
  PARTICIPANTS_FLAT_GROUP_CONTEXT,
  PARTICIPANTS_GROUP_CENTER_COLUMNS,
  PARTICIPANTS_GROUP_CLIENT_COLUMNS,
  PARTICIPANTS_LIST_COLUMNS,
  PARTICIPANTS_LIST_PAGE_SIZE,
} from '@/components/event-management/constant';

import {
  getCommunityEventParticipantsThunk,
  getEventDetailThunk,
  patchCommunityEventParticipantFields,
  syncCommunityEventParticipantsAfterInlineEdit,
  selectCommunityEventParticipants,
  selectCommunityEventParticipantsError,
  selectCommunityEventParticipantsHasMore,
  selectCommunityEventParticipantsLoading,
  selectCommunityEventParticipantsLoadingMore,
  updateEventThunk,
} from '@/redux/eventsSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { SCROLL_LOAD_THRESHOLD } from '@/components/team-management/constants';
import EventParticipantsToolbar from '@/components/event-management/event-participants-toolbar';
import EventParticipantsStatsCards from '@/components/event-management/event-participants-stats-cards';
import EventParticipantsGroupedView from '@/components/event-management/event-participants-grouped-view';
import {
  candidateKeysFromValue,
  findScrollableParent,
  formatApiParticipantsPctValue,
  formatParticipantsPctDisplay,
  formatSeatDisplay,
  getMergedRowFields,
  normalizedIdentifierKey,
  normalizedKey,
  participantColumnWidthClass,
  participantRowKey,
  ParticipantTextCellWithTooltip,
  participantsToolbarLabelToGroupByApi,
  resolveCenterIdFromRow,
} from '@/components/event-management/event-participants-utils';

const prepParticipantCols = (cols) =>
  prepareColumnsForConfig(
    cols.map((c) => (c.id === 'expected_seats' ? { ...c, label: 'Expected Participants' } : c)),
  );

function ParticipantTableBodyRow({
  group,
  row,
  visibleColumns,
  fieldOverrides,
  editingCell,
  editBuffer,
  setEditBuffer,
  beginEditExpectedSeats,
  beginEditRemarks,
  commitExpectedSeatsFromInput,
  commitRemarksFromInput,
}) {
  const merged = getMergedRowFields(row, group.center, fieldOverrides);
  const pctDisplay = formatParticipantsPctDisplay(row);
  const pKey = participantRowKey(row, group.center);
  const isEditingExpectedSeats =
    editingCell?.groupId === group.id &&
    editingCell?.participantKey === pKey &&
    editingCell?.columnId === 'expected_seats';
  const isEditingRemarks =
    editingCell?.groupId === group.id &&
    editingCell?.participantKey === pKey &&
    editingCell?.columnId === 'remarks';
  const expectedSeatsDisplayStr =
    merged.expected_seats === '' || merged.expected_seats == null
      ? ''
      : String(merged.expected_seats);

  return (
    <Table.Row className='hover:bg-bg-weak-50'>
      {visibleColumns.map((column) => {
        switch (column.id) {
          case 'center_name':
            return (
              <Table.Cell
                key={column.id}
                className={`whitespace-nowrap ${participantColumnWidthClass(column.id)}`}
              >
                <ParticipantTextCellWithTooltip
                  text={row.center_name || row.center || '--'}
                  strong
                  className='whitespace-nowrap'
                />
              </Table.Cell>
            );
          case 'client_name':
            return (
              <Table.Cell
                key={column.id}
                className={`whitespace-nowrap ${participantColumnWidthClass(column.id)}`}
              >
                <ParticipantTextCellWithTooltip
                  text={row.client_name || row.participant_name || '--'}
                  strong
                  className='whitespace-nowrap'
                />
              </Table.Cell>
            );
          case 'no_of_seats':
            return (
              <Table.Cell
                key={column.id}
                className={`whitespace-nowrap ${participantColumnWidthClass(column.id)}`}
              >
                <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                  {formatSeatDisplay(merged.no_of_seats)}
                </span>
              </Table.Cell>
            );
          case 'expected_seats':
            if (isEditingExpectedSeats) {
              return (
                <Table.Cell
                  key={column.id}
                  className={`!h-auto min-h-12 py-2 ${participantColumnWidthClass(column.id)}`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Input.Root size='xsmall' className='max-w-[140px]'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          inputMode='decimal'
                          value={editBuffer}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setEditBuffer(val);
                            }
                          }}
                          onBlur={(e) => {
                            const mergedBefore = getMergedRowFields(
                              row,
                              group.center,
                              fieldOverrides,
                            );
                            commitExpectedSeatsFromInput(
                              group.center,
                              row,
                              e.target.value,
                              mergedBefore.remarks,
                              mergedBefore.expected_seats,
                            );
                          }}
                          placeholder='0'
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </Table.Cell>
              );
            }
            return (
              <Table.Cell
                key={column.id}
                className={`whitespace-nowrap ${participantColumnWidthClass(column.id)}`}
              >
                <div
                  role='button'
                  tabIndex={0}
                  className='paragraph-small text-text-sub-600 max-w-[140px] cursor-pointer'
                  onClick={(e) => {
                    e.stopPropagation();
                    beginEditExpectedSeats(group, row, merged);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      beginEditExpectedSeats(group, row, merged);
                    }
                  }}
                >
                  {expectedSeatsDisplayStr === '' ? '--' : expectedSeatsDisplayStr}
                </div>
              </Table.Cell>
            );
          case 'participants_pct':
            return (
              <Table.Cell
                key={column.id}
                className={`whitespace-nowrap ${participantColumnWidthClass(column.id)}`}
              >
                <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                  {pctDisplay}
                </span>
              </Table.Cell>
            );
          case 'remarks':
            if (isEditingRemarks) {
              return (
                <Table.Cell
                  key={column.id}
                  className={`${participantColumnWidthClass(column.id)} !h-auto min-h-12 py-2`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Input.Root size='xsmall' className='w-full'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          onBlur={(e) => {
                            const mergedBefore = getMergedRowFields(
                              row,
                              group.center,
                              fieldOverrides,
                            );
                            commitRemarksFromInput(
                              group.center,
                              row,
                              e.target.value,
                              mergedBefore.expected_seats,
                              mergedBefore.remarks,
                            );
                          }}
                          placeholder='Add remarks...'
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </Table.Cell>
              );
            }
            return (
              <Table.Cell key={column.id} className={participantColumnWidthClass(column.id)}>
                <div
                  role='button'
                  tabIndex={0}
                  className='paragraph-small text-text-sub-600 line-clamp-2 cursor-pointer'
                  title={(merged.remarks ?? '').trim() || undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    beginEditRemarks(group, row, merged);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      beginEditRemarks(group, row, merged);
                    }
                  }}
                >
                  {(merged.remarks ?? '').trim() ? merged.remarks : '--'}
                </div>
              </Table.Cell>
            );
          default:
            return (
              <Table.Cell key={column.id}>
                <span className='paragraph-small text-text-sub-600'>--</span>
              </Table.Cell>
            );
        }
      })}
    </Table.Row>
  );
}

function ParticipantsDataTable({
  group,
  rows,
  visibleColumns,
  fieldOverrides,
  editingCell,
  editBuffer,
  setEditBuffer,
  beginEditExpectedSeats,
  beginEditRemarks,
  commitExpectedSeatsFromInput,
  commitRemarksFromInput,
  isLoading = false,
  hasMore = false,
  sentinelRef = null,
  enableScrollPagination = false,
  loadingLabel = 'Loading participants...',
  showLoadingMore = false,
  loadingMoreLabel = 'Loading more participants...',
  emptyMessage = '',
}) {
  const columns = useMemo(
    () =>
      visibleColumns.map((column) => ({
        id: column.id,
        accessorFn: (row) => row?.[column.id],
        header: ({ column: headerColumn }) => (
          <Table.SortableHeader column={headerColumn} label={column.label} sortable={false} />
        ),
        cell: () => null,
        enableSorting: false,
      })),
    [visibleColumns],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (originalRow, index) =>
      `${group.id}-${participantRowKey(originalRow, group.center)}-${index}`,
  });

  return (
    <Table.Root variant='compact' className='w-full table-fixed' tableInstance={table}>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head
                key={header.id}
                column={header.column}
                className={`whitespace-nowrap ${participantColumnWidthClass(header.column.id)}`}
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
        {isLoading ? (
          <Table.Row>
            <Table.Cell colSpan={Math.max(visibleColumns.length, 1)} className='py-8 text-center'>
              <span className='paragraph-small text-text-sub-600'>{loadingLabel}</span>
            </Table.Cell>
          </Table.Row>
        ) : table.getRowModel().rows.length === 0 && emptyMessage ? (
          <Table.Row>
            <Table.Cell
              colSpan={Math.max(visibleColumns.length, 1)}
              className='py-6 text-center text-paragraph-sm text-text-sub-500'
            >
              {emptyMessage}
            </Table.Cell>
          </Table.Row>
        ) : (
          table.getRowModel().rows.map((tableRow, rowIndex, array) => (
            <React.Fragment key={tableRow.id}>
              <ParticipantTableBodyRow
                group={group}
                row={tableRow.original}
                visibleColumns={visibleColumns}
                fieldOverrides={fieldOverrides}
                editingCell={editingCell}
                editBuffer={editBuffer}
                setEditBuffer={setEditBuffer}
                beginEditExpectedSeats={beginEditExpectedSeats}
                beginEditRemarks={beginEditRemarks}
                commitExpectedSeatsFromInput={commitExpectedSeatsFromInput}
                commitRemarksFromInput={commitRemarksFromInput}
              />
              {rowIndex < array.length - 1 ? <Table.RowDivider /> : null}
            </React.Fragment>
          ))
        )}
        {enableScrollPagination && hasMore ? (
          <Table.Row ref={sentinelRef} data-scroll-sentinel>
            <Table.Cell colSpan={Math.max(visibleColumns.length, 1)} className='h-1 p-0' />
          </Table.Row>
        ) : null}
        {showLoadingMore ? (
          <Table.Row>
            <Table.Cell colSpan={Math.max(visibleColumns.length, 1)} className='py-8 text-center'>
              <div className='flex items-center justify-center gap-2'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                <span className='paragraph-small text-text-sub-600'>{loadingMoreLabel}</span>
              </div>
            </Table.Cell>
          </Table.Row>
        ) : null}
      </Table.Body>
    </Table.Root>
  );
}

/** `centerFilterOptions`: event-linked centers `{ label, value }` (view-event `eventTaskCenterOptions`). */
/** `clientFilterOptions`: event-linked clients `{ label, value }` (view-event `eventParticipantClientOptions`). */
const EventParticipantsTable = ({
  eventName,
  centerFilterOptions = [],
  clientFilterOptions = [],
}) => {
  const dispatch = useDispatch();
  const participantsState = useSelector(selectCommunityEventParticipants);
  const isLoading = useSelector(selectCommunityEventParticipantsLoading);
  const isLoadingMore = useSelector(selectCommunityEventParticipantsLoadingMore);
  const hasMoreParticipants = useSelector(selectCommunityEventParticipantsHasMore);
  const loadError = useSelector(selectCommunityEventParticipantsError);
  const participantsPage = Number(participantsState?.page ?? 1) || 1;
  const participantsPageSize = Number(participantsState?.page_size ?? 20) || 20;

  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue, 500);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({ center: [], client: [] });
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  /** `''` = flat list (`group: 0`); `'Center'` \| `'Client'` → `group: 1` + `group_by`. */
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  /** Inline edits keyed by `participantRowKey`; persists until refetch or navigation */
  const [fieldOverrides, setFieldOverrides] = useState({});
  /** Opex-style single active cell: `{ groupId, participantKey, columnId }` */
  const [editingCell, setEditingCell] = useState(null);
  const [editBuffer, setEditBuffer] = useState('');
  const participantsRootRef = useRef(null);
  const [scrollContainerEl, setScrollContainerEl] = useState(null);
  const columnConfigOpts = useMemo(() => ({ autoSave: true, debounce: 300 }), []);

  const listColumnsPrepared = useMemo(() => prepParticipantCols(PARTICIPANTS_LIST_COLUMNS), []);
  const groupCenterColumnsPrepared = useMemo(
    () => prepParticipantCols(PARTICIPANTS_GROUP_CENTER_COLUMNS),
    [],
  );
  const groupClientColumnsPrepared = useMemo(
    () => prepParticipantCols(PARTICIPANTS_GROUP_CLIENT_COLUMNS),
    [],
  );

  const persistListColumns = useCallback(async (cols) => {
    try {
      localStorage.setItem(`column-config-${PARTICIPANTS_COLUMN_IDS.list}`, JSON.stringify(cols));
    } catch {
      // no-op
    }
  }, []);
  const loadListColumns = useCallback(async () => {
    try {
      const raw = localStorage.getItem(`column-config-${PARTICIPANTS_COLUMN_IDS.list}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : parsed?.columns || [];
    } catch {
      return [];
    }
  }, []);

  const persistGroupCenterColumns = useCallback(async (cols) => {
    try {
      localStorage.setItem(
        `column-config-${PARTICIPANTS_COLUMN_IDS.groupCenter}`,
        JSON.stringify(cols),
      );
    } catch {
      // no-op
    }
  }, []);
  const loadGroupCenterColumns = useCallback(async () => {
    try {
      const raw = localStorage.getItem(`column-config-${PARTICIPANTS_COLUMN_IDS.groupCenter}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : parsed?.columns || [];
    } catch {
      return [];
    }
  }, []);

  const persistGroupClientColumns = useCallback(async (cols) => {
    try {
      localStorage.setItem(
        `column-config-${PARTICIPANTS_COLUMN_IDS.groupClient}`,
        JSON.stringify(cols),
      );
    } catch {
      // no-op
    }
  }, []);
  const loadGroupClientColumns = useCallback(async () => {
    try {
      const raw = localStorage.getItem(`column-config-${PARTICIPANTS_COLUMN_IDS.groupClient}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : parsed?.columns || [];
    } catch {
      return [];
    }
  }, []);

  const columnConfigList = useColumnConfig(
    PARTICIPANTS_COLUMN_IDS.list,
    listColumnsPrepared,
    persistListColumns,
    loadListColumns,
    columnConfigOpts,
  );
  const columnConfigGroupCenter = useColumnConfig(
    PARTICIPANTS_COLUMN_IDS.groupCenter,
    groupCenterColumnsPrepared,
    persistGroupCenterColumns,
    loadGroupCenterColumns,
    columnConfigOpts,
  );
  const columnConfigGroupClient = useColumnConfig(
    PARTICIPANTS_COLUMN_IDS.groupClient,
    groupClientColumnsPrepared,
    persistGroupClientColumns,
    loadGroupClientColumns,
    columnConfigOpts,
  );

  const isGroupedView = Boolean(groupBy);
  const groupByApiValue = participantsToolbarLabelToGroupByApi(groupBy);

  const columnConfig = useMemo(() => {
    if (!isGroupedView) return columnConfigList;
    if (groupBy === 'Client') return columnConfigGroupClient;
    return columnConfigGroupCenter;
  }, [isGroupedView, groupBy, columnConfigList, columnConfigGroupCenter, columnConfigGroupClient]);

  const visibleColumns = useMemo(
    () =>
      columnConfig.visibleColumns.map((column) => ({
        id: column.id,
        label: column.label || column.id,
      })),
    [columnConfig.visibleColumns],
  );

  useEffect(() => {
    if (!eventName) return;
    dispatch(
      getCommunityEventParticipantsThunk({
        event: eventName,
        event_type: 'Community Events',
        keyword: debouncedSearch.trim() || undefined,
        group: isGroupedView ? 1 : 0,
        group_by: isGroupedView ? groupByApiValue : undefined,
        group_order: isGroupedView ? groupOrder : undefined,
        page: 1,
        page_size: PARTICIPANTS_LIST_PAGE_SIZE,
        centers: appliedFilters.center,
        clients: appliedFilters.client,
      }),
    );
  }, [
    dispatch,
    eventName,
    debouncedSearch,
    appliedFilters.center,
    appliedFilters.client,
    groupBy,
    groupOrder,
    isGroupedView,
    groupByApiValue,
  ]);

  const onLoadMoreParticipants = useCallback(() => {
    if (!eventName || !hasMoreParticipants || isLoadingMore || isLoading) return;
    if (isGroupedView) {
      dispatch(
        getCommunityEventParticipantsThunk({
          event: eventName,
          event_type: 'Community Events',
          keyword: debouncedSearch.trim() || undefined,
          group: 1,
          group_by: groupByApiValue,
          group_order: groupOrder,
          page: participantsPage + 1,
          page_size: participantsPageSize,
          append: true,
          centers: appliedFilters.center,
          clients: appliedFilters.client,
        }),
      );
      return;
    }
    dispatch(
      getCommunityEventParticipantsThunk({
        event: eventName,
        event_type: 'Community Events',
        keyword: debouncedSearch.trim() || undefined,
        group: 0,
        page: participantsPage + 1,
        page_size: participantsPageSize,
        append: true,
        centers: appliedFilters.center,
        clients: appliedFilters.client,
      }),
    );
  }, [
    dispatch,
    eventName,
    debouncedSearch,
    hasMoreParticipants,
    isLoadingMore,
    isLoading,
    isGroupedView,
    groupByApiValue,
    groupOrder,
    participantsPage,
    participantsPageSize,
    appliedFilters.center,
    appliedFilters.client,
  ]);

  useEffect(() => {
    const next = participantsRootRef.current
      ? findScrollableParent(participantsRootRef.current)
      : null;
    setScrollContainerEl(next || null);
  }, []);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMoreParticipants,
    hasMore: hasMoreParticipants,
    isLoading: isLoadingMore || isLoading,
    threshold: SCROLL_LOAD_THRESHOLD,
    scrollContainer: scrollContainerEl,
    enabled: Boolean(eventName),
  });

  useEffect(() => {
    if (!loadError) return;
    showErrorToast(extractErrorMessage(loadError, 'Failed to load participants'));
  }, [loadError]);

  const normalizedGroups = useMemo(() => {
    const groups = Array.isArray(participantsState?.groups) ? participantsState.groups : [];
    return groups.map((group, index) => ({
      id: String(group?.id || group?.center || `group-${index}`),
      center: String(group?.center || '--'),
      participants: Array.isArray(group?.participants) ? group.participants : [],
      total_participants: Number(group?.total_participants ?? 0) || 0,
    }));
  }, [participantsState?.groups]);

  useEffect(() => {
    setExpandedGroups((previous) => {
      const next = { ...previous };
      normalizedGroups.forEach((group) => {
        if (next[group.id] === undefined) next[group.id] = true;
      });
      return next;
    });
  }, [normalizedGroups]);

  const filterCenterOptionsOverride = useMemo(
    () => (Array.isArray(centerFilterOptions) ? centerFilterOptions : undefined),
    [centerFilterOptions],
  );

  const filterClientOptionsOverride = useMemo(
    () => (Array.isArray(clientFilterOptions) ? clientFilterOptions : []),
    [clientFilterOptions],
  );

  /** Drop center/client filter values removed from Basic Details scope */
  useEffect(() => {
    const allowedCenterIds = new Set(
      (Array.isArray(centerFilterOptions) ? centerFilterOptions : [])
        .map((o) => String(o?.value ?? '').trim())
        .filter(Boolean),
    );
    const allowedClientIds = new Set(
      (Array.isArray(clientFilterOptions) ? clientFilterOptions : [])
        .map((o) => String(o?.value ?? '').trim())
        .filter(Boolean),
    );
    setAppliedFilters((previous) => {
      const center = (previous.center || []).filter((id) =>
        allowedCenterIds.has(String(id).trim()),
      );
      const client = (previous.client || []).filter((id) =>
        allowedClientIds.has(String(id).trim()),
      );
      const prevCenter = previous.center || [];
      const prevClient = previous.client || [];
      const unchanged =
        center.length === prevCenter.length &&
        client.length === prevClient.length &&
        center.every((id, index) => id === prevCenter[index]) &&
        client.every((id, index) => id === prevClient[index]);
      return unchanged ? previous : { center, client };
    });
  }, [centerFilterOptions, clientFilterOptions]);

  /** Server applies center/client via `body.filters`; UI lists API response as-is. */
  const filteredGroups = useMemo(
    () =>
      normalizedGroups.map((group) => ({
        ...group,
        rows: group.participants,
      })),
    [normalizedGroups],
  );

  const flatResults = useMemo(
    () => (Array.isArray(participantsState?.results) ? participantsState.results : []),
    [participantsState?.results],
  );

  const flatGroupStub = useMemo(
    () => ({ id: 'flat', center: PARTICIPANTS_FLAT_GROUP_CONTEXT }),
    [],
  );

  const isEmpty = isGroupedView ? filteredGroups.length === 0 : flatResults.length === 0;

  /** Show stats after initial fetch for this event — include empty lists when API returns zeros in `stats`. */
  const participantsStatsStripVisible =
    Boolean(eventName?.trim()) &&
    !isLoading &&
    String(participantsState?.eventName ?? '').trim() === String(eventName ?? '').trim();

  const participantStatsAggregates = useMemo(() => {
    const api = participantsState?.participantStats;
    return {
      noOfClients: Number(api?.noOfClients) || 0,
      totalSeats: Number(api?.totalParticipants) || 0,
      totalExpected: Number(api?.totalExpected) || 0,
      participantsPct: formatApiParticipantsPctValue(api?.participantsPct),
    };
  }, [participantsState?.participantStats]);

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups((previous) => ({ ...previous, [groupId]: !(previous[groupId] !== false) }));
  }, []);

  const handleFiltersChange = useCallback((nextFilters) => {
    setAppliedFilters({
      center: Array.isArray(nextFilters?.center)
        ? nextFilters.center
        : nextFilters?.center
          ? [nextFilters.center]
          : [],
      client: Array.isArray(nextFilters?.client)
        ? nextFilters.client
        : nextFilters?.client
          ? [nextFilters.client]
          : [],
    });
  }, []);

  const handleClearAllFilters = useCallback((event) => {
    event.stopPropagation();
    setAppliedFilters({ center: [], client: [] });
    setFilterCount(0);
    setIsFilterOpen(false);
  }, []);

  const handleFieldSave = useCallback((groupCenter, row, field, value) => {
    const key = participantRowKey(row, groupCenter);
    setFieldOverrides((previous) => ({
      ...previous,
      [key]: { ...previous[key], [field]: value },
    }));
  }, []);

  const clearFieldOverride = useCallback((groupCenter, row) => {
    const key = participantRowKey(row, groupCenter);
    setFieldOverrides((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  const applyParticipantFieldsToStore = useCallback(
    (groupCenter, row, { expected_seats, remarks }) => {
      dispatch(
        patchCommunityEventParticipantFields({
          participantKey: participantRowKey(row, groupCenter),
          expected_seats,
          remarks,
        }),
      );
      clearFieldOverride(groupCenter, row);
    },
    [clearFieldOverride, dispatch],
  );

  const syncParticipantContextAfterSave = useCallback(async () => {
    if (!eventName) return;
    const loadedRowCount = Math.max(
      PARTICIPANTS_LIST_PAGE_SIZE,
      participantsPage * participantsPageSize,
    );
    try {
      await dispatch(
        syncCommunityEventParticipantsAfterInlineEdit({
          event: eventName,
          event_type: 'Community Events',
          keyword: debouncedSearch.trim() || undefined,
          group: isGroupedView ? 1 : 0,
          group_by: isGroupedView ? groupByApiValue : undefined,
          group_order: isGroupedView ? groupOrder : undefined,
          page: 1,
          page_size: loadedRowCount,
          centers: appliedFilters.center,
          clients: appliedFilters.client,
        }),
      ).unwrap();
    } catch {
      // Sync is best-effort; row already saved and patched locally.
    }
  }, [
    appliedFilters.center,
    appliedFilters.client,
    debouncedSearch,
    dispatch,
    eventName,
    groupByApiValue,
    groupOrder,
    isGroupedView,
    participantsPage,
    participantsPageSize,
  ]);

  const getEventCustomersForUpdate = useCallback(async () => {
    const eventDoc = await dispatch(getEventDetailThunk({ eventId: eventName })).unwrap();
    const childTableField =
      (Array.isArray(eventDoc?.clients) && 'clients') ||
      (Array.isArray(eventDoc?.event_customers) && 'event_customers') ||
      (Array.isArray(eventDoc?.event_customer) && 'event_customer') ||
      (Array.isArray(eventDoc?.customers) && 'customers') ||
      '';
    const childRows = childTableField ? eventDoc?.[childTableField] : [];

    if (!childTableField || !Array.isArray(childRows) || childRows.length === 0) {
      throw new Error('Event customer child table not found');
    }

    return { childTableField, childRows };
  }, [dispatch, eventName]);

  const persistParticipantFields = useCallback(
    async (groupCenter, row, { expected_seats, remarks }) => {
      if (!eventName) return;
      const customer_id = String(
        row.customer_id ||
          row.raw?.customer_id ||
          row.raw?.customer ||
          row.raw?.client ||
          row.raw?.customer_name ||
          row.client_name ||
          row.participant_name ||
          '',
      ).trim();
      let actualCenterName = String(row?.center_name ?? row?.center ?? '').trim();
      if (
        !actualCenterName &&
        groupCenter !== PARTICIPANTS_FLAT_GROUP_CONTEXT &&
        groupBy === 'Center'
      ) {
        actualCenterName = String(groupCenter ?? '').trim();
      }
      const center_id = String(
        row?.center_id ||
          row?.raw?.center_id ||
          row?.raw?.center ||
          row?.raw?.centre ||
          resolveCenterIdFromRow(row.raw, actualCenterName) ||
          '',
      ).trim();
      try {
        const { childTableField, childRows } = await getEventCustomersForUpdate();

        const rowIdentityKeys = [
          row?.raw?.name,
          row?.raw?.event_customer,
          row?.event_customer,
          row?.event_customer_id,
        ]
          .map((v) => normalizedIdentifierKey(v))
          .filter(Boolean);
        if (rowIdentityKeys.length > 0) {
          const identitySet = new Set(rowIdentityKeys);
          const identityMatchedIndexes = childRows
            .map((childRow, index) => ({ childRow, index }))
            .filter(({ childRow }) => identitySet.has(normalizedKey(childRow?.name)))
            .map(({ index }) => index);
          if (identityMatchedIndexes.length === 1) {
            const targetIndex = identityMatchedIndexes[0];
            const updatedChildRows = childRows.map((childRow, index) => {
              if (index !== targetIndex) return childRow;
              return {
                ...childRow,
                expected_seats,
                expected_seats_user_set: expected_seats == null ? 0 : 1,
                remarks: remarks ?? '',
              };
            });
            await dispatch(
              updateEventThunk({
                eventId: eventName,
                [childTableField]: updatedChildRows,
              }),
            ).unwrap();
            applyParticipantFieldsToStore(groupCenter, row, { expected_seats, remarks });
            await syncParticipantContextAfterSave();
            showSuccessToast('Updated successfully.');
            return true;
          }
        }

        const customerKeys = [
          row?.customer_id,
          row?.raw?.customer_id,
          row?.raw?.customer,
          row?.raw?.client,
          row?.raw?.customer_name,
          row?.client_name,
          row?.participant_name,
          customer_id,
        ].flatMap((v) => candidateKeysFromValue(v));
        const customerKeySet = new Set(customerKeys);
        const centerKeys = [
          center_id,
          row?.center_id,
          row?.raw?.center_id,
          row?.raw?.center,
          row?.raw?.centre,
          row?.raw?.center_name,
          row?.raw?.centre_name,
          row?.center,
          row?.center_name,
          actualCenterName,
          groupBy === 'Center' ? groupCenter : '',
        ].flatMap((v) => candidateKeysFromValue(v));
        const centerKeySet = new Set(centerKeys);
        if (customerKeySet.size === 0) {
          throw new Error('Customer id not found for participant row');
        }

        const candidates = childRows
          .map((childRow, index) => {
            const rowCustomerKeys = [
              childRow?.customer_id ?? childRow?.customer ?? childRow?.client,
              childRow?.customer_name,
              childRow?.client_name,
            ].flatMap((v) => candidateKeysFromValue(v));
            const rowCenterKeys = [
              childRow?.center_id ??
                childRow?.center ??
                childRow?.centre ??
                childRow?.custom_center,
              childRow?.center_name,
              childRow?.centre_name,
              childRow?.center,
            ].flatMap((v) => candidateKeysFromValue(v));
            return { childRow, index, rowCustomerKeys, rowCenterKeys };
          })
          .filter((item) => item.rowCustomerKeys.some((k) => customerKeySet.has(k)));

        if (candidates.length === 0) {
          throw new Error('Matching event customer row not found');
        }

        let targetIndex = -1;
        if (candidates.length === 1) {
          targetIndex = candidates[0].index;
        } else {
          const centerMatched =
            centerKeySet.size > 0
              ? candidates.filter((item) => item.rowCenterKeys.some((k) => centerKeySet.has(k)))
              : [];
          if (centerMatched.length === 1) {
            targetIndex = centerMatched[0].index;
          } else if (centerKeySet.size === 0) {
            throw new Error('Center not found for participant row');
          } else {
            throw new Error('Multiple event customer rows found for this customer');
          }
        }

        const updatedChildRows = childRows.map((childRow, index) => {
          if (index !== targetIndex) return childRow;
          return {
            ...childRow,
            expected_seats,
            expected_seats_user_set: expected_seats == null ? 0 : 1,
            remarks: remarks ?? '',
          };
        });

        await dispatch(
          updateEventThunk({
            eventId: eventName,
            [childTableField]: updatedChildRows,
          }),
        ).unwrap();
        applyParticipantFieldsToStore(groupCenter, row, { expected_seats, remarks });
        await syncParticipantContextAfterSave();
        showSuccessToast('Updated successfully.');
        return true;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save' });
        return false;
      }
    },
    [
      applyParticipantFieldsToStore,
      eventName,
      getEventCustomersForUpdate,
      groupBy,
      syncParticipantContextAfterSave,
    ],
  );

  const beginEditExpectedSeats = useCallback((group, row, merged) => {
    const pKey = participantRowKey(row, group.center);
    const displayStr =
      merged.expected_seats === '' || merged.expected_seats == null
        ? ''
        : String(merged.expected_seats);
    setEditingCell({ groupId: group.id, participantKey: pKey, columnId: 'expected_seats' });
    setEditBuffer(displayStr);
  }, []);

  const beginEditRemarks = useCallback((group, row, merged) => {
    const pKey = participantRowKey(row, group.center);
    setEditingCell({ groupId: group.id, participantKey: pKey, columnId: 'remarks' });
    setEditBuffer(merged.remarks ?? '');
  }, []);

  const commitExpectedSeatsFromInput = useCallback(
    (groupCenter, row, rawInput, remarksSnapshot, previousExpectedSnapshot) => {
      setEditingCell(null);
      const raw = String(rawInput ?? '').trim();
      let next = '';
      if (raw !== '') {
        const n = Number(raw);
        if (Number.isFinite(n)) next = n;
      }
      const assignedSeats = Number(row?.no_of_seats);
      if (next !== '' && Number.isFinite(assignedSeats) && Number(next) > assignedSeats) {
        showErrorToast('Expected seats cannot be greater than Total No. of seats.');
        return;
      }
      handleFieldSave(groupCenter, row, 'expected_seats', next);
      const expectedPayload = next === '' ? null : next;
      void (async () => {
        const success = await persistParticipantFields(groupCenter, row, {
          expected_seats: expectedPayload,
          remarks: remarksSnapshot ?? '',
        });
        if (!success) {
          handleFieldSave(groupCenter, row, 'expected_seats', previousExpectedSnapshot ?? '');
        }
      })();
    },
    [handleFieldSave, persistParticipantFields],
  );

  const commitRemarksFromInput = useCallback(
    (groupCenter, row, rawInput, expectedSeatsSnapshot, previousRemarksSnapshot) => {
      setEditingCell(null);
      const remarks = String(rawInput ?? '').trim();
      handleFieldSave(groupCenter, row, 'remarks', remarks);
      let expectedPayload = null;
      if (expectedSeatsSnapshot !== '' && expectedSeatsSnapshot != null) {
        const n = Number(expectedSeatsSnapshot);
        if (Number.isFinite(n)) expectedPayload = n;
      }
      void (async () => {
        const success = await persistParticipantFields(groupCenter, row, {
          expected_seats: expectedPayload,
          remarks,
        });
        if (!success) {
          handleFieldSave(groupCenter, row, 'remarks', previousRemarksSnapshot ?? '');
        }
      })();
    },
    [handleFieldSave, persistParticipantFields],
  );

  return (
    <div ref={participantsRootRef} className='flex flex-col gap-5'>
      {participantsStatsStripVisible ? (
        <div className='shrink-0 pb-6 pt-2 sm:pb-8 sm:pt-4'>
          <EventParticipantsStatsCards aggregates={participantStatsAggregates} />
        </div>
      ) : null}

      <EventParticipantsToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        filterCount={filterCount}
        setFilterCount={setFilterCount}
        onClearAllFilters={handleClearAllFilters}
        onFiltersChange={handleFiltersChange}
        appliedFilters={appliedFilters}
        centerOptionsOverride={filterCenterOptionsOverride}
        clientOptionsOverride={filterClientOptionsOverride}
        isGroupByOpen={isGroupByOpen}
        setIsGroupByOpen={setIsGroupByOpen}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        groupOrder={groupOrder}
        setGroupOrder={setGroupOrder}
        isColumnManagerOpen={isColumnManagerOpen}
        setIsColumnManagerOpen={setIsColumnManagerOpen}
        columnConfig={columnConfig}
      />

      <div className='w-full'>
        {isLoading && isGroupedView ? (
          <div className='py-10 text-center text-paragraph-sm text-text-sub-500'>Loading...</div>
        ) : !isGroupedView ? (
          <div className='w-full'>
            <div className='w-full overflow-x-auto'>
              <ParticipantsDataTable
                group={flatGroupStub}
                rows={flatResults}
                visibleColumns={visibleColumns}
                fieldOverrides={fieldOverrides}
                editingCell={editingCell}
                editBuffer={editBuffer}
                setEditBuffer={setEditBuffer}
                beginEditExpectedSeats={beginEditExpectedSeats}
                beginEditRemarks={beginEditRemarks}
                commitExpectedSeatsFromInput={commitExpectedSeatsFromInput}
                commitRemarksFromInput={commitRemarksFromInput}
                isLoading={isLoading}
                hasMore={hasMoreParticipants}
                sentinelRef={sentinelRef}
                enableScrollPagination
                loadingLabel='Loading participants...'
                emptyMessage={
                  searchValue.trim()
                    ? 'No participants match your search. Try a different keyword or clear filters.'
                    : 'There are no participants to show for this event yet.'
                }
                showLoadingMore={isLoadingMore}
                loadingMoreLabel='Loading more participants...'
              />
            </div>
          </div>
        ) : isEmpty ? (
          <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
            <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No participants</h3>
            <p className='max-w-md text-sm text-text-sub-600'>
              {searchValue.trim()
                ? 'No participants match your search. Try a different keyword or clear filters.'
                : 'There are no participants to show for this event yet.'}
            </p>
          </div>
        ) : (
          <EventParticipantsGroupedView
            groupBy={groupBy}
            filteredGroups={filteredGroups}
            expandedGroups={expandedGroups}
            onToggleGroup={toggleGroup}
            DataTableComponent={ParticipantsDataTable}
            visibleColumns={visibleColumns}
            fieldOverrides={fieldOverrides}
            editingCell={editingCell}
            editBuffer={editBuffer}
            setEditBuffer={setEditBuffer}
            beginEditExpectedSeats={beginEditExpectedSeats}
            beginEditRemarks={beginEditRemarks}
            commitExpectedSeatsFromInput={commitExpectedSeatsFromInput}
            commitRemarksFromInput={commitRemarksFromInput}
            hasMoreParticipants={hasMoreParticipants}
            sentinelRef={sentinelRef}
            isLoadingMore={isLoadingMore}
          />
        )}
      </div>
    </div>
  );
};

export default EventParticipantsTable;
