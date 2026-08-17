import React, { useMemo } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import * as Checkbox from '@/components/ui/checkbox';
import * as Filter from '@/components/ui/filter';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import {
  PROJECT_MASTER_FILTER_OPTIONS,
  PROJECT_MASTER_GROUP_VALUE_FIELD_MAP,
} from '@/pages/profile/project-master/project-master.constants';
import { TASK_MASTER_FILTER_ALL } from '@/pages/profile/project-master/project-master-helpers';
import { cn } from '@/utils/cn';

export function ProjectMasterGroupValueFilter({ groupBy, value, onChange }) {
  const config = PROJECT_MASTER_GROUP_VALUE_FIELD_MAP[groupBy];
  if (!groupBy || !config) return null;

  const options = PROJECT_MASTER_FILTER_OPTIONS[config.filterKey] ?? [];

  return (
    <Select.Root size='xsmall' value={value} onValueChange={onChange}>
      <Select.Trigger className='w-[128px]'>
        <Select.Value placeholder={config.allLabel} />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value={TASK_MASTER_FILTER_ALL}>{config.allLabel}</Select.Item>
        {options.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

export default function ProjectMasterFilterPopover({
  filterSections = [],
  selectedFilters,
  onSelectedFiltersChange,
  activeSection,
  onActiveSectionChange,
  ariaLabel = 'Filter items',
}) {
  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters ?? {}).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const activeSectionOptions = PROJECT_MASTER_FILTER_OPTIONS[activeSection] ?? [];

  const toggleFilterOption = (section, optionValue) => {
    onSelectedFiltersChange?.((previous) => {
      const current = previous?.[section] ?? [];
      const nextValues = current.includes(optionValue)
        ? current.filter((value) => value !== optionValue)
        : [...current, optionValue];
      return { ...previous, [section]: nextValues };
    });
  };

  const clearAllFilters = () => {
    onSelectedFiltersChange?.(
      filterSections.reduce((accumulator, section) => {
        accumulator[section.id] = [];
        return accumulator;
      }, {}),
    );
  };

  return (
    <Popover.Root>
      <Filter.TriggerButton
        filterCount={totalFilterCount}
        tooltipContent='Filters'
        ariaLabel={ariaLabel}
        size='xsmall'
        onClear={(event) => {
          event.preventDefault();
          event.stopPropagation();
          clearAllFilters();
        }}
      />
      <Filter.Root align='end' sideOffset={8} showArrow={false} className='w-[520px]'>
        <Filter.Header onClear={clearAllFilters} />
        <Filter.Body className='h-[220px]'>
          <Filter.Sidebar width='120px' className='p-2'>
            {filterSections.map((section) => (
              <Filter.SidebarItem
                key={section.id}
                isActive={activeSection === section.id}
                onClick={() => onActiveSectionChange?.(section.id)}
                count={selectedFilters?.[section.id]?.length ?? 0}
                icon={RiArrowRightSLine}
              >
                {section.label}
              </Filter.SidebarItem>
            ))}
          </Filter.Sidebar>
          <Filter.Content width='400px' className='p-2'>
            <div className='flex flex-col gap-1 overflow-y-auto'>
              {activeSectionOptions.map((option) => {
                const checked = (selectedFilters?.[activeSection] ?? []).includes(option.value);
                return (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => toggleFilterOption(activeSection, option.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm transition',
                      'text-text-main-900 hover:bg-bg-weak-50',
                    )}
                  >
                    <Checkbox.Root
                      size='medium'
                      checked={checked}
                      onCheckedChange={() => toggleFilterOption(activeSection, option.value)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    </Popover.Root>
  );
}
