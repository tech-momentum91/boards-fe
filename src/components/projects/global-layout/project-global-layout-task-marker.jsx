import React from 'react';

import { getProjectGlobalLayoutTaskIconConfig } from '@/components/projects/global-layout/project-global-layout-task-icons';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const TASK_MARKER_ICON_SIZE = 28;
export const GLOBAL_LAYOUT_TASK_MARKER_BASE_SIZE = TASK_MARKER_ICON_SIZE;
export const GLOBAL_LAYOUT_TASK_MARKER_MIN_SIZE = 22;
export const GLOBAL_LAYOUT_TASK_MARKER_MAX_SIZE = 74;

/** Matches Tailwind `size-8` used by the marker icon. */
const GLOBAL_LAYOUT_TASK_MARKER_VISUAL_SIZE = 32;

/** Matches Tailwind `size-14` highlight ring diameter. */
const GLOBAL_LAYOUT_TASK_MARKER_HIGHLIGHT_VISUAL_SIZE = 56;

/**
 * Counter-scale task markers against canvas zoom so icons grow when zoomed out
 * and shrink when zoomed in (Google Maps pin behavior), clamped to min/max size.
 *
 * @param {number} canvasScale
 * @returns {number}
 */
export function resolveGlobalLayoutMarkerInverseScale(canvasScale = 1) {
  const safeScale =
    typeof canvasScale === 'number' && Number.isFinite(canvasScale) && canvasScale > 0
      ? canvasScale
      : 1;

  const rawInverse = 1 / safeScale;
  const minInverse = GLOBAL_LAYOUT_TASK_MARKER_MIN_SIZE / GLOBAL_LAYOUT_TASK_MARKER_BASE_SIZE;
  const maxInverse = GLOBAL_LAYOUT_TASK_MARKER_MAX_SIZE / GLOBAL_LAYOUT_TASK_MARKER_BASE_SIZE;

  return Math.min(maxInverse, Math.max(minInverse, rawInverse));
}

/**
 * Hit radius in image pixels so Konva click targets match the CSS-scaled marker icon.
 *
 * @param {number} canvasScale
 * @param {{ highlighted?: boolean }} [options]
 * @returns {number}
 */
export function resolveGlobalLayoutMarkerHitRadius(canvasScale = 1, { highlighted = false } = {}) {
  const inverseScale = resolveGlobalLayoutMarkerInverseScale(canvasScale);
  const visualSize = highlighted
    ? GLOBAL_LAYOUT_TASK_MARKER_HIGHLIGHT_VISUAL_SIZE
    : GLOBAL_LAYOUT_TASK_MARKER_VISUAL_SIZE;

  const radius = (visualSize * inverseScale) / 2;
  return Math.max(14, Math.ceil(radius * 1.08));
}

export function ProjectGlobalLayoutTaskMarkerIcon({
  taskType,
  highlighted = false,
  className,
  canvasScale = 1,
}) {
  const config = getProjectGlobalLayoutTaskIconConfig(taskType);
  const Icon = config.icon;
  const markerScale = resolveGlobalLayoutMarkerInverseScale(canvasScale);
  const shouldScaleMarker = Math.abs(markerScale - 1) >= 0.02;

  return (
    <div
      className={cn('pointer-events-none relative h-0 w-0', className)}
      style={
        shouldScaleMarker
          ? {
              transform: `scale(${markerScale})`,
              transformOrigin: 'bottom center',
            }
          : undefined
      }
    >
      {highlighted ? (
        <>
          <span
            className='absolute bottom-0   left-1/2 size-18 -translate-x-1/2 translate-y-[8%] rounded-full blur-lg'
            style={{
              background: `radial-gradient(circle, ${config.color}CC 0%, ${config.color}33 75%, transparent 72%)`,
            }}
            aria-hidden
          />
          <span
            className='absolute bottom-0 left-1/2 flex size-14 -translate-x-1/2 translate-y-[18%] items-center justify-center rounded-full border border-white/90 shadow-regular-md'
            style={{
              background: `linear-gradient(145deg, ${config.color} 5%, color-mix(in srgb, ${config.color} 92%, white) 52%, white 100%)`,
            }}
            aria-hidden
          />
        </>
      ) : null}
      <Icon
        size={TASK_MARKER_ICON_SIZE}
        color={highlighted ? '#ffffff' : config.color}
        className={cn(
          'absolute bottom-0 left-1/2 -translate-x-1/2 size-8',
          highlighted ? 'z-10 drop-shadow-md' : 'drop-shadow-sm',
        )}
        aria-hidden
      />
    </div>
  );
}

