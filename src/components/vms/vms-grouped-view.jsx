import React, { useState, useEffect } from 'react';
import { flexRender } from '@tanstack/react-table';
import { RiArrowDownSLine, RiArrowUpSLine, RiDeleteBinLine } from 'react-icons/ri';

import { cn } from '@/lib/utils';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import { BADGE_COLOUR } from '@/pages/vms/vms-constant';

/**
 * Renders grouped VMS data (groups from get_visitor_entries_grouped API).
 * groups: [{ group_value, total_items, items }, ...]
 * visibleDefs: column definitions with cell renderers
 */
const VmsGroupedView = ({
  groups = [],
  visibleDefs = [],
  isLoading = false,
  onRowClick,
  onDelete,
  variant = 'compact',
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  sentinelRef,
  emptyMessage = 'No results found.',
}) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries((groups || []).map((g, i) => [g.group_value ?? i, true])),
  );

  useEffect(() => {
    setExpandedKeys((prev) => {
      const next = { ...prev };
      (groups || []).forEach((g, i) => {
        const key = g.group_value ?? String(i);
        if (next[key] === undefined) next[key] = true;
      });
      return next;
    });
  }, [groups]);

  const toggle = (key) => setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  if (isLoading && groups.length === 0) {
    return (
      <Table.Root variant={variant}>
        <Table.Body>
          {Array.from({ length: 6 }).map((_, i) => (
            <React.Fragment key={i}>
              <Table.Row>
                {visibleDefs.map((col) => (
                  <Table.Cell key={col.id}>
                    <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                  </Table.Cell>
                ))}
              </Table.Row>
              {i < 5 && <Table.RowDivider />}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyMessage}</h3>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      {groups.map((group, groupIdx) => {
        const key = group.group_value ?? `group-${groupIdx}`;
        const items = group.items ?? [];
        const isExpanded = expandedKeys[key] !== false;

        return (
          <div key={key} className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex w-full items-center gap-1 font-medium text-text-sub-500 cursor-pointer hover:opacity-80 transition-opacity text-left'
            >
              {key == 'Invited' ||
              key == 'Cancelled' ||
              key == 'Checked In' ||
              key == 'Checked Out' ? (
                <Badge.Root variant='light' color={BADGE_COLOUR[key]}>
                  {key}
                </Badge.Root>
              ) : (
                group.group_value || 'Unknown'
              )}
              <span className='text-text-soft-400 font-normal'>
                ({group.total_items ?? items.length})
              </span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded && (
              <div className='w-full overflow-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0'>
                <Table.Root variant={variant} className='w-full min-w-full'>
                  <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
                    <Table.Row>
                      {visibleDefs.map((col) => (
                        <Table.Head
                          key={col.id}
                          className={cn(
                            col.meta?.headClassName,
                            'bg-bg-weak-50',
                            col.id === 'first_name' &&
                              'sticky left-0 z-40 shadow-[inset_-2px_0_2px_-2px_rgba(0,0,0,0.25)]',
                          )}
                        >
                          {col.id === 'actions' ? null : col.columnLabel || col.id}
                        </Table.Head>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {items.map((item, idx) => (
                      <React.Fragment key={item.name ?? item.id ?? idx}>
                        <Table.Row
                          className={onRowClick ? 'cursor-pointer' : undefined}
                          onClick={() => onRowClick?.(item)}
                        >
                          {visibleDefs.map((col) => {
                            if (col.id === 'actions') {
                              return (
                                <Table.Cell
                                  key={col.id}
                                  className={col.meta?.cellClassName}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {onDelete && (
                                    <div className='flex justify-end'>
                                      <CompactButton.Root
                                        type='button'
                                        variant='error'
                                        onClick={() => onDelete(item)}
                                        aria-label='Delete'
                                      >
                                        <CompactButton.Icon as={RiDeleteBinLine} />
                                      </CompactButton.Root>
                                    </div>
                                  )}
                                </Table.Cell>
                              );
                            }
                            const cellContext = {
                              row: { original: item, id: item.name ?? idx },
                              column: { columnDef: col },
                              getValue: () => item[col.accessorKey],
                            };
                            return (
                              <Table.Cell
                                key={col.id}
                                className={cn(
                                  col.meta?.cellClassName,
                                  col.id === 'first_name' &&
                                    'sticky left-0 z-20 bg-bg-white-0 shadow-[inset_-2px_0_2px_-2px_rgba(0,0,0,0.25)] group-hover/row:bg-bg-weak-50',
                                )}
                              >
                                {col.cell
                                  ? flexRender(col.cell, cellContext)
                                  : (item[col.accessorKey] ?? '--')}
                              </Table.Cell>
                            );
                          })}
                        </Table.Row>
                        {idx < items.length - 1 && <Table.RowDivider />}
                      </React.Fragment>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
            )}
          </div>
        );
      })}

      {sentinelRef && <div ref={sentinelRef} data-scroll-sentinel className='h-1' />}
      {isLoadingMore && (
        <div className='py-4 text-center'>
          <span className='text-paragraph-sm text-text-sub-600'>Loading more groups...</span>
        </div>
      )}
    </div>
  );
};

export default VmsGroupedView;
