import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiArrowRightSLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import {
  clearProjectTaskMasterDetail,
  deleteProjectTaskMaster,
  fetchProjectTaskMasterDetail,
  fetchProjectTaskMasterList,
  updateProjectTaskMasterField,
} from '@/redux/projectMasterSlice';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import ProjectTaskCreateDrawer from '@/pages/profile/project-master/project-task-create-drawer';
import ProjectMasterStatusConfigTab from '@/pages/profile/project-master/project-master-status-config-tab';
import { PROJECT_MASTER_STATUS_FIELD_KEYS } from '@/pages/profile/project-master/project-master-status-config';
import ProjectTaskTable from '@/pages/profile/project-master/project-task-table';
import ProjectTaskViewDrawer from '@/pages/profile/project-master/project-task-view-drawer';
import ProjectMasterFilterPopover, {
  ProjectMasterGroupValueFilter,
} from '@/pages/profile/project-master/project-master-list-filters';
import ProjectMasterGroupTable from '@/pages/profile/project-master/project-master-group-table';
import {
  buildTaskMasterListFilters,
  groupTaskMasterRows,
  TASK_MASTER_FILTER_ALL,
  buildProjectTaskFieldFormData,
  getTaskRowFieldValue,
  taskFieldValuesEqual,
} from '@/pages/profile/project-master/project-master-helpers';
import {
  PROJECT_TASK_COLUMNS,
  PROJECT_TASK_MASTER_FILTER_SECTIONS,
  PROJECT_TASK_MASTER_GROUP_BY_OPTIONS,
  PROJECT_TASK_TABS,
  STAGE_OPTIONS,
  getStoredProjectTaskColumnConfig,
  saveStoredProjectTaskColumnConfig,
} from '@/pages/profile/project-master/project-master.constants';
import { useProjectMasterList } from '@/pages/profile/project-master/use-project-master-list';
import { fetchProjectStageOptions } from '@/components/projects/project-stage-status-helpers';

