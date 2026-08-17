import React, { useMemo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import {
  AGREEMENTS_EMPTY_STATES,
  AGREEMENTS_GROUP_BY_FIELD_MAP,
  AGREEMENTS_GROUP_BY_FIELD_MAP_LANDLORD,
  getStatusBadge,
  getMembershipBadge,
  formatAgreementCurrency,
} from '@/components/agreements/constants';
import { formatDateDisplay, formatOrdinal } from '@/utils/date-utils';
import * as Tooltip from '@/components/ui/tooltip';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import {
  RiAddLine,
  RiArrowDownSFill,
  RiArrowDownSLine,
  RiArrowUpSFill,
  RiArrowUpSLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import { fetchAgreementColumnList, updateAgreementColumnList } from '@/redux/agreementsSlice';

const formatDate = (value) => formatDateDisplay(value, '--');

/** Client group-by list: show this many groups initially, then +N per scroll (API returns all rows). */
const AGREEMENTS_GROUP_BY_PAGE_SIZE = 5;

const headerCell = (label, column) => {
  const isSorted = column?.getIsSorted();
  const canSort = column?.getCanSort();
  const isName = column?.id === 'name';

  if (!canSort || isName) {
    return (
      <div className='flex items-center gap-0.5'>
        <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
      </div>
    );
  }

  return (
    <div
      className='group flex cursor-pointer select-none items-center gap-1'
      onClick={() => column.toggleSorting(isSorted === 'asc')}
    >
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600 transition-colors group-hover:text-text-main-900'>
        {label}
      </span>
      <div className='flex flex-col -space-y-2 translate-y-[1px]'>
        {(!isSorted || isSorted === 'desc') && (
          <RiArrowUpSFill
            size={16}
            className={cn(
              'transition-colors',
              isSorted ? 'text-primary-base' : 'text-text-sub-300 group-hover:text-text-sub-400',
            )}
          />
        )}
        {(!isSorted || isSorted === 'asc') && (
          <RiArrowDownSFill
            size={16}
            className={cn(
              'transition-colors',
              isSorted ? 'text-primary-base' : 'text-text-sub-300 group-hover:text-text-sub-400',
            )}
          />
        )}
      </div>
    </div>
  );
};

/** One group — expand rows only; no header sorting (group-by UX matches non-sortable list). */
const AgreementsGroupTable = React.memo(({ groupRows, columns, variant, onRowSelect }) => {
  const [expanded, setExpanded] = React.useState({});

  const groupTable = useReactTable({
    data: groupRows,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row?.versions ?? [],
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => (row.original?.versions?.length ?? 0) > 0,
    enableSorting: false,
  });

  return (
    <Table.Root variant={variant} className='w-full'>
      <Table.Header>
        {groupTable.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body spacing={8}>
        {groupTable.getRowModel().rows.map((row) => {
          const isChildRow = row.depth > 0;
          return (
            <React.Fragment key={row.id}>
              <Table.Row
                className={cn('cursor-pointer', isChildRow && 'bg-bg-weak-25/50')}
                onClick={() => onRowSelect?.(row.original)}
              >
                {row.getVisibleCells().map((cell, cellIndex) => (
                  <Table.Cell
                    key={cell.id}
                    className={cn(
                      isChildRow && cellIndex === 0 && 'border-l-2 border-l-stroke-soft-200 pl-6',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
              <Table.RowDivider />
            </React.Fragment>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
});

AgreementsGroupTable.displayName = 'AgreementsGroupTable';

/** Collapsible group sections — same structure as CRM accounts grouped view. */
const AgreementsGroupedView = ({ sortedKeys, groups, columns, variant, onRowSelect }) => {
  const [expandedKeys, setExpandedKeys] = React.useState(() =>
    Object.fromEntries(sortedKeys.map((k) => [k, true])),
  );

  React.useEffect(() => {
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
    <div className='flex w-full flex-col gap-10'>
      {sortedKeys.map((key) => {
        const groupRows = groups[key] || [];
        const label = key === '' ? '(None)' : key;
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div
            key={key === '' ? '__none__' : key}
            className='flex w-full flex-col items-start gap-1'
          >
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex w-full cursor-pointer items-center gap-1 text-left font-medium text-text-sub-500 transition-opacity hover:opacity-80'
            >
              {label}
              <span className='font-normal text-text-soft-400'>({groupRows.length})</span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded ? (
              <div className='w-full overflow-x-auto pt-2'>
                <AgreementsGroupTable
                  groupRows={groupRows}
                  columns={columns}
                  variant={variant}
                  onRowSelect={onRowSelect}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const AgreementsTable = React.forwardRef(
  (
    {
      mode = 'client',
      rows = [],
      isLoading = false,
      error = null,
      context = 'default',
      onRetry,
      onRowSelect,
      selectedRow = null,
      sorting = [],
      onSortingChange,
      tableId,
      variant = 'compact',
      onCreateAmendment,
      // Scroll pagination props
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      groupBy = '',
      groupOrder = 'asc',
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [expanded, setExpanded] = React.useState({});
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const [visibleGroupCount, setVisibleGroupCount] = React.useState(AGREEMENTS_GROUP_BY_PAGE_SIZE);
    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const newSorting =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(newSorting);
        if (onSortingChange) onSortingChange(newSorting);
      },
      [localSorting, onSortingChange],
    );

    const renderTruncatedWithTooltip = useCallback((value = '--') => {
      const text = value;
      const shouldTruncate = typeof text === 'string' && text.length > 30;
      const displayText =
        shouldTruncate && typeof text === 'string' ? `${text.slice(0, 30)}...` : text;

      if (text === '--') {
        return (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>{text}</span>
        );
      }

      return (
        <Tooltip.Root size='xsmall'>
          <Tooltip.Trigger asChild>
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {displayText}
            </span>
          </Tooltip.Trigger>
          {shouldTruncate && <Tooltip.Content size='xsmall'>{text}</Tooltip.Content>}
        </Tooltip.Root>
      );
    }, []);

    const allColumnDefs = useMemo(() => {
      const isLandlordMode = mode === 'landlord';

      const nameColumn = {
        id: 'name',
        accessorKey: 'name',
        columnLabel: 'Name',
        enableHiding: false,
        header: ({ column }) => headerCell('Name', column),
        cell: ({ row }) => {
          const isParentExpanded = row.depth === 0 && row.getCanExpand?.() && row.getIsExpanded?.();
          return (
            <div className='flex items-center gap-2'>
              <span
                className={cn(
                  'paragraph-small whitespace-nowrap cursor-pointer truncate',
                  isParentExpanded ? 'text-text-main-900 label-small' : 'text-text-sub-500',
                )}
              >
                {row.original.name || '--'}
              </span>
              {row.depth === 0 && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAmendment?.(row.original);
                      }}
                    >
                      <RiAddLine className='text-primary-base' />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>Create Amendment</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              )}

              {row.original?.versions?.length > 0 && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        row.getToggleExpandedHandler()(e);
                      }}
                    >
                      {row.getIsExpanded() ? (
                        <RiArrowDownSFill className='text-primary-base' />
                      ) : (
                        <RiArrowDownSLine className='text-primary-base' />
                      )}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>View Amendment</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              )}
            </div>
          );
        },
        enableSorting: false,
      };

      if (isLandlordMode) {
        return [
          nameColumn,
          {
            id: 'center',
            accessorKey: 'center',
            columnLabel: 'Center',
            header: ({ column }) => headerCell('Center', column),
            cell: ({ row }) => renderTruncatedWithTooltip(row.original.center_name),
            enableSorting: true,
          },
          {
            id: 'office',
            accessorKey: 'office',
            columnLabel: 'Office',
            header: ({ column }) => headerCell('Office', column),
            cell: ({ row }) => renderTruncatedWithTooltip(row.original.office),
            enableSorting: true,
          },
          {
            id: 'spocName',
            accessorKey: 'spocName',
            columnLabel: 'SPOC Name',
            header: ({ column }) => headerCell('SPOC Name', column),
            cell: ({ row }) =>
              renderTruncatedWithTooltip(row.original.spoc_name || row.original.spoc),
            enableSorting: true,
          },
          {
            id: 'contactNumber',
            accessorKey: 'contactNumber',
            columnLabel: 'Contact No.',
            header: ({ column }) => headerCell('Contact No.', column),
            cell: ({ row }) => {
              const contact =
                row.original.spoc_contact ||
                row.original.contact_number ||
                row.original.mobile_number;
              return (
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                  {contact || '--'}
                </span>
              );
            },
            enableSorting: true,
          },
          {
            id: 'email',
            accessorKey: 'email',
            columnLabel: 'E-mail Id',
            header: ({ column }) => headerCell('E-mail Id', column),
            cell: ({ row }) => {
              const email =
                row.original.spoc_email ||
                row.original.email ||
                row.original.email_address ||
                row.original.contact_email;
              return (
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                  {email || '--'}
                </span>
              );
            },
            enableSorting: true,
          },
          {
            id: 'agreementStartDate',
            accessorKey: 'agreementStartDate',
            columnLabel: 'Agreement Start Date',
            header: ({ column }) => headerCell('Agreement Start Date', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {formatDate(row.original.agreement_start_date)}
              </span>
            ),
            enableSorting: true,
          },
          {
            id: 'rentStartDate',
            accessorKey: 'rentStartDate',
            columnLabel: 'Rent Start Date',
            header: ({ column }) => headerCell('Rent Start Date', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {formatDate(row.original.landlord_rent_start_date ?? row.original.rent_start_date)}
              </span>
            ),
            enableSorting: true,
          },
          {
            id: 'agreementEndDate',
            accessorKey: 'agreementEndDate',
            columnLabel: 'Agreement End Date',
            header: ({ column }) => headerCell('Agreement End Date', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {formatDate(
                  row.original.landlord_agreement_end_date ?? row.original.agreement_end_date,
                )}
              </span>
            ),
            enableSorting: true,
          },
          {
            id: 'lockInEndDate',
            accessorKey: 'lockInEndDate',
            columnLabel: 'Lock in End Date',
            header: ({ column }) => headerCell('Lock in End Date', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {formatDate(
                  row.original.landlord_lock_in_end_date ?? row.original.lock_in_end_date,
                )}
              </span>
            ),
            enableSorting: true,
          },
          {
            id: 'noticePeriod',
            accessorKey: 'noticePeriod',
            columnLabel: 'Notice Period',
            header: ({ column }) => headerCell('Notice Period', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {row.original.notice_period_of_client != null
                  ? `${row.original.notice_period_of_client} Months`
                  : '--'}
              </span>
            ),
            enableSorting: true,
          },
          {
            id: 'parking',
            accessorKey: 'parking',
            columnLabel: 'Allocated Parking',
            header: ({ column }) => headerCell('Allocated Parking', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                {row.original.parking || '--'}
              </span>
            ),
            enableSorting: true,
          },
          // {
          //   id: 'documentsFolder',
          //   accessorKey: 'documentsFolder',
          //   columnLabel: 'Documents Folder',
          //   header: () => headerCell('Documents Folder'),
          //   cell: ({ row }) => {
          //     const docs = Array.isArray(row.original.agreement_document)
          //       ? row.original.agreement_document
          //       : [];
          //     const count = docs.length;
          //     return (
          //       <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
          //         {count > 0 ? `${count} file${count > 1 ? 's' : ''}` : '--'}
          //       </span>
          //     );
          //   },
          //   enableSorting: false,
          // },
          {
            id: 'status',
            accessorKey: 'status',
            columnLabel: 'Status',
            header: ({ column }) => (
              <div className='flex items-center gap-0.5'>
                {headerCell('Status', column)}
                <StatusColumnPopover
                  columnId='status'
                  columnConfigHook={statusPopoverColumnConfig}
                  onOpenStatuses={() => setIsSetStatusesOpen(true)}
                />
              </div>
            ),
            cell: ({ row }) => {
              const statusColorRaw = row.original.status_color;
              if (hasStatusBadgeColor(statusColorRaw)) {
                return (
                  <StatusColorPill
                    value={row.original.status || '—'}
                    color={statusColorRaw}
                    className='max-w-[min(100%,160px)]'
                  />
                );
              }
              const badge = getStatusBadge(row.original.status);
              return (
                <Badge.Root
                  size='small'
                  variant='light'
                  color={badge.color}
                  className='whitespace-nowrap shrink-0'
                >
                  <span className='whitespace-nowrap'>{badge.label}</span>
                </Badge.Root>
              );
            },
            enableSorting: true,
          },
          {
            id: 'roc',
            accessorKey: 'roc',
            columnLabel: 'ROC',
            header: ({ column }) => headerCell('ROC', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                {row.original?.roc ? 'Yes' : 'No'}
              </span>
            ),
            enableSorting: true,
          },
          {
            id: 'changeType',
            accessorKey: 'changeType',
            columnLabel: 'Change Type',
            header: ({ column }) => headerCell('Change Type', column),
            cell: ({ row }) => (
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                {row.original?.roc || '--'}
              </span>
            ),
            enableSorting: true,
          },
        ];
      }

      return [
        nameColumn,
        {
          id: 'clientName',
          accessorKey: 'clientName',
          columnLabel: 'Client',
          header: ({ column }) => headerCell('Client', column),
          cell: ({ row }) => renderTruncatedWithTooltip(row.original.client),
          enableSorting: true,
        },
        {
          id: 'center',
          accessorKey: 'center',
          columnLabel: 'Center',
          header: ({ column }) => headerCell('Center', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.center_name || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'space',
          accessorKey: 'space',
          columnLabel: 'Space',
          header: ({ column }) => headerCell('Space', column),
          cell: ({ row }) => {
            const spacesRaw = row?.original?.space_name;
            const spaces = Array.isArray(spacesRaw) ? spacesRaw : spacesRaw ? [spacesRaw] : [];
            const first = spaces[0] || '--';
            const extraCount = Math.max(0, spaces.length - 1);

            return (
              <div className='flex items-center gap-2'>
                <Badge.Root size='medium' variant='stroke' color='gray'>
                  {renderTruncatedWithTooltip(first)}
                </Badge.Root>

                {extraCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root
                        size='medium'
                        variant='lighter'
                        color='gray'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className='text-label-xs whitespace-nowrap'>+{extraCount}</span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div className='flex flex-col gap-1'>
                        {spaces.map((s) => (
                          <div key={s}>
                            <span className='text-label-xs whitespace-nowrap'>{s}</span>
                          </div>
                        ))}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'membershipPlan',
          accessorKey: 'membershipPlan',
          columnLabel: 'Membership Plan',
          header: ({ column }) => headerCell('Membership Plan', column),
          cell: ({ row }) => {
            const raw = row.original.membership_plan;
            const plans = Array.isArray(raw) ? raw : raw ? [raw] : [];
            const first = plans[0] || '--';
            const extraCount = Math.max(0, plans.length - 1);
            const firstBadge = getMembershipBadge(first);

            return (
              <div className='flex items-center gap-2'>
                <Badge.Root
                  size='small'
                  variant='light'
                  color={firstBadge.color}
                  className='whitespace-nowrap'
                >
                  {firstBadge.label}
                </Badge.Root>

                {extraCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root
                        size='small'
                        variant='lighter'
                        color='gray'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className='text-label-xs whitespace-nowrap'>+{extraCount}</span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div className='flex flex-col gap-1'>
                        {plans.map((p) => {
                          const b = getMembershipBadge(p);
                          return (
                            <Badge.Root
                              key={p}
                              size='small'
                              variant='light'
                              color={b.color}
                              className='whitespace-nowrap'
                            >
                              {b.label}
                            </Badge.Root>
                          );
                        })}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'seats',
          accessorKey: 'seats',
          columnLabel: 'No. of Seats',
          header: ({ column }) => headerCell('No. of Seats', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.no_of_seats ?? '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'escalationYears',
          accessorKey: 'escalationYears',
          columnLabel: 'Annual Escalation Year',
          header: ({ column }) => headerCell('Annual Escalation Year', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap flex items-center justify-center'>
              {row.original.escalation_years != null && row.original.escalation_years !== ''
                ? `${row.original.escalation_years} Year`
                : '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'areaSqFt',
          accessorKey: 'areaSqFt',
          columnLabel: 'Area (sq.ft.)',
          header: ({ column }) => headerCell('Area (sq.ft.)', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.area != null ? Number(row.original.area).toLocaleString() : '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'pricePerSeat',
          accessorKey: 'pricePerSeat',
          columnLabel: 'Price Per Seat (₹)',
          header: ({ column }) => headerCell('Price Per Seat (₹)', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatAgreementCurrency(row.original.price_per_seat)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'monthlyRevenueWithGst',
          accessorKey: 'monthlyRevenueWithGst',
          columnLabel: 'Monthly Revenue With GST (₹)',
          header: ({ column }) => headerCell('Monthly Revenue With GST (₹)', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatAgreementCurrency(row.original.monthly_revenue)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'monthlyRevenueWithoutGst',
          accessorKey: 'monthlyRevenueWithoutGst',
          columnLabel: 'Monthly Revenue Without GST (₹)',
          header: ({ column }) => headerCell('Monthly Revenue Without GST (₹)', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatAgreementCurrency(row.original.monthly_revenue)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'noOfMDeposit',
          accessorKey: 'noOfMDeposit',
          columnLabel: 'No. of M. Deposit',
          header: ({ column }) => headerCell('No. of M. Deposit', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.no_of_monthly_deposit ?? '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'agreementStartDate',
          accessorKey: 'agreementStartDate',
          columnLabel: 'Agreement Start Date',
          header: ({ column }) => headerCell('Agreement Start Date', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatDate(row.original.agreement_start_date)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'rentStartDate',
          accessorKey: 'rentStartDate',
          columnLabel: 'Rent Start Date',
          header: ({ column }) => headerCell('Rent Start Date', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatDate(row.original.rent_start_date)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'contractEndDate',
          accessorKey: 'contractEndDate',
          columnLabel: 'Agreement End Date',
          header: ({ column }) => headerCell('Agreement End Date', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatDate(row.original.agreement_end_date)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'lockInPeriod',
          accessorKey: 'lockInPeriod',
          columnLabel: 'Lock-in Period',
          header: ({ column }) => headerCell('Lock-in Period', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.lock_in_period != null ? `${row.original.lock_in_period} Months` : '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'lockInEndDate',
          accessorKey: 'lockInEndDate',
          columnLabel: 'Lock-in End Date',
          header: ({ column }) => headerCell('Lock-in End Date', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatDate(row.original.lock_in_end_date)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'incrementDate',
          accessorKey: 'incrementDate',
          columnLabel: 'Increment Date',
          header: ({ column }) => headerCell('Increment Date', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.increment_date != null && row.original.increment_date !== '-'
                ? formatDate(row.original.increment_date)
                : (row.original.increment_date ?? '--')}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'annualEscalation',
          accessorKey: 'annualEscalation',
          columnLabel: 'Annual Escalation',
          header: ({ column }) => headerCell('Annual Escalation', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.annual_escalation != null && row.original.annual_escalation !== ''
                ? `${row.original.annual_escalation}%`
                : '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'dueDate',
          accessorKey: 'dueDate',
          columnLabel: 'Payement Due Date',
          header: ({ column }) => headerCell('Payement Due Date', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {Number(row.original.payment_due_day) > 0
                ? formatOrdinal(row.original.payment_due_day)
                : '--'}
            </span>
          ),
          enableSorting: true,
        },
        // {
        //   id: 'type',
        //   accessorKey: 'type',
        //   columnLabel: 'Type',
        //   header: () => headerCell('Type'),
        //   cell: ({ row }) => (
        //     <span className='text-paragraph-sm whitespace-nowrap'>{row.original.type || '--'}</span>
        //   ),
        //   enableSorting: false,
        // },
        {
          id: 'roc',
          accessorKey: 'roc',
          columnLabel: 'ROC',
          header: ({ column }) => headerCell('ROC', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.roc ? 'Yes' : 'No'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'changeType',
          accessorKey: 'changeType',
          columnLabel: 'Change Type',
          header: ({ column }) => headerCell('Change Type', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>{row.original.roc || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'noticePeriodClient',
          accessorKey: 'noticePeriodClient',
          columnLabel: 'Notice Period of Client',
          header: ({ column }) => headerCell('Notice Period of Client', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.notice_period_of_client != null
                ? `${row.original.notice_period_of_client} Months`
                : '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'noticePeriodDevX',
          accessorKey: 'noticePeriodDevX',
          columnLabel: 'Notice Period of DevX',
          header: ({ column }) => headerCell('Notice Period of DevX', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.notice_period_of_devx != null
                ? `${row.original.notice_period_of_devx} Months`
                : '--'}
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
              {headerCell('Status', column)}
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusPopoverColumnConfig}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            </div>
          ),
          cell: ({ row }) => {
            const statusColorRaw = row.original.status_color;
            if (hasStatusBadgeColor(statusColorRaw)) {
              return (
                <StatusColorPill
                  value={row.original.status || '—'}
                  color={statusColorRaw}
                  className='max-w-[min(100%,160px)]'
                />
              );
            }
            const badge = getStatusBadge(row.original.status);
            return (
              <Badge.Root
                size='small'
                variant='light'
                color={badge.color}
                className='whitespace-nowrap shrink-0'
              >
                <span className='whitespace-nowrap'>{badge.label}</span>
              </Badge.Root>
            );
          },
          enableSorting: true,
        },
        // Hidden by default – Column Manager
        {
          id: 'createdBy',
          accessorKey: 'createdBy',
          columnLabel: 'Create By',
          visible: false,
          header: ({ column }) => headerCell('Create By', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.owner || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'createdAt',
          accessorKey: 'createdAt',
          columnLabel: 'Create At',
          visible: false,
          header: ({ column }) => headerCell('Create At', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatDate(row.original.creation)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'lastModifiedAt',
          accessorKey: 'lastModifiedAt',
          columnLabel: 'Last Modified At',
          visible: false,
          header: ({ column }) => headerCell('Last Modified At', column),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {formatDate(row.original.modified)}
            </span>
          ),
          enableSorting: true,
        },
      ];
    }, [mode, onCreateAmendment]);

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    const columnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      async (data) => {
        await dispatch(updateAgreementColumnList(data)).unwrap();
      },
      async () => {
        const result = await dispatch(fetchAgreementColumnList()).unwrap();
        return result || defaultColumnConfig;
      },
      {
        autoSave: true,
        debounce: 300,
      },
    );
    syncColumnConfigHookToPopover(columnConfigHook);

    React.useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    const visibleDefs = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
      [allColumnDefs, columnConfigHook.columns],
    );

    const groupField = useMemo(() => {
      // console.log('groupBy', groupBy);
      if (!groupBy) return null;
      if (mode === 'client') {
        return AGREEMENTS_GROUP_BY_FIELD_MAP[groupBy] ?? groupBy;
      }
      if (mode === 'landlord') {
        return (
          AGREEMENTS_GROUP_BY_FIELD_MAP_LANDLORD[groupBy] ??
          AGREEMENTS_GROUP_BY_FIELD_MAP[groupBy] ??
          groupBy
        );
      }
      return null;
    }, [mode, groupBy]);

    const groupedData = useMemo(() => {
      if (!groupField || !Array.isArray(rows) || rows.length === 0) return null;
      const groups = {};
      for (const row of rows) {
        let raw = row?.[groupField];
        // console.log('raw', raw);
        if (mode === 'landlord' && groupBy === 'client' && (raw == null || raw === '')) {
          raw = row?.landlord_name ?? row?.landlord ?? row?.client;
        }
        const key = raw != null && raw !== '' ? String(raw) : '';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
        console.log('groups', groups);
      }
      const sortedKeys = Object.keys(groups).sort((a, b) =>
        groupOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b),
      );
      return { sortedKeys, groups };
    }, [groupField, groupOrder, rows, mode, groupBy]);

    const groupedKeysSignature = useMemo(
      () => (groupedData ? groupedData.sortedKeys.join('\u001D') : ''),
      [groupedData],
    );

    React.useEffect(() => {
      if (!groupedData) return;
      setVisibleGroupCount(AGREEMENTS_GROUP_BY_PAGE_SIZE);
    }, [groupedData, groupedKeysSignature, groupBy, groupOrder]);

    const pagedGroupedData = useMemo(() => {
      if (!groupedData) return null;
      const { sortedKeys, groups } = groupedData;
      return {
        sortedKeys: sortedKeys.slice(0, visibleGroupCount),
        groups,
      };
    }, [groupedData, visibleGroupCount]);

    const table = useReactTable({
      data: rows,
      columns: visibleDefs,
      state: { sorting: localSorting, expanded },
      onSortingChange: handleSortingChange,
      onExpandedChange: setExpanded,
      getSubRows: (row) => row?.versions ?? [],
      getCoreRowModel: getCoreRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
      getRowCanExpand: (row) => (row.original?.versions?.length ?? 0) > 0,
      enableSortingRemoval: true,
      manualSorting: true,
    });

    const flatScrollEnabled = Boolean(enableScrollPagination && onLoadMore && !groupField);
    const groupedScrollEnabled =
      Boolean(enableScrollPagination && groupField && groupedData) &&
      visibleGroupCount < groupedData.sortedKeys.length;

    const { renderSentinel } = useScrollPagination({
      onLoadMore:
        groupedScrollEnabled && groupedData
          ? () =>
              setVisibleGroupCount((n) =>
                Math.min(n + AGREEMENTS_GROUP_BY_PAGE_SIZE, groupedData.sortedKeys.length),
              )
          : onLoadMore || (() => {}),
      hasMore: groupedScrollEnabled
        ? visibleGroupCount < groupedData.sortedKeys.length
        : Boolean(hasMore) && Boolean(enableScrollPagination),
      isLoading: Boolean(isLoading) || Boolean(isLoadingMore),
      threshold: 200,
      scrollContainer: null,
      enabled: flatScrollEnabled || groupedScrollEnabled,
    });

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>
            Unable to Load Agreements
          </h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
          {onRetry && (
            <Button.Root variant='error' mode='filled' size='small' onClick={onRetry}>
              Try Again
            </Button.Root>
          )}
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      const state = AGREEMENTS_EMPTY_STATES[context] || AGREEMENTS_EMPTY_STATES.default;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    const hasRows = table.getRowModel().rows.length > 0;

    // Loading skeleton (same visual as before, only when table has no data yet)
    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`agreements-skeleton-${index}`}>
            <Table.Row>
              {visibleDefs.map((column) => (
                <Table.Cell key={column.id || column.accessorKey}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    if (pagedGroupedData) {
      return (
        <div className='flex-1 min-h-0 overflow-y-auto w-full rounded-2xl bg-bg-white-0 shadow-regular-xs p-4 flex flex-col gap-6'>
          <AgreementsGroupedView
            sortedKeys={pagedGroupedData.sortedKeys}
            groups={pagedGroupedData.groups}
            columns={visibleDefs}
            variant={variant}
            onRowSelect={onRowSelect}
          />
          {enableScrollPagination && (
            <div className='w-full'>
              {renderSentinel()}
              {isLoadingMore && (
                <div className='flex items-center justify-center gap-2 px-4 py-4'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                  <span className='paragraph-small text-text-sub-600'>
                    Loading more agreements...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className='flex-1 min-h-0 flex flex-col w-full h-full rounded-2xl bg-bg-white-0 shadow-regular-xs'>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype='Agreement'
          field='status'
          showImport={false}
        />
        <Table.Root variant={variant} className='min-h-0 flex-1 overflow-auto' stickyHeader={true}>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head key={header.id}>
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
            <Table.Body spacing={8}>
              {table.getRowModel().rows.map((row) => {
                const isChildRow = row.depth > 0;
                return (
                  <React.Fragment key={row.id}>
                    <Table.Row
                      className={cn('cursor-pointer', isChildRow && 'bg-bg-weak-25/50')}
                      onClick={() => onRowSelect?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell, cellIndex) => (
                        <Table.Cell
                          key={cell.id}
                          className={cn(
                            isChildRow &&
                              cellIndex === 0 &&
                              'border-l-2 border-l-stroke-soft-200 pl-6',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    <Table.RowDivider />
                  </React.Fragment>
                );
              })}
            </Table.Body>
          )}
        </Table.Root>
        {enableScrollPagination && (
          <div className='w-full'>
            {renderSentinel()}
            {isLoadingMore && (
              <div className='flex items-center justify-center gap-2 px-4 py-4'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                <span className='paragraph-small text-text-sub-600'>
                  Loading more agreements...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

AgreementsTable.displayName = 'AgreementsTable';

export default AgreementsTable;
