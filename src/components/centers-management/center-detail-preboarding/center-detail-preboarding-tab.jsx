import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  RiUserReceivedLine,
  RiAddLine,
  RiSearchLine,
  RiLayoutColumnLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { fetchScopedTaskTags } from '@/redux/settingSlice';
import { buildTaskMasterTagOptions, shouldFetchScopedTaskTags } from '@/utils/task-utils';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_FILTER_TABS,
  ONBOARDING_TASK_FILTER_TAB_CONFIG,
  TASK_FILTER_OPTION,
} from '@/components/clients-management/constants';
import CenterDetailTasksTable from '@/components/centers-management/center-detail-tasks-table';
import CenterTaskCreateDrawer from '@/components/centers-management/center-task-create-drawer';
import CenterTaskViewDrawer from '@/components/centers-management/center-task-view-drawer';
import { fetchCenterPreboardingTasks } from '@/redux/centerSlice';

const CENTER_DETAIL_PREBOARDING_FILTERS_KEY = 'center-detail-preboarding-view-filters';

const buildTaskFiltersPayload = (appliedFilters = {}) => {
  const filters = {};
  if (appliedFilters.status?.length > 0) filters.status = appliedFilters.status;
  if (appliedFilters.priority?.length > 0) filters.priority = appliedFilters.priority;
  if (appliedFilters.tags?.length > 0) filters.tags = appliedFilters.tags;
  return filters;
};

const CenterDetailPreboardingTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const centerDetails = useSelector((state) => state.center.centerDetails);
  const centerId = centerDetails?.data?.name || id;

  const preboardingTasks = useSelector((state) => state.center.preboardingTasks);
  const isLoading = preboardingTasks?.isLoading || false;
  const isLoadingMore = preboardingTasks?.isLoadingMore || false;
  const hasMore = preboardingTasks?.has_more || false;
  const currentPage = Number(preboardingTasks?.page ?? 1) || 1;
  const pageSize = Number(preboardingTasks?.page_size ?? 20) || 20;
  const totalTasks =
    Number(preboardingTasks?.total_tasks ?? preboardingTasks?.total_count ?? 0) || 0;
  const completedTasks = Number(preboardingTasks?.completed_tasks ?? 0) || 0;
  const completedPercentage = Number(preboardingTasks?.completed_percentage ?? 0) || 0;

  const tasks = preboardingTasks?.data || [];

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [columnConfig, setColumnConfig] = useState(null);
  const tableRef = useRef(null);
  const [scrollContainerEl, setScrollContainerEl] = useState(null);
  const setScrollContainerRef = useCallback((node) => {
    setScrollContainerEl(node || null);
  }, []);

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const STORAGE_KEY = centerId ? `${CENTER_DETAIL_PREBOARDING_FILTERS_KEY}-${centerId}` : null;
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: STORAGE_KEY,
    defaultFilters: TASK_FILTER_OPTION,
    persistExcludeKeys: ['recurring'],
  });

  const [appliedFilters, setAppliedFilters] = useState(TASK_FILTER_OPTION);
  const [stagedFilters, setStagedFilters] = useState(TASK_FILTER_OPTION);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TASK_FILTER_TABS.STATUS);
  const [filterCount, setFilterCount] = useState(0);
  const [filterSearch, setFilterSearch] = useState('');

  const { variant: tableVariant } = useTableVariant('center-detail-preboarding-table', 'compact');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Initialize filters from session storage
  useEffect(() => {
    if (!centerId || filtersInitialized) return;
    if (persistedFilters) {
      const merged = {
        ...TASK_FILTER_OPTION,
        ...persistedFilters,
      };
      setAppliedFilters(merged);
      setStagedFilters(merged);
      setFilterCount(
        (merged.status?.length || 0) + (merged.priority?.length || 0) + (merged.tags?.length || 0),
      );
    }
    setFiltersInitialized(true);
  }, [centerId, persistedFilters, filtersInitialized]);

  // Persist filters to session storage
  useEffect(() => {
    if (!centerId || !filtersInitialized) return;

    const compact = compactFiltersForSessionStorage(appliedFilters, TASK_FILTER_OPTION, {
      excludeKeys: ['recurring'],
    });

    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [centerId, appliedFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  const mapOrderByToBackend = useCallback((sortingState) => {
    if (!sortingState || sortingState.length === 0) return 'creation desc';
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
    if (!centerId || !filtersInitialized) return;
    const orderBy = mapOrderByToBackend(sorting);
    const filters = buildTaskFiltersPayload(appliedFilters);

    dispatch(
      fetchCenterPreboardingTasks({
        center: centerId,
        search: debouncedSearchTerm,
        order_by: orderBy,
        filters,
      }),
    );
  }, [
    centerId,
    dispatch,
    debouncedSearchTerm,
    sorting,
    mapOrderByToBackend,
    appliedFilters,
    filtersInitialized,
  ]);

  const [scopedTaskTags, setScopedTaskTags] = useState([]);

  useEffect(() => {
    const scope = {
      doctype: 'Task',
      taskType: 'Center Preboarding',
      customRefDoctype: 'Center',
      customRefDocname: centerId,
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
  }, [dispatch, centerId]);

  const preboardingTagOptions = useMemo(
    () =>
      buildTaskMasterTagOptions(tasks, appliedFilters?.tags, stagedFilters?.tags, scopedTaskTags),
    [tasks, appliedFilters?.tags, stagedFilters?.tags, scopedTaskTags],
  );

  // Match client onboarding: prefer backend totals across all pages.
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
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [completedPercentage, completedTasks, tasks, totalTasks]);

  const handleAddTask = () => setIsCreateDrawerOpen(true);

  const handleTaskCreated = () => {
    if (!centerId) return;
    const orderBy = mapOrderByToBackend(sorting);
    const filters = buildTaskFiltersPayload(appliedFilters);
    dispatch(
      fetchCenterPreboardingTasks({
        center: centerId,
        search: debouncedSearchTerm,
        order_by: orderBy,
        filters,
      }),
    );
  };

  const handleRowClick = (task) => {
    setSelectedTaskId(task.name || task.id);
    setIsViewDrawerOpen(true);
  };

  const handleViewDrawerClose = () => {
    setIsViewDrawerOpen(false);
    setSelectedTaskId(null);
  };

  const handleSearchChange = useCallback((event) => setSearchTerm(event.target.value), []);

  const handleOpenChange = (open) => {
    if (!open) {
      setAppliedFilters(stagedFilters);
      const count =
        (stagedFilters.status?.length || 0) +
        (stagedFilters.priority?.length || 0) +
        (stagedFilters.tags?.length || 0);
      setFilterCount(count);
    } else {
      setStagedFilters(appliedFilters);
    }
    setIsFilterOpen(open);
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
    } else if (activeTab === TASK_FILTER_TABS.TAGS) {
      options = preboardingTagOptions;
    }

    if (filterSearch.trim()) {
      const needle = filterSearch.toLowerCase();
      options = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
      );
    }
    return options;
  }, [activeTab, filterSearch, preboardingTagOptions]);

  const handleLoadMore = useCallback(() => {
    if (!centerId || isLoading || isLoadingMore || !hasMore) return;
    const orderBy = mapOrderByToBackend(sorting);
    const filters = buildTaskFiltersPayload(appliedFilters);
    dispatch(
      fetchCenterPreboardingTasks({
        center: centerId,
        search: debouncedSearchTerm,
        order_by: orderBy,
        page: currentPage + 1,
        page_size: pageSize,
        append: true,
        filters,
      }),
    );
  }, [
    centerId,
    isLoading,
    isLoadingMore,
    hasMore,
    mapOrderByToBackend,
    sorting,
    dispatch,
    debouncedSearchTerm,
    currentPage,
    pageSize,
    appliedFilters,
  ]);

  return (
    <div className='flex h-full min-h-0 flex-1 overflow-hidden'>
      <div
        ref={setScrollContainerRef}
        className='flex flex-1 min-h-0 flex-col overflow-y-auto bg-white min-w-0 px-6 py-5'
      >
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <RiUserReceivedLine className='size-5 text-text-soft-400' />
                <h2 className='label-medium text-text-sub-500'>Preboarding Tasks</h2>
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
                  ariaLabel='Filter preboarding tasks'
                />
                <Filter.Root>
                  <Filter.Header title='FILTERS' onClear={handleClearFilters} />
                  <Filter.Body>
                    <Filter.Sidebar width='160px'>
                      <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
                        <TabMenuVertical.List className='p-2 border-r-0'>
                          {ONBOARDING_TASK_FILTER_TAB_CONFIG.map((tab) => {
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

          <CenterDetailTasksTable
            ref={tableRef}
            tasks={tasks}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            variant={tableVariant}
            showRecurring={false}
            context='preboarding'
            onRowClick={handleRowClick}
            react_table_id='center-preboarding-tasks'
            sorting={sorting}
            onSortingChange={setSorting}
            onColumnConfigChange={setColumnConfig}
            enableScrollPagination={Boolean(scrollContainerEl)}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            scrollContainer={scrollContainerEl}
          />
        </div>
      </div>

      <CenterTaskCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={handleTaskCreated}
        taskType='preboarding'
      />
      <CenterTaskViewDrawer
        isOpen={isViewDrawerOpen}
        onClose={handleViewDrawerClose}
        taskId={selectedTaskId}
        taskType='Center Preboarding'
        tasks={tasks}
        onTaskChange={(newId) => setSelectedTaskId(newId)}
        permissions={{ canEdit: true }}
      />
    </div>
  );
};

export default CenterDetailPreboardingTab;
