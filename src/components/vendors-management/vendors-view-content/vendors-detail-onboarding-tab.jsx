import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  RiUserReceivedLine,
  RiAddLine,
  RiSearchLine,
  RiLayoutColumnLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { selectVendorDetail, fetchVendorOnboardingTasks } from '@/redux/vendorSlice';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '@/components/clients-management/constants';
import VendorTaskCreateDrawer from '@/components/vendors-management/vendor-task-create-drawer';
import VendorTaskViewDrawer from '@/components/vendors-management/vendor-task-view-drawer';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import {
  TASK_FILTER_TABS,
  TASK_FILTER_TAB_CONFIG,
  FILTER_OPTION,
  getVendorOnboardingFiltersStorageKey,
  VENDOR_ONBOARDING_PERSISTED_KEYS,
  mergeStoredVendorOnboardingFilters,
} from '@/components/vendors-management/constants';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useTableVariant } from '@/hooks/use-table-variant';
import VendorDetailTasksTable from '@/components/vendors-management/vendor-detail-tasks-table';

const VendorDetailOnboardingTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const vendorDetail = useSelector(selectVendorDetail);
  const vendor = vendorDetail.data;
  const vendorId = vendor?.name || id;
  const onboardingTasks = useSelector((state) => state.vendor.onboardingTasks);
  const isLoading = onboardingTasks?.isLoading || false;
  const tasks = onboardingTasks?.data || [];
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [columnConfig, setColumnConfig] = useState(null);
  const tableRef = useRef(null);

  // Filter state. `appliedFilters` is the committed snapshot (the one driving
  // the task fetch); `stagedFilters` holds in-progress toggles inside the open
  // popover and gets promoted to `appliedFilters` on close. The applied side
  // is persisted to sessionStorage per-vendor so reloading the detail page
  // restores the previous Status / Priority picks.
  const [activeTab, setActiveTab] = useState(TASK_FILTER_TABS.STATUS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const vendorOnboardingFiltersStorageKey = useMemo(
    () => getVendorOnboardingFiltersStorageKey(vendorId),
    [vendorId],
  );
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: vendorOnboardingFiltersStorageKey,
    defaultFilters: FILTER_OPTION,
    persistIncludeKeys: VENDOR_ONBOARDING_PERSISTED_KEYS,
    persistTrimStringArrays: true,
  });
  // Re-normalize hydrated snapshots so downstream `length` / spread reads can
  // never see an undefined bucket (cheap; runs only when persisted state changes).
  const normalizedAppliedFilters = useMemo(
    () => mergeStoredVendorOnboardingFilters(appliedFilters),
    [appliedFilters],
  );
  const [stagedFilters, setStagedFilters] = useState(normalizedAppliedFilters);
  const [filterSearch, setFilterSearch] = useState('');

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'vendor-detail-onboarding-table',
    'compact',
  );

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const mapOrderByToBackend = useCallback((sortingState) => {
    if (!sortingState || sortingState.length === 0) {
      return 'creation desc';
    }

    const sort = sortingState[0];
    const columnId = sort.id;
    const direction = sort.desc ? 'desc' : 'asc';

    const fieldMap = {
      task: 'subject',
      due_date: 'exp_end_date',
      priority: 'priority',
    };

    const backendField = fieldMap[columnId] || columnId;
    return `${backendField} ${direction}`;
  }, []);

  useEffect(() => {
    if (vendorId) {
      const orderBy = mapOrderByToBackend(sorting);
      const filters = {};
      if (normalizedAppliedFilters.status.length > 0)
        filters.status = normalizedAppliedFilters.status;
      if (normalizedAppliedFilters.priority.length > 0)
        filters.priority = normalizedAppliedFilters.priority;

      dispatch(
        fetchVendorOnboardingTasks({
          vendor: vendorId,
          search: debouncedSearchTerm,
          order_by: orderBy,
          filters,
        }),
      );
    }
  }, [vendorId, dispatch, debouncedSearchTerm, sorting, normalizedAppliedFilters]);

  const completionStats = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = tasks.filter((task) => {
      const status = task.status ? String(task.status).toLowerCase() : '';
      return status === 'completed' || status === 'closed';
    }).length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [tasks]);

  const handleAddTask = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleTaskCreated = () => {
    if (vendorId) {
      const orderBy = mapOrderByToBackend(sorting);
      const filters = {};
      if (normalizedAppliedFilters.status.length > 0)
        filters.status = normalizedAppliedFilters.status;
      if (normalizedAppliedFilters.priority.length > 0)
        filters.priority = normalizedAppliedFilters.priority;

      dispatch(
        fetchVendorOnboardingTasks({
          vendor: vendorId,
          search: debouncedSearchTerm,
          order_by: orderBy,
          filters,
        }),
      );
    }
  };

  const handleRowClick = (task) => {
    setSelectedTaskId(task.name || task.id);
    setIsViewDrawerOpen(true);
  };

  const handleTaskChange = (newTaskId) => {
    setSelectedTaskId(newTaskId);
  };

  const handleViewDrawerClose = () => {
    setIsViewDrawerOpen(false);
    setSelectedTaskId(null);
  };

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // Two-track count, mirrors `components/ticket-management/ticket-toolbar.jsx`:
  //   • appliedFilterCount — derived from the persisted snapshot, so a refresh
  //     immediately shows the right badge without waiting for the popover.
  //   • stagedFilterCount  — reflects in-progress dropdown edits while open.
  // The visible badge picks `staged` while the popover is open, otherwise
  // `applied`. Same idea we used for the Ticket toolbar fix.
  const appliedFilterCount = useMemo(
    () =>
      (normalizedAppliedFilters.status?.length || 0) +
      (normalizedAppliedFilters.priority?.length || 0),
    [normalizedAppliedFilters],
  );
  const stagedFilterCount =
    (stagedFilters.status?.length || 0) + (stagedFilters.priority?.length || 0);
  const filterCount = isFilterOpen ? stagedFilterCount : appliedFilterCount;

  const handleOpenChange = (open) => {
    if (!open) {
      // Closing → commit staged to applied (also writes to sessionStorage
      // via usePersistedFilters).
      setAppliedFilters(stagedFilters);
    } else {
      // Opening → seed staged with the current persisted snapshot so the
      // popover reflects what's actually applied.
      setStagedFilters(normalizedAppliedFilters);
    }
    setIsFilterOpen(open);
  };

  const handleToggleFilter = (value) => {
    setStagedFilters((prev) => {
      const current = prev[activeTab] || [];
      const isSelected = current.includes(value);
      const next = {
        ...prev,
        [activeTab]: isSelected ? current.filter((item) => item !== value) : [...current, value],
      };
      return next;
    });
  };

  const handleClearFilters = () => {
    const cleared = { ...FILTER_OPTION };
    setStagedFilters(cleared);
    setAppliedFilters(cleared);
    setFilterSearch('');
  };

  const currentFilterOptions = useMemo(() => {
    let options = [];
    if (activeTab === TASK_FILTER_TABS.STATUS) {
      options = TASK_STATUS_OPTIONS;
    } else if (activeTab === TASK_FILTER_TABS.PRIORITY) {
      options = TASK_PRIORITY_OPTIONS;
    }

    if (filterSearch.trim()) {
      const needle = filterSearch.toLowerCase();
      options = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
      );
    }
    return options;
  }, [activeTab, filterSearch, TASK_FILTER_TABS]);

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-5'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <RiUserReceivedLine className='size-5 text-text-soft-400' />
                <h2 className='label-medium text-text-sub-500'>Onboarding Tasks</h2>
              </div>
              {completionStats.total > 0 && (
                <Badge.Root variant='light' color='orange' className='text-nowrap'>
                  {completionStats.percentage}% {completionStats.completed}/{completionStats.total}{' '}
                  Completed
                </Badge.Root>
              )}
            </div>
            <div className='flex items-center gap-3'>
              <Input.Root className='w-[276px]' size='xsmall'>
                <Input.Wrapper>
                  <Input.Icon>
                    <RiSearchLine />
                  </Input.Icon>
                  <Input.Input
                    placeholder='Search here...'
                    value={searchTerm}
                    onChange={handleSearchChange}
                    aria-label='Search tasks'
                  />
                </Input.Wrapper>
              </Input.Root>
              <Popover.Root open={isFilterOpen} onOpenChange={handleOpenChange}>
                <Filter.TriggerButton
                  filterCount={filterCount}
                  onClear={(e) => {
                    e.stopPropagation();
                    handleClearFilters();
                    setIsFilterOpen(false);
                  }}
                  tooltipContent='Filter'
                  ariaLabel='Filter onboarding tasks'
                />
                <Filter.Root>
                  <Filter.Header title='FILTERS' onClear={handleClearFilters} />
                  <Filter.Body>
                    <Filter.Sidebar width='160px'>
                      <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
                        <TabMenuVertical.List className='p-2 border-r-0'>
                          {TASK_FILTER_TAB_CONFIG.map((tab) => {
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
              {/* <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <TableVariantToggle
                    variant={tableVariant}
                    onToggle={toggleTableVariant}
                    size='xsmall'
                  />
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {tableVariant === 'compact' ? 'Switch to default view' : 'Switch to compact view'}
                </Tooltip.Content>
              </Tooltip.Root> */}
              <ColumnManagerDropdown
                open={isColumnManagerOpen}
                onOpenChange={setIsColumnManagerOpen}
                config={columnConfig ?? tableRef?.current?.columnConfigHook}
                tooltipContent='Column Manager'
                trigger={
                  <Button.Root variant='neutral' mode='stroke' size='xsmall' className='gap-1'>
                    <Button.Icon>
                      <RiLayoutColumnLine size={20} />
                    </Button.Icon>
                  </Button.Root>
                }
              />
              <Button.Root
                variant='primary'
                mode='filled'
                size='xsmall'
                className='gap-1'
                onClick={handleAddTask}
              >
                <Button.Icon>
                  <RiAddLine size={18} />
                </Button.Icon>
                Add Task
              </Button.Root>
            </div>
          </div>
          <VendorDetailTasksTable
            ref={tableRef}
            tasks={tasks}
            isLoading={isLoading}
            variant={tableVariant}
            showRecurring={false}
            context='onboarding'
            onRowClick={handleRowClick}
            react_table_id='vendor-onboarding-tasks'
            sorting={sorting}
            onSortingChange={setSorting}
            onColumnConfigChange={setColumnConfig}
          />
        </div>
      </div>
      <VendorTaskCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={handleTaskCreated}
        taskType='onboarding'
      />
      <VendorTaskViewDrawer
        isOpen={isViewDrawerOpen}
        onClose={handleViewDrawerClose}
        taskId={selectedTaskId}
        taskType='Vendor Onboarding'
        tasks={tasks}
        onTaskChange={handleTaskChange}
        permissions={{ canEdit: true }}
        vendorId={vendorId}
      />
    </div>
  );
};

export default VendorDetailOnboardingTab;