function taskStatusBadgeColor(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('complete') || normalized.includes('closed')) return 'green';
  if (normalized.includes('progress')) return 'blue';
  if (normalized.includes('pending') || normalized.includes('open')) return 'orange';
  return 'gray';
}

function formatAssigneeLabel(assignee) {
  if (!assignee) return '';
  if (typeof assignee === 'string') return assignee;
  return String(
    assignee.full_name ?? assignee.name ?? assignee.user ?? assignee.email ?? assignee,
  ).trim();
}

function TaskAssigneeList({ assignees = [] }) {
  const list = Array.isArray(assignees) ? assignees : [];
  if (list.length === 0) {
    return <span className='text-text-sub-500'>—</span>;
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {list.map((assignee, index) => {
        const label = formatAssigneeLabel(assignee);
        const key = typeof assignee === 'string' ? assignee : String(assignee?.user ?? index);
        return (
          <div key={key} className='flex items-center gap-1.5'>
            <Avatar.Root size='24' color='gray'>
              {label.slice(0, 1).toUpperCase()}
            </Avatar.Root>
            <span className='text-text-main-900'>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectGlobalLayoutTaskInfoContent({ task }) {
  if (!task) return null;

  const subject = String(task.subject ?? task.task_id ?? 'Untitled task').trim();
  const taskType = String(task.type ?? task.task_type ?? 'Task').trim();
  const status = String(task.status ?? '—').trim();
  const areaLabel = String(task.area_label ?? task.area_id ?? '—').trim();
  const areaType = String(task.area_type ?? '—').trim();
  const priority = String(task.priority ?? '—').trim();
  const dueDate = String(task.due_date ?? task.exp_end_date ?? '—').trim();
  const taskId = String(task.task_id ?? task.name ?? '—').trim();
  const assignees = task.assignee ?? task.assignees ?? [];

  return (
    <div className='space-y-3'>
      <Badge.Root size='small' variant='light' color={taskStatusBadgeColor(status)}>
        {status.toUpperCase()}
      </Badge.Root>

      <h3 className='text-title-h6 text-text-main-900'>{subject}</h3>

      <dl className='space-y-2 text-paragraph-sm text-text-sub-500'>
        <div className='flex justify-between gap-3'>
          <dt>Task ID</dt>
          <dd className='text-text-main-900'>{taskId}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt>Type</dt>
          <dd className='text-text-main-900'>{taskType}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt>Area</dt>
          <dd className='text-text-main-900'>{areaLabel}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt>Area type</dt>
          <dd className='text-text-main-900'>{areaType}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt>Priority</dt>
          <dd className='text-text-main-900'>{priority}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt>Due</dt>
          <dd className='text-text-main-900'>{dueDate}</dd>
        </div>
        <div className='space-y-1'>
          <dt>Assignees</dt>
          <dd>
            <TaskAssigneeList assignees={assignees} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function ProjectGlobalLayoutTaskMarkerPopover({
  annotation,
  open = false,
  onOpenChange,
  anchorStyle,
}) {
  if (!annotation?.task) return null;

  const subject = String(annotation.task.subject ?? annotation.task.task_id ?? 'Task').trim();

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {anchorStyle ? (
        <Popover.Anchor asChild>
          <div style={anchorStyle} className='pointer-events-none size-0' aria-hidden />
        </Popover.Anchor>
      ) : (
        <Popover.Trigger asChild>
          <button
            type='button'
            className='flex size-8 cursor-pointer items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0/95 shadow-regular-xs'
            aria-label={`View task ${subject}`}
          />
        </Popover.Trigger>
      )}
      <Popover.Content align='center' side='right' className='w-[300px] p-4'>
        <ProjectGlobalLayoutTaskInfoContent task={annotation.task} />
      </Popover.Content>
    </Popover.Root>
  );
}
