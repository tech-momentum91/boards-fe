import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiDownloadLine,
  RiFilter3Line,
  RiLayoutColumnLine,
  RiSearch2Line,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import ProjectDetailTaskTable from '@/components/projects/tasks/project-detail-task-table';
import ProjectTaskCreateDrawer from '@/components/projects/tasks/project-task-create-drawer';
import ProjectTaskViewDrawer from '@/components/projects/tasks/project-task-view-drawer';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Filter from '@/components/ui/filter';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Popover from '@/components/ui/popover';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { toStatusFilterOptions } from '@/hooks/use-status-options';
import {
  PROJECT_DETAIL_FILTER_OPTIONS,
  PROJECT_DETAIL_FILTER_SECTIONS,
  PROJECT_DETAIL_GROUP_BY_OPTIONS,
  PROJECT_DETAIL_TASK_COLUMNS,
  getStoredProjectDetailTaskColumnConfig,
  saveStoredProjectDetailTaskColumnConfig,
} from '@/components/projects/constants';
import {
  buildProjectTaskUpdateFormData,
  buildProjectTasksGroupByParam,
  buildProjectTasksListviewFilters,
  getProjectTaskRowFieldValue,
  mapProjectTaskDetailToRow,
  mapProjectTasksListviewToGroups,
  patchProjectTaskRow,
  projectTaskFieldValuesEqual,
} from '@/components/projects/tasks/project-task-helpers';
import { parseProjectFloors } from '@/components/projects/shared';
import ProjectQuickFilterToolbar, {
  rowMatchesAssigneeFilter,
} from '@/components/projects/shared/project-quick-filter-toolbar';
import { createProjectTaskAttachmentUploadHandler } from '@/components/projects/shared/project-attachment-upload-utils';
import {
  clearProjectTaskDetail,
  fetchProjectDetail,
  fetchProjectTaskDetail,
  fetchProjectTasksListview,
  patchProjectTaskDetailField,
  selectProjectDetail,
  selectProjectTaskDetail,
  selectProjectTaskDetailLoading,
  selectProjectTasksListview,
  selectProjectTasksListviewLoading,
  updateProjectTask,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { refreshOpenProjectTaskActivities } from '@/components/projects/shared/project-activity-refresh';
import { cn } from '@/utils/cn';
import {
  TaskStatusScopeProvider,
  useTaskStatusScope,
} from '@/components/projects/shared/task-status-scope-context';
import { fetchProjectStageOptions } from '@/components/projects/project-stage-status-helpers';

function TaskGroupTable({
  group,
  rows,
  onFieldUpdate,
  onOpenTask,
  columnConfig,
  projectId,
  projectFloors,
  showGroupHeader = true,
}) {
  return (
    <div className='flex flex-col gap-2'>
      {showGroupHeader ? (
        <div className='flex items-center gap-1'>
          <Badge.Root
            variant='light'
            color={group.startsWith('S') ? 'blue' : 'orange'}
            size='small'
            className='uppercase'
          >
            {group}
          </Badge.Root>
          <RiArrowUpLine className='size-4 text-text-soft-400' />
        </div>
      ) : null}

      <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <div className='overflow-x-auto'>
          <ProjectDetailTaskTable
            tasks={rows}
            groupId={group}
            columnConfig={columnConfig}
            onFieldUpdate={onFieldUpdate}
            onRowClick={onOpenTask}
            projectId={projectId}
            projectFloors={projectFloors}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProjectTasksSection(props) {
  return (
    <TaskStatusScopeProvider tabKey='task'>
      <ProjectTasksSectionContent {...props} />
    </TaskStatusScopeProvider>
  );
}

function ProjectTasksSectionContent({ projectId }) {
  const { completedStatus, statusOptions } = useTaskStatusScope();
  const dispatch = useDispatch();
  const tasksListview = useSelector(selectProjectTasksListview);
  const isListLoading = useSelector(selectProjectTasksListviewLoading);
  const taskDetailData = useSelector(selectProjectTaskDetail);
  const isDetailLoading = useSelector(selectProjectTaskDetailLoading);
  const projectDetailData = useSelector(selectProjectDetail);

  const [taskGroups, setTaskGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('stage');
  const [groupOrder, setGroupOrder] = useState('desc');
  const [activeFilterSection, setActiveFilterSection] = useState('stage');
  const [selectedFilters, setSelectedFilters] = useState({
    stage: [],
    status: [],
    assignee: [],
    priority: [],
  });
  const [selectedTaskKey, setSelectedTaskKey] = useState(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [stageFilterOptions, setStageFilterOptions] = useState([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const projectFloors = useMemo(() => parseProjectFloors(projectDetailData), [projectDetailData]);

  useEffect(() => {
    let cancelled = false;
    fetchProjectStageOptions()
      .then((options) => {
        if (!cancelled) setStageFilterOptions(options);
      })
      .catch((error) => {
        if (!cancelled) showErrorToast(extractErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filterOptions = useMemo(
    () => ({
      ...PROJECT_DETAIL_FILTER_OPTIONS,
      stage: stageFilterOptions,
      status: toStatusFilterOptions(statusOptions),
    }),
    [stageFilterOptions, statusOptions],
  );

  const columnConfig = useColumnConfig(
    'project-detail-task',
    PROJECT_DETAIL_TASK_COLUMNS,
    saveStoredProjectDetailTaskColumnConfig,
    getStoredProjectDetailTaskColumnConfig,
    { autoSave: true, debounce: 200 },
  );

  const loadTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      await dispatch(
        fetchProjectTasksListview({
          project: projectId,
          keyword: debouncedSearchQuery,
          group_by: buildProjectTasksGroupByParam(groupBy, groupOrder),
          filters: buildProjectTasksListviewFilters(selectedFilters),
        }),
      ).unwrap();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [debouncedSearchQuery, dispatch, groupBy, groupOrder, projectId, selectedFilters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!projectId) return;

    dispatch(fetchProjectDetail(projectId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, projectId]);

  useEffect(() => {
    setTaskGroups(mapProjectTasksListviewToGroups(tasksListview));
  }, [tasksListview]);

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const visibleTaskGroups = useMemo(() => {
    return taskGroups
      .map((group) => {
        const filteredRows = group.rows.filter((row) => {
          if (selectedFilters.status.length > 0 && !selectedFilters.status.includes(row.status)) {
            return false;
          }
          if (
            selectedFilters.priority.length > 0 &&
            !selectedFilters.priority.includes(row.priority)
          ) {
            return false;
          }
          if (!rowMatchesAssigneeFilter(row, selectedFilters.assignee)) {
            return false;
          }
          return true;
        });
        return { ...group, rows: filteredRows };
      })
      .filter((group) => group.rows.length > 0);
  }, [selectedFilters, taskGroups]);

  const flatTaskRows = useMemo(
    () =>
      taskGroups.flatMap((group) =>
        group.rows.map((row) => ({
          ...row,
          groupId: group.id,
        })),
      ),
    [taskGroups],
  );

  const selectedTaskIndex = useMemo(
    () =>
      selectedTaskKey
        ? flatTaskRows.findIndex(
            (row) => row.id === selectedTaskKey.rowId && row.groupId === selectedTaskKey.groupId,
          )
        : -1,
    [flatTaskRows, selectedTaskKey],
  );

  const listSelectedTask = selectedTaskIndex >= 0 ? flatTaskRows[selectedTaskIndex] : null;

  const selectedTask = useMemo(() => {
    if (!selectedTaskKey?.rowId) return null;
    if (taskDetailData?.name === selectedTaskKey.rowId) {
      return mapProjectTaskDetailToRow(taskDetailData, listSelectedTask);
    }
    return listSelectedTask;
  }, [listSelectedTask, selectedTaskKey?.rowId, taskDetailData]);

  const getTaskRowForUpdate = useCallback(
    (taskId, fieldName) => {
      const listRow = flatTaskRows.find((row) => row.id === taskId);
      if (!listRow) return null;

      if (
        fieldName === 'description' &&
        selectedTaskKey?.rowId === taskId &&
        taskDetailData?.name === taskId
      ) {
        return mapProjectTaskDetailToRow(taskDetailData, listRow);
      }

      return listRow;
    },
    [flatTaskRows, selectedTaskKey?.rowId, taskDetailData],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, fieldName, value) => {
      const task = getTaskRowForUpdate(taskId, fieldName);
      if (!taskId || !task) return;

      const originalValue = getProjectTaskRowFieldValue(task, fieldName);
      if (projectTaskFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectTask(buildProjectTaskUpdateFormData(taskId, fieldName, value)),
        ).unwrap();
        showSuccessToast('Task updated successfully');

        setTaskGroups((previous) =>
          previous.map((group) => ({
            ...group,
            rows: group.rows.map((row) =>
              row.id === taskId ? patchProjectTaskRow(row, fieldName, value) : row,
            ),
          })),
        );

        if (selectedTaskKey?.rowId === taskId) {
          dispatch(patchProjectTaskDetailField({ fieldName, value }));
        }

        refreshOpenProjectTaskActivities(dispatch, taskId, selectedTaskKey?.rowId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, getTaskRowForUpdate, selectedTaskKey?.rowId],
  );

  const handleUploadAttachments = useCallback(
    createProjectTaskAttachmentUploadHandler({
      dispatch,
      setIsUploading: setIsUploadingAttachments,
      onAfterUpload: async ({ taskId }) => {
        await loadTasks();
        if (selectedTaskKey?.rowId === taskId) {
          await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
        }
      },
    }),
    [dispatch, loadTasks, selectedTaskKey?.rowId],
  );

  useEffect(() => {
    const taskId = selectedTaskKey?.rowId;
    if (!taskId) return;

    dispatch(fetchProjectTaskDetail(taskId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, selectedTaskKey?.rowId]);

  const activeSectionOptions = filterOptions[activeFilterSection] ?? [];

  const toggleFilterOption = (section, option) => {
    if (option.disabled) return;
    setSelectedFilters((prev) => {
      const current = prev[section] ?? [];
      const nextValues = current.includes(option.value)
        ? current.filter((value) => value !== option.value)
        : [...current, option.value];
      return { ...prev, [section]: nextValues };
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({ stage: [], status: [], assignee: [], priority: [] });
  };

  const openTaskDrawer = (groupId, rowId) => {
    setSelectedTaskKey({ groupId, rowId });
  };

  return (
    <>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='w-full max-w-[300px]'>
            <Input.Root size='xsmall'>
              <Input.Wrapper>
                <Input.Icon as={RiSearch2Line} />
                <Input.Input
                  placeholder='Search here...'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex items-center gap-3'>
            {projectId ? (
              <ProjectFollowersPopover
                projectId={projectId}
                scopeMode='project'
                section='tasks'
                referenceDoctype='Project'
                referenceName={projectId}
                activityLabel='tasks tab'
              />
            ) : null}
            <GroupByToolbarControl
              options={PROJECT_DETAIL_GROUP_BY_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOrder={groupOrder}
              onGroupOrderChange={setGroupOrder}
              size='xsmall'
            />

            <ProjectQuickFilterToolbar
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              completedStatus={completedStatus}
              entityLabel='tasks'
            />
            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter project tasks'
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
                    {PROJECT_DETAIL_FILTER_SECTIONS.map((section) => (
                      <Filter.SidebarItem
                        key={section.id}
                        isActive={activeFilterSection === section.id}
                        onClick={() => setActiveFilterSection(section.id)}
                        count={selectedFilters[section.id]?.length ?? 0}
                        icon={RiArrowRightSLine}
                      >
                        {section.label}
                      </Filter.SidebarItem>
                    ))}
                  </Filter.Sidebar>
                  <Filter.Content width='400px' className='p-2'>
                    <div className='flex flex-col gap-1 overflow-y-auto'>
                      {activeSectionOptions.map((option) => {
                        const checked = (selectedFilters[activeFilterSection] ?? []).includes(
                          option.value,
                        );
                        return (
                          <button
                            key={option.value}
                            type='button'
                            disabled={option.disabled}
                            onClick={() => toggleFilterOption(activeFilterSection, option)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm transition',
                              option.disabled
                                ? 'cursor-not-allowed text-text-disabled-300'
                                : 'text-text-main-900 hover:bg-bg-weak-50',
                            )}
                          >
                            <Checkbox.Root
                              size='medium'
                              checked={checked}
                              disabled={option.disabled}
                              onCheckedChange={() =>
                                toggleFilterOption(activeFilterSection, option)
                              }
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
            <Button.Root variant='neutral' mode='stroke' size='xsmall'>
              <Button.Icon as={RiDownloadLine} />
            </Button.Root>
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
                  aria-label='Manage task columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
            <Button.Root
              variant='primary'
              mode='filled'
              size='xsmall'
              onClick={() => setIsCreateDrawerOpen(true)}
            >
              <Button.Icon as={RiAddLine} />
              Add Task
            </Button.Root>
          </div>
        </div>

        <div className='flex flex-col gap-5 pb-4'>
          {isListLoading ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
              Loading tasks…
            </div>
          ) : visibleTaskGroups.length > 0 ? (
            visibleTaskGroups.map((group) => (
              <TaskGroupTable
                key={group.id}
                group={group.id}
                rows={group.rows}
                columnConfig={columnConfig.columns}
                onFieldUpdate={handleFieldUpdate}
                onOpenTask={openTaskDrawer}
                projectId={projectId}
                projectFloors={projectFloors}
                showGroupHeader={Boolean(groupBy)}
              />
            ))
          ) : (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>No tasks found</p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                Adjust filters or add a new task.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProjectTaskCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        projectId={projectId}
        projectFloors={projectFloors}
        onCreated={() => {
          loadTasks();
        }}
      />

      <ProjectTaskViewDrawer
        open={Boolean(selectedTaskKey)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedTaskKey(null);
            dispatch(clearProjectTaskDetail());
          }
        }}
        task={selectedTask}
        isLoading={isDetailLoading}
        onFieldUpdate={handleFieldUpdate}
        onUploadAttachments={handleUploadAttachments}
        isUploadingAttachments={isUploadingAttachments}
        projectId={projectId}
        projectFloors={projectFloors}
      />
    </>
  );
}
