import React, { memo, useCallback, useState } from 'react';

import {
  SchedulerMonthCellIcon,
  SchedulerPlannedBadge,
} from '@/components/aum/maintenance-scheduler/scheduler-cell-icon';
import { MS_MONTH_DRAG_MIME } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';
import { cn } from '@/utils/cn';

const SchedulerMonthCell = memo(
  ({
    rowId,
    monthIndex,
    cell,
    onPlan,
    onUnplan,
    onMovePlanned,
    onPlannedDragStart,
    onPlannedDrag,
    onPlannedDragEnd,
    isLastColumn = false,
    className,
    readOnly = false,
  }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const cellType = cell.type === 'partial' ? 'add' : cell.type;
    const isPlanned = cellType === 'planned';
    const isDropTarget = cellType === 'add';

    const handleAddClick = useCallback(() => {
      if (readOnly || !isDropTarget) return;
      onPlan?.(rowId, monthIndex);
    }, [isDropTarget, monthIndex, onPlan, readOnly, rowId]);

    const handleRemovePlanned = useCallback(
      (event) => {
        if (readOnly) return;
        event.stopPropagation();
        onUnplan?.(rowId, monthIndex);
      },
      [monthIndex, onUnplan, readOnly, rowId],
    );

    const handleDragStart = useCallback(
      (event) => {
        if (readOnly || !isPlanned) return;

        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(
          MS_MONTH_DRAG_MIME,
          JSON.stringify({ rowId, monthIndex, state: 'planned' }),
        );
        onPlannedDragStart?.({ rowId, monthIndex, x: event.clientX, y: event.clientY });
      },
      [isPlanned, monthIndex, onPlannedDragStart, readOnly, rowId],
    );

    const handleDrag = useCallback(
      (event) => {
        if (readOnly || !isPlanned) return;
        if (event.clientX === 0 && event.clientY === 0) return;
        onPlannedDrag?.({ x: event.clientX, y: event.clientY });
      },
      [isPlanned, onPlannedDrag, readOnly],
    );

    const handleDragEnd = useCallback(
      (event) => {
        if (readOnly) return;
        event.stopPropagation();
        onPlannedDragEnd?.();
      },
      [onPlannedDragEnd, readOnly],
    );

    const handleDragOver = useCallback(
      (event) => {
        if (readOnly || !isDropTarget) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      },
      [isDropTarget, readOnly],
    );

    const handleDragLeave = useCallback(() => {
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);

        if (readOnly || !isDropTarget) return;

        const raw = event.dataTransfer.getData(MS_MONTH_DRAG_MIME);
        if (!raw) return;

        try {
          const payload = JSON.parse(raw);
          if (payload.rowId !== rowId) return;
          if (payload.monthIndex === monthIndex) return;
          if (payload.state !== 'planned') return;
          onMovePlanned?.(rowId, payload.monthIndex, monthIndex);
        } catch {
          // Ignore malformed drag payloads.
        }
      },
      [isDropTarget, monthIndex, onMovePlanned, readOnly, rowId],
    );

    const isDragOverTarget = isDragOver && isDropTarget && !readOnly;

    return (
      <div
        className={cn(
          'flex w-full shrink-0 items-center justify-center overflow-visible border-r border-dashed border-stroke-soft-200 p-3',
          isLastColumn && 'border-r-0',
          isPlanned && !readOnly && 'cursor-grab active:cursor-grabbing',
          isDragOverTarget && 'bg-primary-lighter/30 ring-1 ring-primary-base',
          className,
        )}
        draggable={isPlanned && !readOnly}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isPlanned ? (
          <SchedulerPlannedBadge onRemove={readOnly ? undefined : handleRemovePlanned} />
        ) : isDropTarget && !readOnly ? (
          <button
            type='button'
            onClick={handleAddClick}
            className='inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-80'
            aria-label='Schedule maintenance for this month'
          >
            <SchedulerMonthCellIcon />
          </button>
        ) : null}
      </div>
    );
  },
);

SchedulerMonthCell.displayName = 'SchedulerMonthCell';

export default SchedulerMonthCell;
