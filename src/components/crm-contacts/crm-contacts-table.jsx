import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import {
  RiErrorWarningLine,
  RiDeleteBinLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiCalendarLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiCheckboxIndeterminateFill,
} from 'react-icons/ri';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import * as Select from '@/components/ui/select';
import * as Popover from '@/components/ui/popover';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { Datepicker } from '@/components/ui/datepicker';
import { CityCombobox } from '@/components/crm-leads/city-combobox';
import { getCpContactsForCpAccount } from '@/api/crmLeads';
import { parseToDate, calculateAgeFromDob, formatDisplayDateOnly } from '@/utils/date-utils';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import { useColumnConfig } from '@/hooks/use-column-config';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import { CrmContactsSortableHeader } from '@/components/crm-contacts/crm-contacts-sortable-header';
import {
  CONTACT_COLUMN_DEFS,
  EMPTY_STATES,
  CONTACT_COLUMN_MIN_WIDTH,
  CONTACT_COLUMN_MAX_WIDTH,
  DEFAULT_CONTACT_COLUMN_WIDTHS,
  computeContactDataMinWidths,
  DESIGNATION_OPTIONS,
  DEPARTMENT_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
  SUBSCRIPTION_TYPE_OPTIONS,
  UNSUBSCRIBED_REASON_OPTIONS,
  SELECT_NONE_VALUE,
  GROUPS_BY_OPTIONS,
} from './constants';
import {
  FROZEN_ACTIONS_COLUMN_ID,
  buildFrozenColumnPinning,
  getFrozenActionsColumnExtras,
  getFrozenHeaderTableProps,
  getFrozenLeftColumnExtras,
  getFrozenRootTableProps,
  getFrozenTanStackColumnProp,
  getFrozenWrapperClassName,
  orderColumnsWithActionsLast,
  withFrozenColumnPinning,
} from '@/lib/frozen-table-columns';

const PINNED_CONTACT_NAME_COLUMN_ID = 'name';

const EMPTY_ARRAY = [];

const CP_NONE_VALUE = '__none__';

function getCpOptionLabel(options, value) {
  const key = String(value || '').trim();
  if (!key) return '';
  const match = options.find((opt) => String(opt.value) === key);
  return match?.label ?? key;
}

