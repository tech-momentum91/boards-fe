import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { cn } from '@/utils/cn';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import {
  RiErrorWarningLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCalendarLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiCheckboxIndeterminateFill,
} from 'react-icons/ri';
import { useColumnConfig } from '@/hooks/use-column-config';
import { applyColumnConfig } from '@/lib/column-utils';
import * as Select from '@/components/ui/select';
import {
  ACCOUNT_COLUMN_DEFS,
  DEFAULT_ACCOUNT_COLUMN_WIDTHS,
  ACCOUNT_COLUMN_MIN_WIDTH,
  ACCOUNT_COLUMN_MAX_WIDTH,
  TYPE_OF_ORGANIZATION_OPTIONS,
  GROUP_BY_OPTIONS,
} from './constants';
import { CrmAccountsSortableHeader } from '@/components/crm-accounts/crm-accounts-sortable-header';
import {
  SELECT_NONE_VALUE,
  buildLinkSelectOptions,
  getLinkFieldOptionLabel,
  resolveLinkFieldSelectValue,
} from '@/components/crm-leads/constants';
import { useCrmLeadSizeOptions } from '@/hooks/use-crm-lead-size-options';
import { getCpContactsForCpAccount } from '@/api/crmLeads';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { Datepicker } from '@/components/ui/datepicker';
import { parseToDate, parseYearOfEstablishment } from '@/utils/date-utils';
import {
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

const ACCOUNTS_FROZEN_LEFT_COLUMN_ID = 'name';

/** Independent sortable table for a single group — each instance has its own sort state */
const GroupTable = React.memo(
  ({ groupRows, columns, getWidth, variant, onRowClick, tableMinWidth, hideActionsColumn }) => {
    const [localSorting, setLocalSorting] = useState([]);

    const groupTable = useReactTable({
      data: groupRows,
      columns,
      enableColumnPinning: true,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: true,
          leftColumnId: ACCOUNTS_FROZEN_LEFT_COLUMN_ID,
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
        {...getFrozenRootTableProps(true, { tableInstance: groupTable })}
        style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
      >
        <Table.Header {...getFrozenHeaderTableProps(true)}>
          {groupTable.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
              {headerGroup.headers.map((header) => {
                const colId = header.column.id;
                const width = colId === 'actions' ? 60 : getWidth(colId);
                return (
                  <Table.Head
                    key={header.id}
                    {...getFrozenTanStackColumnProp(true, header.column)}
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
                      {...getFrozenTanStackColumnProp(true, cell.column)}
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

/** Format a number as 4-digit year */
function formatYear(value) {
  if (!value) return '-';
  return String(value);
}

/** Map 4-digit year input to Frappe date field (YYYY-MM-DD). */
function normalizeYearForSave(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  return trimmed;
}

const establishmentCalendarIconClassName =
  'pointer-events-none absolute right-0 top-1/2 size-4 shrink-0 -translate-y-1/2 text-text-soft-400 opacity-0 transition-opacity duration-200 group-hover/field:opacity-100 group-focus-within/field:opacity-100';

/** Estimate default width from current data to avoid text overlap into adjacent columns. */
function estimateAccountColumnAutoWidths(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const sampleSize = Math.min(list.length, 200);
  const sampled = list.slice(0, sampleSize);

  const headerTextByColumn = {
    name: 'Account Name',
    custom_legal_name: 'Company Legal Name',
    created_at: 'Created At',
    last_modified_at: 'Last Modified',
    related_contacts: 'CRM Contact',
    website: 'Website',
    sales_owner: 'Sales Owner',
    cp_account: 'CP Account',
    cp_contact: 'CP Contact',
    type_of_organization: 'Type Organization',
    year_of_establishment: 'Year of Establishment',
    no_of_employees: 'No. Employee',
    industry: 'Industry',
  };

  const valueLengthByColumn = {
    name: (row) => String(row?.name || '').length,
    custom_legal_name: (row) => String(row?.custom_legal_name || '').length,
    created_at: (row) => String(row?.creation || '').length,
    last_modified_at: (row) => String(row?.last_modified_at || '').length,
    related_contacts: (row) => {
      let contacts = [];
      if (Array.isArray(row?.related_contacts)) {
        contacts = row.related_contacts;
      } else if (row?.related_contacts) {
        contacts = [row.related_contacts];
      }
      // Avatar stack consumes space even when names are short.
      return Math.max(12, contacts.length * 4);
    },
    website: (row) => String(row?.website || '').replace(/^https?:\/\//, '').length,
    sales_owner: (row) => String(row?.sales_owner || row?.sales_owner_name || '').length + 5,
    cp_account: (row) => String(row?.cp_account_name || row?.cp_account || '').length,
    cp_contact: (row) => String(row?.cp_contact_name || row?.cp_contact || '').length,
    type_of_organization: (row) => String(row?.type_of_organization || '').length,
    year_of_establishment: (row) => String(row?.year_of_establishment || '').length,
    no_of_employees: (row) => String(row?.no_of_employees || '').length,
    industry: (row) => String(row?.industry || '').length,
  };

  const widths = {};
  Object.keys(DEFAULT_ACCOUNT_COLUMN_WIDTHS).forEach((columnId) => {
    if (columnId === 'actions') return;
    const headerLength = (headerTextByColumn[columnId] || columnId).length;
    const measure = valueLengthByColumn[columnId];
    let maxLength = headerLength;
    if (typeof measure === 'function') {
      sampled.forEach((row) => {
        maxLength = Math.max(maxLength, measure(row));
      });
    }
    // ~8px per char + generous cell padding for fixed layout tables.
    const estimated = maxLength * 8 + 56;
    widths[columnId] = Math.min(
      ACCOUNT_COLUMN_MAX_WIDTH,
      Math.max(
        ACCOUNT_COLUMN_MIN_WIDTH,
        Math.max(DEFAULT_ACCOUNT_COLUMN_WIDTHS[columnId] || 150, estimated),
      ),
    );
  });
  return widths;
}

/** Collapsible grouped view — same UI pattern as Team Management Core/Support (group header + table per group). */
/** Collapsible grouped view — each group gets its own independent sort state via GroupTable */
const GroupedAccountsView = ({
  sortedKeys,
  groups,
  columns,
  getWidth,
  variant,
  onRowClick,
  tableMinWidth,
  hideActionsColumn = false,
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
              {key || '(None)'}
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
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const EMPTY_ARRAY = [];

const CrmAccountsTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      onRetry,
      onRowClick,
      onRelatedContactsClick,
      onSortingChange,
      sorting,
      variant = 'compact',
      columnWidths: columnWidthsProperty = null,
      onColumnResize = null,
      persistColumnConfig,
      fetchColumnConfig,
      columnConfigId = 'crm-accounts-table',
      actionAriaLabel = 'Delete account',
      hideActionsColumn = false,
      groupBy = '',
      groupOrder = 'asc',
      onGroupByChange = null,
      // Scroll pagination
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      // Inline edit
      onSalesOwnerUpdate = null,
      onTypeOfOrganizationUpdate = null,
      onIndustryUpdate = null,
      onNoOfEmployeesUpdate = null,
      onCustomLegalNameUpdate = null,
      onLegalNameUpdate = null,
      onYearsOfEstablishmentUpdate = null,
      onWebsiteUpdate = null,
      onCpAccountUpdate = null,
      onCpContactUpdate = null,
      salesOwnerOptions,
      typeOfOrgOptions,
      industryGroups,
      cpAccountOptions,
      cpContactOptions,
      emptyStateTitle,
      emptyStateDescription,
      enableSelection = false,
      selectedAccountIds = EMPTY_ARRAY,
      onToggleAccountSelection,
      onToggleSelectAll,
    },
    ref,
  ) => {
    const sorting_ = sorting ?? EMPTY_ARRAY;
    const leadSizeOptions = useCrmLeadSizeOptions();
    const salesOwnerOptions_ = salesOwnerOptions ?? EMPTY_ARRAY;
    const typeOfOrgOptions_ = typeOfOrgOptions ?? EMPTY_ARRAY;
    const industryGroups_ = industryGroups ?? EMPTY_ARRAY;
    const cpAccountOptions_ = cpAccountOptions ?? EMPTY_ARRAY;
    const cpContactOptions_ = cpContactOptions ?? EMPTY_ARRAY;
    const selectedAccountIds_ = selectedAccountIds ?? EMPTY_ARRAY;
    const industryLabelByValue = useMemo(() => {
      const map = new Map();
      for (const group of industryGroups_) {
        for (const opt of Array.isArray(group?.industry_name) ? group.industry_name : []) {
          if (opt?.value != null && opt.value !== '') {
            map.set(String(opt.value), opt.label ?? String(opt.value));
          }
        }
      }
      return map;
    }, [industryGroups_]);
    const data = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
    const selectedAccountIdSet = useMemo(
      () => new Set(selectedAccountIds_.map(String)),
      [selectedAccountIds_],
    );
    const visibleAccountIds = useMemo(
      () => data.map((row) => String(row?.name || '').trim()).filter(Boolean),
      [data],
    );
    const allVisibleSelected =
      enableSelection &&
      visibleAccountIds.length > 0 &&
      visibleAccountIds.every((id) => selectedAccountIdSet.has(id));
    const someVisibleSelected =
      enableSelection && visibleAccountIds.some((id) => selectedAccountIdSet.has(id));
    const [localSorting, setLocalSorting] = useState(sorting_);
    const [resizing, setResizing] = useState(null);
    const resizingRef = useRef(null);
    const liveWidthRef = useRef(null);
    const sentinelRef = useRef(null);

    useEffect(() => {
      setLocalSorting(sorting_);
    }, [sorting_]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(next);
        onSortingChange?.(next);
      },
      [localSorting, onSortingChange],
    );

    // ── Column widths ─────────────────────────────────────────────────────────
    const columnWidths = useMemo(() => {
      const autoWidths = estimateAccountColumnAutoWidths(data);
      if (columnWidthsProperty && typeof columnWidthsProperty === 'object') {
        // Persisted/manual resize widths must win over auto-estimated defaults.
        return { ...autoWidths, ...columnWidthsProperty };
      }
      return autoWidths;
    }, [columnWidthsProperty, data]);

    const getWidth = useCallback(
      (columnId) => {
        const w = resizing?.columnId === columnId ? resizing.liveWidth : columnWidths[columnId];
        return typeof w === 'number'
          ? Math.min(ACCOUNT_COLUMN_MAX_WIDTH, Math.max(ACCOUNT_COLUMN_MIN_WIDTH, w))
          : (DEFAULT_ACCOUNT_COLUMN_WIDTHS[columnId] ?? 150);
      },
      [columnWidths, resizing],
    );

    // ── Column resizing ───────────────────────────────────────────────────────
    const handleResizeStart = useCallback(
      (columnId, startX) => {
        const startWidth = columnWidths[columnId] ?? DEFAULT_ACCOUNT_COLUMN_WIDTHS[columnId] ?? 150;
        const clamped = Math.min(
          ACCOUNT_COLUMN_MAX_WIDTH,
          Math.max(ACCOUNT_COLUMN_MIN_WIDTH, startWidth),
        );
        setResizing({ columnId, startX, startWidth: clamped, liveWidth: clamped });
        resizingRef.current = { columnId, startX, startWidth: clamped };
        liveWidthRef.current = clamped;
      },
      [columnWidths],
    );

    useEffect(() => {
      if (!resizing) return;

      const onMouseMove = (e) => {
        if (!resizingRef.current) return;
        const delta = e.clientX - resizingRef.current.startX;
        let next = resizingRef.current.startWidth + delta;
        next = Math.max(ACCOUNT_COLUMN_MIN_WIDTH, Math.min(ACCOUNT_COLUMN_MAX_WIDTH, next));
        liveWidthRef.current = next;
        setResizing((previous) => (previous ? { ...previous, liveWidth: next } : null));
      };

      const onMouseUp = () => {
        if (resizingRef.current && onColumnResize && liveWidthRef.current != null) {
          const finalWidth = Math.max(
            ACCOUNT_COLUMN_MIN_WIDTH,
            Math.min(ACCOUNT_COLUMN_MAX_WIDTH, liveWidthRef.current),
          );
          onColumnResize(resizingRef.current.columnId, finalWidth);
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
    }, [resizing, onColumnResize]);

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

    // ── Column config (column manager + persist) ──────────────────────────────
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
      ACCOUNT_COLUMN_DEFS,
      persistColumnConfig ?? (() => {}),
      fetchColumnConfig ?? (() => {}),
      { autoSave: true, debounce: 500, pinnedColumnId: ACCOUNTS_FROZEN_LEFT_COLUMN_ID },
    );

    // ── Column definitions ────────────────────────────────────────────────────
    const allColumnDefs = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'account_name',
          enableSorting: true,
          ...getFrozenLeftColumnExtras(true),
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex min-w-0 items-center gap-1.5 overflow-hidden'>
                {enableSelection ? (
                  <button
                    type='button'
                    aria-label={
                      allVisibleSelected ? 'Deselect all accounts' : 'Select all accounts'
                    }
                    aria-pressed={allVisibleSelected}
                    disabled={visibleAccountIds.length === 0}
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
                <span className='whitespace-nowrap'>Account Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Account Name ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const accountId = String(accountName || '').trim();
            const legalName = String(
              row.original.customer_name || row.original.account_name || '',
            ).trim();
            const isSelected = Boolean(
              enableSelection && accountId && selectedAccountIdSet.has(accountId),
            );
            const nameEditor =
              onLegalNameUpdate && accountName ? (
                <div className='min-w-0 max-w-full'>
                  <InlineEditableText
                    value={legalName}
                    editOnIconOnly
                    placeholder='—'
                    displayClassName='font-medium text-text-strong-950'
                    inputClassName='paragraph-small font-medium text-text-strong-950'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === legalName) return;
                      onLegalNameUpdate(accountName, trimmed);
                    }}
                  />
                </div>
              ) : (
                <span className='paragraph-small font-medium text-text-strong-950 whitespace-nowrap'>
                  {legalName || '-'}
                </span>
              );

            if (!enableSelection) return nameEditor;

            return (
              <div className='flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden'>
                <button
                  type='button'
                  aria-label={isSelected ? 'Deselect account' : 'Select account'}
                  aria-pressed={isSelected}
                  data-prevent-row-click
                  disabled={!accountId}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!accountId) return;
                    onToggleAccountSelection?.(accountId);
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
                {nameEditor}
              </div>
            );
          },
        },
        {
          id: 'custom_legal_name',
          accessorKey: 'custom_legal_name',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Company Legal Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Company Legal Name ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const legalName = String(row.original.custom_legal_name || '').trim();
            if (onCustomLegalNameUpdate && accountName) {
              return (
                <div className='min-w-0 max-w-full'>
                  <InlineEditableText
                    editOnIconOnly
                    value={legalName}
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === legalName) return;
                      onCustomLegalNameUpdate(accountName, trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {legalName || '-'}
              </span>
            );
          },
        },
        {
          id: 'created_at',
          accessorKey: 'creation',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Created At</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Created At ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const value = row.original.creation;
            if (!value) return <span className='paragraph-small text-text-sub-600'>-</span>;
            try {
              const date = new Date(value);
              const options = {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              };
              return (
                <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                  {date.toLocaleString('en-GB', options).replace(',', '')}
                </span>
              );
            } catch {
              return (
                <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>{value}</span>
              );
            }
          },
        },
        {
          id: 'last_modified_at',
          accessorKey: 'last_modified_at',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Last Modified</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Last Modified ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const value = row.original.last_modified_at;
            if (!value) return <span className='paragraph-small text-text-sub-600'>-</span>;
            try {
              const date = new Date(value);
              const options = {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              };
              return (
                <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                  {date.toLocaleString('en-GB', options).replace(',', '')}
                </span>
              );
            } catch {
              return (
                <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>{value}</span>
              );
            }
          },
        },
        {
          id: 'related_contacts',
          header: <span className='whitespace-nowrap'>CRM Contact</span>,
          cell: ({ row }) => {
            const contacts = row.original.related_contacts;
            const handleContactsNavigate = (event) => {
              event.stopPropagation();
              onRelatedContactsClick?.(row.original);
            };

            if (!contacts || (Array.isArray(contacts) && contacts.length === 0)) {
              if (!onRelatedContactsClick) {
                return <span className='paragraph-small text-text-sub-600'>-</span>;
              }
              return (
                <button
                  type='button'
                  className='paragraph-small text-text-sub-600 hover:text-text-strong-950 cursor-pointer bg-transparent border-0 p-0'
                  onClick={handleContactsNavigate}
                >
                  -
                </button>
              );
            }
            const list = Array.isArray(contacts) ? contacts : [contacts];
            const visible = list.slice(0, 4);
            const extra = list.length - visible.length;

            const avatarTriggerClassName = onRelatedContactsClick
              ? 'inline-flex items-center bg-transparent border-0 p-0 cursor-pointer'
              : 'inline-flex items-center bg-transparent border-0 p-0 cursor-default';

            const renderContactsList = (contactsToShow) => (
              <div className='flex flex-col gap-3'>
                <span className='text-label-xs text-text-sub-500 font-medium'>
                  Related contacts
                </span>
                {contactsToShow.map((contact, index) => {
                  const name =
                    typeof contact === 'string'
                      ? contact
                      : contact?.full_name || contact?.name || '—';
                  return (
                    <div
                      key={name ? `${name}-${index}` : index}
                      className='flex items-center gap-2 min-w-0'
                    >
                      <CrmAccountAvatar name={name} index={index} size={32} className='shrink-0' />
                      <div className='flex min-w-0 flex-col'>
                        <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                          {name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );

            return (
              <div className='flex items-center'>
                {extra === 0 ? (
                  <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger
                      type='button'
                      className={avatarTriggerClassName}
                      onClick={onRelatedContactsClick ? handleContactsNavigate : undefined}
                    >
                      {visible.map((contact, i) => {
                        const name =
                          typeof contact === 'string'
                            ? contact
                            : contact?.full_name || contact?.name;
                        return (
                          <span
                            key={i}
                            className='inline-block ring-2 ring-white rounded-full'
                            style={{
                              marginLeft: i === 0 ? 0 : -8,
                              zIndex: i,
                            }}
                          >
                            <CrmAccountAvatar name={name} index={i} size={24} />
                          </span>
                        );
                      })}
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side='top'
                      variant='light'
                      size='medium'
                      className='max-w-[280px] p-3'
                    >
                      {renderContactsList(list)}
                    </Tooltip.Content>
                  </Tooltip.Root>
                ) : (
                  <>
                    {visible.map((contact, i) => {
                      const name =
                        typeof contact === 'string' ? contact : contact?.full_name || contact?.name;
                      return (
                        <Tooltip.Root key={i}>
                          <Tooltip.Trigger
                            type='button'
                            className='inline-block ring-2 ring-white rounded-full bg-transparent border-0 p-0 cursor-default'
                            style={{
                              marginLeft: i === 0 ? 0 : -8,
                              zIndex: i,
                            }}
                            onClick={onRelatedContactsClick ? handleContactsNavigate : undefined}
                          >
                            <CrmAccountAvatar name={name} index={i} size={24} />
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            side='top'
                            variant='light'
                            size='medium'
                            className='max-w-[280px] p-3'
                          >
                            <div className='flex min-w-0 items-center gap-2'>
                              <CrmAccountAvatar
                                name={name}
                                index={i}
                                size={32}
                                className='shrink-0'
                              />
                              <div className='flex min-w-0 flex-col'>
                                <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                                  {name || '—'}
                                </span>
                              </div>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      );
                    })}
                    <Tooltip.Root delayDuration={0}>
                      <Tooltip.Trigger
                        type='button'
                        className='inline-block ring-2 ring-white rounded-full bg-transparent border-0 p-0 cursor-default'
                        style={{
                          marginLeft: -8,
                          zIndex: visible.length,
                        }}
                        onClick={onRelatedContactsClick ? handleContactsNavigate : undefined}
                      >
                        <CrmAccountAvatar
                          name={`+${extra}`}
                          index={0}
                          initials={`+${extra}`}
                          size={24}
                          className='bg-neutral-200 text-neutral-700 shadow-[inset_0px_-8px_16px_0px_rgba(197,199,201,0.48)]'
                        />
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side='top'
                        variant='light'
                        size='medium'
                        className='max-w-[280px] p-3'
                      >
                        {renderContactsList(list)}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </>
                )}
              </div>
            );
          },
        },
        {
          id: 'website',
          accessorKey: 'website',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Website</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label='Sort by Website'
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const website = String(row.original.website || '').trim();
            if (onWebsiteUpdate && accountName) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={website}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === website) return;
                      onWebsiteUpdate(accountName, trimmed);
                    }}
                  />
                </div>
              );
            }
            if (!website) return <span className='paragraph-small text-text-sub-600'>-</span>;
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap truncate'>
                {website}
              </span>
            );
          },
        },
        {
          id: 'sales_owner',
          accessorKey: 'sales_owner',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Sales Owner</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label='Sort by Sales Owner'
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const owner = row.original.sales_owner || row.original.sales_owner_name;
            const ownerValue = row.original.sales_owner_email || owner;
            const salesOpts = salesOwnerOptions_;
            if (onSalesOwnerUpdate && accountName && salesOpts.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Tooltip.Root delayDuration={0}>
                    <Select.Root
                      variant='borderless'
                      value={ownerValue || ''}
                      onValueChange={(value) => onSalesOwnerUpdate(accountName, value)}
                      size='xsmall'
                    >
                      <Tooltip.Trigger asChild>
                        <Select.Trigger className='w-full min-w-0' showArrow={false}>
                          {owner ? (
                            <span className='inline-flex items-center'>
                              <CrmAccountAvatar name={owner} size={24} showNativeTitle={false} />
                            </span>
                          ) : (
                            <Select.Value placeholder='—' />
                          )}
                        </Select.Trigger>
                      </Tooltip.Trigger>
                      <Select.Content className='min-w-[180px]'>
                        {salesOpts.map((opt) => (
                          <Select.Item key={opt.value} value={opt.value}>
                            <div className='flex items-center gap-2'>
                              <CrmAccountAvatar name={opt.label} size={20} />
                              {opt.label}
                            </div>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    {owner ? (
                      <Tooltip.Content
                        side='top'
                        variant='light'
                        size='medium'
                        className='max-w-[280px] p-3'
                      >
                        <div className='flex min-w-0 items-center gap-2'>
                          <CrmAccountAvatar name={owner} size={32} className='shrink-0' />
                          <div className='flex min-w-0 flex-col'>
                            <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                              {owner}
                            </span>
                          </div>
                        </div>
                      </Tooltip.Content>
                    ) : null}
                  </Tooltip.Root>
                </div>
              );
            }
            if (!owner) return <span className='paragraph-small text-text-sub-600'>-</span>;
            return (
              <Tooltip.Root delayDuration={0}>
                <Tooltip.Trigger
                  type='button'
                  className='inline-flex items-center bg-transparent border-0 p-0 cursor-default'
                >
                  <CrmAccountAvatar name={owner} size={24} showNativeTitle={false} />
                </Tooltip.Trigger>
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <CrmAccountAvatar name={owner} size={32} className='shrink-0' />
                    <div className='flex min-w-0 flex-col'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {owner}
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
          enableSorting: true,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='CP Account' sortable />
          ),
          cell: ({ row }) => {
            const accountName = row.original.name;
            const value = String(row.original.cp_account || '').trim();
            const displayLabel =
              row.original.cp_account_name || getCpOptionLabel(cpAccountOptions_, value);
            const opts = cpAccountOptions_;
            if (onCpAccountUpdate && accountName && (opts.length > 0 || value)) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={value || CP_NONE_VALUE}
                    onValueChange={(v) =>
                      onCpAccountUpdate(accountName, v === CP_NONE_VALUE ? '' : v)
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
          enableSorting: true,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='CP Contact' sortable />
          ),
          cell: ({ row }) => {
            const accountName = row.original.name;
            const value = row.original.cp_contact || '';
            const cpAccount = row.original.cp_account || '';
            return (
              <CpContactTableCell
                cpAccount={cpAccount}
                value={value}
                displayLabel={row.original.cp_contact_name}
                allOptions={cpContactOptions_}
                onChange={
                  onCpContactUpdate && accountName
                    ? (next) => onCpContactUpdate(accountName, next, cpAccount)
                    : null
                }
              />
            );
          },
        },

        {
          id: 'type_of_organization',
          accessorKey: 'type_of_organization',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Type Organization</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label='Sort by Type Organization'
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const v = row.original.type_of_organization;
            const typeOrgOpts =
              typeOfOrgOptions_?.length > 0 ? typeOfOrgOptions_ : TYPE_OF_ORGANIZATION_OPTIONS;
            if (onTypeOfOrganizationUpdate && accountName && typeOrgOpts.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={v || ''}
                    onValueChange={(value) => onTypeOfOrganizationUpdate(accountName, value)}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {v ? (
                          <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                            {v}
                          </span>
                        ) : (
                          <span className='paragraph-small text-text-sub-600'>—</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[200px]'>
                      {typeOrgOpts.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            if (!v) return <span className='paragraph-small text-text-sub-600'>-</span>;
            return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>{v}</span>;
          },
        },
        {
          id: 'year_of_establishment',
          accessorKey: 'year_of_establishment',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Year of Establishment</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label='Sort by Year of Establishment'
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const year = String(row.original.year_of_establishment || '').trim();
            if (onYearsOfEstablishmentUpdate && accountName) {
              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className='group/field relative min-w-0 max-w-full pr-5'
                >
                  <Datepicker
                    value={parseYearOfEstablishment(year)}
                    onChange={(date) => {
                      const storedDate = normalizeYearForSave(year);
                      const next = date ? format(date, 'yyyy-MM-dd') : '';
                      if (next === storedDate) return;
                      onYearsOfEstablishmentUpdate(accountName, next);
                    }}
                    placeholder='—'
                    variant='borderless'
                    size='xsmall'
                    max={new Date()}
                    formatDate={(date) => format(date, 'yyyy')}
                    className='paragraph-small text-text-sub-600'
                  />
                  <RiCalendarLine className={establishmentCalendarIconClassName} aria-hidden />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {formatYear(year)}
              </span>
            );
          },
        },
        {
          id: 'no_of_employees',
          accessorKey: 'no_of_employees',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>No. Employee</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label='Sort by No. Employee'
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const rawValue = String(row.original.no_of_employees ?? '').trim();
            const value = resolveLinkFieldSelectValue(rawValue, rawValue, leadSizeOptions);
            const empOpts = buildLinkSelectOptions(leadSizeOptions, value, rawValue);
            const displayLabel = getLinkFieldOptionLabel(value, leadSizeOptions, rawValue) || value;
            if (onNoOfEmployeesUpdate && accountName && empOpts.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={value ? value : SELECT_NONE_VALUE}
                    onValueChange={(nextValue) =>
                      onNoOfEmployeesUpdate(
                        accountName,
                        nextValue === SELECT_NONE_VALUE ? '' : nextValue,
                      )
                    }
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {value ? (
                          <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                            {displayLabel}
                          </span>
                        ) : (
                          <span className='paragraph-small text-text-sub-600'>—</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[140px]'>
                      <Select.Item value={SELECT_NONE_VALUE}>—</Select.Item>
                      {empOpts.map((opt) => (
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
                {displayLabel || '-'}
              </span>
            );
          },
        },
        {
          id: 'industry',
          accessorKey: 'industry',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Industry</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label='Sort by Industry'
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const accountName = row.original.name;
            const v = row.original.industry;
            const displayLabel = v ? industryLabelByValue.get(String(v)) || v : '';
            if (onIndustryUpdate && accountName && industryGroups_.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={v || ''}
                    onValueChange={(value) => onIndustryUpdate(accountName, value)}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {v ? (
                          <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                            {displayLabel}
                          </span>
                        ) : (
                          <span className='paragraph-small text-text-sub-600'>—</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[220px] max-h-[min(360px,70vh)]'>
                      {industryGroups_.map((group) => (
                        <Select.Group key={group.value} className='py-1'>
                          <Select.GroupLabel className='block px-2 pb-1 pt-2 text-paragraph-xs font-medium text-text-soft-400'>
                            {group.label}
                          </Select.GroupLabel>
                          {(Array.isArray(group.industry_name) ? group.industry_name : []).map(
                            (opt) => (
                              <Select.Item
                                key={`${group.value}-${opt.value}`}
                                value={opt.value}
                                className='paragraph-small'
                              >
                                {opt.label}
                              </Select.Item>
                            ),
                          )}
                        </Select.Group>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {displayLabel || v || '-'}
              </span>
            );
          },
        },
        {
          id: 'actions',
          header: '',
          cell: ({ row }) => (
            <div className='flex items-center justify-center'>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  row.original._onDelete?.();
                }}
                className='p-1 rounded hover:bg-bg-weak-50 text-text-sub-400 hover:text-error-base transition-colors'
                aria-label={actionAriaLabel}
              >
                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M7 4V2h10v2h5v2h-2v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6H2V4h5zM6 6v14h12V6H6zm3 3h2v8H9V9zm4 0h2v8h-2V9z' />
                </svg>
              </button>
            </div>
          ),
          enableSorting: false,
          ...getFrozenActionsColumnExtras(true),
        },
      ],
      [
        sorting_,
        onSortingChange,
        onRelatedContactsClick,
        actionAriaLabel,
        onSalesOwnerUpdate,
        onTypeOfOrganizationUpdate,
        onIndustryUpdate,
        onNoOfEmployeesUpdate,
        onCustomLegalNameUpdate,
        onLegalNameUpdate,
        onYearsOfEstablishmentUpdate,
        onWebsiteUpdate,
        onCpAccountUpdate,
        onCpContactUpdate,
        salesOwnerOptions_,
        typeOfOrgOptions_,
        industryGroups_,
        industryLabelByValue,
        leadSizeOptions,
        cpAccountOptions_,
        cpContactOptions_,
        enableSelection,
        selectedAccountIdSet,
        allVisibleSelected,
        someVisibleSelected,
        visibleAccountIds,
        onToggleAccountSelection,
        onToggleSelectAll,
      ],
    );

    // Apply column config (visibility + order)
    const columns = useMemo(() => {
      const fullDefs = applyColumnConfig(
        allColumnDefs,
        columnConfig,
        ACCOUNT_COLUMN_DEFS,
        ACCOUNTS_FROZEN_LEFT_COLUMN_ID,
      );
      if (hideActionsColumn) {
        return fullDefs.filter((c) => c.id !== 'actions');
      }
      // Always include actions column at end
      const hasActions = fullDefs.some((c) => c.id === 'actions');
      const actionsCol = allColumnDefs.find((c) => c.id === 'actions');
      const withActions = !hasActions && actionsCol ? [...fullDefs, actionsCol] : fullDefs;
      return orderColumnsWithActionsLast(withActions);
    }, [allColumnDefs, columnConfig, hideActionsColumn]);

    const table = useReactTable({
      data,
      columns,
      enableColumnPinning: true,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: true,
          leftColumnId: ACCOUNTS_FROZEN_LEFT_COLUMN_ID,
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

    const canResize = typeof onColumnResize === 'function';

    const groupableColumnIds = useMemo(
      () =>
        GROUP_BY_OPTIONS.map((opt) => opt.value).filter(
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

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + (col.id === 'actions' ? 60 : getWidth(col.id)), 0),
      [columns, getWidth, resizing],
    );

    React.useImperativeHandle(ref, () => ({
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

    // ── Group-by logic — groups raw data so each GroupTable can sort independently ──
    const groupedData = useMemo(() => {
      if (!groupBy) return null;
      const groups = {};
      for (const row of data) {
        const key = row[groupBy] ?? '';
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
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Accounts</h3>
          <p className='mb-4 text-sm text-error-darker/80'>
            Something went wrong loading the account list.
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
      const emptyTitle = emptyStateTitle ?? 'No Account found';
      const emptyDescription = emptyStateDescription ?? 'Get started by adding your first account.';
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyTitle}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{emptyDescription}</p>
        </div>
      );
    }

    const colCount = columns.length;
    const hasRows = table.getRowModel().rows.length > 0;

    // Loading skeleton — same pattern as team-table / centers-table (animate-pulse rows, row dividers)
    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 8 }).map((_, index, array) => (
          <React.Fragment key={`accounts-skeleton-${index}`}>
            <Table.Row>
              {columns.map((column) => (
                <Table.Cell
                  key={column.id || column.accessorKey}
                  style={{
                    width: column.id === 'actions' ? 60 : getWidth(column.id),
                    minWidth: column.id === 'actions' ? 60 : ACCOUNT_COLUMN_MIN_WIDTH,
                    maxWidth: ACCOUNT_COLUMN_MAX_WIDTH,
                  }}
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

    // When grouped, render collapsible sections only (no outer table), like Team Management
    // If grouped view would be empty and we're still loading, show table skeleton instead
    if (groupedData) {
      if (groupedData.sortedKeys.length === 0 && isLoading) {
        return (
          <div className={getFrozenWrapperClassName(true)}>
            <Table.Root
              variant={variant}
              style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
              {...getFrozenRootTableProps(true, { tableInstance: table })}
            >
              <Table.Header {...getFrozenHeaderTableProps(true)}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id} className='group/header bg-bg-weak-50'>
                    {headerGroup.headers.map((header) => {
                      const colId = header.column.id;
                      const width = colId === 'actions' ? 60 : getWidth(colId);
                      return (
                        <Table.Head
                          key={header.id}
                          {...getFrozenTanStackColumnProp(true, header.column)}
                          className='text-left label-small text-text-sub-600 font-medium pl-4 pr-4'
                          style={{
                            width,
                            minWidth: colId === 'actions' ? 60 : ACCOUNT_COLUMN_MIN_WIDTH,
                            maxWidth: ACCOUNT_COLUMN_MAX_WIDTH,
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
        <div className='w-full'>
          <GroupedAccountsView
            sortedKeys={groupedData.sortedKeys}
            groups={groupedData.groups}
            columns={columns}
            getWidth={getWidth}
            variant={variant}
            onRowClick={onRowClick}
            tableMinWidth={tableMinWidth}
            hideActionsColumn={hideActionsColumn}
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
              {...getFrozenTanStackColumnProp(true, cell.column)}
              className={cn('align-middle px-4', cell.column.columnDef.meta?.cellClassName)}
              style={{
                width: cell.column.id === 'actions' ? 60 : getWidth(cell.column.id),
                minWidth: cell.column.id === 'actions' ? 60 : ACCOUNT_COLUMN_MIN_WIDTH,
                maxWidth: ACCOUNT_COLUMN_MAX_WIDTH,
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Table.Cell>
          ))}
        </Table.Row>
        {rowIndex < array.length - 1 && <Table.RowDivider />}
      </React.Fragment>
    );

    return (
      <div className={getFrozenWrapperClassName(true)}>
        <Table.Root
          variant={variant}
          {...getFrozenRootTableProps(true, { tableInstance: table })}
          style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <CrmAccountsSortableHeader
            table={table}
            getWidth={getWidth}
            canResize={canResize}
            onResizeStart={canResize ? handleResizeStart : undefined}
            freezeColumns
            onReorderColumnsByIds={reorderColumnsByIds}
            columnConfig={columnConfig}
            groupBy={groupBy}
            groupableColumnIds={groupableColumnIds}
            onSortColumn={handleSortColumnFromMenu}
            onGroupColumn={onGroupByChange ? handleGroupColumnFromMenu : undefined}
            onHideColumn={handleHideColumnFromMenu}
          />

          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table
                .getRowModel()
                .rows.map((row, rowIndex, allRowsArray) => renderRow(row, rowIndex, allRowsArray))}
              {enableScrollPagination && (
                <>
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={colCount} className='h-1 p-0' />
                  </Table.Row>
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={colCount} className='py-8 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          <span className='paragraph-small text-text-sub-600'>
                            Loading more accounts...
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

CrmAccountsTable.displayName = 'CrmAccountsTable';

export default CrmAccountsTable;
