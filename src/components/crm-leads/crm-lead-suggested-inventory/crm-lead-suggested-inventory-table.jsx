import React, { useCallback, useMemo, useState, useImperativeHandle, forwardRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Checkbox from '@/components/ui/checkbox';
import * as Button from '@/components/ui/button';
import { getSpaceStatusBadge, getSpaceTypeBadge } from '@/components/space-management/constants';
import {
  ADD_MORE_SPACES_LABEL,
  REACT_TABLE_ID_LEAD_SUGGESTED_INVENTORY,
  SORTABLE_COLUMN_IDS,
  SUGGESTED_INVENTORY_COLUMN_DEFS,
} from '@/components/crm-leads/crm-lead-suggested-inventory/constants';
import {
  ManualCenterSelect,
  ManualSpaceTypeSelect,
} from '@/components/crm-leads/crm-lead-suggested-inventory/manual-add-selects';
import SuggestedInventorySpaceSelect from '@/components/crm-leads/crm-lead-suggested-inventory/suggested-inventory-space-select';
import {
  formatLeadReqSeats,
  formatRateInr,
  formatSeatDiff,
  getMatchBadge,
  getSelectAllCheckedState,
  getSelectableRowIds,
  isRowSelected,
  toggleRowSelection,
  toggleSelectAll,
} from '@/components/crm-leads/crm-lead-suggested-inventory/utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import {
  getFrozenActionsColumnExtras,
  orderColumnsWithActionsLast,
} from '@/lib/frozen-table-columns';
import { getCrmLeadsColumnPreferences, saveCrmLeadsColumnPreferences } from '@/redux/settingSlice';

const CELL_TEXT_CLASS = 'whitespace-nowrap text-paragraph-sm text-text-sub-500';
const HEADER_CELL_CLASS = 'rounded-none first:rounded-none last:rounded-none';
const DEFAULT_SORTING = [{ id: 'match', desc: true }];

function SortableColumnHeader({ column, label }) {
  const sortable = SORTABLE_COLUMN_IDS.has(column.id);
  return (
    <Table.SortableHeader
      column={column}
      label={label}
      sortable={sortable}
      nowrap
      className='text-label-sm font-medium text-text-soft-400'
    />
  );
}

