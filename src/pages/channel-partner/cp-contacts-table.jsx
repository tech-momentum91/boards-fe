import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCalendarLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
} from 'react-icons/ri';
import { format } from 'date-fns';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import { cn } from '@/utils/cn';
import { parseToDate, calculateAgeFromDob, formatDisplayDateOnly } from '@/utils/date-utils';
import { getCpAccountsList } from '@/services/cp-accounts-service';
import { getCpContactsList } from '@/services/cp-contacts-service';
import { getSalesTeamUserList } from '@/api/crmAccounts';
import { getCpContactOptions } from '@/api/crmContacts';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';
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
  withFrozenColumnPinning,
} from '@/lib/frozen-table-columns';
import { getInitials } from '@/lib/utils';
import {
  CP_CONTACTS_COLUMN_IDS,
  CP_CONTACTS_EMPTY_STATES,
  CP_CONTACTS_LIFECYCLE_STAGE_COLORS,
} from './constants-cp-contacts';
import {
  amountToEditString,
  formatAmount,
  normalizeAmountSaveValue,
} from './cp-contact-field-utils';
import emptyState from '@/assets/images/empty-state.png';

function formatCreatedAt(input) {
  const date = parseToDate(input);
  if (!date) return '–';
  return format(date, 'do MMM yy, HH:mm:ss');
}

function formatDob(input) {
  if (input == null || input === '') return '–';
  const date = parseToDate(input);
  if (!date) return typeof input === 'string' ? input : '–';
  return format(date, 'do MMM yyyy');
}

const SELECT_NONE_VALUE = '__none__';

