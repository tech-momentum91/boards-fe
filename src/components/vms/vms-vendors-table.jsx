import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';

import * as Table from '@/components/ui/table';
import VmsGroupedView from '@/components/vms/vms-grouped-view';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import VmsRemoveModal from '@/components/vms/vms-remove-modal';
import { VmsFirstNameCell } from '@/components/vms/vms-first-name-cell';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { EMPTY_SORTING, getStatusColor } from '@/components/vms/constants';
import { formatDurationDisplay, safeDisplayDateTime } from '@/utils/date-utils';

/** Columns not applicable to Vendor entries — strip from defs and saved prefs */
const VENDOR_EXCLUDED_COLUMN_IDS = new Set([
  'type',
  'host',
  'host_company_name',
  'purpose_of_visit',
  // Space-only (if present in stale list prefs)
  'space_inquiry_type',
  'type_of_space',
  'seats',
  'source_category',
  'sales_person_in_touch',
  'cp_type',
  'ipc_name',
  'cp_company_legal_name',
  'cp_contact_name',
  'cp_contact_mobile',
  'cp_contact_email',
  // Not returned by vendor listview / Visitor Entry list API
  'work_category',
]);

const VmsVendorsTable = React.forwardRef(
  (
    {
      rows = [],
      groups = [],
      isGrouped = false,
      isLoading = false,
      error = null,
      onRetry,
      onDelete,
      onRowClick,
      sorting = EMPTY_SORTING,
      onSortingChange,
      tableId = 'vms-vendors-table',
      variant = 'compact',
      // API-driven column config
      apiColumns = [],
      onColumnsChange,
      onColumnConfigHookChange,
      // Scroll pagination
      hasMore = false,
      isLoadingMore = false,
      onLoadMore,
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [removeModalRow, setRemoveModalRow] = React.useState(null);

    // ── Column config driven by apiColumns ──────────────────────────────────
    const [columnConfig, setColumnConfig] = useState([]);
    const prevColumnsKeyRef = useRef('');
    const suppressPersistFromApiRef = useRef(false);
    const saveTimerRef = useRef(null);
    const renderSortableHeader = useCallback((column, label) => {
      const sortState = column.getIsSorted();
      return (
        <div className='flex items-center gap-1.5 text-nowrap'>
          <span className='text-paragraph-sm text-text-sub-600'>{label}</span>
          <button
            type='button'
            className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
            onClick={() => column.toggleSorting(sortState === 'asc')}
          >
            {Table.getSortingIcon(sortState)}
          </button>
        </div>
      );
    }, []);

    // console.log('rowsss -------- ******************', rows);

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'first_name',
          accessorFn: (row) =>
            [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || '',
          columnLabel: 'Name',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5 text-nowrap'>
                <span className='text-paragraph-sm text-text-sub-600'>Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => <VmsFirstNameCell row={row} nameVariant='full' />,
          enableSorting: true,
        },
        {
          id: 'mobile_number',
          accessorKey: 'mobile_number',
          columnLabel: 'Mobile Number',
          header: () => <div className='flex items-center text-nowrap'>Mobile Number</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.mobile_number || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'email',
          accessorKey: 'email',
          columnLabel: 'Email ID',
          header: () => <div className='flex items-center text-nowrap'>Email ID</div>,
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='paragraph-small text-text-sub-600 text-nowrap max-w-[180px] block overflow-hidden text-ellipsis'>
                  {row.original.email || '--'}
                </span>
              </Tooltip.Trigger>
              {row.original.email && (
                <Tooltip.Content size='xsmall'>{row.original.email}</Tooltip.Content>
              )}
            </Tooltip.Root>
          ),
          enableSorting: false,
        },
        {
          id: 'company_name',
          accessorKey: 'company_name',
          columnLabel: 'Company Name',
          header: () => <div className='flex items-center text-nowrap'>Company Name</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.company_name || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'center',
          accessorKey: 'center',
          columnLabel: 'Center',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5 text-nowrap'>
                <span className='text-paragraph-sm text-text-sub-600'>Center</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.center_name || row.original.center || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'vendor_type',
          accessorKey: 'vendor_type',
          columnLabel: 'Vendor Type',
          header: () => <div className='flex items-center text-nowrap'>Vendor Type</div>,
          cell: ({ row }) => {
            const raw = row.original?.vendor_type;
            // console.log('kirtan00000000000', raw);
            const values = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : [];
            if (values.length === 0) {
              return <span className='paragraph-small text-text-sub-400 text-nowrap'>--</span>;
            }

            const visible = values.slice(0, 2);
            const remaining = values.length - visible.length;

            return (
              <div className='flex items-center gap-1 flex-wrap'>
                {visible.map((val) => (
                  <Badge.Root
                    key={String(val)}
                    variant='stroke'
                    color='gray'
                    className='text-nowrap'
                  >
                    {String(val)}
                  </Badge.Root>
                ))}
                {remaining > 0 && (
                  <Badge.Root variant='stroke' color='gray' className='text-nowrap'>
                    +{remaining}
                  </Badge.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'assigned_supervisor',
          accessorKey: 'assigned_supervisor',
          columnLabel: 'Assigned Supervisor',
          header: ({ column }) => renderSortableHeader(column, 'Assigned Supervisor'),
          cell: ({ row }) => {
            const sup = row.original.assigned_supervisor_name ?? row.original.assigned_supervisor;
            const text =
              sup !== null && sup !== undefined && String(sup).trim() !== '' ? String(sup) : '--';
            return <span className='paragraph-small text-text-sub-600 text-nowrap'>{text}</span>;
          },
          enableSorting: true,
        },
        {
          id: 'vendor',
          accessorKey: 'vendor',
          columnLabel: 'Vendor',
          header: () => <div className='flex items-center text-nowrap'>Vendor</div>,
          cell: ({ row }) => {
            const raw = row.original?.vendor;
            return (
              <span className='paragraph-small text-text-sub-600 text-nowrap'>{raw || '--'}</span>
            );
          },
          enableSorting: false,
        },
        {
          id: 'material_carrying',
          accessorKey: 'material_carrying',
          columnLabel: 'Material Carrying',
          header: ({ column }) => renderSortableHeader(column, 'Material Carrying'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.material_carrying == 1 ? 'Yes' : 'No'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'material_desc',
          accessorKey: 'material_desc',
          columnLabel: 'Material Description',
          header: () => <div className='flex items-center text-nowrap'>Material Description</div>,
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='paragraph-small text-text-sub-600 text-nowrap max-w-[160px] block overflow-hidden text-ellipsis'>
                  {row.original.material_desc || '--'}
                </span>
              </Tooltip.Trigger>
              {row.original.material_desc && (
                <Tooltip.Content size='xsmall'>{row.original.material_desc}</Tooltip.Content>
              )}
            </Tooltip.Root>
          ),
          enableSorting: false,
        },
        {
          id: 'vehicle_number',
          accessorKey: 'vehicle_number',
          columnLabel: 'Vehicle No.',
          header: () => <div className='flex items-center text-nowrap'>Vehicle No.</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.vehicle_number || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'badge_number',
          accessorKey: 'badge_number',
          columnLabel: 'Badge No.',
          header: () => <div className='flex items-center text-nowrap'>Badge No.</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.badge_number || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'no_of_visitors',
          accessorKey: 'no_of_visitors',
          columnLabel: 'No. of Visitors',
          header: ({ column }) => renderSortableHeader(column, 'No. of Visitors'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.no_of_visitors ?? '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'visit_date_time',
          accessorKey: 'visit_date_time',
          columnLabel: 'Visit Date & Time',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5 text-nowrap'>
                <span className='text-paragraph-sm text-text-sub-600'>Visit Date &amp; Time</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {safeDisplayDateTime(row.original.visit_date_time)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          header: ({ column }) => renderSortableHeader(column, 'Status'),
          cell: ({ row }) => {
            const { status } = row.original;
            if (!status) return <span className='paragraph-small text-text-sub-400'>--</span>;
            return (
              <Badge.Root variant='light' color={getStatusColor(status)} className='text-nowrap'>
                {status}
              </Badge.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: 'check_in_date_time',
          accessorKey: 'check_in_date_time',
          columnLabel: 'Check In Date & Time',
          header: ({ column }) => renderSortableHeader(column, 'Check In Date & Time'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {safeDisplayDateTime(row.original.check_in_date_time)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'check_out_date_time',
          accessorKey: 'check_out_date_time',
          columnLabel: 'Check Out Date & Time',
          header: ({ column }) => renderSortableHeader(column, 'Check Out Date & Time'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {safeDisplayDateTime(row.original.check_out_date_time)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'duration',
          accessorKey: 'duration',
          columnLabel: 'Duration',
          header: ({ column }) => renderSortableHeader(column, 'Duration'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {formatDurationDisplay(row.original.duration)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'notes',
          accessorKey: 'notes',
          columnLabel: 'Notes',
          header: () => <div className='flex items-center text-nowrap'>Notes</div>,
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='paragraph-small text-text-sub-600 text-nowrap max-w-[160px] block overflow-hidden text-ellipsis'>
                  {row.original.notes || '--'}
                </span>
              </Tooltip.Trigger>
              {row.original.notes && (
                <Tooltip.Content size='xsmall'>{row.original.notes}</Tooltip.Content>
              )}
            </Tooltip.Root>
          ),
          enableSorting: false,
        },
        {
          id: 'owner',
          accessorKey: 'owner',
          columnLabel: 'Created By',
          header: () => <div className='flex items-center text-nowrap'>Created By</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.owner_name || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'creation',
          accessorKey: 'creation',
          columnLabel: 'Created At',
          header: () => <div className='flex items-center text-nowrap'>Created At</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {safeDisplayDateTime(row.original.creation)}
            </span>
          ),
          enableSorting: false,
        },
        // {
        //   id: 'actions',
        //   enableHiding: false,
        //   header: () => <div className='invisible'>A</div>,
        //   cell: ({ row }) => (
        //     <div className='flex items-center justify-end'>
        //       <CompactButton.Root
        //         type='button'
        //         variant='error'
        //         onClick={(e) => {
        //           e.stopPropagation();
        //           setRemoveModalRow(row.original);
        //         }}
        //         aria-label='Delete vendor'
        //       >
        //         <CompactButton.Icon as={RiDeleteBinLine} />
        //       </CompactButton.Root>
        //     </div>
        //   ),
        //   enableSorting: false,
        //   meta: {
        //     headClassName: 'sticky right-0 z-10 bg-bg-weak-50',
        //     cellClassName: 'border-stroke-soft-200 sticky right-0 z-10 bg-white',
        //   },
        // },
      ],
      [renderSortableHeader],
    );

    const defaultColumnConfig = useMemo(
      () =>
        allColumnDefs
          .filter((d) => d.id !== 'actions')
          .map((d, i) => ({
            id: d.id,
            label: d.columnLabel || d.id,
            visible: true,
            order: i,
            enableHiding: true,
          })),
      [allColumnDefs],
    );

    const effectiveManagerColumns = useMemo(() => {
      if (columnConfig.length > 0) return columnConfig;
      return defaultColumnConfig;
    }, [columnConfig, defaultColumnConfig]);

    useEffect(() => {
      if (!apiColumns || apiColumns.length === 0) return;
      const filteredApi = apiColumns.filter((c) => !VENDOR_EXCLUDED_COLUMN_IDS.has(c.id));
      const key = filteredApi.map((c) => `${c.id}:${c.visible}:${c.order ?? ''}`).join(',');
      if (prevColumnsKeyRef.current === key) return;
      prevColumnsKeyRef.current = key;
      suppressPersistFromApiRef.current = true;
      const defLabelMap = Object.fromEntries(allColumnDefs.map((d) => [d.id, d.columnLabel]));
      const apiIds = new Set(filteredApi.map((c) => c.id));

      const fromApi = filteredApi.map((c, i) => ({
        id: c.id,
        label: defLabelMap[c.id] || c.label || c.id,
        visible: c.visible !== false,
        order: c.order ?? i,
        enableHiding: true,
      }));

      /** Saved prefs often omit newer columns — append defaults so e.g. assigned_supervisor appears */
      const appended = defaultColumnConfig
        .filter((def) => !apiIds.has(def.id))
        .map((def, i) => ({
          id: def.id,
          label: defLabelMap[def.id] || def.label || def.id,
          visible: true,
          order: 100000 + i,
          enableHiding: true,
        }));

      const merged = [...fromApi, ...appended].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setColumnConfig(merged.map((c, i) => ({ ...c, order: i })));
    }, [apiColumns, allColumnDefs, defaultColumnConfig]);

    useEffect(() => {
      if (suppressPersistFromApiRef.current) {
        suppressPersistFromApiRef.current = false;
        return;
      }
      if (columnConfig.length === 0) return;

      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onColumnsChange?.(columnConfig);
      }, 300);
      return () => clearTimeout(saveTimerRef.current);
    }, [columnConfig, onColumnsChange]);

    const reorderColumns = useCallback(
      (from, to) => {
        setColumnConfig((prev) => {
          const base = (prev.length > 0 ? prev : defaultColumnConfig).map((c) => ({ ...c }));
          const [moved] = base.splice(from, 1);
          base.splice(to, 0, moved);
          return base.map((c, i) => ({ ...c, order: i }));
        });
      },
      [defaultColumnConfig],
    );

    const toggleColumnVisibility = useCallback(
      (id) => {
        setColumnConfig((prev) => {
          const base = prev.length > 0 ? prev : defaultColumnConfig;
          return base.map((c) => (c.id === id ? { ...c, visible: !c.visible } : { ...c }));
        });
      },
      [defaultColumnConfig],
    );

    const showAllColumns = useCallback(() => {
      setColumnConfig((prev) => {
        const base = prev.length > 0 ? prev : defaultColumnConfig;
        return base.map((c) => (c.enableHiding !== false ? { ...c, visible: true } : { ...c }));
      });
    }, [defaultColumnConfig]);

    const hideAllColumns = useCallback(() => {
      setColumnConfig((prev) => {
        const base = prev.length > 0 ? prev : defaultColumnConfig;
        return base.map((c) => (c.enableHiding !== false ? { ...c, visible: false } : { ...c }));
      });
    }, [defaultColumnConfig]);

    // ── Scroll pagination ────────────────────────────────────────────────────
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      enabled: Boolean(onLoadMore),
    });

    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const newSorting =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(newSorting);
        onSortingChange?.(newSorting);
      },
      [localSorting, onSortingChange],
    );

    // ── Apply column config ───────────────────────────────────────────────────
    const visibleDefs = useMemo(() => {
      const actionsDef = allColumnDefs.find((d) => d.id === 'actions');

      // Extend with generic text columns for any apiColumns ids not explicitly defined
      const extendedDefs = (() => {
        if (!apiColumns || apiColumns.length === 0) return allColumnDefs;
        const existingIds = new Set(allColumnDefs.map((d) => d.id));
        const generics = apiColumns
          .filter((c) => !existingIds.has(c.id) && !VENDOR_EXCLUDED_COLUMN_IDS.has(c.id))
          .map((c) => ({
            id: c.id,
            accessorKey: c.id,
            columnLabel: c.label || c.id,
            header: () => <div className='flex items-center text-nowrap'>{c.label || c.id}</div>,
            cell: ({ row }) => (
              <span className='paragraph-small text-text-sub-600 text-nowrap'>
                {row.original?.[c.id] ?? '--'}
              </span>
            ),
            enableSorting: false,
          }));
        return [...allColumnDefs, ...generics];
      })();

      if (columnConfig.length === 0) {
        return extendedDefs;
      }

      const sorted = [...columnConfig].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const result = [];
      for (const col of sorted) {
        if (!col.visible) continue;
        const def = extendedDefs.find((d) => d.id === col.id);
        if (def) result.push(def);
      }

      if (actionsDef) result.push(actionsDef);
      return result.length > 1 ? result : extendedDefs;
    }, [allColumnDefs, columnConfig, apiColumns]);

    const columnConfigHookValue = useMemo(
      () => ({
        columns: effectiveManagerColumns,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
      }),
      [
        effectiveManagerColumns,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
      ],
    );

    useEffect(() => {
      onColumnConfigHookChange?.(columnConfigHookValue);
    }, [columnConfigHookValue, onColumnConfigHookChange]);

    React.useImperativeHandle(ref, () => ({
      columnConfigHook: columnConfigHookValue,
    }));

    const table = useReactTable({
      data: rows,
      columns: visibleDefs,
      state: {
        sorting: localSorting,
        columnPinning: {
          left: ['first_name'],
        },
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Vendors</h3>
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
    }

    if (isGrouped) {
      return (
        <div className='w-full'>
          <VmsGroupedView
            groups={groups}
            visibleDefs={visibleDefs}
            isLoading={isLoading}
            onRowClick={onRowClick}
            onDelete={onDelete ? (row) => setRemoveModalRow(row) : undefined}
            variant={variant}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            sentinelRef={sentinelRef}
            emptyMessage='No vendors found.'
          />
          <VmsRemoveModal
            open={!!removeModalRow}
            onOpenChange={(open) => !open && setRemoveModalRow(null)}
            title='Remove vendor?'
            description='Are you sure you want to remove this vendor? This action cannot be undone.'
            onConfirm={() => {
              if (removeModalRow) onDelete?.(removeModalRow);
              setRemoveModalRow(null);
            }}
          />
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No Vendors Found</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            No vendor records match your current filters.
          </p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {(table.getHeaderGroups()[0]?.headers ?? []).map((header) => (
                <Table.Cell key={header.id} column={header.column}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div className='w-full'>
        <Table.Root variant={variant} tableInstance={table} className='overflow-auto'>
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
                    className={header.column.columnDef.meta?.headClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          {isLoading && rows.length === 0 ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, i, allRows) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className={onRowClick ? 'cursor-pointer' : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        column={cell.column}
                        className={cell.column.columnDef.meta?.cellClassName}
                        onClick={(e) => {
                          if (cell.column.id === 'actions') e.stopPropagation();
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {i < allRows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              <Table.Row ref={sentinelRef} data-scroll-sentinel>
                <Table.Cell colSpan={visibleDefs.length} className='h-1 p-0' />
              </Table.Row>
              {isLoadingMore && (
                <Table.Row>
                  <Table.Cell colSpan={visibleDefs.length} className='py-4 text-center'>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      Loading more entries...
                    </span>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          )}
        </Table.Root>

        <VmsRemoveModal
          open={!!removeModalRow}
          onOpenChange={(open) => !open && setRemoveModalRow(null)}
          title='Remove vendor?'
          description='Are you sure you want to remove this vendor? This action cannot be undone.'
          onConfirm={() => {
            if (removeModalRow) onDelete?.(removeModalRow);
            setRemoveModalRow(null);
          }}
        />
      </div>
    );
  },
);

VmsVendorsTable.displayName = 'VmsVendorsTable';

export default VmsVendorsTable;