const CrmLeadSuggestedInventoryTable = forwardRef(
  (
    {
      leadId,
      rows,
      selectedIds,
      onSelectionChange,
      onRemoveRow,
      manualRows,
      onAddManualRow,
      onManualRowChange,
    },
    ref,
  ) => {
    const dispatch = useDispatch();

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(SUGGESTED_INVENTORY_COLUMN_DEFS);
      config.forEach((col, index) => {
        col.order = index;
        col.visible = SUGGESTED_INVENTORY_COLUMN_DEFS[index]?.visible !== false;
      });
      return config;
    }, []);

    const expectedColumnIds = useMemo(
      () => new Set(SUGGESTED_INVENTORY_COLUMN_DEFS.map((col) => col.id)),
      [],
    );

    const persistColumnConfig = useCallback(
      async (cols) => {
        await dispatch(
          saveCrmLeadsColumnPreferences({
            columns: cols,
            react_table_id: REACT_TABLE_ID_LEAD_SUGGESTED_INVENTORY,
          }),
        ).unwrap();
      },
      [dispatch],
    );

    const fetchColumnConfig = useCallback(async () => {
      try {
        const result = await dispatch(
          getCrmLeadsColumnPreferences({
            react_table_id: REACT_TABLE_ID_LEAD_SUGGESTED_INVENTORY,
          }),
        ).unwrap();
        const data = result?.message ?? result?.data ?? result ?? [];
        if (!Array.isArray(data) || data.length === 0) return null;
        const savedIds = new Set(data.map((col) => col.id));
        const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
        return allPresent ? data : null;
      } catch {
        return null;
      }
    }, [dispatch, expectedColumnIds]);

    const columnConfigHook = useColumnConfig(
      REACT_TABLE_ID_LEAD_SUGGESTED_INVENTORY,
      defaultColumnConfig,
      persistColumnConfig,
      fetchColumnConfig,
      { autoSave: true, debounce: 500 },
    );

    useImperativeHandle(ref, () => ({ columnConfigHook }), [columnConfigHook]);

    const allRows = useMemo(() => [...rows, ...manualRows], [rows, manualRows]);

    const selectableRowIds = useMemo(() => getSelectableRowIds(allRows), [allRows]);

    const selectAllChecked = useMemo(
      () => getSelectAllCheckedState(selectedIds, selectableRowIds),
      [selectedIds, selectableRowIds],
    );

    const columns = useMemo(
      () => [
        {
          id: 'select',
          size: 52,
          enableSorting: false,
          header: () => (
            <Checkbox.Root
              checked={selectAllChecked}
              disabled={selectableRowIds.length === 0}
              onCheckedChange={(v) =>
                onSelectionChange(toggleSelectAll(selectedIds, selectableRowIds, Boolean(v)))
              }
            />
          ),
          cell: ({ row }) => {
            if (row.original._isManual && !row.original.space_id) return null;
            const rowId = row.original.id;
            return (
              <Checkbox.Root
                checked={isRowSelected(selectedIds, rowId)}
                onCheckedChange={(checked) =>
                  onSelectionChange(toggleRowSelection(selectedIds, rowId, checked))
                }
              />
            );
          },
          meta: { cellClassName: 'pl-4' },
        },
        {
          id: 'center',
          accessorKey: 'center_name',
          size: 260,
          header: ({ column }) => <SortableColumnHeader column={column} label='Center' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) {
              return (
                <ManualCenterSelect
                  leadId={leadId}
                  value={r._manualCenter || ''}
                  onValueChange={(v) => onManualRowChange(r._manualId, { _manualCenter: v })}
                />
              );
            }
            return (
              <span className='min-w-0 whitespace-nowrap text-label-sm font-medium text-text-strong-950 capitalize'>
                {r.center_name}
                {r.city_code ? (
                  <span className='ml-1 text-[11px] font-medium uppercase tracking-[0.22px] text-text-soft-400'>
                    ({r.city_code})
                  </span>
                ) : null}
              </span>
            );
          },
        },
        {
          id: 'space_type',
          size: 150,
          header: ({ column }) => <SortableColumnHeader column={column} label='Space Type' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) {
              return (
                <ManualSpaceTypeSelect
                  value={r._manualInventoryType || ''}
                  onValueChange={(v) => onManualRowChange(r._manualId, { _manualInventoryType: v })}
                />
              );
            }
            const typeBadge = getSpaceTypeBadge(r.space_type);
            if (!typeBadge?.label || typeBadge.label === '--') return null;
            return (
              <Badge.Root
                size='small'
                variant='light'
                color={typeBadge.color}
                className='whitespace-nowrap'
              >
                {typeBadge.label}
              </Badge.Root>
            );
          },
        },
        {
          id: 'space_name',
          size: 220,
          enableSorting: false,
          header: () => (
            <span className='whitespace-nowrap text-label-sm font-medium text-text-soft-400'>
              Space Name
            </span>
          ),
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) {
              return (
                <SuggestedInventorySpaceSelect
                  leadId={leadId}
                  center={r._manualCenter}
                  inventoryType={r._manualInventoryType}
                  value={r.space_id || ''}
                  onSpaceSelected={(match) =>
                    onManualRowChange(r._manualId, {
                      ...match,
                      id: match.space_id,
                      _isManual: true,
                      _manualId: r._manualId,
                      _manualCenter: r._manualCenter,
                      _manualInventoryType: r._manualInventoryType,
                    })
                  }
                />
              );
            }
            return <span className={cn(CELL_TEXT_CLASS, 'truncate')}>{r.space_name}</span>;
          },
        },
        {
          id: 'match',
          size: 110,
          accessorKey: 'match_percentage',
          header: ({ column }) => <SortableColumnHeader column={column} label='Match' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) return <span className={CELL_TEXT_CLASS}>—</span>;
            if (r.match_percentage === null || r.match_percentage === undefined) {
              return <span className={CELL_TEXT_CLASS}>—</span>;
            }
            const matchBadge = getMatchBadge(r.match_percentage);
            return (
              <Badge.Root
                size='small'
                variant='light'
                color={matchBadge.color}
                className='whitespace-nowrap'
              >
                {matchBadge.label}
              </Badge.Root>
            );
          },
        },
        {
          id: 'floor',
          size: 180,
          accessorKey: 'floor',
          header: ({ column }) => <SortableColumnHeader column={column} label='Floor' />,
          cell: ({ row }) => (
            <span className={cn(CELL_TEXT_CLASS, 'whitespace-nowrap')}>
              {row.original.floor || '—'}
            </span>
          ),
        },
        {
          id: 'status',
          size: 130,
          header: ({ column }) => <SortableColumnHeader column={column} label='Status' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) return <span className={CELL_TEXT_CLASS}>—</span>;
            if (!r.status) return <span className={CELL_TEXT_CLASS}>—</span>;
            const statusBadge = getSpaceStatusBadge(r.status);
            return (
              <Badge.Root
                size='small'
                variant='light'
                color={statusBadge.color}
                className='whitespace-nowrap'
              >
                {statusBadge.label}
              </Badge.Root>
            );
          },
        },
        {
          id: 'lead_req',
          size: 130,
          accessorKey: 'lead_req_seats',
          header: ({ column }) => <SortableColumnHeader column={column} label='Lead Req.' />,
          cell: ({ row }) => (
            <span className={CELL_TEXT_CLASS}>
              {formatLeadReqSeats(row.original.lead_req_seats)}
            </span>
          ),
        },
        {
          id: 'avail_seats',
          size: 130,
          accessorKey: 'avail_seats',
          header: ({ column }) => <SortableColumnHeader column={column} label='Avail. Seats' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) return <span className={CELL_TEXT_CLASS}>—</span>;
            return <span className={CELL_TEXT_CLASS}>{r.avail_seats ?? '—'}</span>;
          },
        },
        {
          id: 'seat_diff',
          size: 120,
          accessorKey: 'seat_diff',
          header: ({ column }) => <SortableColumnHeader column={column} label='Seat Diff' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) return <span className={CELL_TEXT_CLASS}>—</span>;
            const { text, className } = formatSeatDiff(r.seat_diff);
            return <span className={cn(className, 'whitespace-nowrap')}>{text}</span>;
          },
        },
        {
          id: 'rate_per_seat',
          size: 120,
          accessorKey: 'rate_per_seat',
          header: ({ column }) => <SortableColumnHeader column={column} label='Rate/Seat' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) return <span className={CELL_TEXT_CLASS}>—</span>;
            return <span className={CELL_TEXT_CLASS}>{formatRateInr(r.rate_per_seat)}</span>;
          },
        },
        {
          id: 'est_monthly',
          size: 160,
          accessorKey: 'est_monthly_cost',
          header: ({ column }) => <SortableColumnHeader column={column} label='Est. Monthly' />,
          cell: ({ row }) => {
            const r = row.original;
            if (r._isManual && !r.space_id) return <span className={CELL_TEXT_CLASS}>—</span>;
            return <span className={CELL_TEXT_CLASS}>{formatRateInr(r.est_monthly_cost)}</span>;
          },
        },
        {
          id: 'actions',
          size: 80,
          enableSorting: false,
          ...getFrozenActionsColumnExtras(true),
          header: () => null,
          cell: ({ row }) => {
            return (
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='xsmall'
                className='text-text-soft-400 hover:text-[#DF1C41]'
                onClick={() => onRemoveRow(row.original)}
                aria-label='Remove space'
              >
                <Button.Icon as={RiDeleteBinLine} className='size-5' />
              </Button.Root>
            );
          },
        },
      ],
      [
        leadId,
        selectedIds,
        onSelectionChange,
        onRemoveRow,
        onManualRowChange,
        selectAllChecked,
        selectableRowIds,
      ],
    );

    const visibleColumns = useMemo(() => {
      const configured = applyColumnConfig(columns, columnConfigHook.columns);
      return orderColumnsWithActionsLast(configured.filter((c) => c.visible !== false));
    }, [columns, columnConfigHook.columns]);

    const tableMinWidth = useMemo(
      () => visibleColumns.reduce((sum, col) => sum + (Number(col.size) || 120), 0),
      [visibleColumns],
    );

    const getColumnWidth = useCallback(
      (columnId) => {
        const col = visibleColumns.find((c) => c.id === columnId);
        return Number(col?.size) || (columnId === 'actions' ? 56 : 120);
      },
      [visibleColumns],
    );

    const [sorting, setSorting] = useState(DEFAULT_SORTING);

    const table = useReactTable({
      data: rows,
      columns: visibleColumns,
      enableColumnPinning: true,
      state: {
        columnPinning: { right: ['actions'] },
        sorting,
      },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getRowId: (row) => row.id,
      initialState: { sorting: DEFAULT_SORTING },
    });

    const manualTable = useReactTable({
      data: manualRows,
      columns: visibleColumns,
      enableColumnPinning: true,
      state: { columnPinning: { right: ['actions'] } },
      getCoreRowModel: getCoreRowModel(),
      getRowId: (row) => row.id,
    });

    const suggestedTableRows = table.getRowModel().rows;
    const manualTableRows = manualTable.getRowModel().rows;

    const renderBodyRow = (row, rowIndex, sectionRows) => {
      const r = row.original;
      const isManualEmpty = r._isManual && !r.space_id;
      const isSelected = isRowSelected(selectedIds, r.id);

      return (
        <React.Fragment key={row.id}>
          <Table.Row
            className={cn(
              'group/row h-10 border-none transition-colors',
              isSelected && 'bg-bg-weak-100',
              !isSelected && 'hover:bg-bg-weak-50',
              isManualEmpty && 'bg-bg-weak-50',
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <Table.Cell
                key={cell.id}
                column={cell.column}
                className={cn('align-middle', cell.column.columnDef.meta?.cellClassName)}
                style={{
                  width: getColumnWidth(cell.column.id),
                  minWidth: getColumnWidth(cell.column.id),
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Table.Cell>
            ))}
          </Table.Row>
          {rowIndex < sectionRows.length - 1 ? <Table.RowDivider /> : null}
        </React.Fragment>
      );
    };

    return (
      <div className='flex min-h-0 flex-1 flex-col'>
        <div className='min-h-0 flex-1 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
          <Table.Root
            variant='compact'
            className='min-h-0 h-full w-full overflow-auto'
            tableInstance={table}
            stickyHeader
            style={{ tableLayout: 'fixed', width: '100%', minWidth: tableMinWidth }}
          >
            <Table.Header className='sticky top-0 z-20 bg-bg-weak-50'>
              {table.getHeaderGroups().map((hg) => (
                <Table.Row key={hg.id} className='h-9 border-none hover:bg-bg-weak-50'>
                  {hg.headers.map((header) => (
                    <Table.Head
                      key={header.id}
                      column={header.column}
                      className={HEADER_CELL_CLASS}
                      style={{
                        width: getColumnWidth(header.column.id),
                        minWidth: getColumnWidth(header.column.id),
                      }}
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
              {suggestedTableRows.map((row, rowIndex) =>
                renderBodyRow(row, rowIndex, suggestedTableRows),
              )}
              {suggestedTableRows.length > 0 && manualTableRows.length > 0 ? (
                <Table.RowDivider />
              ) : null}
              {manualTableRows.map((row, rowIndex) =>
                renderBodyRow(row, rowIndex, manualTableRows),
              )}
              <Table.Row className='border-none bg-bg-weak-50 hover:bg-bg-weak-50'>
                <Table.Cell
                  colSpan={visibleColumns.length}
                  className='border-t border-stroke-soft-200 py-3 pl-3'
                >
                  <button
                    type='button'
                    onClick={onAddManualRow}
                    className='inline-flex items-center gap-2 text-label-sm font-medium text-primary-base transition-opacity hover:opacity-80'
                  >
                    <span className='flex size-6 items-center justify-center rounded-full border border-primary-base bg-bg-white-0'>
                      <RiAddLine className='size-3.5' aria-hidden />
                    </span>
                    {ADD_MORE_SPACES_LABEL}
                  </button>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    );
  },
);

CrmLeadSuggestedInventoryTable.displayName = 'CrmLeadSuggestedInventoryTable';

export default CrmLeadSuggestedInventoryTable;
