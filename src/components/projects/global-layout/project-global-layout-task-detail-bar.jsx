import React, { useMemo } from 'react';
import { RiCalendarLine, RiDeleteBinLine, RiEyeLine } from 'react-icons/ri';

import { buildGlobalLayoutAreaSelectOptions } from '@/components/projects/global-layout/project-global-layout-task-create-helpers';
import { getProjectGlobalLayoutTaskIconConfig } from '@/components/projects/global-layout/project-global-layout-task-icons';
import { formatProjectTaskVersionLabel } from '@/components/projects/tasks/project-task-helpers';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import * as Select from '@/components/ui/select';
import { formatDateWithOrdinal, parseToDate } from '@/utils/date-utils';
import { cn } from '@/utils/cn';

function normalizeAssigneeIds(task) {
  const source = task?.assignee ?? task?.assignees ?? [];
  if (!Array.isArray(source)) return [];
  return source
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      return String(entry?.user ?? entry?.email ?? entry?.name ?? '').trim();
    })
    .filter(Boolean);
}

export default function ProjectGlobalLayoutTaskDetailBar({
  task = null,
  floor = null,
  onView,
  onDelete,
  className,
}) {
  const taskType = String(task?.type ?? task?.task_type ?? '').trim();
  const iconConfig = getProjectGlobalLayoutTaskIconConfig(taskType);
  const TaskIcon = iconConfig.icon;

  const areaOptions = useMemo(
    () => buildGlobalLayoutAreaSelectOptions(floor?.areas),
    [floor?.areas],
  );

  const subject = String(task?.subject ?? task?.task_id ?? 'Untitled task').trim();
  const areaId = String(task?.area_id ?? task?.custom_area ?? '').trim();
  const areaLabel =
    String(task?.area_label ?? '').trim() ||
    areaOptions.find((option) => option.value === areaId)?.label ||
    areaId;
  const versionLabel = formatProjectTaskVersionLabel(task);
  const assigneeIds = normalizeAssigneeIds(task);
  const dueDateLabel = formatDateWithOrdinal(
    task?.due_date ?? task?.exp_end_date ?? parseToDate(task?.due_date),
  );

  if (!task) return null;

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-auto items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-regular-md',
        className,
      )}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className='flex size-8 shrink-0 items-center justify-center rounded-lg'
        style={{ backgroundColor: `${iconConfig.color}1A` }}
      >
        <TaskIcon className='size-4 shrink-0' style={{ color: iconConfig.color }} aria-hidden />
      </div>

      <Badge.Root size='small' variant='light' color='green' className='shrink-0'>
        {versionLabel}
      </Badge.Root>

      <p className='max-w-[150px] flex-1 truncate text-label-sm font-medium text-text-strong-950'>
        {subject}
      </p>

      <Select.Root value={areaId || undefined} disabled>
        <Select.Trigger className='h-9 max-w-[150px] rounded-lg border border-stroke-soft-200 bg-bg-white-0'>
          <Select.Value placeholder={areaLabel || 'Area'} />
        </Select.Trigger>
        <Select.Content>
          {areaOptions.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <div className='flex shrink-0 items-center rounded-full border border-stroke-soft-200'>
        <AssigneeMultiSelect
          value={assigneeIds}
          readonly
          maxVisibleAvatars={3}
          size='xsmall'
          variant='borderless'
          placeholder='—'
        />
      </div>

      <div className='inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-stroke-soft-200 px-3 text-paragraph-sm text-text-main-900'>
        <RiCalendarLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
        <span className='whitespace-nowrap'>{dueDateLabel || '—'}</span>
      </div>

      <div className='ml-1 flex shrink-0 items-center gap-1'>
        <CompactButton.Root
          type='button'
          variant='stroke'
          size='large'
          aria-label='View task'
          onClick={() => onView?.(task)}
        >
          <CompactButton.Icon as={RiEyeLine} />
        </CompactButton.Root>
        <CompactButton.Root
          type='button'
          variant='stroke'
          size='large'
          aria-label='Delete task'
          onClick={() => onDelete?.(task)}
        >
          <CompactButton.Icon as={RiDeleteBinLine} />
        </CompactButton.Root>
      </div>
    </div>
  );
}