function parseCityValue(raw) {
  if (!raw || raw === '-') return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

const cpAccountSelectTriggerClass = '!w-max min-w-0 shrink-0';
const cpAccountSelectTriggerEmptyClass =
  '!bg-transparent !shadow-none !ring-0 !border-0 !min-h-0 py-0 px-0 hover:!bg-transparent focus:!shadow-none focus:!ring-0';
const cpAccountSelectContentClassName =
  '!min-w-[min(18rem,calc(100vw-2rem))] max-w-[min(24rem,calc(100vw-2rem))] w-max';

const dobCalendarIconClassName =
  'pointer-events-none absolute right-0 top-1/2 size-4 shrink-0 -translate-y-1/2 text-text-soft-400 opacity-0 transition-opacity duration-200 group-hover/field:opacity-100 group-focus-within/field:opacity-100';

const TABLE_ID = 'cp-contacts-table';
const STORAGE_KEY = (id) => `column-config-${id}`;

/** Column ID -> header label for grouped view header row */
const COLUMN_HEADER_LABELS = {
  [CP_CONTACTS_COLUMN_IDS.NAME]: 'Name',
  [CP_CONTACTS_COLUMN_IDS.CP_ACCOUNT]: 'CP Account',
  [CP_CONTACTS_COLUMN_IDS.CREATED_AT]: 'Created At',
  [CP_CONTACTS_COLUMN_IDS.LAST_MODIFIED_AT]: 'Last Modified At',
  [CP_CONTACTS_COLUMN_IDS.SALES_OWNER]: 'Sales Owner',
  [CP_CONTACTS_COLUMN_IDS.REPORTING_MANAGER]: 'Reporting Manager',
  [CP_CONTACTS_COLUMN_IDS.EMAIL]: 'Email',
  [CP_CONTACTS_COLUMN_IDS.OPEN_LEADS_AMOUNT]: 'Open Leads Amount (₹)',
  [CP_CONTACTS_COLUMN_IDS.WON_AMOUNT]: 'Won Amount (₹)',
  [CP_CONTACTS_COLUMN_IDS.DESIGNATION]: 'Designation',
  [CP_CONTACTS_COLUMN_IDS.DEPARTMENT]: 'Department',
  [CP_CONTACTS_COLUMN_IDS.MOBILE_NUMBER]: 'Mobile Number',
  [CP_CONTACTS_COLUMN_IDS.ALT_MOBILE_NUMBER]: 'Alt. Mobile Number',
  [CP_CONTACTS_COLUMN_IDS.DOB]: 'DOB',
  [CP_CONTACTS_COLUMN_IDS.AGE]: 'Age',
  [CP_CONTACTS_COLUMN_IDS.CITY]: 'City',
  [CP_CONTACTS_COLUMN_IDS.LIFECYCLE_STAGE]: 'Lifecycle Stage',
  [CP_CONTACTS_COLUMN_IDS.STATUS]: 'Status',
  [CP_CONTACTS_COLUMN_IDS.PRIMARY_CONTACT]: 'Primary Contact',
  [CP_CONTACTS_COLUMN_IDS.LINKEDIN_URL]: 'LinkedIn URL',
  [CP_CONTACTS_COLUMN_IDS.FACEBOOK_URL]: 'Facebook URL',
  [CP_CONTACTS_COLUMN_IDS.INSTAGRAM_URL]: 'Instagram URL',
  [CP_CONTACTS_COLUMN_IDS.ACTIONS]: '',
};

const GroupedCpContactsView = ({ groupedData, visibleDefs, variant, onDelete, navigate }) => {
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
              <div className='w-full overflow-x-auto pt-2'>
                <Table.Root variant={variant} className='w-full min-w-max'>
                  <Table.Header>
                    <Table.Row>
                      {visibleDefs.map((col) => (
                        <Table.Head
                          key={col.id || col.accessorKey}
                          className='whitespace-nowrap text-text-sub-600 px-3 py-2'
                        >
                          {COLUMN_HEADER_LABELS[col.id] ?? col.id ?? ''}
                        </Table.Head>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(groupRows || []).map((contact, idx) => (
                      <Table.Row
                        className='paragraph-small border-b border-stroke-soft-200 cursor-pointer hover:bg-bg-weak-50 transition-colors'
                        key={contact.id ?? contact.email ?? idx}
                        onClick={() => navigate(`/channel-partner/contacts/${contact.id}`)}
                      >
                        {visibleDefs.map((col) => {
                          const isActions = col.id === CP_CONTACTS_COLUMN_IDS.ACTIONS;
                          return (
                            <Table.Cell
                              key={col.id || col.accessorKey}
                              className={
                                isActions
                                  ? 'whitespace-nowrap align-middle flex items-center justify-end gap-2 px-3 py-2'
                                  : 'whitespace-nowrap truncate align-middle px-3 py-2'
                              }
                              title={
                                !isActions && col.accessorKey && contact[col.accessorKey] != null
                                  ? String(contact[col.accessorKey])
                                  : undefined
                              }
                            >
                              {col.cell && typeof col.cell === 'function'
                                ? flexRender(col.cell, {
                                    row: { original: contact, id: contact.id ?? contact.email },
                                    column: col,
                                    getValue: () => contact[col.accessorKey],
                                    renderValue: () => contact[col.accessorKey],
                                  })
                                : null}
                            </Table.Cell>
                          );
                        })}
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CpContactsTable = React.forwardRef(
  (
    {
      rows = [],
      groupedData = null,
      groupBy = '',
      isLoading = false,
      error = null,
      variant = 'compact',
      sorting = [],
      onSortingChange,
      tableId = TABLE_ID,
      onDelete,
      onFieldUpdate,
      /** 'default' when no contacts at all, 'search' when filters/tab match nothing */
      emptyStateVariant = 'search',
      freezeColumns = true,
    },
    ref,
  ) => {
    const navigate = useNavigate();
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [cpAccountOptions, setCpAccountOptions] = useState([]);
    const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
    const [reportingManagerOptions, setReportingManagerOptions] = useState([]);
    const [designationOptions, setDesignationOptions] = useState([]);
    const [departmentOptions, setDepartmentOptions] = useState([]);

    useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    useEffect(() => {
      getCpAccountsList({ type: 'all' })
        .then((result) => {
          if (result.error) {
            setCpAccountOptions([]);
            return;
          }
          const list = result.data ?? [];
          setCpAccountOptions(
            list.map((a) => ({
              value: a.id,
              label: a.legalName || a.brandName || a.id || '–',
            })),
          );
        })
        .catch(() => setCpAccountOptions([]));

      getSalesTeamUserList()
        .then((list) => {
          const normalized = (Array.isArray(list) ? list : [])
            .map((opt) => {
              if (typeof opt === 'string') return { value: opt, label: opt };
              const value = opt?.value ?? opt?.name ?? opt?.email ?? '';
              const label = opt?.label ?? opt?.full_name ?? value;
              return value ? { value, label } : null;
            })
            .filter(Boolean);
          setSalesOwnerOptions(normalized);
        })
        .catch(() => setSalesOwnerOptions([]));

      getCpContactsList({})
        .then((result) => {
          if (result.error) {
            setReportingManagerOptions([]);
            return;
          }
          const options = (result.data ?? [])
            .map((item) => {
              const value = String(item.id ?? '').trim();
              const label = String(item.name ?? value).trim();
              return value ? { value, label: label || value } : null;
            })
            .filter(Boolean);
          setReportingManagerOptions(options);
        })
        .catch(() => setReportingManagerOptions([]));

      getCpContactOptions()
        .then((opts) => {
          setDesignationOptions(
            (opts?.designation ?? []).map((o) => ({
              value: o.value ?? o.label ?? '',
              label: o.label ?? o.value ?? '',
            })),
          );
          setDepartmentOptions(
            (opts?.department ?? []).map((o) => ({
              value: o.value ?? o.label ?? '',
              label: o.label ?? o.value ?? '',
            })),
          );
        })
        .catch(() => {
          setDesignationOptions([]);
          setDepartmentOptions([]);
        });
    }, []);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const newSorting =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(newSorting);
        onSortingChange?.(newSorting);
      },
      [localSorting, onSortingChange],
    );

    const allColumnDefs = useMemo(
      () => [
        {
          id: CP_CONTACTS_COLUMN_IDS.NAME,
          accessorKey: 'name',
          ...getFrozenLeftColumnExtras(freezeColumns),
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>Name</span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Name'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const displayName = String(row.original.name || '').trim();
            if (onFieldUpdate && contactId) {
              return (
                <div className='flex min-w-0 max-w-full items-center gap-2'>
                  <Avatar.Root size={32} color='gray' className='shrink-0' name={displayName}>
                    <span className='text-xs font-medium text-text-main-900'>
                      {getInitials(displayName)}
                    </span>
                  </Avatar.Root>
                  <InlineEditableText
                    value={displayName}
                    editOnIconOnly
                    placeholder='—'
                    displayClassName='font-medium text-text-strong-950'
                    inputClassName='paragraph-small font-medium text-text-strong-950'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === displayName) return;
                      onFieldUpdate(contactId, 'name', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <div className='flex items-center gap-2'>
                <Avatar.Root size={32} color='gray'>
                  <span className='text-xs font-medium text-text-main-900'>
                    {row.original.initials || row.original.name?.slice(0, 2)?.toUpperCase() || '–'}
                  </span>
                </Avatar.Root>
                <span className='paragraph-small font-medium text-text-strong-950 whitespace-nowrap'>
                  {displayName || '–'}
                </span>
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.CP_ACCOUNT,
          accessorKey: 'cpAccount',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>CP Account</span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by CP Account'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const accountDisplay = String(row.original.cpAccount || '').trim();
            const accountId = String(row.original.cpAccountId || '').trim();
            const accountKey = accountId || accountDisplay;
            const accountMatch = accountKey
              ? cpAccountOptions.find((o) => String(o.value) === accountKey)
              : undefined;
            const accountValue = accountKey ? (accountMatch ? accountMatch.value : accountKey) : '';
            const accountLabel = accountMatch?.label ?? accountDisplay ?? accountKey;

            if (onFieldUpdate && contactId && cpAccountOptions.length > 0) {
              const rowOptions = [{ value: SELECT_NONE_VALUE, label: '-' }, ...cpAccountOptions];
              if (
                accountValue &&
                !rowOptions.some((o) => String(o.value) === String(accountValue))
              ) {
                rowOptions.splice(1, 0, {
                  value: accountValue,
                  label: accountLabel || accountValue,
                });
              }
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={accountValue}
                    valueSentinel={SELECT_NONE_VALUE}
                    onValueChange={(v) => {
                      const next = v === SELECT_NONE_VALUE ? '' : v;
                      if (next !== accountValue) {
                        onFieldUpdate(contactId, 'associateAccount', next);
                      }
                    }}
                    options={rowOptions}
                    placeholder='—'
                    searchPlaceholder='Search CP account...'
                    noResultsMessage='No accounts found'
                    emptyMessage='No accounts available'
                    triggerClassName={cn(
                      accountLabel ? cpAccountSelectTriggerClass : cpAccountSelectTriggerEmptyClass,
                    )}
                    contentClassName={cpAccountSelectContentClassName}
                    renderTrigger={() =>
                      accountLabel ? (
                        <span className='min-w-0 break-words paragraph-small text-text-sub-600 leading-snug'>
                          {accountLabel}
                        </span>
                      ) : (
                        <span className='paragraph-small text-text-sub-600'>—</span>
                      )
                    }
                    renderOptionLabel={(opt) => (
                      <span className='block whitespace-normal break-words text-left leading-snug'>
                        {opt.value === SELECT_NONE_VALUE ? '-' : (opt.label ?? opt.value)}
                      </span>
                    )}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {accountDisplay || '–'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.CREATED_AT,
          accessorKey: 'createdAt',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>Created At</span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
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
          id: CP_CONTACTS_COLUMN_IDS.LAST_MODIFIED_AT,
          accessorKey: 'modifiedAt',
          visible: false,
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>
                Last Modified At
              </span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
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
          id: CP_CONTACTS_COLUMN_IDS.SALES_OWNER,
          accessorKey: 'salesOwnerName',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>Sales Owner</span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Sales Owner'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const ownerValue = String(row.original.salesOwner || '').trim();
            const ownerLabel = String(row.original.salesOwnerName || '').trim() || ownerValue;

            if (onFieldUpdate && contactId && salesOwnerOptions.length > 0) {
              const rowOptions = [{ value: SELECT_NONE_VALUE, label: '-' }, ...salesOwnerOptions];
              if (ownerValue && !rowOptions.some((o) => String(o.value) === ownerValue)) {
                rowOptions.splice(1, 0, {
                  value: ownerValue,
                  label: ownerLabel,
                });
              }
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={ownerValue || SELECT_NONE_VALUE}
                    valueSentinel={SELECT_NONE_VALUE}
                    onValueChange={(v) => {
                      const next = v === SELECT_NONE_VALUE ? '' : v;
                      if (next !== ownerValue) {
                        onFieldUpdate(contactId, 'salesOwner', next);
                      }
                    }}
                    options={rowOptions}
                    placeholder='—'
                    searchPlaceholder='Search sales owner...'
                    noResultsMessage='No users found'
                    emptyMessage='No sales owners'
                    triggerClassName={cn(
                      ownerLabel && ownerValue
                        ? cpAccountSelectTriggerClass
                        : cpAccountSelectTriggerEmptyClass,
                    )}
                    contentClassName={cpAccountSelectContentClassName}
                    renderTrigger={() =>
                      ownerValue ? (
                        <span className='inline-flex items-center gap-1.5'>
                          <Avatar.Root size={24} color='gray'>
                            <span className='text-[10px] font-medium text-text-main-900'>
                              {getInitials(ownerLabel).toUpperCase()}
                            </span>
                          </Avatar.Root>
                        </span>
                      ) : (
                        <span className='paragraph-small text-text-sub-600'>—</span>
                      )
                    }
                    renderOptionLabel={(opt) =>
                      opt.value === SELECT_NONE_VALUE ? (
                        <span>-</span>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <Avatar.Root size={20} color='gray'>
                            <span className='text-[8px] font-medium text-text-main-900'>
                              {getInitials(opt.label ?? opt.value).toUpperCase()}
                            </span>
                          </Avatar.Root>
                          <span>{opt.label ?? opt.value}</span>
                        </div>
                      )
                    }
                  />
                </div>
              );
            }

            return (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span className='inline-flex w-fit items-center'>
                    <Avatar.Root size={24} color='gray'>
                      <span className='text-[10px] font-medium text-text-main-900'>
                        {getInitials(ownerLabel).toUpperCase() || '–'}
                      </span>
                    </Avatar.Root>
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side='top' align='center' sideOffset={6}>
                  <p>{ownerLabel || '–'}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.REPORTING_MANAGER,
          accessorKey: 'reportingManagerName',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>
                Reporting Manager
              </span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Reporting Manager'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const rmId = String(row.original.reportingManager || '').trim();
            const rmLabel = String(row.original.reportingManagerName || '').trim() || rmId;

            if (onFieldUpdate && contactId && reportingManagerOptions.length > 0) {
              const filteredOptions = reportingManagerOptions.filter((o) => o.value !== contactId);
              const rowOptions = [{ value: SELECT_NONE_VALUE, label: '-' }, ...filteredOptions];
              if (rmId && !rowOptions.some((o) => String(o.value) === rmId)) {
                rowOptions.splice(1, 0, {
                  value: rmId,
                  label: rmLabel,
                });
              }
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={rmId || SELECT_NONE_VALUE}
                    valueSentinel={SELECT_NONE_VALUE}
                    onValueChange={(v) => {
                      const next = v === SELECT_NONE_VALUE ? '' : v;
                      if (next !== rmId) {
                        onFieldUpdate(contactId, 'reportingManager', next);
                      }
                    }}
                    options={rowOptions}
                    placeholder='—'
                    searchPlaceholder='Search reporting manager...'
                    noResultsMessage='No contacts found'
                    emptyMessage='No contacts available'
                    triggerClassName={cn(
                      rmLabel && rmId
                        ? cpAccountSelectTriggerClass
                        : cpAccountSelectTriggerEmptyClass,
                    )}
                    contentClassName={cpAccountSelectContentClassName}
                    renderTrigger={() =>
                      rmId ? (
                        <span className='inline-flex items-center gap-1.5'>
                          <Avatar.Root size={24} color='gray'>
                            <span className='text-[10px] font-medium text-text-main-900'>
                              {getInitials(rmLabel).toUpperCase()}
                            </span>
                          </Avatar.Root>
                        </span>
                      ) : (
                        <span className='paragraph-small text-text-sub-600'>—</span>
                      )
                    }
                    renderOptionLabel={(opt) =>
                      opt.value === SELECT_NONE_VALUE ? (
                        <span>-</span>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <Avatar.Root size={20} color='gray'>
                            <span className='text-[8px] font-medium text-text-main-900'>
                              {getInitials(opt.label ?? opt.value).toUpperCase()}
                            </span>
                          </Avatar.Root>
                          <span>{opt.label ?? opt.value}</span>
                        </div>
                      )
                    }
                  />
                </div>
              );
            }

            return (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span className='inline-flex w-fit items-center'>
                    <Avatar.Root size={24} color='gray'>
                      <span className='text-[10px] font-medium text-text-main-900'>
                        {getInitials(rmLabel).toUpperCase() || '–'}
                      </span>
                    </Avatar.Root>
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side='top' align='center' sideOffset={6}>
                  <p>{rmLabel || '–'}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.EMAIL,
          accessorKey: 'email',
          header: <span className='label-small text-text-soft-400 whitespace-nowrap'>Email</span>,
          cell: ({ row }) => {
            const contactId = row.original.id;
            const email = String(row.original.email || '').trim();
            if (onFieldUpdate && contactId) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={email}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === email) return;
                      onFieldUpdate(contactId, 'email', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span
                className='paragraph-small text-text-sub-600 truncate max-w-[180px] block'
                title={email}
              >
                {email || '–'}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.OPEN_LEADS_AMOUNT,
          accessorKey: 'openLeadsAmount',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>
                Open Leads Amount (₹)
              </span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Open Leads Amount'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const raw = row.original.openLeadsAmount;
            const valueStr = amountToEditString(raw);
            const display = valueStr === '' ? '–' : formatAmount(raw);
            if (onFieldUpdate && contactId) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={display === '–' ? '' : display}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = normalizeAmountSaveValue(value);
                      if (trimmed === valueStr) return;
                      onFieldUpdate(contactId, 'openLeadsAmount', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>{display}</span>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.WON_AMOUNT,
          accessorKey: 'wonAmount',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>
                Won Amount (₹)
              </span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Won Amount'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const raw = row.original.wonAmount;
            const valueStr = amountToEditString(raw);
            const display = valueStr === '' ? '–' : formatAmount(raw);
            if (onFieldUpdate && contactId) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={display === '–' ? '' : display}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = normalizeAmountSaveValue(value);
                      if (trimmed === valueStr) return;
                      onFieldUpdate(contactId, 'wonAmount', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>{display}</span>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.DESIGNATION,
          accessorKey: 'designation',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>Designation</span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Designation'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const value = String(row.original.designation || '').trim();

            if (onFieldUpdate && contactId && designationOptions.length > 0) {
              const rowOptions = [{ value: SELECT_NONE_VALUE, label: '-' }, ...designationOptions];
              if (value && !rowOptions.some((o) => String(o.value) === value)) {
                rowOptions.splice(1, 0, { value, label: value });
              }
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={value || SELECT_NONE_VALUE}
                    valueSentinel={SELECT_NONE_VALUE}
                    onValueChange={(v) => {
                      const next = v === SELECT_NONE_VALUE ? '' : v;
                      if (next !== value) {
                        onFieldUpdate(contactId, 'designation', next);
                      }
                    }}
                    options={rowOptions}
                    placeholder='—'
                    searchPlaceholder='Search designation...'
                    noResultsMessage='No designations found'
                    emptyMessage='No designations available'
                    triggerClassName={cn(
                      value ? cpAccountSelectTriggerClass : cpAccountSelectTriggerEmptyClass,
                    )}
                    contentClassName={cpAccountSelectContentClassName}
                    renderTrigger={() =>
                      value ? (
                        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                          {value}
                        </span>
                      ) : (
                        <span className='paragraph-small text-text-sub-600'>—</span>
                      )
                    }
                    renderOptionLabel={(opt) => (
                      <span className='block whitespace-normal break-words text-left leading-snug'>
                        {opt.value === SELECT_NONE_VALUE ? '-' : (opt.label ?? opt.value)}
                      </span>
                    )}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {value || '–'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.DEPARTMENT,
          accessorKey: 'department',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>Department</span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Department'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const value = String(row.original.department || '').trim();

            if (onFieldUpdate && contactId && departmentOptions.length > 0) {
              const rowOptions = [{ value: SELECT_NONE_VALUE, label: '-' }, ...departmentOptions];
              if (value && !rowOptions.some((o) => String(o.value) === value)) {
                rowOptions.splice(1, 0, { value, label: value });
              }
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={value || SELECT_NONE_VALUE}
                    valueSentinel={SELECT_NONE_VALUE}
                    onValueChange={(v) => {
                      const next = v === SELECT_NONE_VALUE ? '' : v;
                      if (next !== value) {
                        onFieldUpdate(contactId, 'department', next);
                      }
                    }}
                    options={rowOptions}
                    placeholder='—'
                    searchPlaceholder='Search department...'
                    noResultsMessage='No departments found'
                    emptyMessage='No departments available'
                    triggerClassName={cn(
                      value ? cpAccountSelectTriggerClass : cpAccountSelectTriggerEmptyClass,
                    )}
                    contentClassName={cpAccountSelectContentClassName}
                    renderTrigger={() =>
                      value ? (
                        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                          {value}
                        </span>
                      ) : (
                        <span className='paragraph-small text-text-sub-600'>—</span>
                      )
                    }
                    renderOptionLabel={(opt) => (
                      <span className='block whitespace-normal break-words text-left leading-snug'>
                        {opt.value === SELECT_NONE_VALUE ? '-' : (opt.label ?? opt.value)}
                      </span>
                    )}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {value || '–'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.MOBILE_NUMBER,
          accessorKey: 'mobileNumber',
          header: (
            <span className='label-small text-text-soft-400 whitespace-nowrap'>Mobile Number</span>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const mobile = String(row.original.mobileNumber || '').trim();
            if (onFieldUpdate && contactId) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={mobile}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === mobile) return;
                      onFieldUpdate(contactId, 'mobileNumber', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {mobile || '–'}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.ALT_MOBILE_NUMBER,
          accessorKey: 'altMobileNumber',
          header: (
            <span className='label-small text-text-soft-400 whitespace-nowrap'>
              Alt. Mobile Number
            </span>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const altMobile = String(row.original.altMobileNumber || '').trim();
            if (onFieldUpdate && contactId) {
              return (
                <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
                  <InlineEditableText
                    value={altMobile}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === altMobile) return;
                      onFieldUpdate(contactId, 'altMobileNumber', trimmed);
                    }}
                  />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {altMobile || '–'}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.DOB,
          accessorKey: 'dateOfBirth',
          header: <span className='label-small text-text-soft-400 whitespace-nowrap'>DOB</span>,
          cell: ({ row }) => {
            const contactId = row.original.id;
            const dob = String(row.original.dateOfBirth ?? row.original.dob ?? '').trim();
            if (onFieldUpdate && contactId) {
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
                      onFieldUpdate(contactId, 'dateOfBirth', next);
                    }}
                    placeholder='—'
                    variant='borderless'
                    size='xsmall'
                    max={new Date()}
                    className='paragraph-small text-text-sub-600'
                  />
                  <RiCalendarLine className={dobCalendarIconClassName} aria-hidden />
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {dob ? formatDisplayDateOnly(dob, '–') : formatDob(dob)}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.AGE,
          accessorKey: 'age',
          header: <span className='label-small text-text-soft-400 whitespace-nowrap'>Age</span>,
          cell: ({ row }) => {
            const age =
              calculateAgeFromDob(row.original.dateOfBirth ?? row.original.dob) ||
              (row.original.age != null && row.original.age !== '' ? String(row.original.age) : '');
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {age || '–'}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.CITY,
          accessorKey: 'city',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>City</span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by City'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const cityArr = parseCityValue(row.original.city);
            const extraOptions = cityArr
              .filter((c) => !INDIA_CITY_OPTIONS.some((o) => o.value === c))
              .map((c) => ({ value: c, label: c }));
            const cityOptions = [...extraOptions, ...INDIA_CITY_OPTIONS];

            if (onFieldUpdate && contactId) {
              const tooltipContent = cityArr.length > 1 ? cityArr.join(', ') : '';
              const multiSelect = (
                <MultiSelect
                  value={cityArr}
                  onValueChange={(selected) => {
                    onFieldUpdate(contactId, 'city', selected.join(', '));
                  }}
                  options={cityOptions}
                  placeholder='—'
                  searchPlaceholder='Search cities...'
                  size='small'
                  maxDisplayItems={2}
                  enableSearch
                  enableVirtualization
                  className='!min-h-0 !py-0.5 !px-1 !shadow-none !ring-0 !border-0 !bg-transparent [&>svg]:hidden'
                />
              );
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  {tooltipContent ? (
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <div>{multiSelect}</div>
                      </Tooltip.Trigger>
                      <Tooltip.Content side='top' align='center' sideOffset={6}>
                        <p className='max-w-[250px] whitespace-normal'>{tooltipContent}</p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  ) : (
                    multiSelect
                  )}
                </div>
              );
            }
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {cityArr.length > 0 ? cityArr.join(', ') : '–'}
              </span>
            );
          },
          enableSorting: true,
        },

        {
          id: CP_CONTACTS_COLUMN_IDS.PRIMARY_CONTACT,
          accessorKey: 'primaryContact',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <span className='label-small text-text-soft-400 whitespace-nowrap'>
                Primary Contact
              </span>
              <button
                type='button'
                className='flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Primary Contact'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const val = row.original.primaryContact;
            const isPrimary = val === true || val === 1 || String(val).toLowerCase() === 'yes';
            const currentValue = isPrimary ? 'yes' : 'no';
            const displayLabel = isPrimary ? 'Yes' : 'No';

            if (onFieldUpdate && contactId) {
              const rowOptions = [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ];
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-0 w-full'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={currentValue}
                    onValueChange={(v) => {
                      if (v !== currentValue) {
                        onFieldUpdate(contactId, 'primaryContact', v === 'yes');
                      }
                    }}
                    options={rowOptions}
                    placeholder='—'
                    searchPlaceholder='Select...'
                    triggerClassName={cn(cpAccountSelectTriggerClass)}
                    contentClassName='!min-w-[100px] w-max'
                    renderTrigger={() => (
                      <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                        {displayLabel}
                      </span>
                    )}
                    renderOptionLabel={(opt) => (
                      <span className='block text-left leading-snug'>{opt.label}</span>
                    )}
                  />
                </div>
              );
            }

            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {displayLabel}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.LINKEDIN_URL,
          accessorKey: 'linkedinUrl',
          header: (
            <span className='label-small text-text-soft-400 whitespace-nowrap'>LinkedIn URL</span>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const url = String(row.original.linkedinUrl || '').trim();
            if (onFieldUpdate && contactId) {
              return (
                <div
                  className='flex min-w-0 max-w-full items-center gap-1'
                  onClick={(e) => e.stopPropagation()}
                >
                  <InlineEditableText
                    value={url}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === url) return;
                      onFieldUpdate(contactId, 'linkedin', trimmed);
                    }}
                  />
                  {url && (
                    <a
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='shrink-0 text-text-soft-400 hover:text-text-strong-950 transition-colors'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RiExternalLinkLine size={14} />
                    </a>
                  )}
                </div>
              );
            }
            return (
              <span
                className='paragraph-small text-text-sub-600 truncate max-w-[180px] block'
                title={url}
              >
                {url || '–'}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.FACEBOOK_URL,
          accessorKey: 'facebookUrl',
          header: (
            <span className='label-small text-text-soft-400 whitespace-nowrap'>Facebook URL</span>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const url = String(row.original.facebookUrl || '').trim();
            if (onFieldUpdate && contactId) {
              return (
                <div
                  className='flex min-w-0 max-w-full items-center gap-1'
                  onClick={(e) => e.stopPropagation()}
                >
                  <InlineEditableText
                    value={url}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === url) return;
                      onFieldUpdate(contactId, 'facebook', trimmed);
                    }}
                  />
                  {url && (
                    <a
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='shrink-0 text-text-soft-400 hover:text-text-strong-950 transition-colors'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RiExternalLinkLine size={14} />
                    </a>
                  )}
                </div>
              );
            }
            return (
              <span
                className='paragraph-small text-text-sub-600 truncate max-w-[180px] block'
                title={url}
              >
                {url || '–'}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.INSTAGRAM_URL,
          accessorKey: 'instagramUrl',
          header: (
            <span className='label-small text-text-soft-400 whitespace-nowrap'>Instagram URL</span>
          ),
          cell: ({ row }) => {
            const contactId = row.original.id;
            const url = String(row.original.instagramUrl || '').trim();
            if (onFieldUpdate && contactId) {
              return (
                <div
                  className='flex min-w-0 max-w-full items-center gap-1'
                  onClick={(e) => e.stopPropagation()}
                >
                  <InlineEditableText
                    value={url}
                    placeholder='—'
                    inputClassName='paragraph-small text-text-sub-600'
                    onSave={(value) => {
                      const trimmed = String(value ?? '').trim();
                      if (trimmed === url) return;
                      onFieldUpdate(contactId, 'instagram', trimmed);
                    }}
                  />
                  {url && (
                    <a
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='shrink-0 text-text-soft-400 hover:text-text-strong-950 transition-colors'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RiExternalLinkLine size={14} />
                    </a>
                  )}
                </div>
              );
            }
            return (
              <span
                className='paragraph-small text-text-sub-600 truncate max-w-[180px] block'
                title={url}
              >
                {url || '–'}
              </span>
            );
          },
        },
        {
          id: CP_CONTACTS_COLUMN_IDS.ACTIONS,
          header: '',
          ...getFrozenActionsColumnExtras(freezeColumns),
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
                  aria-label='Delete CP Contact'
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
      ],
      [
        onDelete,
        onFieldUpdate,
        cpAccountOptions,
        salesOwnerOptions,
        reportingManagerOptions,
        designationOptions,
        departmentOptions,
        freezeColumns,
      ],
    );

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
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

    const visibleDefs = useMemo(() => {
      const appliedDefs = applyColumnConfig(allColumnDefs, columnConfigHook.columns);
      const actionDef = appliedDefs.find((col) => col.id === CP_CONTACTS_COLUMN_IDS.ACTIONS);
      const defsWithoutActions = appliedDefs.filter(
        (col) => col.id !== CP_CONTACTS_COLUMN_IDS.ACTIONS,
      );
      return actionDef ? [...defsWithoutActions, actionDef] : defsWithoutActions;
    }, [allColumnDefs, columnConfigHook.columns]);

    const table = useReactTable({
      data: rows,
      columns: visibleDefs,
      enableColumnPinning: freezeColumns,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: freezeColumns,
          leftColumnId: CP_CONTACTS_COLUMN_IDS.NAME,
          columns: visibleDefs,
        }),
      ),
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
    });

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>
            Unable to Load CP Contacts
          </h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      const state = CP_CONTACTS_EMPTY_STATES[emptyStateVariant] || CP_CONTACTS_EMPTY_STATES.search;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    const hasRows = table.getRowModel().rows.length > 0;
    const isGroupedView = groupBy && groupedData && Object.keys(groupedData).length > 0;

    if (isGroupedView) {
      return (
        <div className='w-full'>
          {isLoading ? (
            <div className='flex items-center justify-center py-16 text-text-soft-400'>
              Loading...
            </div>
          ) : (
            <GroupedCpContactsView
              groupedData={groupedData}
              visibleDefs={visibleDefs}
              variant={variant}
              onDelete={onDelete}
              navigate={navigate}
            />
          )}
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {visibleDefs.map((col) => (
                <Table.Cell key={col.id || col.accessorKey}>
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
      <div className={getFrozenWrapperClassName(freezeColumns)}>
        <Table.Root
          variant={variant}
          {...getFrozenRootTableProps(freezeColumns, {
            tableInstance: table,
            unfrozenClassName: 'w-full',
          })}
        >
          <Table.Header {...getFrozenHeaderTableProps(freezeColumns)}>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    {...getFrozenTanStackColumnProp(freezeColumns, header.column)}
                    className={cn(header.column.columnDef.meta?.headClassName)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, rowIndex, arr) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className='cursor-pointer hover:bg-bg-weak-100 transition-colors'
                    onClick={() => navigate(`/channel-partner/contacts/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        {...getFrozenTanStackColumnProp(freezeColumns, cell.column)}
                        className={cn(cell.column.columnDef.meta?.cellClassName)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {rowIndex < arr.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

CpContactsTable.displayName = 'CpContactsTable';

export default CpContactsTable;
