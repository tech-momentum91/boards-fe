import React, { useMemo, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@/components/client-onboarding/constants';
import {
  TASK_FILTER_TABS,
  RECURRING_FREQUENCY_OPTIONS,
} from '@/components/clients-management/constants';

const ClientTaskMasterFilterPopover = ({
  tabConfig,
  appliedFilters,
  onAppliedFiltersChange,
  tagOptions = [],
  filterCount = 0,
  tooltipContent = 'Filter',
  ariaLabel = 'Filter tasks',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(tabConfig[0]?.value || TASK_FILTER_TABS.STATUS);
  const [stagedFilters, setStagedFilters] = useState(appliedFilters);
  const [filterSearch, setFilterSearch] = useState('');

  const handleOpenChange = (open) => {
    if (!open) {
      onAppliedFiltersChange(stagedFilters);
    } else {
      setStagedFilters(appliedFilters);
    }
    setIsOpen(open);
  };

  const handleToggleFilter = (value) => {
    setStagedFilters((prev) => {
      const current = prev[activeTab] || [];
      const isSelected = current.includes(value);
      return {
        ...prev,
        [activeTab]: isSelected ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const handleClearFilters = () => {
    const cleared = { status: [], priority: [], tags: [], recurring: [] };
    setStagedFilters(cleared);
    onAppliedFiltersChange(cleared);
    setFilterSearch('');
    setIsOpen(false);
  };

  const currentFilterOptions = useMemo(() => {
    let options = [];
    if (activeTab === TASK_FILTER_TABS.STATUS) {
      options = TASK_STATUS_OPTIONS;
    } else if (activeTab === TASK_FILTER_TABS.PRIORITY) {
      options = TASK_PRIORITY_OPTIONS;
    } else if (activeTab === TASK_FILTER_TABS.RECURRING) {
      options = RECURRING_FREQUENCY_OPTIONS;
    } else if (activeTab === TASK_FILTER_TABS.TAGS) {
      options = tagOptions;
    }

    if (filterSearch.trim()) {
      const needle = filterSearch.toLowerCase();
      options = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
      );
    }
    return options;
  }, [activeTab, filterSearch, tagOptions]);

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Filter.TriggerButton
        filterCount={filterCount}
        onClear={(e) => {
          e.stopPropagation();
          handleClearFilters();
        }}
        tooltipContent={tooltipContent}
        ariaLabel={ariaLabel}
      />
      <Filter.Root>
        <Filter.Header title='FILTERS' onClear={handleClearFilters} />
        <Filter.Body>
          <Filter.Sidebar width='160px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {tabConfig.map((tab) => {
                  const count = stagedFilters[tab.value]?.length || 0;
                  return (
                    <TabMenuVertical.Trigger
                      key={tab.value}
                      value={tab.value}
                      className='w-full flex items-center justify-between'
                    >
                      {tab.label}
                      {count > 0 ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black text-white'
                        >
                          {count}
                        </Badge.Root>
                      ) : (
                        <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                      )}
                    </TabMenuVertical.Trigger>
                  );
                })}
              </TabMenuVertical.List>
            </TabMenuVertical.Root>
          </Filter.Sidebar>
          <Filter.Content width='240px'>
            <Filter.List
              options={currentFilterOptions}
              selectedValues={stagedFilters[activeTab] || []}
              onToggle={handleToggleFilter}
              searchValue={filterSearch}
              onSearchChange={setFilterSearch}
              emptyMessage={`No ${activeTab} found`}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    </Popover.Root>
  );
};

export default ClientTaskMasterFilterPopover;
