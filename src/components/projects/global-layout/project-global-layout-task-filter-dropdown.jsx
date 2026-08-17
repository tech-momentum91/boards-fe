import React from 'react';
import { RiArrowDownSLine, RiFilter3Line } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import {
  PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER,
  buildProjectGlobalLayoutTaskFilterOptions,
} from '@/components/projects/global-layout/project-global-layout-task-icons';
import { cn } from '@/utils/cn';

export default function ProjectGlobalLayoutTaskFilterDropdown({
  value = '',
  onChange,
  discoveredTaskTypes = [],
  disabled = false,
}) {
  const options = buildProjectGlobalLayoutTaskFilterOptions(discoveredTaskTypes);
  const selectedConfig = value
    ? (options.find((option) => option.taskType === value) ??
      PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER)
    : PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER;
  const SelectedIcon = selectedConfig.icon;
  const AllTasksIcon = PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER.icon;

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          disabled={disabled}
          className='gap-2'
        >
          <RiFilter3Line className='size-4 shrink-0' />
          <SelectedIcon className='size-4 shrink-0' style={{ color: selectedConfig.color }} />
          <span className='max-w-[140px] truncate'>{selectedConfig.label}</span>
          <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
        </Button.Root>
      </Dropdown.Trigger>
      <Dropdown.Content align='end' sideOffset={8} className='w-[240px] p-2'>
        <button
          type='button'
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-paragraph-sm transition hover:bg-bg-weak-50',
            !value && 'bg-bg-weak-50 text-text-main-900',
          )}
          onClick={() => onChange?.('')}
        >
          <AllTasksIcon className='size-4 shrink-0 text-text-sub-500' />
          <span>{PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER.label}</span>
        </button>
        <div className='my-1 h-px bg-stroke-soft-200' />
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.taskType}
              type='button'
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-paragraph-sm transition hover:bg-bg-weak-50',
                value === option.taskType && 'bg-bg-weak-50 text-text-main-900',
              )}
              onClick={() => onChange?.(option.taskType)}
            >
              <Icon className='size-4 shrink-0' style={{ color: option.color }} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
