import React, { useState, useRef, useCallback } from 'react';
import { RiSearchLine, RiLayoutColumnLine, RiTaskLine } from 'react-icons/ri';
import { ProgressIcon } from '@/components/ticket-management/status-dropdown';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import CrmTasksFilterDropdown from '@/components/crm-tasks/crm-tasks-filter-dropdown';

const CpContactTasksToolbar = ({
  search,
  onSearchChange,
  onAddTask,
  tableRef,
  completedCount = 0,
  totalCount = 0,
  appliedFilters = { type: [], priority: [], status: [] },
  onFiltersChange,
  taskTypeOptions = [],
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);

  const handleClearAllTaskFilters = useCallback(
    (e) => {
      e.stopPropagation();
      onFiltersChange?.({ type: [], priority: [], status: [] });
      setFilterCount(0);
      setIsFilterDropdownOpen(false);
    },
    [onFiltersChange],
  );

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex items-center gap-3 flex-1 max-w-md'>
        <div className='flex items-center gap-2 shrink-0'>
          <RiTaskLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
          <span className='label-medium text-text-sub-500'>Tasks</span>
        </div>
        {/* <div className='flex items-center gap-2 overflow-hidden rounded-[6px] bg-[var(--color-yellow-100)] pl-[4px]'>
          <div className='flex items-center gap-1 shrink-0 py-[2px]'>
            <span className='flex shrink-0 items-center justify-center p-[1.8px]' aria-hidden>
              <ProgressIcon
                percent={progressPercent}
                className='size-[14.4px] text-[var(--color-yellow-900)]'
                aria-hidden
              />
            </span>
            <span className='label-small shrink-0 whitespace-nowrap text-[var(--color-yellow-900)]'>
              {progressPercent}%
            </span>
          </div>
          <div className='flex shrink-0 items-center justify-center border-l border-solid border-[rgba(105,61,17,0.2)] px-2 py-0.5'>
            <span className='paragraph-small shrink-0 whitespace-nowrap text-[var(--color-yellow-900)]'>
              {completedCount}/{totalCount} Completed
            </span>
          </div>
        </div> */}
      </div>
      <div className='flex items-center gap-2'>
        <Input.Root>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine className='size-4 text-text-soft-400' />
            </Input.Icon>
            <Input.Input
              placeholder='Search by subject, status'
              value={search || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>

        <Popover.Root
          open={isFilterDropdownOpen}
          onOpenChange={(open) => {
            const wasOpen = isFilterDropdownOpen;
            setIsFilterDropdownOpen(open);
            if (wasOpen && !open && filterDropdownRef.current) {
              filterDropdownRef.current.handleClose();
            }
          }}
        >
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={handleClearAllTaskFilters}
            tooltipContent='Filter'
            ariaLabel='Filter tasks'
          />
          <CrmTasksFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onOpenChange={setIsFilterDropdownOpen}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            taskTypeOptions={taskTypeOptions}
          />
        </Popover.Root>

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={tableRef?.current?.columnConfigHook}
          tooltipContent={<p>Column Manager</p>}
          trigger={
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-1'
              aria-label='Columns'
            >
              <Button.Icon>
                <RiLayoutColumnLine size={20} />
              </Button.Icon>
            </Button.Root>
          }
        />

        <Button.Root
          variant='primary'
          mode='filled'
          size='small'
          className='gap-1.5'
          onClick={onAddTask}
        >
          <span>+ Add Task</span>
        </Button.Root>
      </div>
    </header>
  );
};

export default CpContactTasksToolbar;
