import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  RiShakeHandsLine,
  RiAddLine,
  RiSearchLine,
  RiLayoutColumnLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import {
  selectClientDetail,
  fetchEngagementTasks,
  CLIENT_TASK_GROUPED_PAGE_SIZE,
} from '@/redux/clientDetailSlice';
import ClientDetailTasksGroupedView from '@/components/clients-management/client-detail-tasks-grouped-view';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import ClientDetailTasksTable from '@/components/clients-management/client-detail-tasks-table';
import ClientTaskCreateDrawer from '@/components/clients-management/client-task-create-drawer';
import ClientTaskViewDrawer from '@/components/clients-management/client-task-view-drawer';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { fetchScopedTaskTags } from '@/redux/settingSlice';
import { buildTaskMasterTagOptions, shouldFetchScopedTaskTags } from '@/utils/task-utils';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import {
  TASK_FILTER_OPTIONS,
  DEFAULT_TASK_FILTER,
  getTaskFilterLabel,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_FILTER_TABS,
  ENGAGEMENT_TASK_FILTER_TAB_CONFIG,
  TASK_FILTER_OPTION,
  RECURRING_FREQUENCY_OPTIONS,
  CLIENT_DETAIL_ENGAGEMENT_FILTERS_KEY,
  CLIENT_TASK_GROUP_BY_OPTIONS,
} from '@/components/clients-management/constants';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

const ClientDetailEngagementTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientId = client?.name || id;
  const engagementTasks = useSelector((state) => state.clientDetail.engagementTasks);
  const isLoading = engagementTasks?.isLoading || false;
  const isLoadingMore = engagementTasks?.isLoadingMore || false;
  const hasMore = engagementTasks?.has_more || false;
  const currentPage = Number(engagementTasks?.page ?? 1) || 1;
  const pageSize = Number(engagementTasks?.page_size ?? 20) || 20;
  const totalTasks = Number(engagementTasks?.total_tasks ?? engagementTasks?.total_count ?? 0) || 0;
  const completedTasks = Number(engagementTasks?.completed_tasks ?? 0) || 0;
  const completedPercentage = Number(engagementTasks?.completed_percentage ?? 0) || 0;
  const tasks = engagementTasks?.data || [];
  const taskGroups = engagementTasks?.taskGroups || [];
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const isGroupedView = Boolean(groupBy);
  const listPageSize = isGroupedView ? CLIENT_TASK_GROUPED_PAGE_SIZE : pageSize;
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState(DEFAULT_TASK_FILTER);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [columnConfig, setColumnConfig] = useState(null);
  const tableRef = useRef(null);

  // Filter state
  const [activeTab, setActiveTab] = useState(TASK_FILTER_TABS.RECURRING);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [filterSearch, setFilterSearch] = useState('');
  const STORAGE_KEY = `${CLIENT_DETAIL_ENGAGEMENT_FILTERS_KEY}-${clientId}`;
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: clientId ? STORAGE_KEY : null,
    defaultFilters: TASK_FILTER_OPTION,
  });

  const [appliedFilters, setAppliedFilters] = useState(TASK_FILTER_OPTION);
  const [stagedFilters, setStagedFilters] = useState(TASK_FILTER_OPTION);

  // 1. Initialize from persistence
  useEffect(() => {
    if (!clientId || filtersInitialized) return;
    if (persistedFilters) {
      const merged = {
        ...TASK_FILTER_OPTION,
        ...persistedFilters,
      };
      setAppliedFilters(merged);
      setStagedFilters(merged);
      const count =
        (merged.status?.length || 0) +
        (merged.priority?.length || 0) +
        (merged.recurring?.length || 0);
      setFilterCount(count);
    }
    setFiltersInitialized(true);
  }, [clientId, persistedFilters, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!clientId || !filtersInitialized) return;

    const compact = compactFiltersForSessionStorage(appliedFilters, TASK_FILTER_OPTION, {});

    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [clientId, appliedFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  // Table variant management with localStorage persistence (default to compact)
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'client-detail-engagement-table',
    'compact',
  );

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Map frontend column IDs to backend field names for sorting
  const mapOrderByToBackend = useCallback((sortingState) => {
    if (!sortingState || sortingState.length === 0) {
      return 'exp_end_date desc';
    }

    const sort = sortingState[0];
    const columnId = sort.id;
    const direction = sort.desc ? 'desc' : 'asc';

    // Map frontend column IDs to backend field names
    const fieldMap = {
      task: 'subject',
      due_date: 'exp_end_date',
      priority: 'priority',
    };

    const backendField = fieldMap[columnId] || columnId;
    return `${backendField} ${direction}`;
  }, []);

  useEffect(() => {
    if (!clientId || !filtersInitialized) return;
    const orderBy = mapOrderByToBackend(sorting);
    const filters = {};
    if (appliedFilters.status.length > 0) filters.status = appliedFilters.status;
    if (appliedFilters.priority.length > 0) filters.priority = appliedFilters.priority;
    if (appliedFilters.recurring.length > 0)
      filters.custom_recurrence_period = appliedFilters.recurring;
    if (appliedFilters.tags?.length > 0) filters.tags = appliedFilters.tags;

    dispatch(
      fetchEngagementTasks({
        customer: clientId,
        keyword: debouncedSearchTerm,
        recurrence_period: taskFilter,
        order_by: orderBy,
        filters,
        page_size: listPageSize,
        group: isGroupedView,
        group_by: groupBy,
        group_order: groupOrder,
      }),
    );
  }, [
    clientId,
    dispatch,
    debouncedSearchTerm,
    taskFilter,
    sorting,
    appliedFilters,
    filtersInitialized,
    listPageSize,
    isGroupedView,
    groupBy,
    groupOrder,
    mapOrderByToBackend,
  ]);

  // Completion stats should reflect backend totals (across all pages), not current page length.
  // Fallback to computing from loaded rows only if backend totals are unavailable.
  const completionStats = useMemo(() => {
    const hasBackendTotals =
      Number.isFinite(totalTasks) && totalTasks > 0 && Number.isFinite(completedTasks);
    if (hasBackendTotals) {
      const pct =
        Number.isFinite(completedPercentage) && completedPercentage >= 0
          ? Math.round(completedPercentage)
          : totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;
      return { completed: completedTasks, total: totalTasks, percentage: pct };
    }

    if (!tasks || tasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = tasks.filter((task) => {
      const status = task.status ? String(task.status).toLowerCase() : '';
      return status === 'completed' || status === 'closed';
    }).length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [completedPercentage, completedTasks, tasks, totalTasks]);

  const handleAddTask = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleTaskCreated = () => {
    // Refresh tasks list
    if (clientId) {
      const orderBy = mapOrderByToBackend(sorting);
      const filters = {};
      if (appliedFilters.status.length > 0) filters.status = appliedFilters.status;
      if (appliedFilters.priority.length > 0) filters.priority = appliedFilters.priority;
      if (appliedFilters.recurring.length > 0)
        filters.custom_recurrence_period = appliedFilters.recurring;
      if (appliedFilters.tags?.length > 0) filters.tags = appliedFilters.tags;

      dispatch(
        fetchEngagementTasks({
          customer: clientId,
          keyword: debouncedSearchTerm,
          recurrence_period: taskFilter,
          order_by: orderBy,
          filters,
          page_size: listPageSize,
          group: isGroupedView,
          group_by: groupBy,
          group_order: groupOrder,
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

  const [scopedTaskTags, setScopedTaskTags] = useState([]);

  useEffect(() => {
    const scope = {
      doctype: 'Task',
      taskType: 'Client Engagement',
      customRefDoctype: 'Customer',
      customRefDocname: clientId,
    };
    if (!shouldFetchScopedTaskTags(scope)) {
      setScopedTaskTags([]);
      return undefined;
    }

    let mounted = true;
    dispatch(fetchScopedTaskTags(scope))
      .unwrap()
      .then((tags) => {
        if (mounted) setScopedTaskTags(tags);
      })
      .catch(() => {
        if (mounted) setScopedTaskTags([]);
      });

    return () => {
      mounted = false;
    };
  }, [dispatch, clientId]);

  const engagementTagOptions = useMemo(
    () =>
      buildTaskMasterTagOptions(tasks, appliedFilters?.tags, stagedFilters?.tags, scopedTaskTags),
    [tasks, appliedFilters?.tags, stagedFilters?.tags, scopedTaskTags],
  );

  const handleOpenChange = (open) => {
    if (!open) {
      // Closing: Apply staged filters
      setAppliedFilters(stagedFilters);
      const count =
        (stagedFilters.status?.length || 0) +
        (stagedFilters.priority?.length || 0) +
        (stagedFilters.recurring?.length || 0) +
        (stagedFilters.tags?.length || 0);
      setFilterCount(count);
    } else {
      // Opening: Sync staged with applied
      setStagedFilters(appliedFilters);
    }
    setIsFilterDropdownOpen(open);
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
    const cleared = { status: [], priority: [], tags: [], recurring: [] };
    setStagedFilters(cleared);
    setAppliedFilters(cleared);
    setFilterCount(0);
    setFilterSearch('');
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
      options = engagementTagOptions;
    }

    if (filterSearch.trim()) {
      const needle = filterSearch.toLowerCase();
      options = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
      );
    }
    return options;
  }, [activeTab, filterSearch, engagementTagOptions]);

  const handleLoadMore = useCallback(() => {
    if (!clientId || isLoading || isLoadingMore || !hasMore) return;
    const orderBy = mapOrderByToBackend(sorting);
    const filters = {};
    if (appliedFilters.status.length > 0) filters.status = appliedFilters.status;
    if (appliedFilters.priority.length > 0) filters.priority = appliedFilters.priority;
    if (appliedFilters.recurring.length > 0)
      filters.custom_recurrence_period = appliedFilters.recurring;
    if (appliedFilters.tags?.length > 0) filters.tags = appliedFilters.tags;

    dispatch(
      fetchEngagementTasks({
        customer: clientId,
        keyword: debouncedSearchTerm,
        recurrence_period: taskFilter,
        order_by: orderBy,
        page: currentPage + 1,
        page_size: listPageSize,
        append: true,
        filters,
        group: isGroupedView,
        group_by: groupBy,
        group_order: groupOrder,
      }),
    );
  }, [
    clientId,
    currentPage,
    debouncedSearchTerm,
    dispatch,
    hasMore,
    isLoading,
    isLoadingMore,
    isGroupedView,
    groupBy,
    groupOrder,
    mapOrderByToBackend,
    listPageSize,
    sorting,
    taskFilter,
    appliedFilters,
  ]);

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-5'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <RiShakeHandsLine className='size-5 text-text-soft-400' />
                <h2 className='label-medium text-text-sub-500'>Engagement Tasks</h2>
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
              {/* <Select.Root
							{/* <Select.Root
								value={taskFilter}
								onValueChange={setTaskFilter}
								open={isFilterOpen}
								onOpenChange={setIsFilterOpen}
								size='xsmall'
							>
								<Select.Trigger className='w-[200px] border-stroke-strong-900 focus:shadow-button-important-focus focus:ring-primary-base'>
									<Select.Value placeholder={getTaskFilterLabel(DEFAULT_TASK_FILTER)}>
										{getTaskFilterLabel(taskFilter)}
									</Select.Value>
								</Select.Trigger>
								<Select.Content className='min-w-[200px]'>
									{TASK_FILTER_OPTIONS.map((option) => (
										<Select.Item key={option.value} value={option.value}>
											{option.label}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root> */}
              {/* <Popover.Root open={isFilterDropdownOpen} onOpenChange={handleOpenChange}> */}
              {/* </Select.Root>  */}
              <Popover.Root open={isFilterDropdownOpen} onOpenChange={handleOpenChange}>
                <Filter.TriggerButton
                  filterCount={filterCount}
                  onClear={(e) => {
                    e.stopPropagation();
                    handleClearFilters();
                    handleClearFilters();
                    setIsFilterDropdownOpen(false);
                  }}
                  tooltipContent='Filter'
                  ariaLabel='Filter engagement tasks'
                />
                <Filter.Root>
                  <Filter.Header title='FILTERS' onClear={handleClearFilters} />
                  <Filter.Body>
                    <Filter.Sidebar width='160px'>
                      <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
                        <TabMenuVertical.List className='p-2 border-r-0'>
                          {ENGAGEMENT_TASK_FILTER_TAB_CONFIG.map((tab) => {
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
              <GroupByToolbarControl
                options={CLIENT_TASK_GROUP_BY_OPTIONS}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                groupOrder={groupOrder}
                onGroupOrderChange={setGroupOrder}
                size='xsmall'
              />
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
              {!isGroupedView && (
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
              )}
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
          {isGroupedView ? (
            <ClientDetailTasksGroupedView
              taskGroups={taskGroups}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              tableRef={tableRef}
              tableVariant={tableVariant}
              showRecurring={true}
              context='engagement'
              onRowClick={handleRowClick}
              react_table_id='engagement-tasks'
              sorting={sorting}
              onSortingChange={setSorting}
              onColumnConfigChange={setColumnConfig}
            />
          ) : (
            <ClientDetailTasksTable
              ref={tableRef}
              tasks={tasks}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              variant={tableVariant}
              showRecurring={true}
              context='engagement'
              onRowClick={handleRowClick}
              react_table_id='engagement-tasks'
              sorting={sorting}
              onSortingChange={setSorting}
              onColumnConfigChange={setColumnConfig}
              enableScrollPagination={true}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />
          )}
        </div>
      </div>
      <ClientTaskCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={handleTaskCreated}
        taskType='engagement'
      />
      <ClientTaskViewDrawer
        isOpen={isViewDrawerOpen}
        onClose={handleViewDrawerClose}
        taskId={selectedTaskId}
        taskType='engagement'
        tasks={tasks}
        onTaskChange={handleTaskChange}
        permissions={{ canEdit: true }}
      />
    </div>
  );
};

export default ClientDetailEngagementTab;
