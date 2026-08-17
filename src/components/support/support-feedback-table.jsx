import React, { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import SupportIssueStatusDropdown from '@/components/support/support-issue-status-dropdown';
import { getStatusMetaForOption } from '@/components/ticket-management/constants';
import {
  SUPPORT_FEEDBACK_DEFAULT_STATUS,
  SUPPORT_ISSUE_STATUS_META,
} from '@/components/support/support-feedback-constants';

const SupportFeedbackTable = ({
  items = [],
  onOpen,
  onStatusChange,
  statusOptions = [],
  updatingStatusId,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  canChangeStatus = false,
}) => {
  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: Boolean(hasMore),
    isLoading: Boolean(isLoadingMore),
    threshold: 200,
    scrollContainer: null,
    enabled: Boolean(onLoadMore),
  });

  const columns = useMemo(
    () => [
      {
        id: 'subject',
        accessorKey: 'title',
        header: () => (
          <div className='flex w-[200px] items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Subject</span>
          </div>
        ),
        cell: ({ row }) => {
          const { title } = row.original;
          return (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <p className='paragraph-small w-[200px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-text-strong-950'>
                  {title || '--'}
                </p>
              </Tooltip.Trigger>
              {title ? (
                <Tooltip.Content size='xsmall' side='bottom'>
                  {title}
                </Tooltip.Content>
              ) : null}
            </Tooltip.Root>
          );
        },
        enableSorting: false,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: () => (
          <div className='flex w-[300px] items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Description</span>
          </div>
        ),
        cell: ({ row }) => {
          const { description } = row.original;
          return (
            <p className='paragraph-small line-clamp-3 w-[300px] whitespace-normal text-ellipsis text-text-sub-600'>
              {description?.trim() || '--'}
            </p>
          );
        },
        enableSorting: false,
      },
      {
        id: 'raisedBy',
        accessorKey: 'raisedByName',
        header: () => (
          <div className='flex items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Raised by</span>
          </div>
        ),
        cell: ({ row }) => {
          const displayName = row.original.raisedByName || row.original.email || '—';
          return (
            <div className='flex max-w-[220px] items-center gap-2'>
              <CrmAccountAvatar name={displayName} size={24} className='shrink-0' />
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <span className='paragraph-small line-clamp-1 min-w-0 flex-1 text-left text-text-sub-600'>
                    {displayName}
                  </span>
                </Tooltip.Trigger>
                {displayName && displayName !== '—' ? (
                  <Tooltip.Content size='xsmall'>{displayName}</Tooltip.Content>
                ) : null}
              </Tooltip.Root>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'module',
        accessorKey: 'module',
        header: () => (
          <div className='flex w-[180px] items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Module</span>
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const modulesList = Array.isArray(item.modules) ? item.modules.filter(Boolean) : [];
          const fallbackLabel = item.module?.trim() || '—';

          if (modulesList.length === 0) {
            return (
              <div className='flex max-w-[180px] flex-wrap items-center gap-1'>
                <Badge.Root
                  variant='light'
                  color='pink'
                  size='small'
                  className='truncate max-w-[168px]'
                >
                  {fallbackLabel}
                </Badge.Root>
              </div>
            );
          }

          const firstModule = modulesList[0];
          const secondModule = modulesList[1];
          const remaining = modulesList.slice(2);
          const remainingCount = remaining.length;

          return (
            <div className='flex max-w-[180px] flex-wrap items-center gap-1'>
              <Badge.Root variant='light' color='pink' size='small' className=' truncate'>
                {firstModule}
              </Badge.Root>
              {secondModule ? (
                <Badge.Root variant='light' color='pink' size='small' className=' truncate'>
                  {secondModule}
                </Badge.Root>
              ) : null}
              {remainingCount > 0 ? (
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <button
                      type='button'
                      className='inline-flex cursor-default border-0 bg-transparent p-0'
                      aria-label={`${remainingCount} more module${remainingCount === 1 ? '' : 's'}`}
                    >
                      <Badge.Root variant='light' color='pink' size='small' className='shrink-0'>
                        +{remainingCount}
                      </Badge.Root>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content size='xsmall' side='bottom' className='max-w-xs'>
                    <ul className='space-y-1 text-left'>
                      {remaining.map((label) => (
                        <li key={`${item.id}-${label}`} className='text-paragraph-xs'>
                          {label}
                        </li>
                      ))}
                    </ul>
                  </Tooltip.Content>
                </Tooltip.Root>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => (
          <div className='flex min-w-[140px] items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Status</span>
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const statusLabel = item.status || SUPPORT_FEEDBACK_DEFAULT_STATUS;
          const statusColor = getStatusMetaForOption(
            { value: statusLabel },
            SUPPORT_ISSUE_STATUS_META,
          ).color;
          if (!canChangeStatus) {
            return (
              <Badge.Root
                variant='light'
                color={statusColor}
                size='small'
                className='min-w-[140px]'
              >
                {statusLabel}
              </Badge.Root>
            );
          }
          return (
            <div className='min-w-[140px]' onClick={(e) => e.stopPropagation()}>
              <SupportIssueStatusDropdown
                value={statusLabel}
                onValueChange={(newStatus) => onStatusChange?.(item.id, newStatus)}
                statusOptions={statusOptions}
                disabled={updatingStatusId === item.id}
                size='small'
                className='w-full'
              />
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'upvotes',
        accessorKey: 'upvoteCount',
        header: () => (
          <div className='flex w-full items-center justify-end gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Upvotes</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className='paragraph-small inline-flex w-full justify-end tabular-nums text-text-strong-950'>
            {row.original.upvoteCount ?? 0}
          </span>
        ),
        enableSorting: false,
        meta: { cellClassName: 'text-right' },
      },
    ],
    [canChangeStatus, onStatusChange, statusOptions, updatingStatusId],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  const rowModel = table.getRowModel().rows;
  const colCount = columns.length;

  return (
    <div className='w-full'>
      <Table.Root variant='compact' className='w-full' tableInstance={table}>
        <Table.Header>
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

        <Table.Body spacing={8}>
          {rowModel.map((row, i, rows) => (
            <React.Fragment key={row.id}>
              <Table.Row className='cursor-pointer' onClick={() => onOpen?.(row.original)}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    column={cell.column}
                    className={cell.column.columnDef.meta?.cellClassName}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
              {i < rows.length - 1 ? <Table.RowDivider /> : null}
            </React.Fragment>
          ))}

          {hasMore ? (
            <Table.Row ref={sentinelRef} data-scroll-sentinel>
              <Table.Cell colSpan={colCount} className='h-1 p-0' />
            </Table.Row>
          ) : null}

          {isLoadingMore ? (
            <Table.Row>
              <Table.Cell colSpan={colCount} className='py-8 text-center'>
                <div className='flex items-center justify-center gap-2'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                  <span className='paragraph-small text-text-sub-600'>Loading more reports...</span>
                </div>
              </Table.Cell>
            </Table.Row>
          ) : null}
        </Table.Body>
      </Table.Root>
    </div>
  );
};

export default SupportFeedbackTable;
