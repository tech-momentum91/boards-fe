import React, { useMemo, useCallback } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { RiPencilLine, RiDeleteBinLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { useDispatch } from 'react-redux';

import * as Table from '@/components/ui/table';
import {
  EMPTY_STATES,
  LANDLORDS_GROUP_BY_FIELD_MAP,
  ENGAGEMENT_MODE_OPTIONS,
  STATUS_TAB_OPTIONS,
} from './constants';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Avatar from '@/components/ui/avatar';
import InlineEditableText from '@/components/ui/inline-editable-text';
import emptyState from '@/assets/images/empty-state.png';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { fetchLandlordColumnList, updateLandlordColumnList } from '@/redux/landlordSlice';
import * as Tooltip from '@/components/ui/tooltip';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import { toStatusFilterOptions, useStatusOptions } from '@/hooks/use-status-options';

const LANDLORDS_GROUP_BY_PAGE_SIZE = 5;

const LandlordsGroupTable = React.memo(({ groupRows, columns, variant, onRowSelect }) => {
  const groupTable = useReactTable({
    data: groupRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
    manualSorting: true,
  });

  return (
    <Table.Root variant={variant} tableClassName='min-w-max'>
      <Table.Header>
        {groupTable.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id} className={header.column.columnDef.meta?.headClassName}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {groupTable.getRowModel().rows.map((row, i, arr) => (
          <React.Fragment key={row.id}>
            <Table.Row className='cursor-pointer' onClick={() => onRowSelect?.(row.original)}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell
                  key={cell.id}
                  className={cell.column.columnDef.meta?.cellClassName}
                  onClick={(e) => {
                    if (cell.column.id === 'actions') e.stopPropagation();
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
            {i < arr.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    </Table.Root>
  );
});

LandlordsGroupTable.displayName = 'LandlordsGroupTable';

const LandlordsGroupedView = ({ sortedKeys, groups, columns, variant, onRowSelect }) => {
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
                <LandlordsGroupTable
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

const sortableHeader = (label, className) => {
  const SortableColumnHeader = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable className={className} />
  );
  SortableColumnHeader.displayName = `SortableHeader(${label})`;
  return SortableColumnHeader;
};

// Status to badge variant mapping
const getStatusVariant = (status) => {
  if (!status) return 'disabled';

  const statusMap = {
    Active: 'green',
    Inactive: 'red',
  };

  return statusMap[status] || 'disabled';
};

const LANDLORD_STATUS_FALLBACK_OPTIONS = STATUS_TAB_OPTIONS.map((o) => ({
  value: o.value,
  label: o.value,
}));

const normalizeInlineValue = (value) => {
  const s = String(value ?? '').trim();
  return s === '--' || s === '-' ? '' : s;
};

// const renderInlineTextCell = (row, field, value, onFieldUpdate, className = 'paragraph-small text-[var(--color-text-sub-600)]') => {
//   const display = normalizeInlineValue(value);
//   if (!onFieldUpdate || !landlordId) {
//     return <span className={className}>{display || '--'}</span>;
//   }
//   return (
//     <div className='min-h-6 min-w-[2.5rem] w-full max-w-full' onClick={(e) => e.stopPropagation()}>
//       <InlineEditableText
//         value={display}
//         placeholder='—'
//         displayClassName={className}
//         inputClassName={className}
//         onSave={(v) => {
//           const trimmed = String(v ?? '').trim();
//           if (trimmed === display) return;
//           onFieldUpdate(landlordId, field, trimmed, row.original);
//         }}
//       />
//     </div>
//   );
// };
//   const landlordId = row.original.name || row.original.id;

const renderInlineTextCell = (
  row,
  field,
  value,
  onFieldUpdate,
  className = 'paragraph-small text-[var(--color-text-sub-600)]',
) => {
  const display = normalizeInlineValue(value);
  const landlordId = row.original.name || row.original.id;

  if (!onFieldUpdate || !landlordId) {
    return <span className={className}>{display || '--'}</span>;
  }

  return (
    <div className='min-h-6 min-w-[2.5rem] w-full max-w-full' onClick={(e) => e.stopPropagation()}>
      <InlineEditableText
        value={display}
        placeholder='—'
        displayClassName={className}
        inputClassName={className}
        onSave={(v) => {
          const trimmed = String(v ?? '').trim();

          if (trimmed === display) return;

          onFieldUpdate(landlordId, field, trimmed, row.original);
        }}
      />
    </div>
  );
};

const renderInlineSelectCell = (row, field, value, options, onFieldUpdate, renderReadOnly) => {
  // console.log("options", options);
  const landlordId = row.original.name || row.original.id;
  if (!onFieldUpdate || !landlordId) return renderReadOnly(value);
  return (
    <div className='min-h-6 min-w-[2.5rem] w-full' onClick={(e) => e.stopPropagation()}>
      <Select.Root
        variant='borderless'
        value={value || '--'}
        onValueChange={(next) =>
          next !== value && onFieldUpdate(landlordId, field, next, row.original)
        }
        size='xsmall'
      >
        <Select.Trigger className='w-full min-w-0' showArrow={false}>
          <Select.Value>{renderReadOnly(value)}</Select.Value>
        </Select.Trigger>
        <Select.Content className='min-w-[230px]'>
          {options.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
};

const LandlordsTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      context = 'default',
      onRetry,
      onRowSelect,
      onEdit,
      onDelete,
      onSortingChange,
      sorting = [],
      permissions = {},
      tableId = 'landlords-table',
      columnConfig: externalColumnConfig,
      onColumnConfigChange,
      variant = 'default', // Table variant: 'default' | 'compact'
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      groupBy = '',
      groupOrder = 'asc',
      onFieldUpdate,
      centerOptions = [],
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const [statusOptionsRefreshKey, setStatusOptionsRefreshKey] = React.useState(0);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const [visibleGroupCount, setVisibleGroupCount] = React.useState(LANDLORDS_GROUP_BY_PAGE_SIZE);
    const dispatch = useDispatch();
    const { options: landlordStatusOptions } = useStatusOptions({
      doctype: 'Landlord',
      field: 'status',
      refreshKey: statusOptionsRefreshKey,
    });
    const statusSelectOptions = React.useMemo(() => {
      const fromConfig = toStatusFilterOptions(landlordStatusOptions);
      return fromConfig.length > 0 ? fromConfig : LANDLORD_STATUS_FALLBACK_OPTIONS;
    }, [landlordStatusOptions]);

    const handleSetStatusesOpenChange = React.useCallback((open) => {
      setIsSetStatusesOpen(open);
      if (!open) setStatusOptionsRefreshKey((key) => key + 1);
    }, []);

    // Preserve scroll position when data is appended (scroll pagination)
    // This ensures smooth continuous scrolling without jumps to top
    const previousRowsLengthRef = React.useRef(rows.length);
    const scrollPositionBeforeUpdateRef = React.useRef(0);
    const isAppendingRef = React.useRef(false);

    // Store scroll position before data update
    React.useLayoutEffect(() => {
      if (enableScrollPagination && rows.length > previousRowsLengthRef.current) {
        // Data is being appended - store current scroll position
        scrollPositionBeforeUpdateRef.current =
          window.pageYOffset || document.documentElement.scrollTop;
        isAppendingRef.current = true;
      }
      previousRowsLengthRef.current = rows.length;
    }, [rows.length, enableScrollPagination]);

    // Restore scroll position after DOM update to maintain smooth scrolling
    React.useLayoutEffect(() => {
      if (
        enableScrollPagination &&
        isAppendingRef.current &&
        !isLoadingMore &&
        scrollPositionBeforeUpdateRef.current > 0
      ) {
        // Restore scroll position to maintain user's view
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDifference = scrollPositionBeforeUpdateRef.current - currentScroll;

        if (Math.abs(scrollDifference) > 5) {
          // Only adjust if there's a significant difference (more than 5px)
          window.scrollTo(0, scrollPositionBeforeUpdateRef.current);
        }

        // Reset flags
        isAppendingRef.current = false;
        scrollPositionBeforeUpdateRef.current = 0;
      }
    }, [rows.length, isLoadingMore, enableScrollPagination]);

    // Sync local sorting with prop
    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const newSorting =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;

        setLocalSorting(newSorting);

        if (onSortingChange) {
          onSortingChange(newSorting);
        }
      },
      [localSorting, onSortingChange],
    );

    // Define all available columns with IDs for column management
    const allColumnDefs = useMemo(
      () => [
        // {
        //   id: 'id',
        //   accessorKey: 'id',
        //   header: ({ column }) => (
        //     <div className='flex items-center gap-0.5'>
        //       ID
        //       <button
        //         className='cursor-pointer'
        //         onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        //       >
        //         {getSortingIcon(column.getIsSorted())}
        //       </button>
        //     </div>
        //   ),
        //   cell: ({ row }) => {
        //     const landlordId = row.original.id;
        //     return (
        //       <span className='paragraph-small text-nowrap text-text-strong-950'>
        //         {landlordId || '--'}
        //       </span>
        //     );
        //   },
        //   enableSorting: true,
        // },
        {
          id: 'name',
          accessorKey: 'name',
          header: sortableHeader('Name'),
          cell: ({ row }) => {
            const landlordId = row.original.name || row.original.id;
            const name = (row.original.landlord_name || '').trim();
            const landlordImage =
              row.original.landlord_image || row.original.user_image || row.original.profile_image;
            return (
              <div className='grid grid-cols-[32px_1fr] items-center gap-2 overflow-hidden'>
                <Avatar.Root size='32' className='shrink-0'>
                  {landlordImage ? (
                    <Avatar.Image src={landlordImage} alt={name} />
                  ) : (
                    <span className='text-text-sub-500'>{getInitials(name)}</span>
                  )}
                </Avatar.Root>
                <div className='min-w-0 overflow-hidden'>
                  <Tooltip.Root size='xsmall'>
                    <Tooltip.Trigger asChild>
                      <div className='min-w-0 overflow-hidden'>
                        <InlineEditableText
                          value={name}
                          editOnIconOnly
                          placeholder='—'
                          displayClassName='paragraph-small font-medium text-[var(--color-text-sub-600)] truncate'
                          inputClassName='paragraph-small font-medium text-[var(--color-text-sub-600)]'
                          onSave={(v) => {
                            const next = String(v ?? '').trim();
                            if (next === name) return;
                            onFieldUpdate?.(landlordId, 'landlord_name', next, row.original);
                          }}
                        />
                      </div>
                    </Tooltip.Trigger>
                    {name && <Tooltip.Content size='xsmall'>{name}</Tooltip.Content>}
                  </Tooltip.Root>
                </div>
              </div>
            );
          },
          meta: {
            cellClassName: 'min-w-[260px] max-w-[260px] whitespace-nowrap',
          },
          enableSorting: true,
        },
        {
          id: 'spoc',
          accessorKey: 'spoc',
          header: sortableHeader('SPOC'),
          cell: ({ row }) => {
            const spocName = row.original.spoc || row.original.spoc_name || '';
            return (
              <span className='paragraph-small whitespace-nowrap text-[var(--color-text-sub-600)]'>
                {spocName || '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'engagement_mode',
          accessorKey: 'engagement_mode',
          header: sortableHeader('Eng Mode'),
          cell: ({ row }) =>
            renderInlineSelectCell(
              row,
              'engagement_mode',
              row.original.engagement_mode,
              ENGAGEMENT_MODE_OPTIONS,
              onFieldUpdate,
              (value) => (
                <Badge.Root variant='stroke' color='gray' className='text-nowrap'>
                  {value || '--'}
                </Badge.Root>
              ),
            ),
          enableSorting: true,
        },
        {
          id: 'contact_number',
          accessorKey: 'contact_number',
          label: 'SPOC Contact Number',
          header: sortableHeader('SPOC Contact Number'),
          cell: ({ row }) => {
            const contactNumber = row.original.contact_number || row.original.mobile_number;
            const formattedNumber = contactNumber ? contactNumber : '--';
            return (
              <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
                {formattedNumber}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'email',
          accessorKey: 'email',
          header: () => <div className='flex items-center gap-0.5'>Email</div>,
          cell: ({ row }) =>
            renderInlineTextCell(
              row,
              'contact_email',
              row.original.email_address || row.original.contact_email,
              onFieldUpdate,
            ),
          enableSorting: false,
        },
        {
          id: 'state',
          accessorKey: 'state',
          header: sortableHeader('State'),
          cell: ({ row }) => (
            <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
              {row.original.state || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'city',
          accessorKey: 'city',
          header: sortableHeader('City'),
          cell: ({ row }) => (
            <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
              {row.original.city || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              Status
              <button
                className='cursor-pointer'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusPopoverColumnConfig}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            </div>
          ),
          cell: ({ row }) =>
            renderInlineSelectCell(
              row,
              'status',
              row.original.status,
              statusSelectOptions,
              onFieldUpdate,
              (value) => {
                if (!value || value === '--') {
                  return <span className='paragraph-small text-text-sub-400'>--</span>;
                }
                const statusColorRaw = row.original.status_color || row.original.statusColor;
                if (hasStatusBadgeColor(statusColorRaw)) {
                  return (
                    <StatusColorPill
                      value={value}
                      color={statusColorRaw}
                      className='max-w-[min(100%,180px)]'
                    />
                  );
                }
                return (
                  <Badge.Root
                    variant='light'
                    color={getStatusVariant(value)}
                    className='text-nowrap'
                  >
                    {value}
                  </Badge.Root>
                );
              },
            ),
          enableSorting: true,
        },
        {
          id: 'tags',
          accessorKey: 'tags',
          header: () => <div className='flex items-center gap-0.5'>Tags</div>,
          cell: ({ row }) => {
            const { tags } = row.original;
            const tagList =
              typeof tags === 'string'
                ? tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                : Array.isArray(tags)
                  ? tags.map((t) => (typeof t === 'string' ? t : String(t)))
                  : [];
            if (tagList.length === 0) {
              return <span className='paragraph-small text-[var(--color-text-sub-600)]'>--</span>;
            }
            const maxVisible = 2;
            const visibleTags = tagList.slice(0, maxVisible);
            const remainingCount = tagList.length - maxVisible;
            return (
              <div className='flex flex-wrap items-center gap-1 max-w-[220px]'>
                {visibleTags.map((tag) => (
                  <Badge.Root
                    key={tag}
                    variant='stroke'
                    color='gray'
                    size='small'
                    className='text-nowrap'
                  >
                    {tag}
                  </Badge.Root>
                ))}
                {remainingCount > 0 && (
                  <Badge.Root
                    variant='stroke'
                    color='gray'
                    size='small'
                    className='text-nowrap'
                    title={tagList.slice(maxVisible).join(', ')}
                  >
                    +{remainingCount}
                  </Badge.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'center',
          accessorKey: 'center',
          header: sortableHeader('Center Name'),
          cell: ({ row }) => {
            const centerId =
              row.original.center_details?.[0]?.center ||
              centerOptions.find((o) => o.label === row.original.center)?.value ||
              '';
            const centerLabel =
              centerOptions.find((o) => o.value === centerId)?.label ||
              row.original.center_details?.[0]?.center_name ||
              row.original.center ||
              '--';
            const landlordId = row.original.name || row.original.id;
            if (!onFieldUpdate || !landlordId) {
              return (
                <span className='paragraph-small text-nowrap text-text-sub-600'>{centerLabel}</span>
              );
            }
            return (
              <div className='min-h-6 min-w-[2.5rem] w-full' onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  showArrow={false}
                  value={centerId}
                  onValueChange={(next) =>
                    next !== centerId && onFieldUpdate(landlordId, 'center', next, row.original)
                  }
                  options={centerOptions}
                  placeholder='—'
                  searchPlaceholder='Search center...'
                  noResultsMessage='No centers found'
                  emptyMessage='No centers available'
                  triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
                  contentClassName='min-w-[230px]'
                  renderTrigger={() => (
                    <span className='paragraph-small text-nowrap text-text-sub-600'>
                      {centerLabel}
                    </span>
                  )}
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'block_floor',
          accessorKey: 'block_floor',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Block / Floor
              </span>
            </div>
          ),
          cell: ({ row }) =>
            renderInlineTextCell(row, 'block_floor', row.original.block_floor, onFieldUpdate),
          enableSorting: false,
        },
        {
          id: 'shop_number',
          accessorKey: 'shop_number',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <Table.SortableHeader label='Shop No' className='cursor-pointer' />
            </div>
          ),
          cell: ({ row }) => {
            const shopNumbers = row.original.shop_number;
            const shopValue = Array.isArray(shopNumbers)
              ? shopNumbers.filter(Boolean).join(', ')
              : shopNumbers || '';
            return renderInlineTextCell(row, 'shop_number', shopValue, onFieldUpdate);
          },
          enableSorting: false,
        },

        {
          id: 'created_by',
          accessorKey: 'created_by',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <Table.SortableHeader label='Created By' className='cursor-pointer' />
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
              {row.original.created_by ?? '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'created_at',
          accessorKey: 'created_at',
          header: () => <div className='flex items-center gap-0.5'>Created At</div>,
          cell: ({ row }) => {
            const raw = row.original.created_at;
            if (!raw)
              return <span className='paragraph-small text-[var(--color-text-sub-600)]'>--</span>;
            try {
              const date = new Date(raw);
              if (Number.isNaN(date.getTime())) return raw;
              return (
                <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
                  {format(date, 'dd MMM yyyy, HH:mm')}
                </span>
              );
            } catch {
              return (
                <span className='paragraph-small text-[var(--color-text-sub-600)]'>{raw}</span>
              );
            }
          },
          enableSorting: false,
        },
        {
          id: 'last_updated',
          accessorKey: 'last_updated',
          label: 'Last Updated Date & Time',
          header: () => <div className='flex items-center gap-0.5'>Last Updated</div>,
          cell: ({ row }) => {
            const raw = row.original.last_updated;
            if (!raw)
              return <span className='paragraph-small text-[var(--color-text-sub-600)]'>--</span>;
            try {
              const date = new Date(raw);
              if (Number.isNaN(date.getTime())) return raw;
              return (
                <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
                  {format(date, 'dd MMM yyyy, HH:mm')}
                </span>
              );
            } catch {
              return (
                <span className='paragraph-small text-[var(--color-text-sub-600)]'>{raw}</span>
              );
            }
          },
          enableSorting: false,
        },
        {
          id: 'actions',
          header: <div className='invisible'>A</div>,
          enableHiding: false,
          cell: ({ row }) => {
            const canWrite = permissions?.canWrite ?? permissions?.canEdit ?? false;
            if (!canWrite) {
              return null;
            }
            return (
              <div className='flex items-center justify-end'>
                <Button.Root
                  variant='neutral'
                  mode='ghost'
                  size='medium'
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(row.original);
                  }}
                  aria-label='Delete landlord'
                >
                  <Button.Icon as={RiDeleteBinLine} />
                </Button.Root>
              </div>
            );
          },
          enableSorting: false,
          meta: {
            headClassName:
              'sticky right-0 z-20 bg-bg-weak-50 min-w-[52px] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]',
            cellClassName:
              'border-stroke-soft-200 sticky right-0 z-20 bg-white min-w-[52px] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover/row:bg-bg-weak-50',
          },
        },
      ],
      [
        onEdit,
        onDelete,
        permissions,
        onFieldUpdate,
        centerOptions,
        statusPopoverColumnConfig,
        statusSelectOptions,
      ],
    );

    // Prepare columns for column management
    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    // Stable callbacks so column pref APIs are not called on every render
    const handlePersistColumnConfig = useCallback(
      async (data) => {
        await dispatch(updateLandlordColumnList(data)).unwrap();
        await dispatch(fetchLandlordColumnList());
      },
      [dispatch],
    );

    const handleFetchColumnConfig = useCallback(async () => {
      return dispatch(fetchLandlordColumnList())
        .unwrap()
        .then((data) => data);
    }, [dispatch]);

    // Use column configuration hook (only if external config not provided)
    const internalColumnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      handlePersistColumnConfig,
      handleFetchColumnConfig,
      {
        autoSave: true,
        debounce: true,
      },
    );

    // Use external config if provided, otherwise use internal hook
    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      isLoading: isLoadingColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = externalColumnConfig || internalColumnConfigHook;

    const activeColumnConfigHook = externalColumnConfig || internalColumnConfigHook;
    syncColumnConfigHookToPopover(activeColumnConfigHook);

    // Expose methods to parent via ref
    React.useImperativeHandle(ref, () => ({
      columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    // Apply column configuration to get final columns for the table; keep actions column last
    const columns = useMemo(() => {
      const applied = applyColumnConfig(allColumnDefs, columnConfig);
      const actionsCol = applied.find((c) => (c.id || c.accessorKey) === 'actions');
      const rest = applied.filter((c) => (c.id || c.accessorKey) !== 'actions');
      return actionsCol ? [...rest, actionsCol] : applied;
    }, [allColumnDefs, columnConfig]);

    const groupField = useMemo(() => {
      if (!groupBy) return null;
      return LANDLORDS_GROUP_BY_FIELD_MAP[groupBy] ?? groupBy;
    }, [groupBy]);

    const groupedData = useMemo(() => {
      if (!groupField || !Array.isArray(rows) || rows.length === 0) return null;
      const groups = {};
      for (const row of rows) {
        let raw = row?.[groupField];
        if (groupBy === 'center') {
          raw = row?.center_details?.[0]?.center_name ?? row?.center_name ?? row?.center;
        }
        const key = raw != null && raw !== '' ? String(raw) : '';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }
      const sortedKeys = Object.keys(groups).sort((a, b) =>
        groupOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b),
      );
      return { sortedKeys, groups };
    }, [groupField, groupOrder, rows, groupBy]);

    React.useEffect(() => {
      setVisibleGroupCount(LANDLORDS_GROUP_BY_PAGE_SIZE);
    }, [groupBy, groupOrder]);

    const pagedGroupedData = useMemo(() => {
      if (!groupedData) return null;
      const { sortedKeys, groups } = groupedData;
      return {
        sortedKeys: sortedKeys.slice(0, visibleGroupCount),
        groups,
      };
    }, [groupedData, visibleGroupCount]);

    const flatScrollEnabled = Boolean(enableScrollPagination && onLoadMore && !groupField);
    const groupedScrollEnabled =
      Boolean(enableScrollPagination && groupField && groupedData) &&
      visibleGroupCount < groupedData.sortedKeys.length;

    const { sentinelRef, renderSentinel } = useScrollPagination({
      onLoadMore:
        groupedScrollEnabled && groupedData
          ? () =>
              setVisibleGroupCount((n) =>
                Math.min(n + LANDLORDS_GROUP_BY_PAGE_SIZE, groupedData.sortedKeys.length),
              )
          : onLoadMore || (() => {}),
      hasMore: groupedScrollEnabled
        ? visibleGroupCount < groupedData.sortedKeys.length
        : Boolean(hasMore) && Boolean(enableScrollPagination),
      isLoading: Boolean(isLoading) || Boolean(isLoadingMore),
      threshold: 200,
      scrollContainer: null,
      enabled:
        flatScrollEnabled ||
        groupedScrollEnabled ||
        Boolean(enableScrollPagination && onLoadMore && groupField && hasMore),
    });

    const table = useReactTable({
      data: rows,
      columns,
      state: {
        sorting: localSorting,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    // Error state
    // if (error) {
    //   return (
    //     <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
    //       <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
    //         <RiErrorWarningLine className='size-6 text-error-base' />
    //       </div>
    //       <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Landlords</h3>
    //       {/* <p className='mb-4 text-sm text-error-darker/80'>{error}</p> */}
    //       {onRetry && (
    //         <button
    //           onClick={onRetry}
    //           className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
    //         >
    //           Try Again
    //         </button>
    //       )}
    //     </div>
    //   );
    // }

    // Loading skeleton
    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {columns.map((column) => (
                <Table.Cell
                  key={column.id || column.accessorKey}
                  className={column.meta?.cellClassName}
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

    // Empty state - show image for search / no_centers contexts, skeleton for default
    if (!isLoading && rows.length === 0) {
      const state = EMPTY_STATES[context] || EMPTY_STATES.default;

      if (context === 'search' || context === 'no_centers') {
        return (
          <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
            <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
            <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
            <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
          </div>
        );
      }

      // Show skeleton for default context
      return (
        <>
          <div className='flex-1 min-h-0 flex flex-col w-full overflow-hidden'>
            <Table.Root
              variant={variant}
              className='min-h-0 flex-1 overflow-auto'
              tableClassName='min-w-max'
            >
              <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Table.Head
                        key={header.id}
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
              {renderSkeleton()}
            </Table.Root>
          </div>
          <SetStatusesModal
            open={isSetStatusesOpen}
            onOpenChange={setIsSetStatusesOpen}
            doctype='Landlord'
            field='status'
          />
        </>
      );
    }

    if (pagedGroupedData) {
      return (
        <div className='flex-1 min-h-0 overflow-y-auto w-full rounded-2xl bg-bg-white-0 shadow-regular-xs p-4 flex flex-col gap-6'>
          <LandlordsGroupedView
            sortedKeys={pagedGroupedData.sortedKeys}
            groups={pagedGroupedData.groups}
            columns={columns}
            variant={variant}
            onRowSelect={onRowSelect}
          />
          {enableScrollPagination && (
            <div className='w-full'>
              {renderSentinel()}
              {isLoadingMore ? (
                <div className='flex items-center justify-center gap-2 px-4 py-4'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                  <span className='paragraph-small text-text-sub-600'>
                    Loading more landlords...
                  </span>
                </div>
              ) : null}
            </div>
          )}
          <SetStatusesModal
            open={isSetStatusesOpen}
            onOpenChange={setIsSetStatusesOpen}
            doctype='Landlord'
            field='status'
          />
        </div>
      );
    }

    return (
      <>
        <div className='flex-1 min-h-0 flex flex-col w-full overflow-hidden'>
          <Table.Root
            variant={variant}
            className='min-h-0 flex-1 overflow-auto'
            tableClassName='min-w-max'
          >
            <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Head
                      key={header.id}
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
                {table.getRowModel().rows.map((row, i, arr) => (
                  <React.Fragment key={row.id}>
                    <Table.Row
                      data-state={row.getIsSelected() && 'selected'}
                      className='cursor-pointer'
                      onClick={() => onRowSelect?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell
                          key={cell.id}
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
                    {i < arr.length - 1 && <Table.RowDivider />}
                  </React.Fragment>
                ))}
                {/* Scroll pagination sentinel and loading indicator */}
                {enableScrollPagination && (
                  <>
                    {/* Sentinel row for intersection observer - must be a tr/td, not div */}
                    {hasMore && (
                      <Table.Row ref={sentinelRef} data-scroll-sentinel>
                        <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                      </Table.Row>
                    )}
                    {isLoadingMore && (
                      <Table.Row>
                        <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                          <div className='flex items-center justify-center gap-2'>
                            <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                            <span className='paragraph-small text-text-sub-600'>
                              Loading more landlords...
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
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={handleSetStatusesOpenChange}
          doctype='Landlord'
          field='status'
        />
      </>
    );
  },
);

LandlordsTable.displayName = 'LandlordsTable';

export default LandlordsTable;
