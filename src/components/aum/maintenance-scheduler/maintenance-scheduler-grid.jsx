import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { RiArrowUpDownLine } from 'react-icons/ri';

import FrequencySelectPopover from '@/components/aum/maintenance-scheduler/frequency-select-popover';
import RoleAssigneePopover from '@/components/aum/maintenance-scheduler/role-assignee-popover';
import SchedulerMonthCell from '@/components/aum/maintenance-scheduler/scheduler-month-cell';
import SchedulerProductTypeCell from '@/components/aum/maintenance-scheduler/scheduler-product-type-cell';
import { SchedulerPlannedDragPreview } from '@/components/aum/maintenance-scheduler/scheduler-cell-icon';
import { MS_MONTH_COLUMNS } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-constants';
import {
  applyMsFrequencyToMonthCells,
  flattenMsSchedulerRowsForDisplay,
  getMsMonthHeaderBadge,
  getMsParentRowIdsWithChildren,
  movePlannedMsMonthCell,
  planMsMonthCell,
  unplanMsMonthCell,
} from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/utils/cn';

const ROW_HEIGHT = 'h-10';
const HEADER_HEIGHT = 'h-9';
const STICKY_WIDTH = 'w-[381px]';
const PRODUCT_WIDTH = 'w-[173px]';
const META_WIDTH = 'w-[104px]';
const MONTH_WIDTH = 'w-[110px]';
const MS_ROW_BORDER = 'border-b border-solid border-stroke-soft-200';
const MS_MONTH_COL_BORDER = 'border-r border-dashed border-stroke-soft-200';

function useScrollSync() {
  const syncScrollTop = useCallback((source, targets) => {
    targets.forEach((target) => {
      if (target && target !== source && target.scrollTop !== source.scrollTop) {
        target.scrollTop = source.scrollTop;
      }
    });
  }, []);

  const syncScrollLeft = useCallback((source, targets) => {
    targets.forEach((target) => {
      if (target && target !== source && target.scrollLeft !== source.scrollLeft) {
        target.scrollLeft = source.scrollLeft;
      }
    });
  }, []);

  return { syncScrollTop, syncScrollLeft };
}

