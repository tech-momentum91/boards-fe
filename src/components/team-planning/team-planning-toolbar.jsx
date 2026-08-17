import React, { useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine, RiSettings3Line } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Dropdown from '@/components/ui/dropdown';
import * as SegmentedControl from '@/components/ui/segmented-control';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { selectVariants } from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { VIEW_BY_OPTIONS } from './constants';

const ALL_OPTION = { value: 'all', label: 'All' };

const normalizeDepartmentSelection = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => item && item !== 'all');
  }
  if (!value || value === 'all') return [];
  return [value];
};

const BenchDepartmentMultiSelect = ({ options = [], value = [], onValueChange, minWidth }) => {
  const [open, setOpen] = useState(false);
  const departmentValues = useMemo(
    () => options.map((option) => option.value).filter((item) => item && item !== 'all'),
    [options],
  );
  const selected = useMemo(() => normalizeDepartmentSelection(value), [value]);
  const allSelected =
    departmentValues.length > 0 && departmentValues.every((item) => selected.includes(item));

  const { triggerRoot, triggerArrow } = selectVariants({ size: 'small', variant: 'compact' });

  const triggerLabel = useMemo(() => {
    if (allSelected || selected.length === 0) return 'All Departments';
    if (selected.length === 1) {
      return options.find((option) => option.value === selected[0])?.label || selected[0];
    }
    return `${selected.length} Departments`;
  }, [allSelected, selected, options]);

  const handleToggleAll = () => {
    if (allSelected) {
      onValueChange?.([]);
      return;
    }
    onValueChange?.(departmentValues);
  };

  const handleToggle = (optionValue) => {
    if (selected.includes(optionValue)) {
      onValueChange?.(selected.filter((item) => item !== optionValue));
      return;
    }
    onValueChange?.([...selected, optionValue]);
  };

  return (
    <Dropdown.Root open={open} onOpenChange={setOpen}>
      <Dropdown.Trigger asChild>
        <button type='button' className={cn(triggerRoot(), 'shrink-0', minWidth)}>
          <span className='min-w-0 flex-1 truncate text-left'>{triggerLabel}</span>
          <RiArrowDownSLine className={cn(triggerArrow(), open && 'rotate-180')} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content align='end' className='min-w-[180px] p-1' sideOffset={8}>
        <button
          type='button'
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-paragraph-sm transition hover:bg-bg-weak-50',
            allSelected && 'bg-bg-weak-50',
          )}
          onClick={(event) => {
            event.preventDefault();
            handleToggleAll();
          }}
        >
          <span className='min-w-0 flex-1 truncate'>All</span>
          {allSelected ? <RiCheckLine className='size-4 shrink-0 text-text-sub-500' /> : null}
        </button>
        {departmentValues.map((optionValue) => {
          const option = options.find((item) => item.value === optionValue);
          const checked = selected.includes(optionValue);
          return (
            <button
              key={optionValue}
              type='button'
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-paragraph-sm transition hover:bg-bg-weak-50',
                checked && 'bg-bg-weak-50',
              )}
              onClick={(event) => {
                event.preventDefault();
                handleToggle(optionValue);
              }}
            >
              <span className='min-w-0 flex-1 truncate'>{option?.label || optionValue}</span>
              {checked ? <RiCheckLine className='size-4 shrink-0 text-text-sub-500' /> : null}
            </button>
          );
        })}
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

const ViewByTabs = ({ value, onValueChange }) => (
  <SegmentedControl.Root value={value || 'departments'} onValueChange={onValueChange}>
    <SegmentedControl.List className='w-auto shrink-0 gap-1'>
      {VIEW_BY_OPTIONS.map((tab) => (
        <SegmentedControl.Trigger
          key={tab.value}
          value={tab.value}
          className='h-8 min-w-[108px] px-3'
        >
          {tab.label}
        </SegmentedControl.Trigger>
      ))}
    </SegmentedControl.List>
    {VIEW_BY_OPTIONS.map((tab) => (
      <SegmentedControl.Content key={tab.value} value={tab.value} className='sr-only'>
        {tab.label}
      </SegmentedControl.Content>
    ))}
  </SegmentedControl.Root>
);

const TeamPlanningToolbar = ({
  filters,
  filterOptions = {},
  onSearchChange,
  onMemberChange,
  onDepartmentChange,
  onProjectChange,
  onViewByChange,
  onOpenWeeklyPriority,
}) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const isBench = filters.view_mode === 'bench';
  const isWeekly = filters.view_mode === 'weekly_allocation';

  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  const memberOptions = useMemo(
    () => [
      { value: 'all', label: 'All Members' },
      ...(filterOptions.members || []).map((item) => ({ value: item.id, label: item.label })),
    ],
    [filterOptions.members],
  );

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All Departments' },
      ...(filterOptions.departments || []).map((item) => ({ value: item, label: item })),
    ],
    [filterOptions.departments],
  );

  const benchDepartmentOptions = useMemo(
    () => (filterOptions.departments || []).map((item) => ({ value: item, label: item })),
    [filterOptions.departments],
  );

  const projectOptions = useMemo(
    () => [
      { value: 'all', label: 'All Projects' },
      ...(filterOptions.projects || []).map((item) => ({ value: item.id, label: item.label })),
    ],
    [filterOptions.projects],
  );

  return (
    <div className='flex items-center justify-between gap-4'>
      <Input.Root className='w-[300px] shrink-0'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder={isBench ? 'Search by name' : 'Search by name, role'}
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value);
              onSearchChange?.(event.target.value);
            }}
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex shrink-0 items-center gap-4'>
        {isBench ? (
          <BenchDepartmentMultiSelect
            options={benchDepartmentOptions}
            value={filters.department}
            onValueChange={onDepartmentChange}
            minWidth='min-w-[146px]'
          />
        ) : (
          <>
            <FilterSelect
              value={filters.member || ALL_OPTION.value}
              options={memberOptions}
              onValueChange={onMemberChange}
              minWidth='min-w-[122px]'
            />
            <FilterSelect
              value={
                Array.isArray(filters.department)
                  ? filters.department[0] || ALL_OPTION.value
                  : filters.department || ALL_OPTION.value
              }
              options={departmentOptions}
              onValueChange={onDepartmentChange}
              minWidth='min-w-[146px]'
            />
            <FilterSelect
              value={filters.project || ALL_OPTION.value}
              options={projectOptions}
              onValueChange={onProjectChange}
              minWidth='min-w-[113px]'
            />
            <ViewByTabs value={filters.view_by || 'departments'} onValueChange={onViewByChange} />
            {isWeekly ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <CompactButton.Root
                    type='button'
                    variant='stroke'
                    size='medium'
                    className='size-8'
                    aria-label='Set Project Priority'
                    onClick={onOpenWeeklyPriority}
                  >
                    <CompactButton.Icon as={RiSettings3Line} />
                  </CompactButton.Root>
                </Tooltip.Trigger>
                <Tooltip.Content variant='dark' size='xsmall'>
                  Set Project Priority
                </Tooltip.Content>
              </Tooltip.Root>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

const FilterSelect = ({ value, options, onValueChange, minWidth }) => (
  <Select.Root value={value} onValueChange={onValueChange} size='small' variant='compact'>
    <Select.Trigger className={cn('shrink-0', minWidth)}>
      <Select.Value />
    </Select.Trigger>
    <Select.Content>
      {options.map((option) => (
        <Select.Item key={option.value} value={option.value}>
          {option.label}
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Root>
);

export default TeamPlanningToolbar;
