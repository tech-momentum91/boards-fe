import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { parseToDate } from '@/utils/date-utils';
import { cn } from '@/utils/cn';
import {
  RiErrorWarningLine,
  RiDeleteBinLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiAddLine,
  RiRecordCircleLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiCheckboxIndeterminateFill,
} from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CityCombobox } from '@/components/crm-leads/city-combobox';
import {
  LeadPipelineEditPopover,
  StageColorPill,
} from '@/components/crm-leads/lead-pipeline-edit-popover';
import { getCrmAccountContacts, getCrmAccountList } from '@/api/crmAccounts';
import { getCrmLeadOptions } from '@/api/crmLeads';
import { showErrorToast } from '@/utils/error-utils';
import * as Badge from '@/components/ui/badge';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  applyColumnConfig,
  prepareColumnsForConfig,
  reorderPipelineLifecycleGroup,
} from '@/lib/column-utils';
import { CrmLeadsSortableHeader } from '@/components/crm-leads/crm-leads-sortable-header';
import {
  LEAD_COLUMN_DEFS,
  DEFAULT_LEAD_COLUMN_WIDTHS,
  LEAD_COLUMN_MIN_WIDTH,
  LEAD_COLUMN_MAX_WIDTH,
  EMPTY_STATES,
  formatCurrencyInr,
  formatNumberInrForInput,
  SELECT_NONE_VALUE,
  CRM_DEFAULT_PIPELINE_COLOR,
  CRM_DEFAULT_STAGE_COLOR,
  resolveCrmColor,
  resolveCrmStatusBadgeColor,
  LEAD_INLINE_EDITABLE_TEXT_FIELD_IDS,
  LEAD_TRUNCATED_TEXT_FIELD_IDS,
  LEAD_TRUNCATED_TEXT_MAX_CHARS,
  getLeadFieldRawString,
  getLeadFieldDisplayValue,
  normalizeLeadFieldSaveValue,
  buildLinkSelectOptions,
  resolveLinkFieldSelectValue,
  getLinkFieldOptionLabel,
  getServiceDisplayLabel,
  getInfoCallStatusBadgeColor,
  LEAD_TEMPERATURE_COLORS,
  LEAD_TEMPERATURE_ICONS,
  LEAD_TEMPERATURE_OPTIONS,
  statusLabelRequiresLostReason,
  GROUP_BY_OPTIONS,
} from './constants';
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

const PINNED_LEAD_NAME_COLUMN_ID = 'name';
const LEAD_ACTIONS_COLUMN_WIDTH = 60;

function getLeadTableColumnWidth(colId, getWidth) {
  if (colId === 'actions') return LEAD_ACTIONS_COLUMN_WIDTH;
  return getWidth(colId);
}

function getLeadTableColumnMinWidth(colId) {
  if (colId === 'actions') return LEAD_ACTIONS_COLUMN_WIDTH;
  return LEAD_COLUMN_MIN_WIDTH;
}

function getLeadTableColumnMaxWidth(colId) {
  return LEAD_COLUMN_MAX_WIDTH;
}

function getLeadRowId(row) {
  return String(row?.id || row?.name || '').trim();
}

/** Tag-style pill: always one line; column width should be set wide enough in defaults. */
const tagPillClass =
  'inline-flex w-max max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-stroke-soft-200 bg-white px-2.5 py-1 text-paragraph-xs font-medium text-text-sub-600 leading-normal text-center';

/** Empty state: "-" inside a rounded pill so it matches filled pills. */
const emptyPill = <span className={tagPillClass}>-</span>;

/** Plain dash / text for select cells without pill borders. */
const plainEmptyDash = <span className='paragraph-small text-text-sub-600'>-</span>;
const leadPlainCellTextClass = 'paragraph-small text-text-sub-600 block min-w-0 truncate';

/** Cell wrapper: hides any value wider than the current column width. */
const leadCellOverflowClass = 'min-w-0 w-full overflow-hidden';

/** Treat API placeholder "-" the same as empty (matches city column). */
function normalizeLeadTableSelectValue(value) {
  const trimmed = String(value ?? '').trim();
  return !trimmed || trimmed === '-' ? '' : trimmed;
}

function renderLeadTemperatureOptionLabel(opt) {
  const value = opt?.value;
  const Icon = LEAD_TEMPERATURE_ICONS[value];
  const color = LEAD_TEMPERATURE_COLORS[value];
  return (
    <LeadTemperatureBadge value={value} label={opt?.label ?? value} icon={Icon} color={color} />
  );
}

/** Icon + label inside a coloured pill badge — used in dropdown options and table cells. */
function LeadTemperatureBadge({ value, label, icon: Icon, color }) {
  if (!value || !color) {
    return <RiRecordCircleLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />;
  }
  const bg = `${color}20`;
  const border = `${color}60`;
  return (
    <div
      className='inline-flex w-max shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-paragraph-xs font-medium leading-normal'
      style={{ backgroundColor: bg, borderColor: border, color }}
    >
      {Icon && <Icon className='size-3.5 shrink-0' aria-hidden />}
      {label ?? value}
    </div>
  );
}

function renderLeadPlainSelectTrigger(text) {
  const display = normalizeLeadTableSelectValue(text);
  return display ? <span className={leadPlainCellTextClass}>{display}</span> : plainEmptyDash;
}

function InfoCallStatusBadge({ status }) {
  const label = String(status || '').trim();
  if (!label || label === '-') return plainEmptyDash;
  return (
    <Badge.Root
      variant='light'
      color={getInfoCallStatusBadgeColor(status)}
      size='medium'
      className='normal-case'
    >
      {label}
    </Badge.Root>
  );
}

/** Lifecycle / pipeline / status coloured pill badge (same style for all three). */
function renderCrmColorBadge(value, color) {
  return (
    <div className={leadCellOverflowClass}>
      <StageColorPill value={value} stageColor={color} />
    </div>
  );
}

function renderLeadPlainOwnerTrigger(name) {
  const display = normalizeLeadTableSelectValue(name);
  if (!display) return plainEmptyDash;
  // Use a div so SearchableSelect's [&>span]:block trigger wrap doesn't kill flex.
  return (
    <div className='flex min-w-0 max-w-full items-center gap-2 whitespace-nowrap'>
      <CrmAccountAvatar name={display} variant='weak' size={24} className='shrink-0' />
      <span className='paragraph-small text-text-sub-600 min-w-0 truncate'>{display}</span>
    </div>
  );
}

/** Pill wrapper for avatar + text (Sales Owner / Inside Sales): single line. */
const avatarPillClass =
  'inline-flex w-max max-w-full shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-stroke-soft-200 bg-white pl-0.5 pr-2 py-1 text-paragraph-xs font-medium text-text-sub-600 leading-normal';

/** Full-width trigger so cell text can ellipsis-truncate consistently. */
const leadTableSelectTriggerClass = '!w-full min-w-0 max-w-full';

/** Compact trigger for icon / avatar-only chips (temperature, sales owner). */
const leadTableSelectTriggerCompactClass = '!w-max min-w-0 shrink-0';

/** When Sales Owner / Inside Sales is empty: no button/avatar look, just plain dash. */
const leadTableSelectTriggerEmptyClass =
  '!bg-transparent !shadow-none !ring-0 !border-0 !min-h-0 py-0 px-0 hover:!bg-transparent focus:!shadow-none focus:!ring-0';

/** Wider dropdown than trigger pill so long option labels are fully visible (wrap to next line). */
const leadTableSelectContentClassName =
  '!min-w-[min(18rem,calc(100vw-2rem))] max-w-[min(24rem,calc(100vw-2rem))] w-max';

/** Fixed 200px panel for lifecycle stage, status, product, lead relevance, need urgency, lost cause. */
const leadTableSelectContentClassName200 = '!min-w-[200px] !max-w-[200px] w-[200px]';

function renderLeadSelectItemLabel(label) {
  return (
    <span className='block whitespace-normal break-words text-left leading-snug'>{label}</span>
  );
}

const ownerOptionGetValue = (opt) => opt?.value ?? opt?.email ?? '';

function renderLeadOwnerOptionLabel(opt) {
  const label = opt?.label ?? opt?.name ?? ownerOptionGetValue(opt) ?? '—';
  return (
    <div className='flex items-center gap-2'>
      <CrmAccountAvatar name={label} size={20} />
      <span>{label}</span>
    </div>
  );
}

function renderLeadOwnerTrigger(name) {
  if (!name) return emptyPill;
  return (
    <div className={avatarPillClass}>
      <CrmAccountAvatar name={name} size={24} className='shrink-0' />
      {/* <span className='shrink-0 whitespace-nowrap paragraph-small text-text-sub-600'>{name}</span> */}
    </div>
  );
}

/** SearchableSelect preset for inline lead table cells (borderless pill trigger, optional clear row). */
function LeadTableSearchableSelect({
  value = '',
  onValueChange,
  options = [],
  searchPlaceholder = 'Search...',
  noResultsMessage = 'No options found',
  emptyMessage = 'No options available',
  renderTrigger,
  renderOptionLabel,
  onOpenChange,
  includeClearOption = true,
  valueSentinel,
  getOptionValue,
  getOptionLabel,
  itemKeyPrefix = '',
  placeholder = '—',
  contentClassName,
  triggerClassName: triggerClassNameProp,
  ...searchableSelectProps
}) {
  const sentinel =
    valueSentinel !== undefined
      ? valueSentinel
      : includeClearOption
        ? SELECT_NONE_VALUE
        : undefined;
  const normalizedValue = normalizeLeadTableSelectValue(value);
  const hasValue = Boolean(normalizedValue);
  const mergedOptions =
    sentinel != null && includeClearOption !== false
      ? [{ value: sentinel, label: '-' }, ...options]
      : options;
  const resolveOptionValue = getOptionValue ?? ((opt) => opt?.value ?? opt);
  const resolveOptionLabel =
    getOptionLabel ?? ((opt) => opt?.label ?? String(opt?.value ?? opt ?? ''));

  return (
    <SearchableSelect
      variant='borderless'
      size='xsmall'
      showArrow={false}
      value={hasValue ? normalizedValue : ''}
      valueSentinel={sentinel}
      onValueChange={onValueChange}
      onOpenChange={onOpenChange}
      options={mergedOptions}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      noResultsMessage={noResultsMessage}
      emptyMessage={emptyMessage}
      triggerClassName={cn(
        triggerClassNameProp ??
          (hasValue ? leadTableSelectTriggerClass : leadTableSelectTriggerEmptyClass),
      )}
      contentClassName={contentClassName ?? leadTableSelectContentClassName}
      renderTrigger={renderTrigger}
      renderOptionLabel={
        renderOptionLabel ??
        ((opt) =>
          sentinel != null && String(resolveOptionValue(opt)) === String(sentinel)
            ? renderLeadSelectItemLabel('-')
            : renderLeadSelectItemLabel(resolveOptionLabel(opt)))
      }
      getOptionValue={getOptionValue}
      getOptionLabel={getOptionLabel}
      itemKeyPrefix={itemKeyPrefix}
      {...searchableSelectProps}
    />
  );
}

