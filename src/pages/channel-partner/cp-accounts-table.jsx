import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import * as Input from '@/components/ui/input';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiSearchLine,
} from 'react-icons/ri';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
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
import { parseToDate } from '@/utils/date-utils';
import {
  CP_TYPE_BADGE_COLORS,
  CP_TYPE_DEFAULT_BADGE_COLOR,
  CP_ACCOUNTS_COLUMN_IDS,
  CP_ACCOUNTS_EMPTY_STATES,
  CP_CONTACTS_AVATAR_DISPLAY_COUNT,
} from '@/pages/channel-partner/constants';
import emptyState from '@/assets/images/empty-state.png';
import {
  deriveOperationalStatesDisplay,
  getOperationalCitiesFromRow,
} from '@/pages/channel-partner/cp-operational-location-utils';
import {
  CpOperationalCityField,
  TextCellWithTooltip,
} from '@/pages/channel-partner/cp-operational-city-field';
import { useSelector } from 'react-redux';
import { selectCpAccountTypeOptions } from '@/redux/cpAccountSlices';

// Stable empty-array reference for optional array props.
// Using an inline `= []` default mints a NEW array on every render; when such a
// default feeds a memo/effect dependency (e.g. `industryGroups` in the
// `allColumnDefs` deps → `defaultColumnConfig` → useColumnConfig load effect),
// it retriggers that effect every render, causing an async setState re-render
// loop that freezes the tab. A shared frozen constant keeps the reference stable.
const EMPTY_ARRAY = Object.freeze([]);

function formatCreatedAt(input) {
  const date = parseToDate(input);
  if (!date) return '–';
  return format(date, 'do MMM yy, HH:mm:ss');
}

function formatYearDisplay(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '–';
  const yearMatch = trimmed.match(/^(\d{4})/);
  return yearMatch ? yearMatch[1] : trimmed;
}

function toEmployeeCountEditableValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed === '–') return '';
  return trimmed;
}

function formatEmployeeCountDisplay(value) {
  const editable = toEmployeeCountEditableValue(value);
  return editable || '–';
}

const TypeBadge = ({ type, label }) => {
  const display = label || type;
  const color = CP_TYPE_BADGE_COLORS[display] ?? CP_TYPE_DEFAULT_BADGE_COLOR;
  return (
    <Badge.Root
      variant='light'
      color={color}
      size='small'
      className='h-auto min-h-4 max-w-none whitespace-nowrap py-0.5'
    >
      {display}
    </Badge.Root>
  );
};

function resolveCpTypeOption(type, typeOptions) {
  if (!type) return null;
  return (typeOptions || []).find((o) => o.value === type || o.label === type) || null;
}

function resolveCpTypeLabel(type, typeOptions) {
  return resolveCpTypeOption(type, typeOptions)?.label || type || '';
}

function resolveCpTypeSelectValue(type, typeOptions) {
  return resolveCpTypeOption(type, typeOptions)?.value || type || '';
}

const SALES_OWNER_NONE_VALUE = '__none__';

function buildSalesOwnerSelectOptions(salesOwnerOptions, currentOwnerId, currentLabel) {
  const base = Array.isArray(salesOwnerOptions) ? [...salesOwnerOptions] : [];
  const id = String(currentOwnerId ?? '').trim();
  if (id && !base.some((o) => String(o.value) === id)) {
    base.unshift({ value: id, label: currentLabel || id });
  }
  return [{ value: SALES_OWNER_NONE_VALUE, label: '—' }, ...base];
}

function SalesOwnerAvatarTrigger({ name }) {
  if (!name) {
    return <span className='paragraph-small text-text-sub-600'>—</span>;
  }
  return (
    <span className='inline-flex items-center'>
      <CrmAccountAvatar name={name} variant='weak' size={24} showNativeTitle={false} />
    </span>
  );
}

/** Grouped searchable industry picker (type header + sub-type items). */
function CpAccountIndustryGroupedSelect({ value, displayLabel, industryGroups, onChange }) {
  const groups = Array.isArray(industryGroups) ? industryGroups : [];
  const hasValue = value != null && String(value).trim() !== '';

  const flattenedOptions = useMemo(() => {
    return groups.flatMap((group) => {
      const parentLabel = group.label;
      const list = Array.isArray(group.industry_name) ? group.industry_name : [];
      return list.map((opt) => ({
        value: opt.value,
        label: opt.label,
        groupLabel: parentLabel,
      }));
    });
  }, [groups]);

  const triggerLabel = hasValue ? displayLabel : '—';

  return (
    <SearchableSelect
      variant='borderless'
      size='xsmall'
      matchTriggerWidth={false}
      showArrow={false}
      value={hasValue ? value : ''}
      onValueChange={(nextValue) => {
        onChange(nextValue);
      }}
      options={flattenedOptions}
      placeholder='—'
      searchPlaceholder='Search industry...'
      noResultsMessage='No industries found'
      emptyMessage='No industries available'
      triggerClassName='!h-auto !min-h-8 w-full min-w-0 max-w-full items-start py-1'
      contentClassName='max-h-[min(360px,70vh)] w-max min-w-[min(100vw-24px,320px)] max-w-[min(100vw-24px,520px)] p-0'
      renderTrigger={() => (
        <span
          className='paragraph-small text-text-sub-600 block min-w-0 max-w-full text-left leading-snug line-clamp-2 break-words'
          title={hasValue ? displayLabel : undefined}
        >
          {triggerLabel}
        </span>
      )}
      renderOptionLabel={(opt) => (
        <div className='flex flex-col items-start gap-0.5'>
          <span className='text-paragraph-xs font-medium text-text-soft-400'>{opt.groupLabel}</span>
          <span className='paragraph-small text-text-strong-950 leading-snug whitespace-normal break-words text-left'>
            {opt.label}
          </span>
        </div>
      )}
    />
  );
}

