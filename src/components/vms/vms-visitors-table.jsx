import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useDispatch, useSelector } from 'react-redux';
import { RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';

import * as Table from '@/components/ui/table';
import * as Avatar from '@/components/ui/avatar';
import VmsGroupedView from '@/components/vms/vms-grouped-view';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import VmsRemoveModal from '@/components/vms/vms-remove-modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { EMPTY_SORTING, getStatusColor } from '@/components/vms/constants';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import { formatDurationDisplay, safeDisplayDateTime } from '@/utils/date-utils';
import { getInitials, resolveFileUrl } from '@/lib/utils';
import { updateVisitorEntryThunk } from '@/redux/vmsSlice';
import { getCenterListThunk } from '@/redux/centerSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const VmsVisitorsTable = React.forwardRef(
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
      tableId = 'vms-visitors-table',
      variant = 'compact',
      // API-driven column config
      apiColumns = [],
      onColumnsChange,
      /** Keeps toolbar column manager in sync (refs alone do not re-render parents). */
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
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();

    // ── Inline editing ───────────────────────────────────────────────────────
    const dispatch = useDispatch();
    const [localRows, setLocalRows] = useState(rows);
    useEffect(() => setLocalRows(rows), [rows]);

    const centerListData = useSelector((state) => state.center.centerListData?.data);
    const purposeListData = useSelector((state) => state.vms.purposeOfVisitList?.data?.data);

    useEffect(() => {
      if (!centerListData || centerListData.length === 0) {
        dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 })).catch(() => {});
      }
    }, [dispatch, centerListData]);

    const centerOptions = useMemo(
      () => (centerListData || []).map((c) => ({ value: c.name, label: c.center_name || c.name })),
      [centerListData],
    );
    const purposeOptions = useMemo(
      () =>
        [
          ...(purposeListData || []).filter(
            (p) => (p?.name || '').trim().toLowerCase() !== 'other',
          ),
          { name: 'Other' },
        ].map((p) => ({ value: p.name, label: p.name })),
      [purposeListData],
    );

    const handleFieldUpdate = useCallback(
      (name, field, value, prevRow, extraPatch = {}) => {
        if (!name) return;
        setLocalRows((prev) =>
          prev.map((r) =>
            (r.name || r.id) === name ? { ...r, [field]: value, ...extraPatch } : r,
          ),
        );
        dispatch(updateVisitorEntryThunk({ name, payload: { [field]: value } }))
          .unwrap()
          .then(() => showSuccessToast('Saved'))
          .catch((error) => {
            setLocalRows((prev) => prev.map((r) => ((r.name || r.id) === name ? prevRow : r)));
            showErrorToast(error || 'Failed to update visitor');
          });
      },
      [dispatch],
    );

    const renderInlineText = useCallback(
      (row, field, { numericOnly = false } = {}) => {
        const name = row.original.name || row.original.id;
        const display = row.original[field] == null ? '' : String(row.original[field]);
        return (
          <div className='min-w-[120px]' onClick={(e) => e.stopPropagation()}>
            <InlineEditableText
              value={display}
              placeholder='—'
              numericOnly={numericOnly}
              displayClassName='paragraph-small text-text-sub-600 text-nowrap'
              inputClassName='paragraph-small text-text-sub-600'
              onSave={(v) => {
                const next = String(v ?? '').trim();
                if (next === display.trim()) return;
                handleFieldUpdate(
                  name,
                  field,
                  numericOnly && next !== '' ? Number(next) : next,
                  row.original,
                );
              }}
            />
          </div>
        );
      },
      [handleFieldUpdate],
    );

    const renderInlineSelect = useCallback(
      (row, field, options, { extraPatch, fallbackLabel } = {}) => {
        const name = row.original.name || row.original.id;
        const value = row.original[field] || '';
        const label =
          options.find((o) => o.value === value)?.label || fallbackLabel || value || '--';
        return (
          <div className='min-w-[160px]' onClick={(e) => e.stopPropagation()}>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              showArrow={false}
              value={value}
              options={options}
              placeholder='—'
              searchPlaceholder='Search...'
              triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
              contentClassName='min-w-[230px]'
              onValueChange={(next) =>
                next !== value &&
                handleFieldUpdate(name, field, next, row.original, extraPatch?.(next) || {})
              }
              renderTrigger={() => (
                <span className='paragraph-small text-nowrap text-text-sub-600'>{label}</span>
              )}
            />
          </div>
        );
      },
      [handleFieldUpdate],
    );

    // ── Column config driven by apiColumns ──────────────────────────────────
    const [columnConfig, setColumnConfig] = useState([]);
    const prevColumnsKeyRef = useRef('');
    /** Skip debounced persist right after applied API/Redux column sync (not user edits). */
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

    // ── All possible column definitions (keyed by API field names) ───────────
    const allColumnDefs = useMemo(
      () => [
        {
          id: 'first_name',
          accessorKey: 'first_name',
          columnLabel: 'First Name',
          header: ({ column }) => renderSortableHeader(column, 'First Name'),
          cell: ({ row }) => {
            const name = row.original.name || row.original.id;
            const first = (row.original.first_name || '').trim();
            const lastName = (row.original.last_name || '').trim();
            const fullName = [first, lastName].filter(Boolean).join(' ').trim() || '--';
            const photoUrl = row.original.custom_visitor_photo
              ? resolveFileUrl(row.original.custom_visitor_photo)
              : '';
            return (
              <div
                className='flex w-[220px] min-w-0 max-w-[220px] items-center gap-1'
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar.Root size='24' color='gray' className='shrink-0'>
                  {photoUrl ? (
                    <Avatar.Image src={photoUrl} alt='' />
                  ) : (
                    <span className='text-label-xs'>{getInitials(fullName) || '--'}</span>
                  )}
                </Avatar.Root>
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <div className='min-w-0 flex-1'>
                      <InlineEditableText
                        value={first}
                        placeholder='—'
                        displayClassName='paragraph-small truncate text-text-strong-950 font-medium'
                        inputClassName='paragraph-small text-text-strong-950 font-medium'
                        onSave={(v) => {
                          const next = String(v ?? '').trim();
                          if (next === first) return;
                          handleFieldUpdate(name, 'first_name', next, row.original);
                        }}
                      />
                    </div>
                  </Tooltip.Trigger>
                  {first && <Tooltip.Content size='xsmall'>{first}</Tooltip.Content>}
                </Tooltip.Root>
              </div>
            );
          },
          enableSorting: true,
          meta: {
            headClassName: 'w-[240px] min-w-[240px] max-w-[240px]',
            cellClassName: 'w-[240px] min-w-[240px] max-w-[240px]',
          },
        },
        {
          id: 'last_name',
          accessorKey: 'last_name',
          columnLabel: 'Last Name',
          header: ({ column }) => renderSortableHeader(column, 'Last Name'),
          cell: ({ row }) => {
            const name = row.original.name || row.original.id;
            const last = (row.original.last_name || '').trim();
            return (
              <div
                className='w-[180px] max-w-[180px] overflow-hidden'
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <div className='min-w-0 overflow-hidden'>
                      <InlineEditableText
                        value={last}
                        placeholder='—'
                        displayClassName='paragraph-small truncate text-text-sub-600'
                        inputClassName='paragraph-small text-text-sub-600'
                        onSave={(v) => {
                          const next = String(v ?? '').trim();
                          if (next === last) return;
                          handleFieldUpdate(name, 'last_name', next, row.original);
                        }}
                      />
                    </div>
                  </Tooltip.Trigger>
                  {last && <Tooltip.Content size='xsmall'>{last}</Tooltip.Content>}
                </Tooltip.Root>
              </div>
            );
          },
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
          cell: ({ row }) => {
            const email = row.original.email;
            const inlineText = renderInlineText(row, 'email');
            if (!email) return inlineText;
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <div className='max-w-[180px] truncate'>{inlineText}</div>
                </Tooltip.Trigger>
                <Tooltip.Content size='xsmall'>{email}</Tooltip.Content>
              </Tooltip.Root>
            );
          },
          enableSorting: false,
        },
        {
          id: 'company_name',
          accessorKey: 'company_name',
          columnLabel: 'Visitor Company Name',
          header: ({ column }) => renderSortableHeader(column, 'Visitor Company Name'),
          cell: ({ row }) => renderInlineText(row, 'company_name'),
          enableSorting: true,
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
          cell: ({ row }) =>
            renderInlineSelect(row, 'center', centerOptions, {
              fallbackLabel: row.original.center_name,
              extraPatch: (next) => ({
                center_name: centerOptions.find((o) => o.value === next)?.label || '',
              }),
            }),
          enableSorting: true,
        },
        {
          id: 'type',
          accessorKey: 'type',
          columnLabel: 'Type',
          header: () => <div className='flex items-center text-nowrap'>Type</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.type || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'host',
          accessorKey: 'host',
          columnLabel: 'Host',
          header: ({ column }) => renderSortableHeader(column, 'Host'),
          cell: ({ row }) => renderInlineText(row, 'host'),
          enableSorting: true,
        },
        {
          id: 'host_company_name',
          accessorKey: 'host_company_name',
          columnLabel: 'Host Company Name',
          header: ({ column }) => renderSortableHeader(column, 'Host Company Name'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.host_company_name || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'vehicle_number',
          accessorKey: 'vehicle_number',
          columnLabel: 'Vehicle No.',
          header: () => <div className='flex items-center text-nowrap'>Vehicle No.</div>,
          cell: ({ row }) => renderInlineText(row, 'vehicle_number'),
          enableSorting: false,
        },
        {
          id: 'badge_number',
          accessorKey: 'badge_number',
          columnLabel: 'Badge No.',
          header: () => <div className='flex items-center text-nowrap'>Badge No.</div>,
          cell: ({ row }) => renderInlineText(row, 'badge_number'),
          enableSorting: false,
        },
        {
          id: 'purpose_of_visit',
          accessorKey: 'purpose_of_visit',
          columnLabel: 'Purpose of Visit',
          header: () => <div className='flex items-center text-nowrap'>Purpose of Visit</div>,
          cell: ({ row }) => {
            const purpose = row.original.purpose_of_visit;
            const inlineSelect = renderInlineSelect(row, 'purpose_of_visit', purposeOptions);
            if (!purpose) return inlineSelect;
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <div className='max-w-[160px] truncate'>{inlineSelect}</div>
                </Tooltip.Trigger>
                <Tooltip.Content size='xsmall'>{purpose}</Tooltip.Content>
              </Tooltip.Root>
            );
          },
          enableSorting: false,
        },
        {
          id: 'no_of_visitors',
          accessorKey: 'no_of_visitors',
          columnLabel: 'No. of Visitors',
          header: ({ column }) => renderSortableHeader(column, 'No. of Visitors'),
          cell: ({ row }) => renderInlineText(row, 'no_of_visitors', { numericOnly: true }),
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
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              {renderSortableHeader(column, 'Status')}
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusPopoverColumnConfig}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            </div>
          ),
          cell: ({ row }) => {
            const { status } = row.original;
            const statusColorRaw = row.original.status_color;
            if (!status) return <span className='paragraph-small text-text-sub-400'>--</span>;
            if (hasStatusBadgeColor(statusColorRaw)) {
              return (
                <StatusColorPill
                  value={status}
                  color={statusColorRaw}
                  className='max-w-[min(100%,180px)]'
                />
              );
            }
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
        //         aria-label='Delete visitor'
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
      [
        renderSortableHeader,
        renderInlineText,
        renderInlineSelect,
        centerOptions,
        purposeOptions,
        handleFieldUpdate,
      ],
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
      const defLabelMap = Object.fromEntries(allColumnDefs.map((d) => [d.id, d.columnLabel]));
      const requiredNameIds = ['first_name', 'last_name'];
      const seen = new Set(apiColumns.map((c) => c.id));
      let merged = [...apiColumns];
      let nextOrder = merged.length;
      for (const id of requiredNameIds) {
        if (!seen.has(id)) {
          merged = [
            ...merged,
            {
              id,
              label: defLabelMap[id] || id,
              visible: true,
              order: nextOrder++,
            },
          ];
          seen.add(id);
        }
      }
      const key = merged.map((c) => `${c.id}:${c.visible}:${c.order ?? ''}`).join(',');
      if (prevColumnsKeyRef.current === key) return;
      prevColumnsKeyRef.current = key;
      suppressPersistFromApiRef.current = true;
      setColumnConfig(
        merged.map((c, i) => ({
          id: c.id,
          label: defLabelMap[c.id] || c.label || c.id,
          visible: c.visible !== false,
          order: c.order ?? i,
          enableHiding: true,
        })),
      );
    }, [apiColumns, allColumnDefs]);

    useEffect(() => {
      if (suppressPersistFromApiRef.current) {
        suppressPersistFromApiRef.current = false;
        return;
      }
      // Avoid POSTing implicit defaults before API hydration or user edits.
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

    const columnConfigHookValue = useMemo(
      () => ({
        columns: columnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
      }),
      [columnConfig, reorderColumns, toggleColumnVisibility, showAllColumns, hideAllColumns],
    );
    syncColumnConfigHookToPopover(columnConfigHookValue);

    // ── Scroll pagination ────────────────────────────────────────────────────
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore,
      isLoading: isLoadingMore,
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

    // ── Apply column config to get visible/ordered columns ───────────────────
    const visibleDefs = useMemo(() => {
      const actionsDef = allColumnDefs.find((d) => d.id === 'actions');

      if (columnConfig.length === 0) {
        return allColumnDefs;
      }

      const sorted = [...columnConfig].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const result = [];
      for (const col of sorted) {
        if (!col.visible) continue;
        const def = allColumnDefs.find((d) => d.id === col.id);
        if (def) result.push(def);
      }

      if (actionsDef) result.push(actionsDef);
      return result.length > 1 ? result : allColumnDefs;
    }, [allColumnDefs, columnConfig]);

    useEffect(() => {
      onColumnConfigHookChange?.(columnConfigHookValue);
    }, [columnConfigHookValue, onColumnConfigHookChange]);

    React.useImperativeHandle(ref, () => ({
      columnConfigHook: columnConfigHookValue,
    }));

    const table = useReactTable({
      data: localRows,
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
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Visitors</h3>
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
            emptyMessage='No visitors found.'
          />
          <VmsRemoveModal
            open={!!removeModalRow}
            onOpenChange={(open) => !open && setRemoveModalRow(null)}
            title='Remove visitor?'
            description='Are you sure you want to remove this visitor? This action cannot be undone.'
            onConfirm={() => {
              if (removeModalRow) onDelete?.(removeModalRow);
              setRemoveModalRow(null);
            }}
          />
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No Visitors Found</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            No visitor records match your current filters.
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
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype='Visitor Entry'
          field='status'
          showImport={false}
        />
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

          {isLoading ? (
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
                          if (cell.column.id === 'actions') {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {i < allRows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {/* Scroll pagination sentinel */}
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
          title='Remove visitor?'
          description='Are you sure you want to remove this visitor? This action cannot be undone.'
          onConfirm={() => {
            if (removeModalRow) onDelete?.(removeModalRow);
            setRemoveModalRow(null);
          }}
        />
      </div>
    );
  },
);

VmsVisitorsTable.displayName = 'VmsVisitorsTable';

export default VmsVisitorsTable;