/** Format Created At / Last Modified At as "5 March 2026, 10:40 AM". Accepts ISO or Frappe datetime. */
function formatLeadDateTime(raw) {
  if (raw == null || raw === '' || raw === '-') {
    return <span className={leadPlainCellTextClass}>-</span>;
  }
  const date = parseToDate(raw);
  if (!date) {
    return <span className={leadPlainCellTextClass}>-</span>;
  }
  const formatted = format(date, 'd MMMM yyyy, h:mm a');
  return <span className={leadPlainCellTextClass}>{formatted}</span>;
}
function renderLeadTruncatedReadOnly(text) {
  const full = String(text ?? '').trim();
  if (!full) {
    return <span className='paragraph-small text-text-sub-600'>-</span>;
  }
  const truncated = full.length > LEAD_TRUNCATED_TEXT_MAX_CHARS;
  const visible = truncated ? `${full.slice(0, LEAD_TRUNCATED_TEXT_MAX_CHARS)}…` : full;
  if (!truncated) {
    return (
      <span className='paragraph-small text-text-sub-600 block min-w-0 truncate' title={full}>
        {visible}
      </span>
    );
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className='paragraph-small text-text-sub-600 block min-w-0 w-full cursor-default truncate'>
          {visible}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side='bottom' className='max-w-sm break-words'>
        {full}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function renderLeadInlineEditableTextCell({ row, fieldId, onFieldUpdate }) {
  const leadId = row.original.id || row.original.name;
  const raw = row.original[fieldId];
  const valueStr = getLeadFieldRawString(raw, fieldId);
  const displayValue = getLeadFieldDisplayValue(valueStr, fieldId);
  const useTruncation = LEAD_TRUNCATED_TEXT_FIELD_IDS.has(fieldId);

  if (!onFieldUpdate || !leadId) {
    const isEmpty = valueStr === '';
    if (useTruncation && !isEmpty) {
      return renderLeadTruncatedReadOnly(raw);
    }
    const display = isEmpty ? '-' : fieldId === 'est_lifetime_value' ? formatCurrencyInr(raw) : raw;
    return <span className={leadPlainCellTextClass}>{display}</span>;
  }

  return (
    <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
      <InlineEditableText
        value={displayValue}
        placeholder='—'
        inputClassName='paragraph-small text-text-sub-600'
        maxDisplayChars={useTruncation ? LEAD_TRUNCATED_TEXT_MAX_CHARS : undefined}
        onSave={(value) => {
          const trimmed = normalizeLeadFieldSaveValue(value, fieldId);
          if (trimmed === valueStr) return;
          onFieldUpdate(leadId, fieldId, trimmed);
        }}
      />
    </div>
  );
}

const GroupTable = React.memo(
  ({
    groupRows,
    columns,
    getWidth,
    variant,
    onRowClick,
    tableMinWidth,
    canResize = false,
    onResizeStart,
    freezeColumns = false,
    onReorderColumnsByIds,
    /** When true, disable local overflow so a parent scrollport owns horizontal scroll. */
    sharedScrollParent = false,
    selectedLeadIdSet,
    columnConfig = [],
    groupBy = '',
    groupableColumnIds = [],
    onSortColumn,
    onGroupColumn,
    onHideColumn,
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
          leftColumnId: PINNED_LEAD_NAME_COLUMN_ID,
          columns,
        }),
      ),
      onSortingChange: setLocalSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: false,
      enableSortingRemoval: true,
    });

    const rootProps = sharedScrollParent
      ? {
          tableInstance: freezeColumns ? groupTable : undefined,
          // Keep sticky left/right pins, but let the outer grouped scrollport own overflow.
          stickyHeader: Boolean(freezeColumns),
          className: 'w-full !overflow-visible',
        }
      : getFrozenRootTableProps(freezeColumns, {
          tableInstance: groupTable,
          unfrozenClassName: 'w-full',
        });

    return (
      <Table.Root
        variant={variant}
        {...rootProps}
        style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
      >
        <CrmLeadsSortableHeader
          table={groupTable}
          getWidth={getWidth}
          canResize={canResize}
          onResizeStart={onResizeStart}
          freezeColumns={freezeColumns}
          onReorderColumnsByIds={onReorderColumnsByIds}
          columnConfig={columnConfig}
          groupBy={groupBy}
          groupableColumnIds={groupableColumnIds}
          onSortColumn={onSortColumn}
          onGroupColumn={onGroupColumn}
          onHideColumn={onHideColumn}
        />
        <Table.Body>
          {groupTable.getRowModel().rows.map((row, rowIndex, allRows) => {
            const leadId = getLeadRowId(row.original);
            const isSelected = Boolean(leadId && selectedLeadIdSet?.has(leadId));
            return (
              <React.Fragment key={row.id}>
                <Table.Row
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'group/row',
                    onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : '',
                    isSelected && 'bg-bg-weak-50',
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const width = getLeadTableColumnWidth(colId, getWidth);
                    return (
                      <Table.Cell
                        key={cell.id}
                        {...getFrozenTanStackColumnProp(freezeColumns, cell.column)}
                        className={cn(
                          'align-middle px-4 py-2.5 min-w-0 overflow-hidden',
                          cell.column.columnDef.meta?.cellClassName,
                        )}
                        style={{
                          width,
                          minWidth: getLeadTableColumnMinWidth(colId),
                          maxWidth: getLeadTableColumnMaxWidth(colId),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
                {rowIndex < allRows.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            );
          })}
        </Table.Body>
      </Table.Root>
    );
  },
);
GroupTable.displayName = 'GroupTable';

const GroupedLeadsView = ({
  sortedKeys,
  groups,
  columns,
  getWidth,
  variant,
  onRowClick,
  tableMinWidth,
  canResize = false,
  onResizeStart,
  freezeColumns = false,
  onReorderColumnsByIds,
  selectedLeadIdSet,
  columnConfig = [],
  groupBy = '',
  groupableColumnIds = [],
  onSortColumn,
  onGroupColumn,
  onHideColumn,
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
    <div
      className='flex w-full flex-col gap-10'
      style={{ minWidth: Math.max(tableMinWidth || 0, 0) || undefined }}
    >
      {sortedKeys.map((key) => {
        const groupRows = groups[key] || [];
        const isExpanded = expandedKeys[key] !== false;
        const title = key === '' ? 'Empty' : key;
        return (
          <div
            key={key === '' ? '__empty__' : key}
            className='flex w-full flex-col items-start gap-1'
          >
            {/*
              Sticky group titles must NOT be w-full — a full-bleed sticky box
              is as wide as the scroll content, so left-stick never engages.
            */}
            <div className='sticky left-0 z-20 w-max max-w-[min(100vw,100%)] bg-bg-white-0 pr-4'>
              <button
                type='button'
                onClick={() => toggle(key)}
                className='label-small flex items-center gap-1 text-left font-medium text-[var(--color-text-sub-500)] cursor-pointer transition-opacity hover:opacity-80'
              >
                {title}
                <span className='text-text-soft-400 font-normal'>({groupRows.length})</span>
                {isExpanded ? (
                  <RiArrowUpSLine size={16} className='shrink-0' />
                ) : (
                  <RiArrowDownSLine size={16} className='shrink-0' />
                )}
              </button>
            </div>
            {isExpanded && (
              <div className='w-full pt-2 [&_table]:table-fixed'>
                <GroupTable
                  groupRows={groupRows}
                  columns={columns}
                  getWidth={getWidth}
                  variant={variant}
                  onRowClick={onRowClick}
                  tableMinWidth={tableMinWidth}
                  canResize={canResize}
                  onResizeStart={onResizeStart}
                  freezeColumns={freezeColumns}
                  onReorderColumnsByIds={onReorderColumnsByIds}
                  sharedScrollParent
                  selectedLeadIdSet={selectedLeadIdSet}
                  columnConfig={columnConfig}
                  groupBy={groupBy}
                  groupableColumnIds={groupableColumnIds}
                  onSortColumn={onSortColumn}
                  onGroupColumn={onGroupColumn}
                  onHideColumn={onHideColumn}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

function createSortableHeader(label, column, ariaLabel) {
  const sortState = column.getIsSorted();
  return (
    <div className='flex items-center gap-1.5'>
      <span className='whitespace-nowrap'>{label}</span>
      <button
        type='button'
        className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors shrink-0'
        onClick={() => column.toggleSorting(sortState === 'asc')}
        aria-label={ariaLabel || `Sort by ${label}`}
      >
        {Table.getSortingIcon(sortState)}
      </button>
    </div>
  );
}

const CrmLeadsTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      onRetry,
      onRowClick,
      onSortingChange,
      sorting = [],
      variant = 'compact',
      columnWidths: columnWidthsProperty = null,
      onColumnResize = null,
      persistColumnConfig,
      fetchColumnConfig,
      columnConfigId = 'crm-leads-table',
      leadOptions,
      stagesByPipeline = {},
      ensureStagesForPipeline,
      onFieldUpdate,
      onBatchFieldUpdate,
      onContactClick,
      contactOptions = [],
      onCreateContact,
      onCreateAccount,
      removeFromAccountMode = false,
      groupBy = '',
      groupOrder = 'asc',
      onGroupByChange = null,
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      freezeColumns = false,
      showDropReasonColumn = false,
      enableSelection = false,
      selectedLeadIds = [],
      onToggleLeadSelection,
      onToggleSelectAll,
    },
    ref,
  ) => {
    const data = Array.isArray(rows) ? rows : [];
    const selectedLeadIdSet = useMemo(
      () => new Set((Array.isArray(selectedLeadIds) ? selectedLeadIds : []).map(String)),
      [selectedLeadIds],
    );
    const visibleLeadIds = useMemo(() => data.map(getLeadRowId).filter(Boolean), [data]);
    const allVisibleSelected =
      enableSelection &&
      visibleLeadIds.length > 0 &&
      visibleLeadIds.every((id) => selectedLeadIdSet.has(id));
    const someVisibleSelected =
      enableSelection &&
      !allVisibleSelected &&
      visibleLeadIds.some((id) => selectedLeadIdSet.has(id));
    const [accountOptions, setAccountOptions] = useState([]);
    const [contactOptionsByAccount, setContactOptionsByAccount] = useState({});
    const contactOptionsByAccountFetchRef = useRef(new Set());
    const [pipelineLinkOptionsByPipeline, setPipelineLinkOptionsByPipeline] = useState({});
    const pipelineLinkOptionsByPipelineRef = useRef({});
    const pipelineLinkOptionsFetchRef = useRef(new Set());
    const [localSorting, setLocalSorting] = useState(sorting);
    const [resizing, setResizing] = useState(null);
    const resizingRef = useRef(null);
    const liveWidthRef = useRef(null);
    const sentinelRef = useRef(null);

    useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    useEffect(() => {
      getCrmAccountList()
        .then((list) => setAccountOptions(Array.isArray(list) ? list : []))
        .catch(() => setAccountOptions([]));
    }, []);

    const ensureAccountContactOptions = useCallback(async (accountId) => {
      const account = normalizeLeadTableSelectValue(accountId);
      if (!account || contactOptionsByAccountFetchRef.current.has(account)) return;
      contactOptionsByAccountFetchRef.current.add(account);
      try {
        const contacts = await getCrmAccountContacts(account);
        const options = (Array.isArray(contacts) ? contacts : [])
          .map((contact) => {
            const value = String(contact?.name || contact?.value || '').trim();
            if (!value) return null;
            return {
              value,
              label: String(contact?.full_name || contact?.label || value).trim(),
            };
          })
          .filter(Boolean);
        setContactOptionsByAccount((previous) => ({ ...previous, [account]: options }));
      } catch {
        setContactOptionsByAccount((previous) => ({ ...previous, [account]: [] }));
      } finally {
        contactOptionsByAccountFetchRef.current.delete(account);
      }
    }, []);

    const ensurePipelineLinkOptions = useCallback(async (pipelineId) => {
      const pl = String(pipelineId || '').trim();
      if (!pl) return { lead_relevance: [], lead_size: [], product: [], lost_reason: [] };
      if (pipelineLinkOptionsByPipelineRef.current[pl]) {
        return pipelineLinkOptionsByPipelineRef.current[pl];
      }
      if (pipelineLinkOptionsFetchRef.current.has(pl)) {
        return { lead_relevance: [], lead_size: [], product: [], lost_reason: [] };
      }
      pipelineLinkOptionsFetchRef.current.add(pl);
      try {
        const opts = await getCrmLeadOptions(undefined, pl);
        const cached = {
          lead_relevance: Array.isArray(opts.lead_relevance) ? opts.lead_relevance : [],
          lead_size: Array.isArray(opts.lead_size) ? opts.lead_size : [],
          product: Array.isArray(opts.product) ? opts.product : [],
          lost_reason: Array.isArray(opts.lost_reason) ? opts.lost_reason : [],
        };
        const next = { ...pipelineLinkOptionsByPipelineRef.current, [pl]: cached };
        pipelineLinkOptionsByPipelineRef.current = next;
        setPipelineLinkOptionsByPipeline(next);
        return cached;
      } catch {
        return { lead_relevance: [], lead_size: [], product: [], lost_reason: [] };
      } finally {
        pipelineLinkOptionsFetchRef.current.delete(pl);
      }
    }, []);

    useEffect(() => {
      const pipelineIds = new Set();
      for (const row of data) {
        const pipelineRaw = row.pipeline && row.pipeline !== '-' ? String(row.pipeline).trim() : '';
        if (!pipelineRaw) continue;
        const pipelineValue = resolveLinkFieldSelectValue(
          pipelineRaw,
          row.pipeline_label,
          leadOptions?.pipelines,
        );
        if (pipelineValue) pipelineIds.add(pipelineValue);
      }
      pipelineIds.forEach((pl) => {
        if (!pipelineLinkOptionsByPipelineRef.current[pl]) {
          void ensurePipelineLinkOptions(pl);
        }
      });
    }, [data, leadOptions?.pipelines, ensurePipelineLinkOptions]);

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

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(next);
        onSortingChange?.(next);
      },
      [localSorting, onSortingChange],
    );

    const columnWidths = useMemo(() => {
      if (columnWidthsProperty && typeof columnWidthsProperty === 'object') {
        return { ...DEFAULT_LEAD_COLUMN_WIDTHS, ...columnWidthsProperty };
      }
      return DEFAULT_LEAD_COLUMN_WIDTHS;
    }, [columnWidthsProperty]);

    const getWidth = useCallback(
      (columnId) => {
        const w = resizing?.columnId === columnId ? resizing.liveWidth : columnWidths[columnId];
        return typeof w === 'number'
          ? Math.min(LEAD_COLUMN_MAX_WIDTH, Math.max(LEAD_COLUMN_MIN_WIDTH, w))
          : (DEFAULT_LEAD_COLUMN_WIDTHS[columnId] ?? LEAD_COLUMN_MIN_WIDTH);
      },
      [columnWidths, resizing],
    );

    const handleResizeStart = useCallback(
      (columnId, startX) => {
        const startWidth =
          columnWidths[columnId] ?? DEFAULT_LEAD_COLUMN_WIDTHS[columnId] ?? LEAD_COLUMN_MIN_WIDTH;
        const clamped = Math.min(
          LEAD_COLUMN_MAX_WIDTH,
          Math.max(LEAD_COLUMN_MIN_WIDTH, startWidth),
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
        next = Math.max(LEAD_COLUMN_MIN_WIDTH, Math.min(LEAD_COLUMN_MAX_WIDTH, next));
        liveWidthRef.current = next;
        setResizing((previous) => (previous ? { ...previous, liveWidth: next } : null));
      };

      const onMouseUp = () => {
        if (resizingRef.current && onColumnResize && liveWidthRef.current != null) {
          const finalWidth = Math.max(
            LEAD_COLUMN_MIN_WIDTH,
            Math.min(LEAD_COLUMN_MAX_WIDTH, liveWidthRef.current),
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

    const allColumnDefs = useMemo(() => {
      const defs = [
        {
          id: 'name',
          accessorKey: 'name',
          enableSorting: true,
          ...getFrozenLeftColumnExtras(freezeColumns),
          header: ({ column }) => (
            <div className='flex min-w-0 items-center gap-1.5 overflow-hidden'>
              {enableSelection ? (
                <button
                  type='button'
                  aria-label={allVisibleSelected ? 'Deselect all leads' : 'Select all leads'}
                  aria-pressed={allVisibleSelected}
                  disabled={visibleLeadIds.length === 0}
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
              <div className='min-w-0 truncate'>{createSortableHeader('Name', column)}</div>
            </div>
          ),
          cell: ({ row }) => {
            const leadId = getLeadRowId(row.original);
            const leadName = String(row.original.name || '').trim();
            const temp = normalizeLeadTableSelectValue(row.original.lead_temperature);
            const TempIcon = LEAD_TEMPERATURE_ICONS[temp];
            const isSelected = Boolean(enableSelection && leadId && selectedLeadIdSet.has(leadId));
            const nameContent =
              onFieldUpdate && leadId ? (
                <InlineEditableText
                  value={leadName}
                  editOnIconOnly
                  placeholder='—'
                  displayClassName='font-medium text-text-strong-950 leading-snug'
                  inputClassName='paragraph-small text-text-strong-950'
                  onSave={(value) => {
                    const trimmed = String(value ?? '').trim();
                    if (trimmed === leadName) return;
                    onFieldUpdate(leadId, 'name', trimmed);
                  }}
                />
              ) : (
                <span className='min-w-0 truncate paragraph-small font-medium text-text-strong-950 leading-snug'>
                  {leadName || '-'}
                </span>
              );

            const temperatureControl =
              onFieldUpdate && leadId ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <LeadTableSearchableSelect
                    value={temp}
                    options={LEAD_TEMPERATURE_OPTIONS}
                    contentClassName={leadTableSelectContentClassName200}
                    searchPlaceholder='Search temperature...'
                    noResultsMessage='No options found'
                    emptyMessage='No options available'
                    triggerClassName={leadTableSelectTriggerCompactClass}
                    onValueChange={(next) => onFieldUpdate(leadId, 'lead_temperature', next)}
                    renderTrigger={() =>
                      TempIcon ? (
                        <TempIcon
                          className='size-4'
                          color={LEAD_TEMPERATURE_COLORS[temp]}
                          style={{ color: LEAD_TEMPERATURE_COLORS[temp] }}
                          aria-hidden
                        />
                      ) : (
                        <RiRecordCircleLine className='size-4 text-text-soft-400' aria-hidden />
                      )
                    }
                    renderOptionLabel={renderLeadTemperatureOptionLabel}
                  />
                </div>
              ) : TempIcon ? (
                <TempIcon
                  className='size-4'
                  color={LEAD_TEMPERATURE_COLORS[temp]}
                  style={{ color: LEAD_TEMPERATURE_COLORS[temp] }}
                  aria-hidden
                />
              ) : (
                <RiRecordCircleLine className='size-4 text-text-soft-400' aria-hidden />
              );

            return (
              <div className='flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden'>
                {enableSelection ? (
                  <button
                    type='button'
                    aria-label={isSelected ? 'Deselect lead' : 'Select lead'}
                    aria-pressed={isSelected}
                    data-prevent-row-click
                    disabled={!leadId}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!leadId) return;
                      onToggleLeadSelection?.(leadId);
                    }}
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded transition-opacity disabled:opacity-40',
                      isSelected
                        ? 'text-primary-base opacity-100'
                        : 'text-icon-sub-500 opacity-0 group-hover/row:opacity-100',
                    )}
                  >
                    {isSelected ? (
                      <RiCheckboxFill size={16} className='shrink-0' />
                    ) : (
                      <RiCheckboxBlankLine size={16} className='shrink-0' />
                    )}
                  </button>
                ) : null}
                {!enableSelection || TempIcon ? (
                  <div className='flex size-5 shrink-0 items-center justify-center'>
                    {temperatureControl}
                  </div>
                ) : null}
                <div className='min-w-0 flex-1 overflow-hidden'>
                  <div className='flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden'>
                    <div className='min-w-0 truncate'>{nameContent}</div>
                    {(row.original.is_repeated || (Number(row.original.call_count) || 0) > 1) && (
                      <Badge.Root
                        variant='light'
                        color='orange'
                        size='medium'
                        className='normal-case shrink-0'
                      >
                        {`Repeat (${Math.max(Number(row.original.call_count) || 0, 2)})`}
                      </Badge.Root>
                    )}
                  </div>
                </div>
              </div>
            );
          },
        },
        {
          id: 'contact',
          accessorKey: 'contact_name',
          enableSorting: false,
          header: () => <span className='whitespace-nowrap'>Contact</span>,
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const contactId = normalizeLeadTableSelectValue(row.original.contact);
            const contactName = normalizeLeadTableSelectValue(row.original.contact_name);
            const linkedContacts = Array.isArray(row.original.contacts)
              ? row.original.contacts.filter((c) => c?.id || c?.name)
              : [];
            const contactsForStack =
              linkedContacts.length > 0
                ? linkedContacts
                : contactId || contactName
                  ? [{ id: contactId, name: contactName || contactId }]
                  : [];
            const displayName =
              contactsForStack
                .map((c) => c.name || c.id)
                .filter(Boolean)
                .join(', ') || '-';
            const hasLinkedContact = contactsForStack.length > 0;
            const accountId = normalizeLeadTableSelectValue(
              row.original.account_id || row.original.account,
            );
            const rowContactOptions = accountId
              ? (contactOptionsByAccount[accountId] ?? [])
              : contactOptions;

            const handleContactNavigate = (event) => {
              event.stopPropagation();
              onContactClick?.(row.original);
            };

            const maxStack = 3;
            const visible = contactsForStack.slice(0, maxStack);
            const overflow = contactsForStack.length - visible.length;
            const content =
              contactsForStack.length === 0 ? (
                <CrmAccountAvatar name='-' size={24} className='shrink-0' />
              ) : (
                <div className='flex items-center -space-x-1.5' title={displayName}>
                  {visible.map((c, index) => (
                    <CrmAccountAvatar
                      key={c.id || c.name || index}
                      name={c.name || c.id || '?'}
                      size={24}
                      className='shrink-0 ring-2 ring-bg-white-0'
                    />
                  ))}
                  {overflow > 0 ? (
                    <span className='relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-weak-50 text-[10px] font-medium text-text-sub-600 ring-2 ring-bg-white-0'>
                      +{overflow}
                    </span>
                  ) : null}
                </div>
              );

            if (hasLinkedContact && onContactClick && leadId) {
              return (
                <button
                  type='button'
                  className='flex min-w-0 w-full items-start gap-2 bg-transparent border-0 p-0 cursor-pointer text-left hover:opacity-80 transition-opacity'
                  onClick={handleContactNavigate}
                  aria-label={displayName === '-' ? 'View contacts' : `View contact ${displayName}`}
                >
                  {content}
                </button>
              );
            }

            if (!hasLinkedContact && onFieldUpdate && leadId) {
              return (
                <div onClick={(event) => event.stopPropagation()} className={leadCellOverflowClass}>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    showArrow={false}
                    value=''
                    options={rowContactOptions}
                    placeholder='—'
                    searchPlaceholder='Search contacts...'
                    noResultsMessage='No contacts found'
                    emptyMessage='No contacts available'
                    triggerClassName={leadTableSelectTriggerEmptyClass}
                    contentClassName={leadTableSelectContentClassName}
                    onOpenChange={(open) => {
                      if (
                        open &&
                        accountId &&
                        !Object.prototype.hasOwnProperty.call(contactOptionsByAccount, accountId)
                      ) {
                        void ensureAccountContactOptions(accountId);
                      }
                    }}
                    onValueChange={(contact) => onFieldUpdate(leadId, 'contact', contact)}
                    renderTrigger={() => content}
                    renderOptionLabel={(option) =>
                      renderLeadSelectItemLabel(option.label ?? option.value)
                    }
                    renderFooter={
                      onCreateContact
                        ? ({ close, searchQuery }) => {
                            const normalizedQuery = String(searchQuery || '')
                              .trim()
                              .toLocaleLowerCase();
                            const accountContactsLoaded =
                              !accountId ||
                              Object.prototype.hasOwnProperty.call(
                                contactOptionsByAccount,
                                accountId,
                              );
                            const contactAlreadyExists = rowContactOptions.some((option) => {
                              const label = String(option?.label || '')
                                .trim()
                                .toLocaleLowerCase();
                              const value = String(option?.value || '')
                                .trim()
                                .toLocaleLowerCase();
                              return label === normalizedQuery || value === normalizedQuery;
                            });
                            if (
                              !normalizedQuery ||
                              !accountContactsLoaded ||
                              contactAlreadyExists
                            ) {
                              return null;
                            }
                            return (
                              <button
                                type='button'
                                className='flex w-full items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm font-medium text-primary-base hover:bg-bg-weak-50'
                                onClick={() => {
                                  close();
                                  onCreateContact(row.original, searchQuery);
                                }}
                              >
                                <RiAddLine size={18} />
                                Create new contact
                              </button>
                            );
                          }
                        : undefined
                    }
                  />
                </div>
              );
            }

            return <div className='flex min-w-0 items-start gap-2'>{content}</div>;
          },
        },
        {
          id: 'account',
          accessorKey: 'account',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Account', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const accountDisplay =
              row.original.account && row.original.account !== '-'
                ? String(row.original.account).trim()
                : '';
            const accountId =
              row.original.account_id && row.original.account_id !== '-'
                ? String(row.original.account_id).trim()
                : '';
            const accountKey = accountId || accountDisplay;
            const accountMatch = accountKey
              ? accountOptions.find((o) => String(o.value) === accountKey)
              : undefined;
            const accountValue = accountKey ? (accountMatch ? accountMatch.value : accountKey) : '';
            const accountLabel = accountMatch?.label ?? accountDisplay ?? accountKey;
            const rowAccountOptions = [{ value: SELECT_NONE_VALUE, label: '-' }, ...accountOptions];
            if (
              accountValue &&
              !rowAccountOptions.some((o) => String(o.value) === String(accountValue))
            ) {
              rowAccountOptions.splice(1, 0, {
                value: accountValue,
                label: accountLabel || accountValue,
              });
            }
            if (onFieldUpdate && leadId) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={accountValue}
                    valueSentinel={SELECT_NONE_VALUE}
                    onValueChange={(v) => {
                      const next = v === SELECT_NONE_VALUE ? '' : v;
                      if (onBatchFieldUpdate && next !== accountValue) {
                        onBatchFieldUpdate(leadId, { account: next, contacts: [] });
                        return;
                      }
                      onFieldUpdate(leadId, 'account', next);
                    }}
                    options={rowAccountOptions}
                    placeholder='—'
                    searchPlaceholder='Search account...'
                    noResultsMessage='No accounts found'
                    emptyMessage='No accounts available'
                    triggerClassName={cn(
                      accountLabel ? leadTableSelectTriggerClass : leadTableSelectTriggerEmptyClass,
                    )}
                    contentClassName={leadTableSelectContentClassName}
                    renderTrigger={() =>
                      accountLabel ? (
                        <span className='block min-w-0 truncate paragraph-small text-text-sub-600'>
                          {accountLabel}
                        </span>
                      ) : (
                        // emptyPill
                        plainEmptyDash
                      )
                    }
                    renderOptionLabel={(opt) =>
                      opt.value === SELECT_NONE_VALUE
                        ? renderLeadSelectItemLabel('-')
                        : renderLeadSelectItemLabel(opt.label ?? opt.value)
                    }
                    renderFooter={
                      !accountValue && onCreateAccount
                        ? ({ close, searchQuery }) => {
                            const normalizedQuery = String(searchQuery || '')
                              .trim()
                              .toLocaleLowerCase();
                            const accountAlreadyExists = accountOptions.some((option) => {
                              const label = String(option?.label || '')
                                .trim()
                                .toLocaleLowerCase();
                              const value = String(option?.value || '')
                                .trim()
                                .toLocaleLowerCase();
                              return label === normalizedQuery || value === normalizedQuery;
                            });
                            if (!normalizedQuery || accountAlreadyExists) return null;
                            return (
                              <button
                                type='button'
                                className='flex w-full items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm font-medium text-primary-base hover:bg-bg-weak-50'
                                onClick={async () => {
                                  close();
                                  const created = await onCreateAccount(row.original, searchQuery);
                                  if (!created?.value) return;
                                  setAccountOptions((previous) =>
                                    previous.some(
                                      (option) => String(option?.value) === String(created.value),
                                    )
                                      ? previous
                                      : [...previous, created],
                                  );
                                }}
                              >
                                <RiAddLine size={18} />
                                Create new account
                              </button>
                            );
                          }
                        : undefined
                    }
                  />
                </div>
              );
            }
            return (
              <span className='block min-w-0 truncate paragraph-small text-text-sub-600'>
                {accountDisplay || '-'}
              </span>
            );
          },
        },
        {
          id: 'cp_account',
          accessorKey: 'cp_account',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('CP Account', column),
          cell: ({ row }) => {
            const display = (row.original.cp_account || '').trim() || '-';
            return (
              <span
                className='paragraph-small text-text-sub-600 block min-w-0 max-w-full truncate'
                title={display === '-' ? undefined : display}
              >
                {display}
              </span>
            );
          },
        },
        {
          id: 'company_legal_name',
          accessorKey: 'company_legal_name',
          enableSorting: false,
          header: ({ column }) => createSortableHeader('Company Legal Name', column),
          cell: ({ row }) => {
            // Display CRM Account.custom_legal_name (via list API company_legal_name)
            const display = (row.original.company_legal_name || '').trim() || '-';
            return (
              <span
                className='paragraph-small text-text-sub-600 block min-w-0 max-w-full truncate'
                title={display === '-' ? undefined : display}
              >
                {display}
              </span>
            );
          },
        },
        {
          id: 'lead_of',
          accessorKey: 'lead_of',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Lead Of', column),
          cell: ({ row }) => {
            const rawValue = row.original.lead_of || '';
            const leadOfOptions = leadOptions?.lead_of ?? [];
            const selectedLabel = getLinkFieldOptionLabel(rawValue, leadOfOptions, rawValue);
            return (
              <span className={leadPlainCellTextClass}>{selectedLabel || rawValue || '-'}</span>
            );
          },
        },
        {
          id: 'created_at',
          accessorKey: 'created_at',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Created At', column),
          cell: ({ row }) => formatLeadDateTime(row.original.created_at),
        },
        {
          id: 'last_modified_at',
          accessorKey: 'last_modified_at',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Last Modified At', column),
          cell: ({ row }) => formatLeadDateTime(row.original.last_modified_at),
        },
        {
          id: 'pipeline',
          accessorKey: 'pipeline',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Pipeline', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const pipelineRaw =
              row.original.pipeline && row.original.pipeline !== '-'
                ? String(row.original.pipeline).trim()
                : '';
            const pipelineLabelRaw =
              row.original.pipeline_label && row.original.pipeline_label !== '-'
                ? String(row.original.pipeline_label).trim()
                : '';
            const pipelineOptions = leadOptions?.pipelines ?? [];
            const pipelineValue = resolveLinkFieldSelectValue(
              pipelineRaw,
              pipelineLabelRaw,
              pipelineOptions,
            );
            const stageRaw =
              row.original.lifecycle_stage && row.original.lifecycle_stage !== '-'
                ? String(row.original.lifecycle_stage).trim()
                : '';
            const stageLabel =
              row.original.lifecycle_stage_label && row.original.lifecycle_stage_label !== '-'
                ? String(row.original.lifecycle_stage_label).trim()
                : '';
            const statusRaw =
              row.original.life_cycle_stage_status && row.original.life_cycle_stage_status !== '-'
                ? String(row.original.life_cycle_stage_status).trim()
                : '';
            const statusLabel =
              row.original.life_cycle_stage_status_label &&
              row.original.life_cycle_stage_status_label !== '-'
                ? String(row.original.life_cycle_stage_status_label).trim()
                : row.original.status && row.original.status !== '-'
                  ? String(row.original.status).trim()
                  : '';
            const pipelineStages = pipelineValue ? stagesByPipeline[pipelineValue] : null;
            const stageList = pipelineStages?.stages ?? leadOptions?.stages ?? [];
            const stageColorMap = pipelineStages?.stageColorMap ?? leadOptions?.stageColorMap ?? {};
            const stageStatusMap =
              pipelineStages?.stageStatusMap ?? leadOptions?.stageStatusMap ?? {};
            const stageValue = resolveLinkFieldSelectValue(stageRaw, stageLabel, stageList);
            const statusOptionsForStage = stageValue ? stageStatusMap[stageValue] || [] : [];
            const statusValue = resolveLinkFieldSelectValue(
              statusRaw,
              statusLabel,
              statusOptionsForStage,
            );
            const selectedLabel = getLinkFieldOptionLabel(
              pipelineValue,
              pipelineOptions,
              pipelineLabelRaw || pipelineRaw,
            );
            const pipelineColor = resolveCrmColor(
              row.original.pipeline_color,
              pipelineOptions.find((o) => String(o.value) === String(pipelineValue))?.color,
              CRM_DEFAULT_PIPELINE_COLOR,
            );
            if (onBatchFieldUpdate && leadId && pipelineOptions.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadPipelineEditPopover
                    pipelineValue={pipelineValue}
                    stageValue={stageValue}
                    statusValue={statusValue}
                    lostReasonValue={
                      row.original.lost_cause && row.original.lost_cause !== '-'
                        ? String(row.original.lost_cause).trim()
                        : ''
                    }
                    pipelineOptions={buildLinkSelectOptions(
                      pipelineOptions,
                      pipelineValue,
                      pipelineLabelRaw || pipelineRaw,
                    )}
                    stageOptions={buildLinkSelectOptions(stageList, stageValue, stageLabel)}
                    statusOptions={buildLinkSelectOptions(
                      statusOptionsForStage,
                      statusValue,
                      statusLabel,
                    )}
                    stageColorMap={stageColorMap}
                    stageStatusMap={stageStatusMap}
                    stageColor={row.original.lifecycle_stage_color || ''}
                    ensureStagesForPipeline={ensureStagesForPipeline}
                    onCommit={(payload) => onBatchFieldUpdate(leadId, payload)}
                    renderTriggerContent={() =>
                      renderCrmColorBadge(pipelineValue ? selectedLabel : '', pipelineColor)
                    }
                  />
                </div>
              );
            }
            return renderCrmColorBadge(selectedLabel || '', pipelineColor);
          },
        },
        {
          id: 'lifecycle_stage',
          accessorKey: 'lifecycle_stage',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Life Cycle Stage', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const stageRaw =
              row.original.lifecycle_stage && row.original.lifecycle_stage !== '-'
                ? String(row.original.lifecycle_stage).trim()
                : '';
            const stageLabel =
              row.original.lifecycle_stage_label && row.original.lifecycle_stage_label !== '-'
                ? String(row.original.lifecycle_stage_label).trim()
                : '';
            const pipelineRaw =
              row.original.pipeline && row.original.pipeline !== '-'
                ? String(row.original.pipeline).trim()
                : '';
            const pipelineValue = resolveLinkFieldSelectValue(
              pipelineRaw,
              row.original.pipeline_label,
              leadOptions?.pipelines,
            );
            const pipelineStages = pipelineValue ? stagesByPipeline[pipelineValue] : null;
            const stageList = pipelineStages?.stages ?? leadOptions?.stages ?? [];
            const stageColorMap = pipelineStages?.stageColorMap ?? leadOptions?.stageColorMap ?? {};
            const stageStatusMap =
              pipelineStages?.stageStatusMap ?? leadOptions?.stageStatusMap ?? {};
            const stageValue = resolveLinkFieldSelectValue(stageRaw, stageLabel, stageList);
            const statusRaw =
              row.original.life_cycle_stage_status && row.original.life_cycle_stage_status !== '-'
                ? String(row.original.life_cycle_stage_status).trim()
                : '';
            const statusLabel =
              row.original.life_cycle_stage_status_label &&
              row.original.life_cycle_stage_status_label !== '-'
                ? String(row.original.life_cycle_stage_status_label).trim()
                : row.original.status && row.original.status !== '-'
                  ? String(row.original.status).trim()
                  : '';
            const statusOptionsForStage = stageValue ? stageStatusMap[stageValue] || [] : [];
            const statusValue = resolveLinkFieldSelectValue(
              statusRaw,
              statusLabel,
              statusOptionsForStage,
            );
            const options = buildLinkSelectOptions(stageList, stageValue, stageLabel);
            const displayLabel = getLinkFieldOptionLabel(stageValue, stageList, stageLabel);
            const displayColor = resolveCrmColor(
              stageColorMap[stageValue],
              row.original.lifecycle_stage_color,
              CRM_DEFAULT_STAGE_COLOR,
            );

            if (onBatchFieldUpdate && leadId && pipelineValue && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadPipelineEditPopover
                    showPipeline={false}
                    pipelineValue={pipelineValue}
                    stageValue={stageValue}
                    statusValue={statusValue}
                    lostReasonValue={
                      row.original.lost_cause && row.original.lost_cause !== '-'
                        ? String(row.original.lost_cause).trim()
                        : ''
                    }
                    stageOptions={options}
                    statusOptions={buildLinkSelectOptions(
                      statusOptionsForStage,
                      statusValue,
                      statusLabel,
                    )}
                    stageColorMap={stageColorMap}
                    stageStatusMap={stageStatusMap}
                    stageColor={row.original.lifecycle_stage_color || ''}
                    ensureStagesForPipeline={ensureStagesForPipeline}
                    onCommit={(payload) => onBatchFieldUpdate(leadId, payload)}
                    renderTriggerContent={() =>
                      renderCrmColorBadge(stageValue ? displayLabel : '', displayColor)
                    }
                  />
                </div>
              );
            }

            const stage = displayLabel || stageRaw || '';
            return renderCrmColorBadge(stage, displayColor);
          },
        },
        {
          id: 'status',
          accessorKey: 'status',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Status', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const statusRaw =
              row.original.life_cycle_stage_status && row.original.life_cycle_stage_status !== '-'
                ? String(row.original.life_cycle_stage_status).trim()
                : '';
            const statusLabel =
              row.original.life_cycle_stage_status_label &&
              row.original.life_cycle_stage_status_label !== '-'
                ? String(row.original.life_cycle_stage_status_label).trim()
                : row.original.status && row.original.status !== '-'
                  ? String(row.original.status).trim()
                  : '';
            const stageRaw =
              row.original.lifecycle_stage && row.original.lifecycle_stage !== '-'
                ? String(row.original.lifecycle_stage).trim()
                : '';
            const stageLabel =
              row.original.lifecycle_stage_label && row.original.lifecycle_stage_label !== '-'
                ? String(row.original.lifecycle_stage_label).trim()
                : '';
            const pipelineRaw =
              row.original.pipeline && row.original.pipeline !== '-'
                ? String(row.original.pipeline).trim()
                : '';
            const pipelineValue = resolveLinkFieldSelectValue(
              pipelineRaw,
              row.original.pipeline_label,
              leadOptions?.pipelines,
            );
            const pipelineStages = pipelineValue ? stagesByPipeline[pipelineValue] : null;
            const stageList = pipelineStages?.stages ?? leadOptions?.stages ?? [];
            const stageColorMap = pipelineStages?.stageColorMap ?? leadOptions?.stageColorMap ?? {};
            const stageStatusMap =
              pipelineStages?.stageStatusMap ?? leadOptions?.stageStatusMap ?? {};
            const stageValue = resolveLinkFieldSelectValue(stageRaw, stageLabel, stageList);
            const statusOptions = stageValue ? stageStatusMap[stageValue] || [] : [];
            const statusValue = resolveLinkFieldSelectValue(statusRaw, statusLabel, statusOptions);
            const options = buildLinkSelectOptions(statusOptions, statusValue, statusLabel);
            const displayLabel = getLinkFieldOptionLabel(statusValue, statusOptions, statusLabel);
            const statusColor = resolveCrmStatusBadgeColor({
              statusColor: row.original.life_cycle_stage_status_color,
              optionColor: statusOptions.find((o) => String(o.value) === String(statusValue))
                ?.color,
              statusLabel: displayLabel || statusLabel,
            });

            if (onBatchFieldUpdate && leadId && pipelineValue && stageValue && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadPipelineEditPopover
                    showPipeline={false}
                    pipelineValue={pipelineValue}
                    stageValue={stageValue}
                    statusValue={statusValue}
                    lostReasonValue={
                      row.original.lost_cause && row.original.lost_cause !== '-'
                        ? String(row.original.lost_cause).trim()
                        : ''
                    }
                    stageOptions={buildLinkSelectOptions(stageList, stageValue, stageLabel)}
                    statusOptions={options}
                    stageColorMap={stageColorMap}
                    stageStatusMap={stageStatusMap}
                    stageColor={row.original.lifecycle_stage_color || ''}
                    ensureStagesForPipeline={ensureStagesForPipeline}
                    onCommit={(payload) => onBatchFieldUpdate(leadId, payload)}
                    renderTriggerContent={() =>
                      renderCrmColorBadge(statusValue ? displayLabel : '', statusColor)
                    }
                  />
                </div>
              );
            }

            const display = displayLabel && displayLabel !== '-' ? displayLabel : '-';
            return renderCrmColorBadge(display, statusColor);
          },
        },
        {
          id: 'sales_owner',
          accessorKey: 'sales_owner',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Sales Owner', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const value = row.original.sales_owner || '';
            const options = leadOptions?.sales_owner || [];
            const ownerLabel =
              options.find((opt) => ownerOptionGetValue(opt) === value)?.label ??
              options.find((opt) => opt?.label === value || opt?.name === value)?.label ??
              value;
            if (onFieldUpdate && leadId && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger asChild>
                      <span className='inline-flex max-w-full'>
                        <LeadTableSearchableSelect
                          value={value}
                          onValueChange={(v) => onFieldUpdate(leadId, 'sales_owner', v)}
                          options={options}
                          searchPlaceholder='Search sales owner...'
                          noResultsMessage='No sales owners found'
                          emptyMessage='No sales owners available'
                          getOptionValue={ownerOptionGetValue}
                          getOptionLabel={(opt) =>
                            opt?.label ?? opt?.name ?? ownerOptionGetValue(opt)
                          }
                          itemKeyPrefix='sales-owner-'
                          triggerClassName={
                            ownerLabel || value
                              ? leadTableSelectTriggerCompactClass
                              : leadTableSelectTriggerEmptyClass
                          }
                          renderTrigger={() => renderLeadOwnerTrigger(ownerLabel || value)}
                          renderOptionLabel={renderLeadOwnerOptionLabel}
                        />
                      </span>
                    </Tooltip.Trigger>
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
              return <span className='paragraph-small text-text-sub-600'>-</span>;
            }
            return (
              <Tooltip.Root delayDuration={0}>
                <Tooltip.Trigger
                  type='button'
                  className='inline-flex items-center bg-transparent border-0 p-0 cursor-default'
                >
                  <div className={avatarPillClass}>
                    <CrmAccountAvatar name={value} size={24} className='shrink-0' />
                    {/* <span className='shrink-0 whitespace-nowrap paragraph-small text-text-sub-600'>
                      {value}
                    </span> */}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <CrmAccountAvatar name={value} size={32} className='shrink-0' />
                    <div className='flex min-w-0 flex-col'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {value}
                      </span>
                    </div>
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            );
          },
        },
        {
          id: 'product',
          accessorKey: 'product',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Product', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const rawValue = normalizeLeadTableSelectValue(row.original.product);
            const pipelineRaw =
              row.original.pipeline && row.original.pipeline !== '-'
                ? String(row.original.pipeline).trim()
                : '';
            const pipelineValue = resolveLinkFieldSelectValue(
              pipelineRaw,
              row.original.pipeline_label,
              leadOptions?.pipelines,
            );
            const productOptions = pipelineValue
              ? (pipelineLinkOptionsByPipeline[pipelineValue]?.product ?? [])
              : [];
            const value = resolveLinkFieldSelectValue(rawValue, rawValue, productOptions);
            const options = buildLinkSelectOptions(productOptions, value, rawValue);
            if (onFieldUpdate && leadId && pipelineValue) {
              const selectedLabel = getLinkFieldOptionLabel(value, productOptions, rawValue);
              const productLabel = value ? selectedLabel || value : '';
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    contentClassName={leadTableSelectContentClassName200}
                    onOpenChange={(open) => {
                      if (open) void ensurePipelineLinkOptions(pipelineValue);
                    }}
                    onValueChange={(v) => {
                      const next =
                        v === '' || v === SELECT_NONE_VALUE
                          ? ''
                          : resolveLinkFieldSelectValue(v, v, productOptions) || v;
                      if (next === value) return;
                      onFieldUpdate(leadId, 'product', next);
                    }}
                    options={options}
                    searchPlaceholder='Search product...'
                    noResultsMessage='No products found'
                    emptyMessage='No products available'
                    triggerClassName={
                      productLabel ? leadTableSelectTriggerClass : leadTableSelectTriggerEmptyClass
                    }
                    renderTrigger={() =>
                      productLabel ? (
                        <span className='block min-w-0 truncate paragraph-small text-text-sub-600'>
                          {productLabel}
                        </span>
                      ) : (
                        plainEmptyDash
                      )
                    }
                  />
                </div>
              );
            }
            const display = getLinkFieldOptionLabel(value, productOptions, rawValue) || rawValue;
            return (
              <span className='block min-w-0 truncate paragraph-small text-text-sub-600'>
                {display || '-'}
              </span>
            );
          },
        },
        {
          id: 'seats',
          accessorKey: 'seats',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Seats', column),
          cell: ({ row }) =>
            renderLeadInlineEditableTextCell({ row, fieldId: 'seats', onFieldUpdate }),
        },
        {
          id: 'monthly_value',
          accessorKey: 'monthly_value',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Monthly Value', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const monthlyRaw = row.original.monthly_value;
            const monthlyStr =
              monthlyRaw == null || monthlyRaw === ''
                ? ''
                : String(monthlyRaw).replaceAll(/[^\d.]/g, '');
            const monthlyDisplay = monthlyStr ? formatNumberInrForInput(monthlyStr) : '';
            if (onFieldUpdate && leadId) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={monthlyDisplay}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').replaceAll(/[^\d.]/g, '');
                      if (trimmed === monthlyStr) return;
                      onFieldUpdate(leadId, 'monthly_value', trimmed);
                    }}
                  />
                </div>
              );
            }
            return <span className={leadPlainCellTextClass}>{formatCurrencyInr(monthlyRaw)}</span>;
          },
        },
        {
          id: 'lead_source',
          accessorKey: 'lead_source',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Lead Source', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const value = row.original.lead_source || '';
            const options = leadOptions?.lead_source || [];
            if (onFieldUpdate && leadId && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    contentClassName={leadTableSelectContentClassName200}
                    onValueChange={(v) => onFieldUpdate(leadId, 'lead_source', v)}
                    options={options}
                    searchPlaceholder='Search lead source...'
                    noResultsMessage='No lead sources found'
                    emptyMessage='No lead sources available'
                    renderTrigger={() =>
                      value ? (
                        <span className={leadPlainCellTextClass}>{value}</span>
                      ) : (
                        plainEmptyDash
                      )
                    }
                  />
                </div>
              );
            }
            return value ? <span className={leadPlainCellTextClass}>{value}</span> : plainEmptyDash;
          },
        },
        {
          id: 'city',
          accessorKey: 'city',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('City', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const cityValue = normalizeLeadTableSelectValue(row.original.city);
            if (onFieldUpdate && leadId) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <CityCombobox
                    value={cityValue}
                    onChange={(v) => onFieldUpdate(leadId, 'city', v)}
                    placeholder='—'
                    inlineTrigger
                    size='xsmall'
                    variant='borderless'
                  />
                </div>
              );
            }
            return renderLeadPlainSelectTrigger(cityValue);
          },
        },
        {
          id: 'lead_size',
          accessorKey: 'lead_size',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Lead Size', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const rawValue = row.original.lead_size || '';
            const pipelineRaw =
              row.original.pipeline && row.original.pipeline !== '-'
                ? String(row.original.pipeline).trim()
                : '';
            const pipelineValue = resolveLinkFieldSelectValue(
              pipelineRaw,
              row.original.pipeline_label,
              leadOptions?.pipelines,
            );
            const sizeOptions = pipelineValue
              ? (pipelineLinkOptionsByPipeline[pipelineValue]?.lead_size ?? [])
              : [];
            const value = resolveLinkFieldSelectValue(rawValue, rawValue, sizeOptions);
            const options = buildLinkSelectOptions(sizeOptions, value, rawValue);
            if (onFieldUpdate && leadId && pipelineValue) {
              const selectedLabel = getLinkFieldOptionLabel(value, sizeOptions, rawValue);
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    onOpenChange={(open) => {
                      if (open) void ensurePipelineLinkOptions(pipelineValue);
                    }}
                    onValueChange={(v) => {
                      const next =
                        v === '' || v === SELECT_NONE_VALUE
                          ? ''
                          : resolveLinkFieldSelectValue(v, v, sizeOptions) || v;
                      if (next === value) return;
                      onFieldUpdate(leadId, 'lead_size', next);
                    }}
                    options={options}
                    searchPlaceholder='Search lead size...'
                    noResultsMessage='No lead sizes found'
                    emptyMessage='No lead sizes available'
                    renderTrigger={() =>
                      value ? (
                        <span className={leadPlainCellTextClass}>{selectedLabel || value}</span>
                      ) : (
                        plainEmptyDash
                      )
                    }
                  />
                </div>
              );
            }
            const display = getLinkFieldOptionLabel(value, sizeOptions, rawValue) || '-';
            return display !== '-' ? (
              <span className={leadPlainCellTextClass}>{display}</span>
            ) : (
              plainEmptyDash
            );
          },
        },
        {
          id: 'need_urgency',
          accessorKey: 'need_urgency',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Need Urgency', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const value = row.original.need_urgency || '';
            const options = leadOptions?.need_urgency || [];
            if (onFieldUpdate && leadId && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    contentClassName={leadTableSelectContentClassName200}
                    onValueChange={(v) => onFieldUpdate(leadId, 'need_urgency', v)}
                    options={options}
                    searchPlaceholder='Search need urgency...'
                    noResultsMessage='No options found'
                    emptyMessage='No options available'
                    renderTrigger={() => renderLeadPlainSelectTrigger(value)}
                  />
                </div>
              );
            }
            return renderLeadPlainSelectTrigger(value);
          },
        },
        {
          id: 'lead_relevance',
          accessorKey: 'lead_relevance',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Lead Relevance', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const rawValue = row.original.lead_relevance || '';
            const pipelineRaw =
              row.original.pipeline && row.original.pipeline !== '-'
                ? String(row.original.pipeline).trim()
                : '';
            const pipelineValue = resolveLinkFieldSelectValue(
              pipelineRaw,
              row.original.pipeline_label,
              leadOptions?.pipelines,
            );
            const relevanceOptions = pipelineValue
              ? (pipelineLinkOptionsByPipeline[pipelineValue]?.lead_relevance ?? [])
              : [];
            const value = resolveLinkFieldSelectValue(rawValue, rawValue, relevanceOptions);
            const options = buildLinkSelectOptions(relevanceOptions, value, rawValue);
            if (onFieldUpdate && leadId && pipelineValue) {
              const selectedLabel = getLinkFieldOptionLabel(value, relevanceOptions, rawValue);
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    contentClassName={leadTableSelectContentClassName200}
                    onOpenChange={(open) => {
                      if (open) void ensurePipelineLinkOptions(pipelineValue);
                    }}
                    onValueChange={(v) => {
                      const next =
                        v === '' || v === SELECT_NONE_VALUE
                          ? ''
                          : resolveLinkFieldSelectValue(v, v, relevanceOptions) || v;
                      if (next === value) return;
                      onFieldUpdate(leadId, 'lead_relevance', next);
                    }}
                    options={options}
                    searchPlaceholder='Search lead relevance...'
                    noResultsMessage='No options found'
                    emptyMessage='No options available'
                    renderTrigger={() => renderLeadPlainSelectTrigger(value ? selectedLabel : '')}
                  />
                </div>
              );
            }
            const display = getLinkFieldOptionLabel(value, relevanceOptions, rawValue) || '-';
            return renderLeadPlainSelectTrigger(display !== '-' ? display : '');
          },
        },
        {
          id: 'info_call_status',
          accessorKey: 'info_call_status',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Info Call Status', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const rawValue = row.original.info_call_status || '';
            const options = leadOptions?.info_call_status || [];
            const value = normalizeLeadTableSelectValue(rawValue);
            const selectOptions = buildLinkSelectOptions(options, value, rawValue);
            if (onFieldUpdate && leadId && selectOptions.length > 0) {
              const selectedLabel = getLinkFieldOptionLabel(value, options, rawValue);
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    contentClassName={leadTableSelectContentClassName200}
                    onValueChange={(v) => {
                      const next = v === '' || v === SELECT_NONE_VALUE ? '' : v;
                      if (next === value) return;
                      onFieldUpdate(leadId, 'info_call_status', next);
                    }}
                    options={selectOptions}
                    searchPlaceholder='Search info call status...'
                    noResultsMessage='No info call statuses found'
                    emptyMessage='No info call statuses available'
                    renderTrigger={() => (
                      <InfoCallStatusBadge status={value ? selectedLabel || value : ''} />
                    )}
                    renderOptionLabel={(opt) => (
                      <InfoCallStatusBadge status={opt?.label || opt?.value} />
                    )}
                  />
                </div>
              );
            }
            return <InfoCallStatusBadge status={value} />;
          },
        },
        {
          id: 'lost_cause',
          accessorKey: 'lost_cause',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Drop Reason', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const rawValue = row.original.lost_cause || '';
            const pipelineRaw =
              row.original.pipeline && row.original.pipeline !== '-'
                ? String(row.original.pipeline).trim()
                : '';
            const pipelineValue = resolveLinkFieldSelectValue(
              pipelineRaw,
              row.original.pipeline_label,
              leadOptions?.pipelines,
            );
            const statusRaw =
              row.original.life_cycle_stage_status && row.original.life_cycle_stage_status !== '-'
                ? String(row.original.life_cycle_stage_status).trim()
                : '';
            const statusLabel =
              row.original.life_cycle_stage_status_label &&
              row.original.life_cycle_stage_status_label !== '-'
                ? String(row.original.life_cycle_stage_status_label).trim()
                : row.original.status && row.original.status !== '-'
                  ? String(row.original.status).trim()
                  : statusRaw;
            const requiresDropReason = statusLabelRequiresLostReason(statusLabel || statusRaw);
            const lostReasonOptions = pipelineValue
              ? (pipelineLinkOptionsByPipeline[pipelineValue]?.lost_reason ?? [])
              : [];
            const value = resolveLinkFieldSelectValue(rawValue, rawValue, lostReasonOptions);
            const options = buildLinkSelectOptions(lostReasonOptions, value, rawValue);
            if (onFieldUpdate && leadId && pipelineValue) {
              const selectedLabel = getLinkFieldOptionLabel(value, lostReasonOptions, rawValue);
              const missingRequired = requiresDropReason && !value;
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    contentClassName={leadTableSelectContentClassName200}
                    triggerClassName={cn(missingRequired && 'ring-1 ring-error-base')}
                    onOpenChange={(open) => {
                      if (open) void ensurePipelineLinkOptions(pipelineValue);
                    }}
                    onValueChange={(v) => {
                      const next =
                        v === '' || v === SELECT_NONE_VALUE
                          ? ''
                          : resolveLinkFieldSelectValue(v, v, lostReasonOptions) || v;
                      if (next === value) return;
                      if (requiresDropReason && !next) {
                        showErrorToast('Lost / drop reason is required');
                        return;
                      }
                      onFieldUpdate(leadId, 'lost_cause', next);
                    }}
                    options={options}
                    placeholder={requiresDropReason ? 'Select reason...' : undefined}
                    searchPlaceholder='Search drop reason...'
                    noResultsMessage='No drop reasons found'
                    emptyMessage='No drop reasons available'
                    renderTrigger={() =>
                      renderLeadPlainSelectTrigger(
                        value ? selectedLabel || value : requiresDropReason ? '' : '',
                      )
                    }
                  />
                  {missingRequired ? (
                    <span className='mt-0.5 block text-[10px] font-medium text-error-base'>
                      Required for drop status
                    </span>
                  ) : null}
                </div>
              );
            }
            const display = getLinkFieldOptionLabel(value, lostReasonOptions, rawValue) || rawValue;
            return renderLeadPlainSelectTrigger(display && display !== '-' ? display : '');
          },
        },
        {
          id: 'inside_sales',
          accessorKey: 'inside_sales',
          enableSorting: true,
          header: ({ column }) => createSortableHeader('Inside Sales', column),
          cell: ({ row }) => {
            const leadId = row.original.id || row.original.name;
            const value = normalizeLeadTableSelectValue(row.original.inside_sales);
            const options = leadOptions?.inside_sales || [];
            if (onFieldUpdate && leadId && options.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className={leadCellOverflowClass}>
                  <LeadTableSearchableSelect
                    value={value}
                    onValueChange={(v) => onFieldUpdate(leadId, 'inside_sales', v)}
                    options={options}
                    searchPlaceholder='Search inside sales...'
                    noResultsMessage='No inside sales found'
                    emptyMessage='No inside sales available'
                    getOptionValue={ownerOptionGetValue}
                    getOptionLabel={(opt) => opt?.label ?? opt?.name ?? ownerOptionGetValue(opt)}
                    itemKeyPrefix='inside-sales-'
                    renderTrigger={() => renderLeadPlainOwnerTrigger(value)}
                    renderOptionLabel={renderLeadOwnerOptionLabel}
                  />
                </div>
              );
            }
            return renderLeadPlainOwnerTrigger(value);
          },
        },
      ];

      const restIds = LEAD_COLUMN_DEFS.map((c) => c.id).filter(
        (id) => !defs.some((d) => d.id === id),
      );
      const CURRENCY_IDS = ['est_monthly_value', 'est_lifetime_value', 'monthly_value'];
      restIds.forEach((id) => {
        const label = LEAD_COLUMN_DEFS.find((c) => c.id === id)?.label || id;
        const isCurrency = CURRENCY_IDS.includes(id);
        defs.push({
          id,
          accessorKey: id,
          enableSorting: true,
          header: ({ column }) => createSortableHeader(label, column),
          cell: ({ row }) => {
            if (LEAD_INLINE_EDITABLE_TEXT_FIELD_IDS.has(id)) {
              return renderLeadInlineEditableTextCell({ row, fieldId: id, onFieldUpdate });
            }
            const raw = row.original[id];
            const isEmpty = raw === undefined || raw === null || raw === '';
            if (id === 'lead_temperature') {
              const leadId = row.original.id || row.original.name;
              const v = normalizeLeadTableSelectValue(raw);
              const TempBadge = (
                <LeadTemperatureBadge
                  value={v}
                  label={v || '-'}
                  icon={LEAD_TEMPERATURE_ICONS[v]}
                  color={LEAD_TEMPERATURE_COLORS[v]}
                />
              );
              if (onFieldUpdate && leadId) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={cn(leadCellOverflowClass, 'flex justify-center')}
                  >
                    <LeadTableSearchableSelect
                      value={v}
                      options={LEAD_TEMPERATURE_OPTIONS}
                      contentClassName={leadTableSelectContentClassName200}
                      searchPlaceholder='Search temperature...'
                      noResultsMessage='No options found'
                      emptyMessage='No options available'
                      triggerClassName={leadTableSelectTriggerCompactClass}
                      onValueChange={(next) => onFieldUpdate(leadId, 'lead_temperature', next)}
                      renderTrigger={() => TempBadge}
                      renderOptionLabel={renderLeadTemperatureOptionLabel}
                    />
                  </div>
                );
              }
              return <div className='flex w-full justify-center'>{TempBadge}</div>;
            }
            let display = isEmpty ? '-' : isCurrency ? formatCurrencyInr(raw) : raw;
            if (id === 'service_id' && raw) {
              display = getServiceDisplayLabel(raw);
            }
            return <span className={leadPlainCellTextClass}>{display}</span>;
          },
        });
      });

      defs.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className='flex items-center justify-end bg-inherit'>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                row.original._onDelete?.();
              }}
              className='p-1 rounded hover:bg-bg-weak-50 text-text-sub-400 hover:text-error-base transition-colors'
              aria-label={removeFromAccountMode ? 'Remove lead from account' : 'Delete lead'}
            >
              <RiDeleteBinLine size={16} />
            </button>
          </div>
        ),
        enableSorting: false,
        ...getFrozenActionsColumnExtras(freezeColumns),
      });

      return defs;
    }, [
      leadOptions,
      accountOptions,
      stagesByPipeline,
      ensureStagesForPipeline,
      pipelineLinkOptionsByPipeline,
      ensurePipelineLinkOptions,
      onFieldUpdate,
      onBatchFieldUpdate,
      onContactClick,
      contactOptions,
      contactOptionsByAccount,
      ensureAccountContactOptions,
      onCreateContact,
      onCreateAccount,
      removeFromAccountMode,
      freezeColumns,
      enableSelection,
      selectedLeadIdSet,
      allVisibleSelected,
      someVisibleSelected,
      visibleLeadIds.length,
      onToggleLeadSelection,
      onToggleSelectAll,
    ]);

    const defaultColumnConfig = useMemo(() => {
      // Keep defaults stable across Dropped/active tab switches so Save View
      // prefs are not reshuffled; lost_cause is inject/filtered in `columns` below.
      const config = prepareColumnsForConfig(LEAD_COLUMN_DEFS);
      config.forEach((col, index) => {
        const def = LEAD_COLUMN_DEFS.find((c) => c.id === col.id);
        if (def) {
          col.visible = def.visible !== false;
          col.enableHiding = def.enableHiding !== false;
        }
        col.order = index;
      });
      return config.sort((a, b) => a.order - b.order);
    }, []);

    const defaultPersist = useCallback(() => {}, []);
    const defaultFetch = useCallback(() => Promise.resolve([]), []);

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
      { autoSave: true, debounce: 500, pinnedColumnId: PINNED_LEAD_NAME_COLUMN_ID },
    );

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

    const columnMenuHeaderProps = useMemo(
      () => ({
        columnConfig,
        groupBy,
        groupableColumnIds,
        onSortColumn: handleSortColumnFromMenu,
        onGroupColumn: onGroupByChange ? handleGroupColumnFromMenu : undefined,
        onHideColumn: handleHideColumnFromMenu,
      }),
      [
        columnConfig,
        groupBy,
        groupableColumnIds,
        handleSortColumnFromMenu,
        handleGroupColumnFromMenu,
        handleHideColumnFromMenu,
        onGroupByChange,
      ],
    );

    const columns = useMemo(() => {
      let configured = applyColumnConfig(
        allColumnDefs,
        columnConfig,
        undefined,
        PINNED_LEAD_NAME_COLUMN_ID,
      );
      if (showDropReasonColumn) {
        // Ensure Drop Reason is present/visible on the Dropped leads tab.
        const hasLost = configured.some((c) => c.id === 'lost_cause');
        if (!hasLost) {
          const lostDef = allColumnDefs.find((c) => c.id === 'lost_cause');
          if (lostDef) configured = [...configured, lostDef];
        }
      } else {
        configured = configured.filter((c) => c.id !== 'lost_cause');
      }
      return orderColumnsWithActionsLast(reorderPipelineLifecycleGroup(configured));
    }, [allColumnDefs, columnConfig, showDropReasonColumn]);

    const table = useReactTable({
      data,
      columns,
      enableColumnPinning: freezeColumns,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: freezeColumns,
          leftColumnId: PINNED_LEAD_NAME_COLUMN_ID,
          columns,
        }),
      ),
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

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

    const canResize = typeof onColumnResize === 'function';

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + getLeadTableColumnWidth(col.id, getWidth), 0),
      [columns, getWidth, resizing],
    );

    const groupedData = useMemo(() => {
      if (!groupBy) return null;
      const groups = {};
      for (const row of data) {
        const raw = row[groupBy];
        const key = raw === undefined || raw === null ? '' : String(raw).trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }
      const sortedKeys = Object.keys(groups).sort((a, b) => {
        // Keep empty values first in asc / last in desc, like boards "Empty".
        if (a === '' && b !== '') return groupOrder === 'desc' ? 1 : -1;
        if (b === '' && a !== '') return groupOrder === 'desc' ? -1 : 1;
        return groupOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
      });
      return { sortedKeys, groups };
    }, [groupBy, groupOrder, data]);

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <RiErrorWarningLine className='size-12 text-error-base mb-4' />
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Leads</h3>
          {onRetry && (
            <button
              type='button'
              onClick={onRetry}
              className='mt-4 px-4 py-2 rounded-lg bg-error-base text-white'
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    const renderRow = (row, rowIndex, array) => {
      const leadId = getLeadRowId(row.original);
      const isSelected = Boolean(leadId && selectedLeadIdSet.has(leadId));
      return (
        <React.Fragment key={row.id}>
          <Table.Row
            onClick={() => onRowClick?.(row.original)}
            className={cn(
              'group/row',
              onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : '',
              isSelected && 'bg-bg-weak-50',
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <Table.Cell
                key={cell.id}
                {...getFrozenTanStackColumnProp(freezeColumns, cell.column)}
                className={cn(
                  'align-middle px-4 py-2.5 min-w-0 overflow-hidden',
                  cell.column.columnDef.meta?.cellClassName,
                )}
                style={{
                  width: getLeadTableColumnWidth(cell.column.id, getWidth),
                  minWidth: getLeadTableColumnMinWidth(cell.column.id),
                  maxWidth: getLeadTableColumnMaxWidth(cell.column.id),
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Table.Cell>
            ))}
          </Table.Row>
          {rowIndex < array.length - 1 && <Table.RowDivider />}
        </React.Fragment>
      );
    };

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
                      return (
                        <Table.Head
                          key={header.id}
                          {...getFrozenTanStackColumnProp(freezeColumns, header.column)}
                          className='text-left label-small text-text-sub-600 font-medium pl-4 pr-4 relative'
                          style={{
                            width: getLeadTableColumnWidth(colId, getWidth),
                            minWidth: getLeadTableColumnMinWidth(colId),
                            maxWidth: getLeadTableColumnMaxWidth(colId),
                            paddingRight: canResize && colId !== 'actions' ? '2rem' : undefined,
                          }}
                        >
                          <div className='flex items-center gap-0.5 min-w-0'>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        </Table.Head>
                      );
                    })}
                  </Table.Row>
                ))}
              </Table.Header>
              <Table.Body>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Table.Row key={i}>
                    {columns.map((col) => (
                      <Table.Cell key={col.id}>
                        <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        );
      }
      return (
        <div className={getFrozenWrapperClassName(freezeColumns)}>
          <GroupedLeadsView
            sortedKeys={groupedData.sortedKeys}
            groups={groupedData.groups}
            columns={columns}
            getWidth={getWidth}
            variant={variant}
            onRowClick={onRowClick}
            tableMinWidth={tableMinWidth}
            canResize={canResize}
            onResizeStart={handleResizeStart}
            freezeColumns={freezeColumns}
            onReorderColumnsByIds={reorderColumnsByIds}
            selectedLeadIdSet={selectedLeadIdSet}
            {...columnMenuHeaderProps}
          />
        </div>
      );
    }

    const hasRows = table.getRowModel().rows.length > 0;
    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 8 }).map((_, i) => (
          <React.Fragment key={i}>
            <Table.Row>
              {columns.map((col) => (
                <Table.Cell
                  key={col.id}
                  style={{
                    width: getLeadTableColumnWidth(col.id, getWidth),
                    minWidth: getLeadTableColumnMinWidth(col.id),
                  }}
                >
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {i < 7 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div className={getFrozenWrapperClassName(freezeColumns)}>
        <Table.Root
          variant={variant}
          {...getFrozenRootTableProps(freezeColumns, { tableInstance: table })}
          style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <CrmLeadsSortableHeader
            table={table}
            getWidth={getWidth}
            canResize={canResize}
            onResizeStart={handleResizeStart}
            freezeColumns={freezeColumns}
            onReorderColumnsByIds={reorderColumnsByIds}
            {...columnMenuHeaderProps}
          />

          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table
                .getRowModel()
                .rows.map((row, rowIndex, array) => renderRow(row, rowIndex, array))}
              {enableScrollPagination && hasMore && (
                <div ref={sentinelRef} data-scroll-sentinel className='h-1' />
              )}
              {isLoadingMore && (
                <Table.Row>
                  <Table.Cell colSpan={columns.length} className='text-center py-4'>
                    <span className='paragraph-small text-text-sub-500'>Loading more...</span>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          )}
        </Table.Root>
        {!isLoading && !hasRows && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
              {EMPTY_STATES.default.title}
            </h3>
            <p className='text-paragraph-sm text-text-sub-500'>
              {EMPTY_STATES.default.description}
            </p>
          </div>
        )}
      </div>
    );
  },
);

CrmLeadsTable.displayName = 'CrmLeadsTable';

export default CrmLeadsTable;