const TABLE_ID = 'cp-accounts-table';
const STORAGE_KEY = (id) => `column-config-${id}`;
const CP_ACCOUNTS_FROZEN_LEFT_COLUMN_ID = CP_ACCOUNTS_COLUMN_IDS.LEGAL_NAME;
const CP_ACCOUNTS_ACTIONS_COLUMN_WIDTH = 60;
const CP_ACCOUNTS_COLUMN_MIN_WIDTH = 140;
const CP_ACCOUNTS_TYPE_COLUMN_WIDTH = 200;
const CP_ACCOUNTS_COLUMN_MAX_WIDTH = 280;

function getCpColumnWidth(colId) {
  if (colId === CP_ACCOUNTS_COLUMN_IDS.ACTIONS) return CP_ACCOUNTS_ACTIONS_COLUMN_WIDTH;
  if (colId === CP_ACCOUNTS_COLUMN_IDS.TYPE) return CP_ACCOUNTS_TYPE_COLUMN_WIDTH;
  return CP_ACCOUNTS_COLUMN_MIN_WIDTH;
}

function getCpColumnCellStyle(colId) {
  const width = getCpColumnWidth(colId);
  const isType = colId === CP_ACCOUNTS_COLUMN_IDS.TYPE;
  return {
    width,
    minWidth:
      colId === CP_ACCOUNTS_COLUMN_IDS.ACTIONS
        ? width
        : isType
          ? CP_ACCOUNTS_TYPE_COLUMN_WIDTH
          : CP_ACCOUNTS_COLUMN_MIN_WIDTH,
    maxWidth:
      colId === CP_ACCOUNTS_COLUMN_IDS.ACTIONS
        ? width
        : isType
          ? Math.max(CP_ACCOUNTS_COLUMN_MAX_WIDTH, CP_ACCOUNTS_TYPE_COLUMN_WIDTH)
          : CP_ACCOUNTS_COLUMN_MAX_WIDTH,
  };
}

/** Column ID to short label for grouped table header (dynamic for any group-by) */
const COLUMN_HEADER_LABELS = {
  [CP_ACCOUNTS_COLUMN_IDS.LEGAL_NAME]: 'Legal Name',
  [CP_ACCOUNTS_COLUMN_IDS.IPC_NAME]: 'IPC Name',
  [CP_ACCOUNTS_COLUMN_IDS.BRAND_NAME]: 'Brand Name',
  [CP_ACCOUNTS_COLUMN_IDS.TYPE]: 'Type',
  [CP_ACCOUNTS_COLUMN_IDS.INDUSTRY]: 'Industry Type',
  [CP_ACCOUNTS_COLUMN_IDS.CITY]: 'Primary City',
  [CP_ACCOUNTS_COLUMN_IDS.STATE]: 'State',
  [CP_ACCOUNTS_COLUMN_IDS.CREATED_AT]: 'Created At',
  [CP_ACCOUNTS_COLUMN_IDS.LAST_MODIFIED_AT]: 'Last Modified At',
  [CP_ACCOUNTS_COLUMN_IDS.CONTACTS]: 'Related CP Contacts',
  [CP_ACCOUNTS_COLUMN_IDS.WEBSITE]: 'Website',
  [CP_ACCOUNTS_COLUMN_IDS.SALES_OWNER]: 'Sales Owner',
  [CP_ACCOUNTS_COLUMN_IDS.YEAR_OF_ESTABLISHMENT]: 'Year of Est.',
  [CP_ACCOUNTS_COLUMN_IDS.NO_OF_EMPLOYEES]: 'No of Employees',
  [CP_ACCOUNTS_COLUMN_IDS.RERA_NUMBER]: 'RERA Number',
  [CP_ACCOUNTS_COLUMN_IDS.OPERATIONAL_CITY]: 'Operational City',
  [CP_ACCOUNTS_COLUMN_IDS.OPERATIONAL_STATE]: 'Operational State',
  [CP_ACCOUNTS_COLUMN_IDS.ACTIONS]: '',
};

