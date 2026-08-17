import React, { useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';

import {
  areGlobalLayoutStatusFiltersEqual,
  buildGlobalLayoutSelectAllStatusFilters,
  countGlobalLayoutStatusSelections,
  getGlobalLayoutStatusSelectAllState,
  toggleGlobalLayoutStatusFilter,
} from '@/components/projects/global-layout/project-global-layout-status-filter-helpers';
import { useGlobalLayoutStatusFilterGroups } from '@/components/projects/global-layout/use-global-layout-status-filter-groups';
import { getProjectGlobalLayoutTabConfig } from '@/components/projects/global-layout/project-global-layout-task-icons';
import * as Checkbox from '@/components/ui/checkbox';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

export default function ProjectGlobalLayoutStatusFilter({
  activeTabId = 'all',
  statusFiltersByTaskType = {},
  onStatusFiltersApply,
  disabled = false,
}) {
  const { groups, loading } = useGlobalLayoutStatusFilterGroups();
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(statusFiltersByTaskType);
  const [expandedGroupIds, setExpandedGroupIds] = useState(['tasks']);

  const activeTab = useMemo(() => getProjectGlobalLayoutTabConfig(activeTabId), [activeTabId]);
  const displayFilters = open ? draftFilters : statusFiltersByTaskType;
  const selectionCount = countGlobalLayoutStatusSelections(displayFilters);
  const selectAllState = getGlobalLayoutStatusSelectAllState(
    displayFilters,
    groups,
    activeTab.taskType,
  );

  useEffect(() => {
    if (!open) return;
    setDraftFilters(statusFiltersByTaskType);
  }, [open, statusFiltersByTaskType]);

  useEffect(() => {
    if (!open) return;
    const activeGroup = groups.find((group) => group.id === activeTabId);
    if (activeGroup) {
      setExpandedGroupIds((previous) =>
        previous.includes(activeGroup.id) ? previous : [activeGroup.id, ...previous],
      );
    }
  }, [activeTabId, groups, open]);

  const triggerLabel = selectionCount > 0 ? `${selectionCount} selected` : 'All Status';

  const handleOpenChange = (nextOpen) => {
    if (
      open &&
      !nextOpen &&
      !areGlobalLayoutStatusFiltersEqual(draftFilters, statusFiltersByTaskType)
    ) {
      onStatusFiltersApply?.(draftFilters);
    }
    setOpen(nextOpen);
  };

  const handleSelectAllToggle = (checked) => {
    setDraftFilters(
      checked ? buildGlobalLayoutSelectAllStatusFilters(groups, activeTab.taskType) : {},
    );
  };

  const handleExpandAll = () => {
    setExpandedGroupIds(groups.map((group) => group.id));
  };

  const handleToggleGroup = (groupId) => {
    setExpandedGroupIds((previous) =>
      previous.includes(groupId) ? previous.filter((id) => id !== groupId) : [...previous, groupId],
    );
  };

  const handleStatusToggle = (taskType, status, checked) => {
    setDraftFilters((previous) =>
      toggleGlobalLayoutStatusFilter(previous, taskType, status, checked, activeTab.taskType),
    );
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          className={cn(
            'ml-auto inline-flex h-12 shrink-0 items-center gap-1 px-3 text-label-sm transition',
            selectionCount > 0
              ? 'text-text-main-900'
              : 'text-text-sub-500 hover:text-text-main-900',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {triggerLabel}
          <RiArrowDownSLine className='size-4 shrink-0' />
        </button>
      </Popover.Trigger>
      <Popover.Content align='end' sideOffset={8} className='w-[280px] rounded-2xl p-0'>
        <div className='border-b border-stroke-soft-200 px-4 py-3'>
          <div className='flex items-center justify-between gap-3'>
            <label className='flex min-w-0 flex-1 items-center gap-2.5'>
              <Checkbox.Root
                checked={
                  selectAllState === 'checked'
                    ? true
                    : selectAllState === 'indeterminate'
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={(value) => handleSelectAllToggle(value === true)}
              />
              <span className='text-label-sm font-medium text-text-main-900'>Select All</span>
            </label>
            <button
              type='button'
              className='shrink-0 text-label-sm font-medium text-success-base underline'
              onClick={handleExpandAll}
            >
              Expand All
            </button>
          </div>
        </div>

        <div className='max-h-[360px] overflow-y-auto py-1'>
          {loading && groups.every((group) => (group.statuses ?? []).length === 0) ? (
            <p className='px-4 py-6 text-center text-paragraph-sm text-text-sub-500'>
              Loading statuses…
            </p>
          ) : null}

          {groups.map((group) => {
            const isExpanded = expandedGroupIds.includes(group.id);
            const selectedStatuses = displayFilters[group.taskType] ?? [];
            const isTypedTab = Boolean(activeTab.taskType);
            const isActiveTaskTypeGroup = !isTypedTab || activeTab.taskType === group.taskType;
            const statuses = group.statuses ?? [];

            return (
              <div key={group.id} className='px-2'>
                <button
                  type='button'
                  className='flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-label-xs font-medium tracking-wide text-text-soft-400 transition hover:bg-bg-weak-50'
                  onClick={() => handleToggleGroup(group.id)}
                >
                  <span>{group.label}</span>
                  {isExpanded ? (
                    <RiArrowDownSLine className='size-4 shrink-0' />
                  ) : (
                    <RiArrowRightSLine className='size-4 shrink-0' />
                  )}
                </button>

                {isExpanded
                  ? statuses.map((status) => {
                      const isChecked = selectedStatuses.includes(status.value);
                      return (
                        <label
                          key={`${group.taskType}-${status.value}`}
                          className={cn(
                            'mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 transition hover:bg-bg-weak-50',
                            isChecked && 'bg-bg-weak-50',
                            !isActiveTaskTypeGroup && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <Checkbox.Root
                            checked={isChecked}
                            disabled={!isActiveTaskTypeGroup}
                            onCheckedChange={(value) => {
                              if (!isActiveTaskTypeGroup) return;
                              handleStatusToggle(group.taskType, status.value, value === true);
                            }}
                          />
                          <span
                            className='size-2.5 shrink-0 rounded-full'
                            style={{ backgroundColor: status.dotColor }}
                            aria-hidden
                          />
                          <span className='text-label-sm text-text-main-900'>{status.label}</span>
                        </label>
                      );
                    })
                  : null}
              </div>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
