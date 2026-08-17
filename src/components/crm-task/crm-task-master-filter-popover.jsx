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
  CRM_TASK_MASTER_FILTER_TABS,
  CRM_TASK_MASTER_FILTER_TAB_CONFIG,
  CRM_TASK_MASTER_DEPARTMENT_OPTIONS,
  CRM_TASK_MASTER_FILTER_OPTION,
  normalizeCrmTaskTypeOptions,
} from '@/components/crm-task/crm-task-master-constants';

const CrmTaskMasterFilterPopover = ({
  appliedFilters,
  onAppliedFiltersChange,
  taskTypeOptions = [],
  filterCount = 0,
  tooltipContent = 'Filter',
  ariaLabel = 'Filter tasks',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(CRM_TASK_MASTER_FILTER_TABS.DEPARTMENT);
  const [stagedFilters, setStagedFilters] = useState(appliedFilters);
  const [filterSearch, setFilterSearch] = useState('');

  const typeOptions = useMemo(
    () => normalizeCrmTaskTypeOptions(taskTypeOptions),
    [taskTypeOptions],
  );

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
    setStagedFilters(CRM_TASK_MASTER_FILTER_OPTION);
    onAppliedFiltersChange(CRM_TASK_MASTER_FILTER_OPTION);
    setFilterSearch('');
    setIsOpen(false);
  };

  const currentFilterOptions = useMemo(() => {
    let options = [];
    if (activeTab === CRM_TASK_MASTER_FILTER_TABS.DEPARTMENT) {
      options = CRM_TASK_MASTER_DEPARTMENT_OPTIONS;
    } else if (activeTab === CRM_TASK_MASTER_FILTER_TABS.TYPE) {
      options = typeOptions;
    } else if (activeTab === CRM_TASK_MASTER_FILTER_TABS.PRIORITY) {
      options = TASK_PRIORITY_OPTIONS;
    } else if (activeTab === CRM_TASK_MASTER_FILTER_TABS.STATUS) {
      options = TASK_STATUS_OPTIONS;
    }

    if (filterSearch.trim()) {
      const needle = filterSearch.toLowerCase();
      options = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
      );
    }
    return options;
  }, [activeTab, filterSearch, typeOptions]);

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
                {CRM_TASK_MASTER_FILTER_TAB_CONFIG.map((tab) => {
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

export default CrmTaskMasterFilterPopover;