export default function ProjectTasksMaster({ onTasksClick }) {
  const dispatch = useDispatch();
  const { list, detail } = useSelector((state) => state.projectMaster.tasks);
  const isDeleting = useSelector((state) => state.projectMaster.delete.isLoading);
  const { data: taskList, isLoading: isListLoading } = list;
  const listTasks = taskList?.results ?? [];
  const openTask = detail.data;

  const [activeTab, setActiveTab] = useState('Tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('stage');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [groupValueFilter, setGroupValueFilter] = useState(TASK_MASTER_FILTER_ALL);
  const [activeFilterSection, setActiveFilterSection] = useState('status');
  const [selectedFilters, setSelectedFilters] = useState({ status: [], priority: [] });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [stageOptions, setStageOptions] = useState(STAGE_OPTIONS);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const columnConfig = useColumnConfig(
    'project-task-master',
    PROJECT_TASK_COLUMNS,
    saveStoredProjectTaskColumnConfig,
    getStoredProjectTaskColumnConfig,
    { autoSave: true, debounce: 200 },
  );

  useEffect(() => {
    let cancelled = false;
    fetchProjectStageOptions()
      .then((options) => {
        if (cancelled || options.length === 0) return;
        setStageOptions(options.map((option) => option.value));
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error) || 'Failed to load stages');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getListFilters = useCallback(
    () => ({
      keyword: debouncedSearchTerm,
      filters: buildTaskMasterListFilters({
        groupBy,
        groupValueFilter,
        selectedFilters,
      }),
    }),
    [debouncedSearchTerm, groupBy, groupValueFilter, selectedFilters],
  );

  const { loadList, paginationProps } = useProjectMasterList({
    dispatch,
    fetchListThunk: fetchProjectTaskMasterList,
    getFilters: getListFilters,
    isActive: activeTab === 'Tasks',
    reloadDeps: [debouncedSearchTerm, groupBy, groupValueFilter, selectedFilters, groupOrder],
  });

  const taskGroups = useMemo(
    () => groupTaskMasterRows(listTasks, groupBy, groupOrder),
    [groupBy, groupOrder, listTasks],
  );

  useEffect(() => {
    setGroupValueFilter(TASK_MASTER_FILTER_ALL);
  }, [groupBy]);

  const loadTaskDetail = useCallback(
    async (taskId) => {
      await dispatch(fetchProjectTaskMasterDetail(taskId)).unwrap();
    },
    [dispatch],
  );

  const handleOpenTask = useCallback(
    async (task) => {
      const taskId = task?.name ?? task?.id;
      if (!taskId) return;

      try {
        await loadTaskDetail(taskId);
        setIsViewDrawerOpen(true);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [loadTaskDetail],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, fieldName, value) => {
      const task = listTasks.find((row) => row.name === taskId);
      if (!taskId || !task) return;

      const originalValue = getTaskRowFieldValue(task, fieldName);
      if (taskFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectTaskMasterField(buildProjectTaskFieldFormData(taskId, fieldName, value)),
        ).unwrap();
        await loadList();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, listTasks, loadList],
  );

  const handleRefreshTask = useCallback(async () => {
    const taskId = openTask?.name;
    if (!taskId) return;

    try {
      await loadTaskDetail(taskId);
      await loadList();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [loadList, loadTaskDetail, openTask?.name]);

  const handleTaskChange = useCallback(
    async (taskId) => {
      if (!taskId) return;
      try {
        await loadTaskDetail(taskId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [loadTaskDetail],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsViewDrawerOpen(false);
    dispatch(clearProjectTaskMasterDetail());
  }, [dispatch]);

  const handleRequestDeleteTask = useCallback((task) => {
    const id = task?.name ?? task?.id;
    if (!id) return;

    setPendingDelete({
      id,
      label: task.task_name || id,
    });
  }, []);

  const handleConfirmDeleteTask = useCallback(async () => {
    const taskId = pendingDelete?.id;
    if (!taskId) return;

    try {
      await dispatch(deleteProjectTaskMaster(taskId)).unwrap();
      showSuccessToast('Task deleted successfully');
      if (openTask?.name === taskId) {
        handleCloseDrawer();
      }
      setPendingDelete(null);
      await loadList();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, handleCloseDrawer, loadList, openTask?.name, pendingDelete?.id]);

  return (
    <div className='flex w-full flex-col'>
      <div className='flex items-center gap-2 border-b border-stroke-soft-200 pb-2'>
        <div onClick={onTasksClick} className='text-label-sm text-text-sub-500'>
          Projects Master
        </div>
        <RiArrowRightSLine className='size-4 text-text-sub-500' />
        <div>Tasks</div>
      </div>

      <section className='flex flex-col gap-5'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none'
          >
            {PROJECT_TASK_TABS.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>

        {activeTab === 'Tasks' ? (
          <>
            <div className='flex flex-col gap-3'>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <Input.Root size='xsmall' className='w-full sm:w-[276px]'>
                  <Input.Wrapper>
                    <Input.Icon as={RiSearchLine} />
                    <Input.Input
                      placeholder='Search here...'
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>

                <div className='flex flex-wrap items-center justify-end gap-3'>
                  <GroupByToolbarControl
                    options={PROJECT_TASK_MASTER_GROUP_BY_OPTIONS}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    groupOrder={groupOrder}
                    onGroupOrderChange={setGroupOrder}
                    size='xsmall'
                  />
                  <ProjectMasterGroupValueFilter
                    groupBy={groupBy}
                    value={groupValueFilter}
                    onChange={setGroupValueFilter}
                  />
                  <ProjectMasterFilterPopover
                    filterSections={PROJECT_TASK_MASTER_FILTER_SECTIONS}
                    selectedFilters={selectedFilters}
                    onSelectedFiltersChange={setSelectedFilters}
                    activeSection={activeFilterSection}
                    onActiveSectionChange={setActiveFilterSection}
                    ariaLabel='Filter project tasks'
                  />
                  <ColumnManagerDropdown
                    open={isColumnManagerOpen}
                    onOpenChange={setIsColumnManagerOpen}
                    config={columnConfig}
                    tooltipContent={<p>Manage columns</p>}
                    trigger={
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        aria-label='Manage columns'
                      >
                        <Button.Icon as={RiLayoutColumnLine} />
                      </Button.Root>
                    }
                  />
                  <Button.Root
                    size='xsmall'
                    className='gap-2 px-4'
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Task
                  </Button.Root>
                </div>
              </div>
            </div>

            <PaginatedTableLayout grouped {...paginationProps}>
              {isListLoading ? (
                <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
                  Loading tasks…
                </div>
              ) : taskGroups.some((group) => group.rows.length > 0) ? (
                taskGroups.map((group) =>
                  group.rows.length > 0 ? (
                    <ProjectMasterGroupTable
                      key={group.id}
                      group={group.id}
                      groupBy={groupBy}
                      showGroupHeader={Boolean(groupBy)}
                    >
                      <ProjectTaskTable
                        tasks={group.rows}
                        onFieldUpdate={handleFieldUpdate}
                        onOpenTask={handleOpenTask}
                        onDelete={handleRequestDeleteTask}
                        columnConfig={columnConfig.columns}
                        stageOptions={stageOptions}
                      />
                    </ProjectMasterGroupTable>
                  ) : null,
                )
              ) : (
                <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
                  <p className='text-label-md text-text-strong-950'>No tasks found</p>
                  <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                    Create a task or adjust the search filter.
                  </p>
                </div>
              )}
            </PaginatedTableLayout>
          </>
        ) : (
          <ProjectMasterStatusConfigTab
            fieldKey={PROJECT_MASTER_STATUS_FIELD_KEYS.tasks}
            configKey='tasks'
          />
        )}

        <ProjectTaskCreateDrawer
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={() => {
            setActiveTab('Tasks');
            loadList();
          }}
        />

        <ProjectTaskViewDrawer
          isOpen={isViewDrawerOpen}
          onClose={handleCloseDrawer}
          task={openTask}
          onRefresh={handleRefreshTask}
          tasks={listTasks}
          onTaskChange={handleTaskChange}
          stageOptions={stageOptions}
        />

        <DeleteConfirmModal
          isOpen={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          title='Delete task?'
          description={
            pendingDelete?.label
              ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.`
              : 'Are you sure you want to delete this task? This action cannot be undone.'
          }
          item={pendingDelete}
          onConfirm={handleConfirmDeleteTask}
          isLoading={isDeleting}
        />
      </section>
    </div>
  );
}