/** Per-group table with frozen Name (left) and Actions (right), matching CRM Accounts grouped view. */
const GroupCpTable = React.memo(
  ({ groupRows, columns, variant, onRowSelect, navigate, tableMinWidth, hideActionsColumn }) => {
    const [localSorting, setLocalSorting] = useState([]);

    const columnPinning = useMemo(
      () =>
        buildFrozenColumnPinning({
          enabled: true,
          leftColumnId: CP_ACCOUNTS_FROZEN_LEFT_COLUMN_ID,
          hideActionsColumn,
          columns,
        }),
      [hideActionsColumn, columns],
    );

    const tableState = useMemo(
      () => withFrozenColumnPinning({ sorting: localSorting }, columnPinning),
      [localSorting, columnPinning],
    );

    const groupTable = useReactTable({
      data: groupRows,
      columns,
      enableColumnPinning: true,
      state: tableState,
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
                return (
                  <Table.Head
                    key={header.id}
                    {...getFrozenTanStackColumnProp(true, header.column)}
                    className={cn(
                      'text-left label-small text-text-sub-600 font-medium pl-4 pr-4',
                      header.column.columnDef.meta?.headClassName,
                    )}
                    style={getCpColumnCellStyle(colId)}
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
                className='cursor-pointer hover:bg-bg-weak-50 transition-colors'
                onClick={() => {
                  if (onRowSelect) onRowSelect(row.original);
                  else navigate(`/channel-partner/accounts/${row.original.id}`);
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id;
                  return (
                    <Table.Cell
                      key={cell.id}
                      {...getFrozenTanStackColumnProp(true, cell.column)}
                      className={cn('align-middle', cell.column.columnDef.meta?.cellClassName)}
                      style={getCpColumnCellStyle(colId)}
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
GroupCpTable.displayName = 'GroupCpTable';

function OperationalCityCell({ accountId, row, onOperationalLocationUpdate }) {
  const selectedCities = getOperationalCitiesFromRow(row);

  return (
    <CpOperationalCityField
      selectedCities={selectedCities}
      className='min-w-0 w-full max-w-full'
      onChange={
        onOperationalLocationUpdate && accountId
          ? (nextCities) => onOperationalLocationUpdate(accountId, nextCities)
          : undefined
      }
    />
  );
}

/** Grouped view: design aligned with GroupedTeamView (team-management-core-team), dynamic columns for any group-by */
const GroupedCpAccountsView = ({
  groupedData,
  columns,
  variant,
  onRowSelect,
  navigate,
  tableMinWidth,
  hideActionsColumn,
}) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries(Object.keys(groupedData || {}).map((k) => [k, true])),
  );

  useEffect(() => {
    setExpandedKeys((prev) => {
      const next = { ...prev };
      Object.keys(groupedData || {}).forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [groupedData]);

  const toggle = (key) => setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  const entries = Object.entries(groupedData || {});
  if (entries.length === 0) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>
        No results found.
      </div>
    );
  }

  return (
    <div className='w-full flex flex-col gap-10'>
      {entries.map(([groupKey, groupRows]) => {
        const isExpanded = expandedKeys[groupKey] !== false;
        return (
          <div key={groupKey} className='flex w-full flex-col items-start gap-1'>
            <button
              type='button'
              onClick={() => toggle(groupKey)}
              className='label-small flex items-center gap-1 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            >
              {groupKey}
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded && (
              <div className='w-full pt-2 [&_table]:table-fixed'>
                <GroupCpTable
                  groupRows={groupRows || []}
                  columns={columns}
                  variant={variant}
                  onRowSelect={onRowSelect}
                  navigate={navigate}
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

const CpAccountsTable = React.forwardRef(
  (
    {
      rows = EMPTY_ARRAY,
      groupedData = null,
      groupBy = '',
      isLoading = false,
      error = null,
      variant = 'compact',
      sorting = EMPTY_ARRAY,
      onSortingChange,
      tableId = TABLE_ID,
      onRowSelect,
      onDelete,
      onFieldUpdate,
      onYearsOfEstablishmentUpdate = null,
      onOperationalLocationUpdate = null,
      onRelatedCpContactsClick = null,
      onPrimaryCityClick = null,
      industryGroups = EMPTY_ARRAY,
      showActions = true,
      /** 'default' when no accounts at all, 'search' when filters/tab match nothing */
      emptyStateVariant = 'search',
      /** Resolve `salesOwner` user id → full name for hover tooltip (e.g. from getSalesTeamUserList). */
      salesOwnerOptions = EMPTY_ARRAY,
    },
    ref,
  ) => {
    const navigate = useNavigate();
    const typeOptions = useSelector(selectCpAccountTypeOptions);
    const [localSorting, setLocalSorting] = React.useState(sorting);
    useEffect(() => {
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

    const allColumnDefs = useMemo(() => {
      const salesOwnerMetaByKey = new Map();
      const registerKey = (key, meta) => {
        if (key == null || key === '') return;
        const s = String(key);
        if (!salesOwnerMetaByKey.has(s)) salesOwnerMetaByKey.set(s, meta);
        if (s.includes('@')) {
          const low = s.toLowerCase();
          if (!salesOwnerMetaByKey.has(low)) salesOwnerMetaByKey.set(low, meta);
        }
      };
      for (const opt of salesOwnerOptions || []) {
        const value = opt?.value ?? opt?.name ?? '';
        if (!value) continue;
        const label = String(opt?.label ?? opt?.full_name ?? value);
        const rawEmail = typeof opt?.email === 'string' && opt.email.trim() ? opt.email.trim() : '';
        const valueStr = String(value);
        const meta = { label, value: valueStr };
        registerKey(value, meta);
        if (rawEmail && rawEmail !== value) registerKey(rawEmail, meta);
      }
      const resolveSalesOwnerMeta = (ownerId) => {
        const s = String(ownerId);
        let m = salesOwnerMetaByKey.get(s);
        if (!m && s.includes('@')) m = salesOwnerMetaByKey.get(s.toLowerCase());
        return m;
      };
      const industryGroups_ = Array.isArray(industryGroups) ? industryGroups : [];
      const industryLabelByValue = new Map();
      for (const group of industryGroups_) {
        for (const option of Array.isArray(group?.industry_name) ? group.industry_name : []) {
          if (option?.value == null) continue;
          industryLabelByValue.set(String(option.value), option.label ?? option.value);
        }
      }

      return [
        {
          id: CP_ACCOUNTS_COLUMN_IDS.LEGAL_NAME,
          accessorKey: 'legalName',
          columnLabel: 'Name',
          ...getFrozenLeftColumnExtras(true),
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Name</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Legal Name'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const accountId = row.original.id;
            const displayValue = String(row.original.legalName || '').trim();
            if (onFieldUpdate && accountId) {
              return (
                <div className='min-w-0 max-w-[220px]'>
                  <InlineEditableText
                    value={displayValue}
                    editOnIconOnly
                    placeholder='—'
                    displayClassName='paragraph-small font-medium text-text-strong-950 whitespace-nowrap'
                    inputClassName='paragraph-small font-medium text-text-strong-950'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === displayValue) return;
                      onFieldUpdate(accountId, 'legalName', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <span className='block paragraph-small font-medium text-text-strong-950 whitespace-nowrap overflow-hidden text-ellipsis'>
                    {row.original.legalName || '–'}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side='bottom'>{row.original.legalName || '–'}</Tooltip.Content>
              </Tooltip.Root>
            );
          },
          meta: {
            columnClassName: 'w-[250px] min-w-[250px] max-w-[250px]',
            cellClassName: 'w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap',
          },
          enableSorting: true,
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.BRAND_NAME,
          accessorKey: 'brandName',
          header: <span className='whitespace-nowrap'>Brand Name</span>,
          cell: ({ row }) => {
            const accountId = row.original.id;
            const displayValue = String(row.original.brandName || '').trim();
            if (onFieldUpdate && accountId) {
              const tooltipLabel = displayValue || '–';
              return (
                <div className='min-w-0 max-w-[220px]' onClick={(e) => e.stopPropagation()}>
                  <Tooltip.Root size='xsmall'>
                    <Tooltip.Trigger asChild>
                      <div className='min-w-0 w-full'>
                        <InlineEditableText
                          value={displayValue}
                          placeholder='—'
                          displayClassName='paragraph-small text-text-sub-600 whitespace-nowrap'
                          inputClassName='paragraph-small text-text-sub-600'
                          onSave={(value) => {
                            const trimmed = String(value ?? '').trim();
                            if (trimmed === displayValue) return;
                            onFieldUpdate(accountId, 'brandName', trimmed);
                          }}
                        />
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='bottom'>{tooltipLabel}</Tooltip.Content>
                  </Tooltip.Root>
                </div>
              );
            }
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <span className='block paragraph-small text-text-sub-600 whitespace-nowrap overflow-hidden text-ellipsis'>
                    {row.original.brandName || '–'}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side='bottom'>{row.original.brandName || '–'}</Tooltip.Content>
              </Tooltip.Root>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.TYPE,
          accessorKey: 'type',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Type</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Type'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const accountId = row.original.id;
            const raw = row.original.type || '';
            const value = resolveCpTypeSelectValue(raw, typeOptions);
            const typeLabel = resolveCpTypeLabel(raw, typeOptions);
            if (onFieldUpdate && accountId) {
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={value}
                    onValueChange={(nextValue) => {
                      if (nextValue !== value) {
                        onFieldUpdate(accountId, 'type', nextValue);
                      }
                    }}
                    options={typeOptions}
                    placeholder='—'
                    searchPlaceholder='Search type...'
                    noResultsMessage='No types found'
                    emptyMessage='No types available'
                    triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
                    contentClassName='min-w-[160px]'
                    renderTrigger={() =>
                      value ? (
                        <TypeBadge type={value} label={typeLabel} />
                      ) : (
                        <span className='paragraph-small text-text-sub-600'>—</span>
                      )
                    }
                    renderOptionLabel={(opt) => <TypeBadge type={opt.value} label={opt.label} />}
                  />
                </div>
              );
            }
            return value ? (
              <TypeBadge type={value} label={typeLabel} />
            ) : (
              <span className='paragraph-small text-text-sub-600'>–</span>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.CREATED_AT,
          accessorKey: 'createdAt',
          visible: false,
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Created At</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Created At'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatCreatedAt(row.original.createdAt)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.LAST_MODIFIED_AT,
          accessorKey: 'modifiedAt',
          visible: false,
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Last Modified At</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Last Modified At'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatCreatedAt(row.original.modifiedAt || row.original.modified)}
            </span>
          ),
          enableSorting: true,
          sortingFn: (rowA, rowB) => {
            const a = parseToDate(rowA.original.modifiedAt || rowA.original.modified);
            const b = parseToDate(rowB.original.modifiedAt || rowB.original.modified);
            if (!a && !b) return 0;
            if (!a) return -1;
            if (!b) return 1;
            return a.getTime() - b.getTime();
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.INDUSTRY,
          accessorKey: 'industry',
          header: <span className='whitespace-nowrap'>Industry Type</span>,
          cell: ({ row }) => {
            const accountId = row.original.id;
            const value = row.original.industry || '';
            const displayLabel = value ? industryLabelByValue.get(String(value)) || value : '';
            if (onFieldUpdate && accountId && industryGroups_.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <CpAccountIndustryGroupedSelect
                    value={value}
                    displayLabel={displayLabel}
                    industryGroups={industryGroups_}
                    onChange={(nextValue) => {
                      if (nextValue !== value) {
                        onFieldUpdate(accountId, 'industry', nextValue);
                      }
                    }}
                  />
                </div>
              );
            }
            return (
              <span
                className='paragraph-small text-text-sub-600 block min-w-0 max-w-[280px] line-clamp-2 break-words leading-snug'
                title={displayLabel || value || undefined}
              >
                {displayLabel || value || '–'}
              </span>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.CITY,
          accessorKey: 'city',
          columnLabel: 'Primary City',
          visible: false,
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Primary City</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Primary City'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const city = row.original.city;
            const display = city == null || String(city).trim() === '' ? '–' : String(city).trim();

            if (!onPrimaryCityClick || !row.original.id) {
              return (
                <div className='min-w-0 w-full overflow-hidden'>
                  <TextCellWithTooltip text={city} />
                </div>
              );
            }

            return (
              <div className='min-w-0 w-full overflow-hidden' onClick={(e) => e.stopPropagation()}>
                <button
                  type='button'
                  className='block min-w-0 w-full truncate text-left paragraph-small text-text-sub-600 hover:text-primary-base cursor-pointer transition-colors'
                  title={display !== '–' ? display : 'Edit primary address'}
                  onClick={() => onPrimaryCityClick(row.original)}
                >
                  {display}
                </button>
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.STATE,
          accessorKey: 'state',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>State</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by State'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <div className='min-w-0 w-full overflow-hidden'>
              <TextCellWithTooltip text={row.original.state} />
            </div>
          ),
          enableSorting: true,
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.CONTACTS,
          accessorKey: 'contacts',
          header: <span className='whitespace-nowrap'>Related CP Contacts</span>,
          cell: ({ row }) => {
            const contacts = row.original.contacts || [];
            const list = Array.isArray(contacts) ? contacts : contacts ? [contacts] : [];

            const handleContactsNavigate = (event) => {
              event.stopPropagation();
              onRelatedCpContactsClick?.(row.original);
            };

            if (list.length === 0) {
              if (onRelatedCpContactsClick) {
                return (
                  <button
                    type='button'
                    className='paragraph-small text-text-sub-600 bg-transparent border-0 p-0 cursor-pointer hover:text-text-strong-950 transition-colors'
                    onClick={handleContactsNavigate}
                  >
                    –
                  </button>
                );
              }
              return <span className='paragraph-small text-text-sub-600'>–</span>;
            }

            const visible = list.slice(0, CP_CONTACTS_AVATAR_DISPLAY_COUNT);
            const extra = list.length - visible.length;

            const avatarTriggerClassName = onRelatedCpContactsClick
              ? 'inline-flex items-center bg-transparent border-0 p-0 cursor-pointer'
              : 'inline-flex items-center bg-transparent border-0 p-0 cursor-default';

            const avatarItemClassName = onRelatedCpContactsClick
              ? 'inline-block ring-2 ring-white rounded-full bg-transparent border-0 p-0 cursor-pointer'
              : 'inline-block ring-2 ring-white rounded-full cursor-default';

            const renderContactsList = (contactsToShow) => (
              <div className='flex flex-col gap-3'>
                <span className='text-label-xs text-text-sub-500 font-medium'>
                  Related contacts
                </span>
                {contactsToShow.map((contact, index) => {
                  const name =
                    contact?.name || contact?.full_name || contact?.email || contact?.id || '—';
                  const email = contact?.email || contact?.email_id || '';
                  return (
                    <div
                      key={contact?.id ? `${contact.id}-${index}` : index}
                      className='flex items-center gap-2 min-w-0'
                    >
                      <CrmAccountAvatar name={name} index={index} size={32} className='shrink-0' />
                      <div className='flex flex-col min-w-0'>
                        <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                          {name}
                        </span>
                        {email ? (
                          <span className='text-paragraph-xs text-text-sub-500 truncate'>
                            {email}
                          </span>
                        ) : null}
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
                      onClick={onRelatedCpContactsClick ? handleContactsNavigate : undefined}
                    >
                      {visible.map((contact, i) => {
                        const name =
                          contact?.name || contact?.full_name || contact?.email || contact?.id;
                        return (
                          <span
                            key={contact?.id || i}
                            className='inline-block ring-2 ring-white rounded-full'
                            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
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
                        contact?.name || contact?.full_name || contact?.email || contact?.id;
                      const email = contact?.email || contact?.email_id || '';
                      return (
                        <Tooltip.Root key={contact?.id || i}>
                          <Tooltip.Trigger
                            type='button'
                            className={avatarItemClassName}
                            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                            onClick={onRelatedCpContactsClick ? handleContactsNavigate : undefined}
                          >
                            <CrmAccountAvatar name={name} index={i} size={24} />
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            side='top'
                            variant='light'
                            size='medium'
                            className='max-w-[280px] p-3'
                          >
                            <div className='flex items-center gap-2 min-w-0'>
                              <CrmAccountAvatar
                                name={name}
                                index={i}
                                size={32}
                                className='shrink-0'
                              />
                              <div className='flex flex-col min-w-0'>
                                <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                                  {name || '—'}
                                </span>
                                {email ? (
                                  <span className='text-paragraph-xs text-text-sub-500 truncate'>
                                    {email}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      );
                    })}
                    <Tooltip.Root delayDuration={0}>
                      <Tooltip.Trigger
                        type='button'
                        className={`${avatarItemClassName} ${onRelatedCpContactsClick ? '' : 'cursor-default'}`}
                        style={{ marginLeft: -8, zIndex: visible.length }}
                        onClick={onRelatedCpContactsClick ? handleContactsNavigate : undefined}
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
          id: CP_ACCOUNTS_COLUMN_IDS.WEBSITE,
          accessorKey: 'website',
          header: <span className='whitespace-nowrap'>Website</span>,
          cell: ({ row }) => {
            const accountId = row.original.id;
            const displayValue = String(row.original.website || '').trim();
            if (onFieldUpdate && accountId) {
              return (
                <div className='max-w-[120px] min-w-0' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={displayValue}
                    placeholder='—'
                    displayClassName='paragraph-small text-text-sub-600'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === displayValue) return;
                      onFieldUpdate(accountId, 'website', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span
                className='paragraph-small text-text-sub-600 truncate max-w-[120px] block'
                title={row.original.website}
              >
                {row.original.website || '–'}
              </span>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.SALES_OWNER,
          accessorKey: 'salesOwner',
          header: <span className='whitespace-nowrap'>Sales Owner</span>,
          cell: ({ row }) => {
            const accountId = row.original.id;
            const ownerId = String(row.original.salesOwner ?? '').trim();
            const meta = ownerId ? resolveSalesOwnerMeta(ownerId) : null;
            const displayName = meta?.label || (ownerId ? String(ownerId) : '');
            const ownerSelectOptions = buildSalesOwnerSelectOptions(
              salesOwnerOptions,
              ownerId,
              displayName,
            );

            if (onFieldUpdate && accountId) {
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={ownerId}
                    valueSentinel={SALES_OWNER_NONE_VALUE}
                    onValueChange={(nextValue) => {
                      const next =
                        nextValue === SALES_OWNER_NONE_VALUE ? '' : String(nextValue ?? '');
                      if (next !== ownerId) {
                        onFieldUpdate(accountId, 'salesOwner', next);
                      }
                    }}
                    options={ownerSelectOptions}
                    placeholder='—'
                    searchPlaceholder='Search...'
                    noResultsMessage='No sales owners found'
                    emptyMessage={
                      salesOwnerOptions.length === 0
                        ? 'No sales owners available'
                        : 'No sales owners found'
                    }
                    triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
                    contentClassName='min-w-[220px]'
                    getOptionLabel={(opt) =>
                      opt.value === SALES_OWNER_NONE_VALUE ? '—' : (opt.label ?? opt.value)
                    }
                    renderTrigger={() => <SalesOwnerAvatarTrigger name={displayName} />}
                    renderOptionLabel={(opt) => {
                      if (opt.value === SALES_OWNER_NONE_VALUE) {
                        return <span className='paragraph-small text-text-sub-600'>—</span>;
                      }
                      const label = opt.label ?? opt.value;
                      return (
                        <span className='inline-flex min-w-0 items-center gap-2'>
                          <CrmAccountAvatar
                            name={label}
                            variant='weak'
                            size={24}
                            className='shrink-0'
                          />
                          <span className='paragraph-small text-text-strong-950 truncate'>
                            {label}
                          </span>
                        </span>
                      );
                    }}
                  />
                </div>
              );
            }

            if (!ownerId) {
              return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>–</span>;
            }
            return (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span className='inline-flex items-center gap-1.5 cursor-default'>
                    <CrmAccountAvatar
                      name={displayName}
                      variant='weak'
                      size={24}
                      showNativeTitle={false}
                    />
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side='top' align='center' sideOffset={6}>
                  <p>{displayName}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.YEAR_OF_ESTABLISHMENT,
          accessorKey: 'yearOfEstablishment',
          header: <span className='whitespace-nowrap'>Year of Establishment</span>,
          cell: ({ row }) => {
            const accountId = row.original.id;
            const year = String(row.original.yearOfEstablishment || '').trim();
            const displayValue = formatYearDisplay(year) === '–' ? '' : formatYearDisplay(year);
            if (onYearsOfEstablishmentUpdate && accountId) {
              return (
                <div className='min-w-0 max-w-[100px]' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={displayValue}
                    placeholder='—'
                    numericOnly
                    maxLength={4}
                    displayClassName='paragraph-small text-text-sub-600 whitespace-nowrap'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === displayValue) return;
                      onYearsOfEstablishmentUpdate(accountId, trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {formatYearDisplay(year)}
              </span>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.NO_OF_EMPLOYEES,
          accessorKey: 'noOfEmployees',
          header: <span className='whitespace-nowrap'>No of Employees</span>,
          cell: ({ row }) => {
            const accountId = row.original.id;
            const displayValue = toEmployeeCountEditableValue(row.original.noOfEmployees);
            if (onFieldUpdate && accountId) {
              return (
                <div className='min-w-0 max-w-[100px]' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={displayValue}
                    placeholder='—'
                    numericOnly
                    displayClassName='paragraph-small text-text-sub-600 whitespace-nowrap'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === displayValue) return;
                      onFieldUpdate(accountId, 'noOfEmployees', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {formatEmployeeCountDisplay(row.original.noOfEmployees)}
              </span>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.RERA_NUMBER,
          accessorKey: 'rera_registered',
          label: 'RERA Number',
          columnLabel: 'RERA Number',
          header: <span className='whitespace-nowrap'>RERA Number</span>,
          cell: ({ row }) => {
            const accountId = row.original.id;
            const displayValue = String(
              row.original.reraNumber ??
                row.original.rera_registered ??
                row.original.reraRegistered ??
                '',
            ).trim();
            if (onFieldUpdate && accountId) {
              const tooltipLabel = displayValue || '–';
              return (
                <div className='min-w-0 max-w-[220px]' onClick={(e) => e.stopPropagation()}>
                  <Tooltip.Root size='xsmall'>
                    <Tooltip.Trigger asChild>
                      <div className='min-w-0 w-full'>
                        <InlineEditableText
                          value={displayValue}
                          placeholder='—'
                          displayClassName='paragraph-small text-text-sub-600 whitespace-nowrap'
                          inputClassName='paragraph-small text-text-sub-600'
                          onSave={(value) => {
                            const trimmed = String(value ?? '').trim();
                            if (trimmed === displayValue) return;
                            onFieldUpdate(accountId, 'reraNumber', trimmed);
                          }}
                        />
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='bottom'>{tooltipLabel}</Tooltip.Content>
                  </Tooltip.Root>
                </div>
              );
            }
            if (!displayValue) {
              return <span className='paragraph-small text-text-sub-600'>–</span>;
            }
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <span className='block paragraph-small text-text-sub-600 whitespace-nowrap overflow-hidden text-ellipsis'>
                    {displayValue}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side='bottom'>{displayValue}</Tooltip.Content>
              </Tooltip.Root>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.OPERATIONAL_CITY,
          accessorKey: 'operationalCities',
          header: <span className='whitespace-nowrap'>Operational City</span>,
          cell: ({ row }) => (
            <div className='min-w-0 w-full overflow-hidden'>
              <OperationalCityCell
                accountId={row.original.id}
                row={row.original}
                onOperationalLocationUpdate={onOperationalLocationUpdate}
              />
            </div>
          ),
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.OPERATIONAL_STATE,
          accessorKey: 'operationalState',
          header: <span className='whitespace-nowrap'>Operational State</span>,
          cell: ({ row }) => {
            const cities = getOperationalCitiesFromRow(row.original);
            const display =
              String(row.original.operationalState ?? '').trim() ||
              deriveOperationalStatesDisplay(cities);
            return (
              <div className='min-w-0 w-full overflow-hidden'>
                <TextCellWithTooltip text={display} />
              </div>
            );
          },
        },
        {
          id: CP_ACCOUNTS_COLUMN_IDS.ACTIONS,
          header: '',
          ...getFrozenActionsColumnExtras(true),
          cell: ({ row }) => (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(row.original);
                  }}
                  className='p-2 rounded-md hover:bg-bg-weak-100 text-text-sub-500 hover:text-error-base transition-colors'
                  aria-label='Delete CP Account'
                >
                  <RiDeleteBinLine size={20} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>Delete</p>
              </Tooltip.Content>
            </Tooltip.Root>
          ),
        },
      ];
    }, [
      onDelete,
      onFieldUpdate,
      onYearsOfEstablishmentUpdate,
      onOperationalLocationUpdate,
      onRelatedCpContactsClick,
      onPrimaryCityClick,
      industryGroups,
      salesOwnerOptions,
      typeOptions,
    ]);

    const defaultColumnConfig = useMemo(
      () =>
        prepareColumnsForConfig(
          showActions
            ? allColumnDefs
            : allColumnDefs.filter((def) => def.id !== CP_ACCOUNTS_COLUMN_IDS.ACTIONS),
        ),
      [allColumnDefs, showActions],
    );

    const getCall = useCallback(
      () =>
        Promise.resolve().then(() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEY(tableId));
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        }),
      [tableId],
    );

    const persistCall = useCallback(
      (payload) => {
        try {
          localStorage.setItem(STORAGE_KEY(tableId), JSON.stringify(payload));
        } catch (error_) {
          console.error('Failed to persist column config', error_);
        }
        return Promise.resolve(payload);
      },
      [tableId],
    );

    const columnConfigHook = useColumnConfig(tableId, defaultColumnConfig, persistCall, getCall, {
      autoSave: true,
      debounce: 300,
    });

    React.useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    const columns = useMemo(() => {
      const availableDefs = showActions
        ? allColumnDefs
        : allColumnDefs.filter((def) => def.id !== CP_ACCOUNTS_COLUMN_IDS.ACTIONS);
      const current = Array.isArray(columnConfigHook.columns) ? columnConfigHook.columns : [];
      const existingIds = new Set(current.map((c) => c.id));
      const missingFromSaved = availableDefs
        .filter((def) => !existingIds.has(def.id || def.accessorKey))
        .map((def, index) => ({
          id: def.id || def.accessorKey,
          label: def.label || def.id || def.accessorKey,
          visible: def.visible !== false,
          order: current.length + index,
          enableHiding: def.enableHiding !== false,
        }));

      const configured = applyColumnConfig(availableDefs, [...current, ...missingFromSaved]);
      const hasActions = configured.some((c) => c.id === CP_ACCOUNTS_COLUMN_IDS.ACTIONS);
      const actionsCol = allColumnDefs.find((c) => c.id === CP_ACCOUNTS_COLUMN_IDS.ACTIONS);
      const withActions =
        showActions && !hasActions && actionsCol ? [...configured, actionsCol] : configured;
      return orderColumnsWithActionsLast(withActions);
    }, [allColumnDefs, columnConfigHook.columns, showActions]);

    const hideActionsColumn = !showActions;

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + getCpColumnWidth(col.id), 0),
      [columns],
    );

    const columnPinning = useMemo(
      () =>
        buildFrozenColumnPinning({
          enabled: true,
          leftColumnId: CP_ACCOUNTS_FROZEN_LEFT_COLUMN_ID,
          hideActionsColumn,
          columns,
        }),
      [hideActionsColumn, columns],
    );

    const tableState = useMemo(
      () => withFrozenColumnPinning({ sorting: localSorting }, columnPinning),
      [localSorting, columnPinning],
    );

    const table = useReactTable({
      data: rows,
      columns,
      enableColumnPinning: true,
      state: tableState,
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
    });

    const hasRows = table.getRowModel().rows.length > 0;
    const groupedKeys = groupedData ? Object.keys(groupedData) : [];
    const isGroupedView = Boolean(groupBy && groupedData && groupedKeys.length > 0);

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>
            Unable to Load CP Accounts
          </h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      const state = CP_ACCOUNTS_EMPTY_STATES[emptyStateVariant] || CP_ACCOUNTS_EMPTY_STATES.search;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 8 }).map((_, index, array) => (
          <React.Fragment key={`cp-accounts-skeleton-${index}`}>
            <Table.Row>
              {columns.map((column) => (
                <Table.Cell
                  key={column.id || column.accessorKey}
                  style={getCpColumnCellStyle(column.id)}
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

    const renderFrozenHeader = () =>
      table.getHeaderGroups().map((headerGroup) => (
        <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
          {headerGroup.headers.map((header) => {
            const colId = header.column.id;
            return (
              <Table.Head
                key={header.id}
                {...getFrozenTanStackColumnProp(true, header.column)}
                className={cn(
                  'text-left label-small text-text-sub-600 font-medium pl-4 pr-4',
                  header.column.columnDef.meta?.headClassName,
                )}
                style={getCpColumnCellStyle(colId)}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            );
          })}
        </Table.Row>
      ));

    const renderRow = (row, rowIndex, allRows) => (
      <React.Fragment key={row.id}>
        <Table.Row
          className='cursor-pointer hover:bg-bg-weak-50 transition-colors'
          onClick={() => {
            if (onRowSelect) onRowSelect(row.original);
            else navigate(`/channel-partner/accounts/${row.original.id}`);
          }}
        >
          {row.getVisibleCells().map((cell) => {
            const colId = cell.column.id;
            return (
              <Table.Cell
                key={cell.id}
                {...getFrozenTanStackColumnProp(true, cell.column)}
                className={cn('align-middle', cell.column.columnDef.meta?.cellClassName)}
                style={getCpColumnCellStyle(colId)}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Table.Cell>
            );
          })}
        </Table.Row>
        {rowIndex < allRows.length - 1 && <Table.RowDivider />}
      </React.Fragment>
    );

    if (groupBy && groupedData) {
      if (groupedKeys.length === 0 && isLoading) {
        return (
          <div className={getFrozenWrapperClassName(true)}>
            <Table.Root
              variant={variant}
              style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
              {...getFrozenRootTableProps(true, { tableInstance: table })}
            >
              <Table.Header {...getFrozenHeaderTableProps(true)}>
                {renderFrozenHeader()}
              </Table.Header>
              {renderSkeleton()}
            </Table.Root>
          </div>
        );
      }

      if (isGroupedView) {
        return (
          <div className='w-full'>
            <GroupedCpAccountsView
              groupedData={groupedData}
              columns={columns}
              variant={variant}
              onRowSelect={onRowSelect}
              navigate={navigate}
              tableMinWidth={tableMinWidth}
              hideActionsColumn={hideActionsColumn}
            />
          </div>
        );
      }
    }

    return (
      <div className={getFrozenWrapperClassName(true)}>
        <Table.Root
          variant={variant}
          {...getFrozenRootTableProps(true, { tableInstance: table })}
          style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <Table.Header {...getFrozenHeaderTableProps(true)}>{renderFrozenHeader()}</Table.Header>
          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table
                .getRowModel()
                .rows.map((row, rowIndex, allRows) => renderRow(row, rowIndex, allRows))}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

CpAccountsTable.displayName = 'CpAccountsTable';

export default CpAccountsTable;