function CpContactTableCell({ cpAccount, value, displayLabel, allOptions, onChange }) {
  const [scopedOptions, setScopedOptions] = useState([]);
  const current = String(value || '').trim();
  const cpAccountId = String(cpAccount || '').trim();
  const fallbackOptions = Array.isArray(allOptions) ? allOptions : [];

  useEffect(() => {
    if (!cpAccountId) {
      setScopedOptions(fallbackOptions);
      return undefined;
    }

    let cancelled = false;
    getCpContactsForCpAccount(cpAccountId)
      .then((list) => {
        if (!cancelled) setScopedOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setScopedOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [cpAccountId, fallbackOptions]);

  const options = useMemo(() => {
    const base = cpAccountId ? scopedOptions : fallbackOptions;
    if (current && !base.some((opt) => String(opt.value) === current)) {
      const label = displayLabel || current;
      return [{ value: current, label }, ...base];
    }
    return base;
  }, [cpAccountId, scopedOptions, fallbackOptions, current, displayLabel]);

  const resolvedLabel = displayLabel || getCpOptionLabel(options, current);

  if (!onChange || (options.length === 0 && !current)) {
    return (
      <span className='paragraph-small text-text-sub-600 whitespace-nowrap truncate'>
        {resolvedLabel || '-'}
      </span>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select.Root
        variant='borderless'
        value={current || CP_NONE_VALUE}
        onValueChange={(v) => onChange(v === CP_NONE_VALUE ? '' : v)}
        size='xsmall'
      >
        <Select.Trigger className='w-full min-w-0' showArrow={false}>
          <Select.Value>
            {current ? (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap truncate'>
                {resolvedLabel}
              </span>
            ) : (
              <span className='paragraph-small text-text-sub-600'>—</span>
            )}
          </Select.Value>
        </Select.Trigger>
        <Select.Content className='min-w-[200px] max-h-[min(360px,70vh)]'>
          <Select.Item value={CP_NONE_VALUE}>—</Select.Item>
          {options.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label ?? opt.value}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase();
}

/** Tag-style pill: rounded border, white fill, light gray text (match reference). */
const tagPillClass =
  'inline-flex items-center rounded-full border border-stroke-soft-200 bg-white px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 whitespace-nowrap';

const dobCalendarIconClassName =
  'pointer-events-none absolute right-0 top-1/2 size-4 shrink-0 -translate-y-1/2 text-text-soft-400 opacity-0 transition-opacity duration-200 group-hover/field:opacity-100 group-focus-within/field:opacity-100';

/** Independent sortable table for a single group — same pattern as crm-accounts-table GroupTable */
const GroupTable = React.memo(
  ({
    groupRows,
    columns,
    getWidth,
    variant,
    onRowClick,
    tableMinWidth,
    hideActionsColumn,
    freezeColumns = false,
  }) => {
    const [localSorting, setLocalSorting] = useState([]);

    const groupTable = useReactTable({
      data: groupRows,
      columns,
      enableColumnPinning: freezeColumns,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: freezeColumns,
          leftColumnId: PINNED_CONTACT_NAME_COLUMN_ID,
          hideActionsColumn,
          columns,
        }),
      ),
      onSortingChange: setLocalSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: false,
      enableSortingRemoval: true,
    });

    return (
      <Table.Root
        variant={variant}
        {...getFrozenRootTableProps(freezeColumns, {
          tableInstance: groupTable,
          unfrozenClassName: 'w-full',
        })}
        style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
      >
        <Table.Header {...getFrozenHeaderTableProps(freezeColumns)}>
          {groupTable.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
              {headerGroup.headers.map((header) => {
                const colId = header.column.id;
                const width = colId === 'actions' ? 60 : getWidth(colId);
                return (
                  <Table.Head
                    key={header.id}
                    {...getFrozenTanStackColumnProp(freezeColumns, header.column)}
                    className={cn(
                      'text-left label-small text-text-sub-600 font-medium pl-4 pr-4',
                      header.column.columnDef.meta?.headClassName,
                    )}
                    style={{ width, minWidth: colId === 'actions' ? 60 : undefined }}
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
          {groupTable.getRowModel().rows.map((row, rowIndex, allRows) => (
            <React.Fragment key={row.id}>
              <Table.Row
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : ''}
              >
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id;
                  const width = colId === 'actions' ? 60 : getWidth(colId);
                  return (
                    <Table.Cell
                      key={cell.id}
                      {...getFrozenTanStackColumnProp(freezeColumns, cell.column)}
                      className={cn('align-middle', cell.column.columnDef.meta?.cellClassName)}
                      style={{ width, minWidth: colId === 'actions' ? 60 : undefined }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
              {rowIndex < allRows.length - 1 && <Table.RowDivider />}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    );
  },
);

GroupTable.displayName = 'GroupTable';

/** Collapsible grouped view — same UI as crm-accounts (group header button + table per group). */
const GroupedContactsView = ({
  sortedKeys,
  groups,
  columns,
  getWidth,
  variant,
  onRowClick,
  tableMinWidth,
  hideActionsColumn = false,
  freezeColumns = false,
}) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries(sortedKeys.map((k) => [k, true])),
  );

  useEffect(() => {
    setExpandedKeys((previous) => {
      const next = { ...previous };
      sortedKeys.forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [sortedKeys]);

  const toggle = (key) => setExpandedKeys((previous) => ({ ...previous, [key]: !previous[key] }));

  return (
    <div className='w-full flex flex-col gap-10'>
      {sortedKeys.map((key) => {
        const groupRows = groups[key] || [];
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div key={key} className='flex w-full flex-col items-start gap-1'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex items-center gap-1 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            >
              {key}
              <span className='text-text-soft-400 font-normal'>({groupRows.length})</span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded && (
              <div className='w-full pt-2 [&_table]:table-fixed'>
                <GroupTable
                  groupRows={groupRows}
                  columns={columns}
                  getWidth={getWidth}
                  variant={variant}
                  onRowClick={onRowClick}
                  tableMinWidth={tableMinWidth}
                  hideActionsColumn={hideActionsColumn}
                  freezeColumns={freezeColumns}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CrmContactsTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      context = 'default',
      emptyStateTitle,
      emptyStateDescription,
      onRetry,
      onRowClick,
      onDeleteContact,
      removeFromAccountMode = false,
      onSortingChange,
      sorting = [],
      variant = 'compact',
      persistColumnConfig,
      fetchColumnConfig,
      columnConfigId = 'crm-contacts-table',
      hideActionsColumn = false,
      groupBy = '',
      groupOrder = 'asc',
      onGroupByChange = null,
      columnWidths: columnWidthsProperty = null,
      onColumnResize = null,
      resizeEnabled = true,
      // Scroll pagination props
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      onFieldUpdate,
      contactOptions = {},
      freezeColumns = false,
      enableSelection = false,
      selectedContactIds = EMPTY_ARRAY,
      onToggleContactSelection,
      onToggleSelectAll,
    },
    ref,
  ) => {
    const selectedContactIds_ = selectedContactIds ?? EMPTY_ARRAY;
    const data = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
    const selectedContactIdSet = useMemo(
      () => new Set(selectedContactIds_.map(String)),
      [selectedContactIds_],
    );
    const visibleContactIds = useMemo(
      () => data.map((row) => String(row?.id || row?.name || '').trim()).filter(Boolean),
      [data],
    );
    const allVisibleSelected =
      enableSelection &&
      visibleContactIds.length > 0 &&
      visibleContactIds.every((id) => selectedContactIdSet.has(id));
    const someVisibleSelected =
      enableSelection && visibleContactIds.some((id) => selectedContactIdSet.has(id));
    const [localSorting, setLocalSorting] = useState(sorting);
    const [resizing, setResizing] = useState(null);
    const resizingRef = useRef(null);
    const liveWidthRef = useRef(null);
    const sentinelRef = useRef(null);

    // Sync local sorting with prop
    useEffect(() => {
      if (JSON.stringify(localSorting) !== JSON.stringify(sorting)) {
        setLocalSorting(sorting);
      }
    }, [sorting]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(next);
        onSortingChange?.(next);
      },
      [localSorting, onSortingChange],
    );

    const emptyState = useMemo(() => EMPTY_STATES[context] || EMPTY_STATES.default, [context]);

    // ── Scroll pagination ─────────────────────────────────────────────────────
    useEffect(() => {
      if (!enableScrollPagination || !onLoadMore || !sentinelRef.current) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
            onLoadMore();
          }
        },
        { threshold: 0 },
      );
      observer.observe(sentinelRef.current);
      return () => observer.disconnect();
    }, [enableScrollPagination, onLoadMore, hasMore, isLoadingMore, isLoading]);

    // ── Column widths ─────────────────────────────────────────────────────────
    const [internalColumnWidths, setInternalColumnWidths] = useState(DEFAULT_CONTACT_COLUMN_WIDTHS);
    const columnWidths = useMemo(() => {
      if (columnWidthsProperty && typeof columnWidthsProperty === 'object') {
        return { ...DEFAULT_CONTACT_COLUMN_WIDTHS, ...columnWidthsProperty };
      }
      return { ...DEFAULT_CONTACT_COLUMN_WIDTHS, ...internalColumnWidths };
    }, [columnWidthsProperty, internalColumnWidths]);
    const useExternalWidths = columnWidthsProperty != null;

    const dataDerivedMinWidths = useMemo(() => computeContactDataMinWidths(data), [data]);

    const resolvedColumnWidths = useMemo(() => {
      const out = { ...columnWidths };
      for (const [colId, minFromData] of Object.entries(dataDerivedMinWidths)) {
        const base = out[colId] ?? DEFAULT_CONTACT_COLUMN_WIDTHS[colId] ?? CONTACT_COLUMN_MIN_WIDTH;
        out[colId] = Math.min(
          CONTACT_COLUMN_MAX_WIDTH,
          Math.max(CONTACT_COLUMN_MIN_WIDTH, Math.max(base, minFromData)),
        );
      }
      return out;
    }, [columnWidths, dataDerivedMinWidths]);

    const getWidth = useCallback(
      (columnId) => {
        const w =
          resizing?.columnId === columnId ? resizing.liveWidth : resolvedColumnWidths[columnId];
        return typeof w === 'number'
          ? Math.min(CONTACT_COLUMN_MAX_WIDTH, Math.max(CONTACT_COLUMN_MIN_WIDTH, w))
          : (DEFAULT_CONTACT_COLUMN_WIDTHS[columnId] ?? 150);
      },
      [resolvedColumnWidths, resizing],
    );

    const handleResizeStart = useCallback(
      (columnId, startX) => {
        const startWidth =
          resolvedColumnWidths[columnId] ?? DEFAULT_CONTACT_COLUMN_WIDTHS[columnId] ?? 150;
        const clamped = Math.min(
          CONTACT_COLUMN_MAX_WIDTH,
          Math.max(CONTACT_COLUMN_MIN_WIDTH, startWidth),
        );
        setResizing({ columnId, startX, startWidth: clamped, liveWidth: clamped });
        resizingRef.current = { columnId, startX, startWidth: clamped };
        liveWidthRef.current = clamped;
      },
      [resolvedColumnWidths],
    );

    const effectiveOnColumnResize = resizeEnabled && onColumnResize ? onColumnResize : null;

    useEffect(() => {
      if (!resizing) return;

      const onMouseMove = (e) => {
        if (!resizingRef.current) return;
        const delta = e.clientX - resizingRef.current.startX;
        let next = resizingRef.current.startWidth + delta;
        next = Math.max(CONTACT_COLUMN_MIN_WIDTH, Math.min(CONTACT_COLUMN_MAX_WIDTH, next));
        liveWidthRef.current = next;
        setResizing((previous) => (previous ? { ...previous, liveWidth: next } : null));
      };

      const onMouseUp = () => {
        if (resizingRef.current && liveWidthRef.current != null) {
          const finalWidth = Math.max(
            CONTACT_COLUMN_MIN_WIDTH,
            Math.min(CONTACT_COLUMN_MAX_WIDTH, liveWidthRef.current),
          );
          if (effectiveOnColumnResize) {
            effectiveOnColumnResize(resizingRef.current.columnId, finalWidth);
          } else {
            setInternalColumnWidths((previous) => ({
              ...previous,
              [resizingRef.current.columnId]: finalWidth,
            }));
          }
        }
        setResizing(null);
        resizingRef.current = null;
        liveWidthRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }, [resizing, effectiveOnColumnResize]);

    // ── Column definitions ────────────────────────────────────────────────────
    const allColumnDefs = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'name',
          ...getFrozenLeftColumnExtras(freezeColumns),
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex min-w-0 items-center gap-1.5 overflow-hidden'>
                {enableSelection ? (
                  <button
                    type='button'
                    aria-label={
                      allVisibleSelected ? 'Deselect all contacts' : 'Select all contacts'
                    }
                    aria-pressed={allVisibleSelected}
                    disabled={visibleContactIds.length === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleSelectAll?.();
                    }}
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center transition-opacity disabled:opacity-40',
                      someVisibleSelected || allVisibleSelected
                        ? 'text-primary-base opacity-100'
                        : 'text-icon-soft-400 opacity-0 group-hover/header:opacity-100',
                    )}
                  >
                    {allVisibleSelected ? (
                      <RiCheckboxFill size={16} className='shrink-0' />
                    ) : someVisibleSelected ? (
                      <RiCheckboxIndeterminateFill size={16} className='shrink-0' />
                    ) : (
                      <RiCheckboxBlankLine size={16} className='shrink-0' />
                    )}
                  </button>
                ) : null}
                <span className='whitespace-nowrap'>Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Name ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const contactId = String(row.original.id || row.original.name || '').trim();
            const displayName = String(row.original.name || '').trim();
            const isSelected = Boolean(
              enableSelection && contactId && selectedContactIdSet.has(contactId),
            );

            let nameContent;
            if (onFieldUpdate && contactName) {
              nameContent = (
                <div className='flex min-w-0 max-w-full items-center gap-2 py-1'>
                  <CrmAccountAvatar
                    name={displayName || '?'}
                    index={row.index}
                    size={24}
                    className='shrink-0'
                  />
                  <InlineEditableText
                    value={displayName}
                    editOnIconOnly
                    placeholder='—'
                    displayClassName='font-medium text-text-strong-950'
                    inputClassName='paragraph-small font-medium text-text-strong-950'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === displayName) return;
                      onFieldUpdate(contactName, 'name', trimmed);
                    }}
                  />
                </div>
              );
            } else if (!displayName) {
              nameContent = (
                <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>-</span>
              );
            } else {
              nameContent = (
                <div className='flex items-center gap-2 py-1'>
                  <CrmAccountAvatar name={displayName} index={row.index} size={24} />
                  <span className='paragraph-small font-medium text-text-strong-950 whitespace-nowrap'>
                    {displayName}
                  </span>
                </div>
              );
            }

            if (!enableSelection) return nameContent;

            return (
              <div className='flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden'>
                <button
                  type='button'
                  aria-label={isSelected ? 'Deselect contact' : 'Select contact'}
                  aria-pressed={isSelected}
                  data-prevent-row-click
                  disabled={!contactId}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!contactId) return;
                    onToggleContactSelection?.(contactId);
                  }}
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center transition-opacity disabled:opacity-40',
                    isSelected
                      ? 'text-primary-base opacity-100'
                      : 'text-icon-soft-400 opacity-0 group-hover/row:opacity-100',
                  )}
                >
                  {isSelected ? (
                    <RiCheckboxFill size={16} className='shrink-0' />
                  ) : (
                    <RiCheckboxBlankLine size={16} className='shrink-0' />
                  )}
                </button>
                {nameContent}
              </div>
            );
          },
        },
        {
          id: 'account',
          accessorKey: 'account',
          header: ({ column }) => <Table.SortableHeader column={column} label='Account' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = row.original.account || '';
            const options = contactOptions?.account?.length ? contactOptions.account : [];
            if (onFieldUpdate && contactName && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={value || undefined}
                    onValueChange={(v) => onFieldUpdate(contactName, 'account', v ?? '')}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                          {value || '-'}
                        </span>
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[160px]'>
                      {options.map((opt) => (
                        <Select.Item
                          key={opt.value ?? opt.name}
                          value={opt.value ?? opt.name ?? ''}
                        >
                          {opt.label ?? opt.customer_name ?? opt.value ?? opt.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {value || '-'}
              </span>
            );
          },
        },
        {
          id: 'created_at',
          accessorKey: 'created_at',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Created At' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            if (!row.original.created_at || row.original.created_at === '-') {
              return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>-</span>;
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {row.original.created_at}
              </span>
            );
          },
        },
        {
          id: 'last_modified_at',
          accessorKey: 'last_modified_at',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Last Modified' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            if (!row.original.last_modified_at || row.original.last_modified_at === '-') {
              return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>-</span>;
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {row.original.last_modified_at}
              </span>
            );
          },
        },
        {
          id: 'sales_owner',
          accessorKey: 'sales_owner',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Sales Owner' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = row.original.sales_owner || '';
            const options = contactOptions?.sales_owner?.length ? contactOptions.sales_owner : [];
            const ownerLabel =
              options.find(
                (opt) =>
                  opt.value === value ||
                  opt.name === value ||
                  opt.email === value ||
                  opt.label === value,
              )?.label ?? value;

            if (onFieldUpdate && contactName && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Tooltip.Root delayDuration={0}>
                    <Select.Root
                      variant='borderless'
                      value={value || '__none__'}
                      onValueChange={(v) =>
                        onFieldUpdate(contactName, 'sales_owner', v === '__none__' ? '' : v)
                      }
                      size='xsmall'
                    >
                      <Tooltip.Trigger asChild>
                        <Select.Trigger className='w-full min-w-0' showArrow={false}>
                          {value ? (
                            <div className='flex items-center gap-2 whitespace-nowrap'>
                              <CrmAccountAvatar name={value} size={24} />
                            </div>
                          ) : (
                            <Select.Value placeholder='-' />
                          )}
                        </Select.Trigger>
                      </Tooltip.Trigger>
                      <Select.Content className='min-w-[180px]'>
                        <Select.Item value='__none__'>-</Select.Item>
                        {options.map((opt) => (
                          <Select.Item
                            key={opt.value ?? opt.name ?? opt.email}
                            value={opt.value ?? opt.name ?? opt.email ?? ''}
                          >
                            <div className='flex items-center gap-2'>
                              <CrmAccountAvatar
                                name={opt.label ?? opt.name ?? opt.value ?? opt.email}
                                size={20}
                              />
                              <span>{opt.label ?? opt.name ?? opt.value ?? opt.email}</span>
                            </div>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    {ownerLabel ? (
                      <Tooltip.Content
                        side='top'
                        variant='light'
                        size='medium'
                        className='max-w-[280px] p-3'
                      >
                        <div className='flex min-w-0 items-center gap-2'>
                          <CrmAccountAvatar name={ownerLabel} size={32} className='shrink-0' />
                          <div className='flex min-w-0 flex-col'>
                            <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                              {ownerLabel}
                            </span>
                          </div>
                        </div>
                      </Tooltip.Content>
                    ) : null}
                  </Tooltip.Root>
                </div>
              );
            }
            if (!value || value === '-') {
              return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>-</span>;
            }
            return (
              <Tooltip.Root delayDuration={0}>
                <Tooltip.Trigger
                  type='button'
                  className='inline-flex items-center bg-transparent border-0 p-0 cursor-default'
                >
                  <div className='flex items-center gap-2 whitespace-nowrap'>
                    <CrmAccountAvatar name={value} size={24} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <CrmAccountAvatar name={ownerLabel} size={32} className='shrink-0' />
                    <div className='flex min-w-0 flex-col'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {ownerLabel}
                      </span>
                    </div>
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            );
          },
        },
        {
          id: 'cp_account',
          accessorKey: 'cp_account',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='CP Account' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = String(row.original.cp_account || '').trim();
            const cpAccountOptions = contactOptions?.cp_account?.length
              ? contactOptions.cp_account
              : [];
            const displayLabel =
              row.original.cp_account_name || getCpOptionLabel(cpAccountOptions, value);
            const opts = cpAccountOptions;
            if (onFieldUpdate && contactName && (opts.length > 0 || value)) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={value || CP_NONE_VALUE}
                    onValueChange={(v) =>
                      onFieldUpdate(contactName, 'cp_account', v === CP_NONE_VALUE ? '' : v)
                    }
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {value ? (
                          <span className='paragraph-small text-text-sub-600 whitespace-nowrap truncate'>
                            {displayLabel}
                          </span>
                        ) : (
                          <span className='paragraph-small text-text-sub-600'>—</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[200px] max-h-[min(360px,70vh)]'>
                      <Select.Item value={CP_NONE_VALUE}>—</Select.Item>
                      {opts.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label ?? opt.value}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap truncate'>
                {displayLabel || '-'}
              </span>
            );
          },
        },
        {
          id: 'cp_contact',
          accessorKey: 'cp_contact',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='CP Contact' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = row.original.cp_contact || '';
            const cpAccount = row.original.cp_account || '';
            const cpContactOptions = contactOptions?.cp_contact?.length
              ? contactOptions.cp_contact
              : [];
            return (
              <CpContactTableCell
                cpAccount={cpAccount}
                value={value}
                displayLabel={row.original.cp_contact_name}
                allOptions={cpContactOptions}
                onChange={
                  onFieldUpdate && contactName
                    ? (next) => onFieldUpdate(contactName, 'cp_contact', next)
                    : null
                }
              />
            );
          },
        },
        {
          id: 'email',
          accessorKey: 'email',
          header: ({ column }) => <Table.SortableHeader column={column} label='Email' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const email = String(row.original.email || '').trim();
            if (onFieldUpdate && contactName) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={email}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === email) return;
                      onFieldUpdate(contactName, 'email', trimmed);
                    }}
                  />
                </div>
              );
            }
            if (!email) return <span className='paragraph-small text-text-sub-600'>-</span>;
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>{email}</span>
            );
          },
        },
        {
          id: 'designation',
          accessorKey: 'designation',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Designation' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = row.original.designation || '';
            const options = contactOptions?.designation?.length
              ? contactOptions.designation
              : DESIGNATION_OPTIONS;
            if (onFieldUpdate && contactName && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={value || '__none__'}
                    onValueChange={(v) =>
                      onFieldUpdate(contactName, 'designation', v === '__none__' ? '' : v)
                    }
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {value ? (
                          <span className={tagPillClass}>{value}</span>
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>-</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[140px]'>
                      <Select.Item value='__none__'>-</Select.Item>
                      {options.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label ?? opt.value}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {value ? <span className={tagPillClass}>{value}</span> : '-'}
              </span>
            );
          },
        },
        {
          id: 'department',
          accessorKey: 'department',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Department' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = row.original.department || '';
            const options = contactOptions?.department?.length
              ? contactOptions.department
              : DEPARTMENT_OPTIONS;
            if (onFieldUpdate && contactName && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={value || '__none__'}
                    onValueChange={(v) =>
                      onFieldUpdate(contactName, 'department', v === '__none__' ? '' : v)
                    }
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {value ? (
                          <span className={tagPillClass}>{value}</span>
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>-</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[140px]'>
                      <Select.Item value='__none__'>-</Select.Item>
                      {options.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label ?? opt.value}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {value ? <span className={tagPillClass}>{value}</span> : '-'}
              </span>
            );
          },
        },
        {
          id: 'mobile_number',
          accessorKey: 'mobile_number',
          header: ({ column }) => <Table.SortableHeader column={column} label='Contact' sortable />,
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.mobile_number || '-'}
            </span>
          ),
        },
        {
          id: 'alt_mobile_number',
          accessorKey: 'alt_mobile_number',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Alternate Contact' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.alt_mobile_number || '-'}
            </span>
          ),
        },
        {
          id: 'dob',
          accessorKey: 'dob',
          header: ({ column }) => <Table.SortableHeader column={column} label='DOB' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const dob = String(row.original.dob || '').trim();
            if (onFieldUpdate && contactName) {
              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className='group/field relative min-w-0 max-w-full pr-5'
                >
                  <Datepicker
                    value={parseToDate(dob) || undefined}
                    onChange={(date) => {
                      const next = date ? format(date, 'yyyy-MM-dd') : '';
                      if (next === dob) return;
                      onFieldUpdate(contactName, 'dob', next);
                    }}
                    placeholder='—'
                    variant='borderless'
                    size='xsmall'
                    max={new Date()}
                    formatDate={(date) => formatDisplayDateOnly(date)}
                    className='paragraph-small text-text-sub-600'
                  />
                  <RiCalendarLine className={dobCalendarIconClassName} aria-hidden />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {dob ? formatDisplayDateOnly(dob, '-') : '-'}
              </span>
            );
          },
        },
        {
          id: 'age',
          accessorKey: 'age',
          header: ({ column }) => <Table.SortableHeader column={column} label='Age' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const age = calculateAgeFromDob(row.original.dob);
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {age || '-'}
              </span>
            );
          },
        },
        {
          id: 'city',
          accessorKey: 'city',
          header: ({ column }) => <Table.SortableHeader column={column} label='City' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = row.original.city || '';
            if (onFieldUpdate && contactName) {
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <CityCombobox
                    value={value}
                    onChange={(v) => onFieldUpdate(contactName, 'city', v ?? '')}
                    placeholder='-'
                    inlineTrigger
                    className='w-full max-w-full'
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {value ? <span className={tagPillClass}>{value}</span> : '-'}
              </span>
            );
          },
        },
        {
          id: 'subscription_status',
          accessorKey: 'subscription_status',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Subscription Status' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const value = row.original.subscription_status || '';
            const options =
              contactOptions?.subscription_status?.length > 0
                ? contactOptions.subscription_status
                : SUBSCRIPTION_STATUS_OPTIONS.filter((o) => o.value !== SELECT_NONE_VALUE);
            const selectValue = value || SELECT_NONE_VALUE;
            if (onFieldUpdate && contactName) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    matchTriggerWidth={false}
                    value={selectValue}
                    onValueChange={(v) =>
                      onFieldUpdate(
                        contactName,
                        'subscription_status',
                        v === SELECT_NONE_VALUE ? '' : v,
                      )
                    }
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {value ? (
                          <span className={tagPillClass}>{value}</span>
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>-</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[200px]'>
                      <Select.Item value={SELECT_NONE_VALUE}>-</Select.Item>
                      {options.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {value ? <span className={tagPillClass}>{value}</span> : '-'}
              </span>
            );
          },
        },
        {
          id: 'subscription_type',
          accessorKey: 'subscription_type',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Subscription Type' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const raw = row.original.subscription_type;
            let types = [];
            if (Array.isArray(raw)) types = raw.filter(Boolean);
            else if (typeof raw === 'string' && raw !== '-')
              types = raw
                .split(',')
                .map((c) => c.trim())
                .filter(Boolean);
            const options = contactOptions?.subscription_type?.length
              ? contactOptions.subscription_type
              : SUBSCRIPTION_TYPE_OPTIONS;

            const visibleCount = 1;
            const visibleTypes = types.slice(0, visibleCount);
            const remainingCount = types.length - visibleCount;
            const remainingTypes = types.slice(visibleCount);

            const displayTags = (
              <div className='flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-hidden'>
                {types.length === 0 ? (
                  <span className='paragraph-small text-text-sub-600'>-</span>
                ) : (
                  <>
                    {visibleTypes.map((type, index) => (
                      <span key={`${type}-${index}`} className={tagPillClass}>
                        {type}
                      </span>
                    ))}
                    {remainingCount > 0 && (
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span
                            className={cn(
                              tagPillClass,
                              'cursor-default border-stroke-soft-200 text-text-sub-500',
                            )}
                          >
                            +{remainingCount}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          side='top'
                          className='max-w-xs rounded-lg border border-stroke-soft-200 bg-white p-2 shadow-regular-md'
                        >
                          <div className='text-paragraph-sm font-medium text-text-strong-950 mb-1.5'>
                            Subscription types
                          </div>
                          <ul className='flex flex-col gap-1'>
                            {remainingTypes.map((type, index) => (
                              <li
                                key={`${type}-${index}`}
                                className='text-paragraph-sm text-text-sub-600'
                              >
                                {type}
                              </li>
                            ))}
                          </ul>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    )}
                  </>
                )}
              </div>
            );

            if (onFieldUpdate && contactName && options.length > 0) {
              const handleToggle = (optValue) => {
                const next = types.includes(optValue)
                  ? types.filter((t) => t !== optValue)
                  : [...types, optValue];
                onFieldUpdate(contactName, 'subscription_type', next);
              };
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <div
                        className={cn(
                          'flex w-full min-w-0 min-h-8 cursor-pointer items-center outline-none select-none',
                          'rounded-md hover:bg-bg-weak-50/70 focus-visible:ring-2 focus-visible:ring-stroke-strong-950/20',
                        )}
                      >
                        {displayTags}
                      </div>
                    </Popover.Trigger>
                    <Popover.Content
                      className='max-h-60 overflow-y-auto p-1 min-w-[200px] border border-stroke-soft-200 bg-white shadow-regular-md'
                      showArrow={false}
                      align='start'
                      sideOffset={4}
                    >
                      {options.map((opt) => {
                        const isSelected = types.includes(opt.value);
                        return (
                          <div
                            key={opt.value}
                            className={cn(
                              'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-paragraph-sm',
                              isSelected ? 'bg-bg-weak-50' : 'hover:bg-bg-weak-50',
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(opt.value);
                            }}
                          >
                            <span>{opt.label ?? opt.value}</span>
                            {isSelected && (
                              <RiCheckLine className='ml-auto size-4 text-text-sub-600' />
                            )}
                          </div>
                        );
                      })}
                    </Popover.Content>
                  </Popover.Root>
                </div>
              );
            }
            return types.length > 0 ? (
              displayTags
            ) : (
              <span className='paragraph-small text-text-sub-600'>-</span>
            );
          },
        },
        {
          id: 'unsubscribe_reason',
          accessorKey: 'unsubscribe_reason',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Unsubscribe Reason' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const contactName = row.original.id;
            const reason = row.original.unsubscribe_reason || '';
            const options = contactOptions?.unsubscribed_reason?.length
              ? contactOptions.unsubscribed_reason
              : UNSUBSCRIBED_REASON_OPTIONS.filter((o) => o.value !== SELECT_NONE_VALUE);
            if (onFieldUpdate && contactName && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    matchTriggerWidth={false}
                    value={reason || SELECT_NONE_VALUE}
                    onValueChange={(v) =>
                      onFieldUpdate(
                        contactName,
                        'unsubscribed_reason',
                        v === SELECT_NONE_VALUE ? '' : v,
                      )
                    }
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {reason ? (
                          <span className={tagPillClass}>{reason}</span>
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>-</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[200px]'>
                      <Select.Item value={SELECT_NONE_VALUE}>-</Select.Item>
                      {options.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            if (!reason) return <span className='paragraph-small text-text-sub-600'>-</span>;
            return (
              <span className={tagPillClass} title={reason}>
                {reason}
              </span>
            );
          },
        },
        ...(hideActionsColumn
          ? []
          : [
              {
                id: FROZEN_ACTIONS_COLUMN_ID,
                header: <div className='invisible'>A</div>,
                enableHiding: false,
                cell: ({ row }) => (
                  <div className='flex items-center justify-end'>
                    <CompactButton.Root
                      type='button'
                      variant='error'
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteContact?.(row.original);
                      }}
                      aria-label={
                        removeFromAccountMode ? 'Remove contact from account' : 'Delete contact'
                      }
                    >
                      <CompactButton.Icon as={RiDeleteBinLine} />
                    </CompactButton.Root>
                  </div>
                ),
                enableSorting: false,
                ...getFrozenActionsColumnExtras(freezeColumns),
              },
            ]),
      ],
      [
        onFieldUpdate,
        contactOptions,
        freezeColumns,
        hideActionsColumn,
        onDeleteContact,
        removeFromAccountMode,
        enableSelection,
        selectedContactIdSet,
        allVisibleSelected,
        someVisibleSelected,
        visibleContactIds,
        onToggleContactSelection,
        onToggleSelectAll,
      ],
    );

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(CONTACT_COLUMN_DEFS);
      const configMap = new Map(config.map((col) => [col.id, col]));

      // Merge defaults from CONTACT_COLUMN_DEFS into current definitions
      config.forEach((col, index) => {
        const contactDef = CONTACT_COLUMN_DEFS.find((c) => c.id === col.id);
        if (contactDef) {
          col.visible = contactDef.visible !== false;
          col.enableHiding = contactDef.enableHiding !== false;
        }
        col.order = index;
      });

      return config.sort((a, b) => a.order - b.order);
    }, []);

    const defaultPersist = useCallback(() => {}, []);
    const defaultFetch = useCallback(() => {}, []);

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      reorderColumns,
      reorderColumnsByIds,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
      applyExternalConfig,
    } = useColumnConfig(
      columnConfigId,
      defaultColumnConfig,
      persistColumnConfig ?? defaultPersist,
      fetchColumnConfig ?? defaultFetch,
      { autoSave: true, debounce: 500, pinnedColumnId: PINNED_CONTACT_NAME_COLUMN_ID },
    );

    const columns = useMemo(
      () => orderColumnsWithActionsLast(applyColumnConfig(allColumnDefs, columnConfig)),
      [allColumnDefs, columnConfig],
    );

    const table = useReactTable({
      data,
      columns,
      enableColumnPinning: freezeColumns,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: freezeColumns,
          leftColumnId: PINNED_CONTACT_NAME_COLUMN_ID,
          hideActionsColumn,
          columns,
        }),
      ),
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    const canResize = Boolean(resizeEnabled && (effectiveOnColumnResize || !useExternalWidths));

    const groupableColumnIds = useMemo(
      () =>
        GROUPS_BY_OPTIONS.map((opt) => opt.value).filter(
          (value) => typeof value === 'string' && value,
        ),
      [],
    );

    const handleSortColumnFromMenu = useCallback(
      (columnId) => {
        if (!columnId) return;
        const current = Array.isArray(localSorting) ? localSorting : [];
        const existing = current.find((item) => item.id === columnId);
        let next;
        if (!existing) {
          next = [{ id: columnId, desc: false }];
        } else if (!existing.desc) {
          next = [{ id: columnId, desc: true }];
        } else {
          next = [];
        }
        setLocalSorting(next);
        onSortingChange?.(next);
      },
      [localSorting, onSortingChange],
    );

    const handleGroupColumnFromMenu = useCallback(
      (columnId) => {
        if (!onGroupByChange || !columnId) return;
        onGroupByChange(groupBy === columnId ? '' : columnId);
      },
      [groupBy, onGroupByChange],
    );

    const handleHideColumnFromMenu = useCallback(
      (columnId) => {
        if (!columnId) return;
        toggleColumnVisibility(columnId);
      },
      [toggleColumnVisibility],
    );

    React.useImperativeHandle(ref, () => ({
      columnConfig,
      columnConfigHook: {
        columns: columnConfig,
        visibleColumns: visibleColumnConfig,
        reorderColumns,
        reorderColumnsByIds,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
        applyExternalConfig,
      },
    }));

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + (col.id === 'actions' ? 60 : getWidth(col.id)), 0),
      [columns, getWidth, resizing],
    );

    // ── Group-by logic — same as crm-accounts: { sortedKeys, groups } for GroupedContactsView ──
    const groupedData = useMemo(() => {
      if (!groupBy) return null;
      const groups = {};
      for (const row of data) {
        let key = row[groupBy];
        if (key === undefined || key === null || key === '' || key === '-') key = '(None)';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }
      const sortedKeys = Object.keys(groups).sort((a, b) =>
        groupOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b),
      );
      return { sortedKeys, groups };
    }, [groupBy, groupOrder, data]);

    // ── Error state ───────────────────────────────────────────────────────────
    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Contacts</h3>
          <p className='mb-4 text-sm text-error-darker/80'>
            Something went wrong loading the contact list.
          </p>
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

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!isLoading && data.length === 0) {
      const emptyTitle = emptyStateTitle ?? emptyState.title;
      const emptyDescription = emptyStateDescription ?? emptyState.description;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center h-full'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyTitle}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{emptyDescription}</p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 8 }).map((_, index, array) => (
          <React.Fragment key={`contacts-skeleton-${index}`}>
            <Table.Row>
              {table.getAllColumns().map((column) => (
                <Table.Cell
                  key={column.id}
                  style={{ width: getWidth(column.id), minWidth: CONTACT_COLUMN_MIN_WIDTH }}
                >
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    const renderRow = (row, rowIndex, array) => (
      <React.Fragment key={row.id}>
        <Table.Row
          onClick={(event) => {
            if (event.target?.closest?.('[data-prevent-row-click]')) return;
            onRowClick?.(row.original);
          }}
          className={cn('group/row', onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : '')}
        >
          {row.getVisibleCells().map((cell) => (
            <Table.Cell
              key={cell.id}
              {...getFrozenTanStackColumnProp(freezeColumns, cell.column)}
              className={cn('align-middle px-4', cell.column.columnDef.meta?.cellClassName)}
              style={{
                width: cell.column.id === 'actions' ? 60 : getWidth(cell.column.id),
                minWidth: cell.column.id === 'actions' ? 60 : CONTACT_COLUMN_MIN_WIDTH,
                maxWidth: CONTACT_COLUMN_MAX_WIDTH,
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Table.Cell>
          ))}
        </Table.Row>
        {rowIndex < array.length - 1 && <Table.RowDivider />}
      </React.Fragment>
    );

    // When grouped, render collapsible sections only (same as crm-accounts) — no outer table
    if (groupedData) {
      if (groupedData.sortedKeys.length === 0 && isLoading) {
        return (
          <div className={getFrozenWrapperClassName(freezeColumns)}>
            <Table.Root
              variant={variant}
              {...getFrozenRootTableProps(freezeColumns, { tableInstance: table })}
              style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
            >
              <Table.Header {...getFrozenHeaderTableProps(freezeColumns)}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
                    {headerGroup.headers.map((header) => {
                      const colId = header.column.id;
                      const width = colId === 'actions' ? 60 : getWidth(colId);
                      return (
                        <Table.Head
                          key={header.id}
                          {...getFrozenTanStackColumnProp(freezeColumns, header.column)}
                          className={cn(
                            'text-left label-small text-text-sub-600 font-medium pl-4 pr-4',
                            header.column.columnDef.meta?.headClassName,
                          )}
                          style={{
                            width,
                            minWidth: colId === 'actions' ? 60 : CONTACT_COLUMN_MIN_WIDTH,
                            maxWidth: CONTACT_COLUMN_MAX_WIDTH,
                          }}
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
              {renderSkeleton()}
            </Table.Root>
          </div>
        );
      }
      return (
        <div className={getFrozenWrapperClassName(freezeColumns)}>
          <GroupedContactsView
            sortedKeys={groupedData.sortedKeys}
            groups={groupedData.groups}
            columns={columns}
            getWidth={getWidth}
            variant={variant}
            onRowClick={onRowClick}
            tableMinWidth={tableMinWidth}
            hideActionsColumn={hideActionsColumn}
            freezeColumns={freezeColumns}
          />
          {enableScrollPagination && (
            <>
              <div ref={sentinelRef} data-scroll-sentinel className='h-1' />
              {isLoadingMore && (
                <div className='flex items-center justify-center gap-2 py-8'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                  <span className='paragraph-small text-text-sub-600'>Loading more groups...</span>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <div className={getFrozenWrapperClassName(freezeColumns)}>
        <Table.Root
          variant={variant}
          {...getFrozenRootTableProps(freezeColumns, { tableInstance: table })}
          style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <CrmContactsSortableHeader
            table={table}
            getWidth={getWidth}
            canResize={canResize}
            onResizeStart={canResize ? handleResizeStart : undefined}
            freezeColumns={freezeColumns}
            onReorderColumnsByIds={reorderColumnsByIds}
            columnConfig={columnConfig}
            groupBy={groupBy}
            groupableColumnIds={groupableColumnIds}
            onSortColumn={handleSortColumnFromMenu}
            onGroupColumn={onGroupByChange ? handleGroupColumnFromMenu : undefined}
            onHideColumn={handleHideColumnFromMenu}
          />

          {isLoading && data.length === 0 ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table
                .getRowModel()
                .rows.map((row, rowIndex, allRowsArray) => renderRow(row, rowIndex, allRowsArray))}
              {enableScrollPagination && (
                <>
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                  </Table.Row>
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          <span className='paragraph-small text-text-sub-600'>
                            Loading more contacts...
                          </span>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              )}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

CrmContactsTable.displayName = 'CrmContactsTable';

export default CrmContactsTable;