const MaintenanceSchedulerGrid = memo(({ rows, onRowChange }) => {
  const { syncScrollTop, syncScrollLeft } = useScrollSync();
  const [dragPreview, setDragPreview] = useState({ visible: false, x: 0, y: 0 });
  const [expandedRowIds, setExpandedRowIds] = useState(
    () => new Set(getMsParentRowIdsWithChildren(rows)),
  );

  const leftBodyRef = useRef(null);
  const monthHeaderRef = useRef(null);
  const monthBodyRef = useRef(null);

  const displayRows = useMemo(
    () => flattenMsSchedulerRowsForDisplay(rows, expandedRowIds),
    [expandedRowIds, rows],
  );

  const handleToggleExpand = useCallback((rowId) => {
    setExpandedRowIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const resolveEditableRowId = useCallback((row) => row.id, []);

  const handlePlannedDragStart = useCallback(({ x, y }) => {
    setDragPreview({ visible: true, x, y });
  }, []);

  const handlePlannedDrag = useCallback(({ x, y }) => {
    setDragPreview({ visible: true, x, y });
  }, []);

  const handlePlannedDragEnd = useCallback(() => {
    setDragPreview({ visible: false, x: 0, y: 0 });
  }, []);

  const handleAssigneeChange = useCallback(
    (rowId, assigneeRole) => {
      onRowChange?.(rowId, { assigneeRole });
    },
    [onRowChange],
  );

  const handleFrequencyChange = useCallback(
    (rowId, frequency) => {
      onRowChange?.(rowId, (currentRow) => ({
        frequency,
        monthCells: applyMsFrequencyToMonthCells(frequency, currentRow.monthCells),
      }));
    },
    [onRowChange],
  );

  const handlePlanMonth = useCallback(
    (row, monthIndex) => {
      const rowId = resolveEditableRowId(row);
      onRowChange?.(rowId, (currentRow) => {
        const frequency = currentRow.frequency || 'monthly';
        return {
          frequency,
          monthCells: planMsMonthCell(currentRow.monthCells, monthIndex, frequency),
        };
      });
    },
    [onRowChange, resolveEditableRowId],
  );

  const handleUnplanMonth = useCallback(
    (row, monthIndex) => {
      const rowId = resolveEditableRowId(row);
      onRowChange?.(rowId, (currentRow) => ({
        monthCells: unplanMsMonthCell(currentRow.monthCells, monthIndex, currentRow.frequency),
      }));
    },
    [onRowChange, resolveEditableRowId],
  );

  const handleMovePlannedMonth = useCallback(
    (row, fromIndex, toIndex) => {
      const rowId = resolveEditableRowId(row);
      onRowChange?.(rowId, (currentRow) => ({
        monthCells: movePlannedMsMonthCell(
          currentRow.monthCells,
          fromIndex,
          toIndex,
          currentRow.frequency,
        ),
      }));
    },
    [onRowChange, resolveEditableRowId],
  );

  const handleLeftBodyScroll = useCallback(
    (event) => {
      syncScrollTop(event.currentTarget, [monthBodyRef.current]);
    },
    [syncScrollTop],
  );

  const handleMonthBodyScroll = useCallback(
    (event) => {
      syncScrollTop(event.currentTarget, [leftBodyRef.current]);
      syncScrollLeft(event.currentTarget, [monthHeaderRef.current]);
    },
    [syncScrollLeft, syncScrollTop],
  );

  const handleMonthHeaderScroll = useCallback(
    (event) => {
      syncScrollLeft(event.currentTarget, [monthBodyRef.current]);
    },
    [syncScrollLeft],
  );

  return (
    <>
      <div className='flex min-h-[480px] flex-1 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        {/* Left panel — product meta only */}
        <div className='flex shrink-0 flex-col overflow-hidden'>
          <div
            className={cn(
              'flex shrink-0 bg-bg-weak-100',
              STICKY_WIDTH,
              HEADER_HEIGHT,
              MS_ROW_BORDER,
            )}
          >
            <div className={cn('flex items-center gap-0.5 px-3', PRODUCT_WIDTH)}>
              <span className='text-label-sm text-text-soft-400'>Product Type</span>
              <RiArrowUpDownLine className='size-5 text-text-soft-400' aria-hidden />
            </div>
            <div className={cn('flex items-center px-3', META_WIDTH)}>
              <span className='text-label-sm text-text-soft-400'>Assignee</span>
            </div>
            <div className={cn('flex items-center px-3', META_WIDTH)}>
              <span className='text-label-sm text-text-soft-400'>Frequency</span>
            </div>
          </div>

          <div
            ref={leftBodyRef}
            onScroll={handleLeftBodyScroll}
            className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden', STICKY_WIDTH)}
          >
            {displayRows.map((row) => (
              <div key={row.id} className={cn('flex bg-bg-white-0', ROW_HEIGHT, MS_ROW_BORDER)}>
                <div className={cn('flex min-w-0 items-center', PRODUCT_WIDTH)}>
                  <SchedulerProductTypeCell
                    productType={row.productType}
                    rowKind={row.rowKind}
                    hasChildren={row.hasChildren}
                    isExpanded={expandedRowIds.has(row.id)}
                    onToggleExpand={() => handleToggleExpand(row.id)}
                  />
                </div>
                <div className={META_WIDTH}>
                  <RoleAssigneePopover
                    value={row.assigneeRole}
                    disabled={!row.editable}
                    onValueChange={(value) =>
                      handleAssigneeChange(resolveEditableRowId(row), value)
                    }
                  />
                </div>
                <div className={META_WIDTH}>
                  <FrequencySelectPopover
                    value={row.frequency}
                    disabled={!row.editable}
                    onValueChange={(value) =>
                      handleFrequencyChange(resolveEditableRowId(row), value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='w-px shrink-0 self-stretch bg-stroke-soft-200' aria-hidden />

        {/* Right panel — month schedule */}
        <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
          <div
            ref={monthHeaderRef}
            onScroll={handleMonthHeaderScroll}
            className={cn(
              'shrink-0 overflow-x-auto overflow-y-hidden bg-bg-weak-100',
              HEADER_HEIGHT,
              MS_ROW_BORDER,
            )}
          >
            <div className='flex min-w-max'>
              {MS_MONTH_COLUMNS.map((column) => {
                const monthBadge = getMsMonthHeaderBadge(column.id);
                return (
                  <div
                    key={column.id}
                    className={cn(
                      'relative flex shrink-0 items-center justify-center px-3 last:border-r-0',
                      MS_MONTH_COL_BORDER,
                      MONTH_WIDTH,
                      HEADER_HEIGHT,
                    )}
                  >
                    <span className='text-label-sm text-text-soft-400'>{column.label}</span>
                    {monthBadge ? (
                      <Badge.Root
                        size='small'
                        variant='filled'
                        color='green'
                        square
                        className='absolute right-2 top-1 min-h-[18px] min-w-[18px] px-1'
                      >
                        {monthBadge}
                      </Badge.Root>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={monthBodyRef}
            onScroll={handleMonthBodyScroll}
            className='min-h-0 flex-1 overflow-auto'
          >
            {displayRows.map((row) => (
              <div
                key={`${row.id}-months`}
                className={cn('flex min-w-max', ROW_HEIGHT, MS_ROW_BORDER)}
              >
                {MS_MONTH_COLUMNS.map((column, index) => {
                  const cell = row.monthCells[index] ?? { type: 'empty' };
                  return (
                    <SchedulerMonthCell
                      key={`${row.id}-${column.id}`}
                      rowId={row.id}
                      monthIndex={index}
                      cell={cell}
                      readOnly={!row.editable}
                      isLastColumn={index === MS_MONTH_COLUMNS.length - 1}
                      className={MONTH_WIDTH}
                      onPlan={() => handlePlanMonth(row, index)}
                      onUnplan={() => handleUnplanMonth(row, index)}
                      onMovePlanned={(_rowId, fromIndex, toIndex) =>
                        handleMovePlannedMonth(row, fromIndex, toIndex)
                      }
                      onPlannedDragStart={handlePlannedDragStart}
                      onPlannedDrag={handlePlannedDrag}
                      onPlannedDragEnd={handlePlannedDragEnd}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <SchedulerPlannedDragPreview
        visible={dragPreview.visible}
        x={dragPreview.x}
        y={dragPreview.y}
      />
    </>
  );
});

MaintenanceSchedulerGrid.displayName = 'MaintenanceSchedulerGrid';

export default MaintenanceSchedulerGrid;
