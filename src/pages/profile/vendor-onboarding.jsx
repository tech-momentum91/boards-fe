import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as Input from '@/components/ui/input';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  createVendorOnboardingTask,
  updateVendorOnboardingTask,
  getVendorOnboardingColumnPreferences,
  saveVendorOnboardingColumnPreferences,
  getVendorOnboardingTaskList,
  getParticularTaskDetail,
  getRolesWithDescription,
} from '@/redux/settingSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { buildTaskMasterListFilters, countTaskMasterAppliedFilters } from '@/utils/task-utils';
import { useTaskFieldUpdaters } from '@/hooks/use-task-field-updaters';
import TaskViewDrawerCommon from '@/components/client-onboarding/task-view-drawer-common';
import TasksTableCommon from '@/components/client-onboarding/tasks-table-common';
import CreateTaskDrawerCommon from '@/components/client-onboarding/create-task-drawer-common';
import ClientTaskMasterFilterPopover from '@/components/client-onboarding/client-task-master-filter-popover';
import {
  FILTER_OPTION,
  TASK_FILTER_TAB_CONFIG,
  VENDOR_TASK_MASTER_ONBOARDING_FILTERS_KEY,
} from '@/components/vendors-management/constants';

const TASK_TYPE = 'Vendor Onboarding';
const TABLE_STORAGE_KEY = 'vendor-onboarding-table';

const VendorOnboarding = () => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeOptionsLoading, setAssigneeOptionsLoading] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(FILTER_OPTION);
  const [filterCount, setFilterCount] = useState(0);

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: VENDOR_TASK_MASTER_ONBOARDING_FILTERS_KEY,
    defaultFilters: FILTER_OPTION,
    persistIncludeKeys: ['status', 'priority'],
    persistTrimStringArrays: true,
  });

  const react_table_id = 'vendor-onboarding-tasks';
  const { isLoading: isCreateVendorOnboardingTaskLoading } = useSelector(
    (state) => state.setting.vendorOnboarding.createTask.isLoading,
  );

  const { data: vendorOnboardingTaskList } = useSelector(
    (state) => state.setting.vendorOnboarding.getList,
  );

  const { data: columnPreferences } = useSelector(
    (state) => state.setting.vendorOnboarding.columnPreferences,
  );

  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setAssigneeOptionsLoading(true);
      try {
        const response = await dispatch(getRolesWithDescription()).unwrap();
        const list = response?.message ?? response ?? [];
        const arr = Array.isArray(list) ? list : [];
        const options = arr
          .map((role) => {
            const value = role?.name ?? role?.role ?? role?.value ?? String(role);
            const label = role?.name ?? role?.description ?? role?.role ?? value;
            return value ? { value, label } : null;
          })
          .filter(Boolean);
        if (mounted) setAssigneeOptions(options);
      } catch {
        if (mounted) setAssigneeOptions([]);
      } finally {
        if (mounted) setAssigneeOptionsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    TABLE_STORAGE_KEY,
    'compact',
  );

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (filtersInitialized) return;
    const merged = { ...FILTER_OPTION, ...persistedFilters };
    setAppliedFilters(merged);
    setFilterCount(countTaskMasterAppliedFilters(merged));
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactFiltersForSessionStorage(appliedFilters, FILTER_OPTION);
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  const handleAppliedFiltersChange = useCallback((nextFilters) => {
    setAppliedFilters({
      status: nextFilters.status || [],
      priority: nextFilters.priority || [],
    });
    setFilterCount((nextFilters.status?.length || 0) + (nextFilters.priority?.length || 0));
  }, []);

  const tasks = useMemo(() => vendorOnboardingTaskList?.results || [], [vendorOnboardingTaskList]);

  const apiColumns = useMemo(() => {
    return (
      vendorOnboardingTaskList?.columns ||
      vendorOnboardingTaskList?.message?.columns ||
      columnPreferences ||
      []
    );
  }, [vendorOnboardingTaskList, columnPreferences]);

  const apiColumnIdMap = useMemo(
    () => ({
      task_name: 'task',
      assignees: 'assigned_to',
      duration: 'duration',
      tags: 'tags',
      priority: 'priority',
      status: 'status',
    }),
    [],
  );

  const allColumnDefs = useMemo(() => {
    if (apiColumns && apiColumns.length > 0) {
      return apiColumns.map((apiCol) => {
        const tableColumnId = apiColumnIdMap[apiCol.id] || apiCol.id;
        let label = apiCol.label || apiCol.id;
        if (label === 'Assignees' || label.toLowerCase() === 'assignees') {
          label = 'Assignee';
        }
        return {
          id: tableColumnId,
          label,
          visible: apiCol.visible !== false,
        };
      });
    }

    return [
      { id: 'task', label: 'Task', visible: true },
      { id: 'assigned_to', label: 'Assignee', visible: true },
      { id: 'duration', label: 'Duration', visible: true },
      { id: 'tags', label: 'Tags', visible: true },
      { id: 'priority', label: 'Priority', visible: true },
      { id: 'status', label: 'Status', visible: true },
    ];
  }, [apiColumns, apiColumnIdMap]);

  // Stable identity for useColumnConfig: Redux/API often replaces column arrays with new references
  // even when content is unchanged; that would retrigger the hook's load effect and spam the API.
  const columnDefsContentKey = useMemo(
    () =>
      JSON.stringify(
        allColumnDefs.map((c) => ({
          id: c.id,
          label: c.label,
          visible: c.visible !== false,
          enableHiding: c.enableHiding,
        })),
      ),
    [allColumnDefs],
  );

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(allColumnDefs),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures semantic column shape
    [columnDefsContentKey],
  );

  const columnConfigHook = useColumnConfig(
    react_table_id,
    defaultColumnConfig,
    async (cols) => {
      await dispatch(
        saveVendorOnboardingColumnPreferences({ columns: cols, react_table_id }),
      ).unwrap();
    },
    async () => {
      const result = await dispatch(
        getVendorOnboardingColumnPreferences({ react_table_id }),
      ).unwrap();
      return result?.message || result?.data || result || [];
    },
    { autoSave: true, debounce: 300 },
  );
  useEffect(() => {
    dispatch(getVendorOnboardingColumnPreferences({ react_table_id }));
  }, [dispatch, react_table_id]);

  const visibleColumns = useMemo(() => {
    return columnConfigHook.visibleColumns
      .filter((col) => col.id !== 'task_type' && col.id !== 'task_name')
      .map((col) => ({
        id: col.id,
        label: col.label || col.id,
      }));
  }, [columnConfigHook.visibleColumns]);

  const columnLabelsMap = useMemo(() => {
    const labelsMap = {};
    if (apiColumns && apiColumns.length > 0) {
      apiColumns.forEach((apiCol) => {
        const tableColumnId = apiColumnIdMap[apiCol.id] || apiCol.id;
        let label = apiCol.label || apiCol.id;
        if (label === 'Assignees' || label.toLowerCase() === 'assignees') {
          label = 'Assignee';
        }
        labelsMap[tableColumnId] = label;
      });
    }
    return labelsMap;
  }, [apiColumns, apiColumnIdMap]);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleSortChange = useCallback((field) => {
    setSorting((currentSorting) => {
      if (currentSorting?.field === field) {
        if (currentSorting.direction === 'asc') return { field, direction: 'desc' };
        if (currentSorting.direction === 'desc') return null;
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const handleAddTask = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const handleCreateTask = useCallback(
    async (formData) => {
      const apiFormData = new FormData();

      apiFormData.append('subject', formData.taskTitle);
      apiFormData.append('description', formData.description);
      apiFormData.append('status', formData.status);
      apiFormData.append('priority', formData.priority);
      apiFormData.append('type', TASK_TYPE);
      apiFormData.append('duration', formData.duration);
      if (formData.next_update != null && String(formData.next_update).trim() !== '') {
        apiFormData.append('next_update', String(formData.next_update).trim());
      }
      if (Array.isArray(formData.assignedTo) && formData.assignedTo.length > 0) {
        apiFormData.append('assignees', JSON.stringify(formData.assignedTo));
      } else if (formData.assignedTo) {
        apiFormData.append('assignees', JSON.stringify([formData.assignedTo]));
      }

      formData.attachment?.forEach((item) => {
        apiFormData.append('attachment', item.file);
      });

      if (formData.tagArr.length > 0) {
        apiFormData.append('tags', JSON.stringify(formData.tagArr));
      }

      try {
        const result = await dispatch(createVendorOnboardingTask(apiFormData)).unwrap();

        dispatch(
          getVendorOnboardingTaskList({
            task_type: TASK_TYPE,
            keyword: debouncedSearchTerm.trim() || undefined,
            ...(Object.keys(buildTaskMasterListFilters(appliedFilters)).length > 0
              ? { filters: JSON.stringify(buildTaskMasterListFilters(appliedFilters)) }
              : {}),
          }),
        );

        if (result?.message) {
          showSuccessToast(result?.message?.message);
          return true;
        }
        return false;
      } catch (error) {
        showErrorToast(error);
        return false;
      }
    },
    [dispatch, debouncedSearchTerm, appliedFilters],
  );

  const fetchVendorOnboardingTaskList = useCallback(
    async (keyword = '', orderBy = null, filters = appliedFilters) => {
      try {
        const payload = {
          task_type: TASK_TYPE,
          keyword: keyword.trim() || undefined,
        };

        if (orderBy?.field && orderBy?.direction) {
          payload.order_by = `${orderBy.field} ${orderBy.direction}`;
        }

        const apiFilters = buildTaskMasterListFilters(filters);
        if (Object.keys(apiFilters).length > 0) {
          payload.filters = JSON.stringify(apiFilters);
        }

        await dispatch(getVendorOnboardingTaskList(payload)).unwrap();
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage);
      }
    },
    [dispatch, appliedFilters],
  );

  useEffect(() => {
    if (!filtersInitialized) return;
    fetchVendorOnboardingTaskList(debouncedSearchTerm, sorting);
  }, [
    debouncedSearchTerm,
    sorting,
    appliedFilters,
    filtersInitialized,
    fetchVendorOnboardingTaskList,
  ]);

  const handleTaskClick = useCallback(
    async (task) => {
      const taskTitle = task.task_name || task.subject;
      if (!taskTitle) return;

      try {
        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: task.name,
            subject: taskTitle,
            type: TASK_TYPE,
          }),
        ).unwrap();

        const taskData = response?.message?.data || response?.data || response;

        if (taskData) {
          setSelectedTask(taskData);
          setIsViewDrawerOpen(true);
        }
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch],
  );

  const handleTaskChange = useCallback(
    async (taskId) => {
      if (!taskId) return;

      try {
        const taskFromList = tasks.find(
          (t) => (t.name || t.id || t.subject || t.task_name) === taskId,
        );
        const taskSubject = taskFromList?.task_name || taskFromList?.subject || taskId;

        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: taskFromList?.name || taskFromList?.id || taskId,
            subject: taskSubject,
            type: TASK_TYPE,
          }),
        ).unwrap();

        const taskData = response?.message?.data || response?.data || response;

        if (taskData) {
          setSelectedTask(taskData);
        }
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, tasks],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, fieldNameOrChanges, value) => {
      let existingTask = selectedTask;
      if (!existingTask && taskId) {
        existingTask = tasks.find(
          (t) => t.name === taskId || t.task_id === taskId || t.id === taskId,
        );
      }

      if (!existingTask) {
        showErrorToast('Task data not available. Please refresh and try again.');
        return;
      }

      try {
        const taskIdValue = existingTask.name || existingTask.task_id || taskId;
        let taskSubject = existingTask.subject || existingTask.task_name || taskId;

        const isBatchUpdate =
          typeof fieldNameOrChanges === 'object' &&
          fieldNameOrChanges !== null &&
          !Array.isArray(fieldNameOrChanges);

        const updateData = { ...existingTask };
        let newAttachments = null;
        let allChanges = null;

        if (isBatchUpdate) {
          allChanges = fieldNameOrChanges;
          Object.entries(allChanges).forEach(([key, value_]) => {
            if (key === 'newAttachments') {
              newAttachments = value_;
            } else if (key !== 'tags') {
              if (key === 'task_name') {
                updateData.subject = value_;
                taskSubject = value_ || taskSubject;
              } else if (key === 'assigned_to') {
                updateData.assignees = value_;
              } else {
                updateData[key] = value_;
              }
            }
          });
        } else {
          const fieldName = fieldNameOrChanges;
          if (fieldName === 'task_name') {
            updateData.subject = value;
            taskSubject = value || taskSubject;
          } else if (fieldName === 'assigned_to') {
            updateData.assignees = value;
          } else {
            updateData[fieldName] = value;
          }
        }

        const apiFormData = new FormData();
        apiFormData.append('task_id', taskIdValue);
        apiFormData.append('subject', updateData.subject || taskSubject);
        apiFormData.append('description', updateData.description || '');
        apiFormData.append('status', updateData.status || '');
        apiFormData.append('priority', updateData.priority || '');
        apiFormData.append('type', updateData.type || TASK_TYPE);
        apiFormData.append('duration', updateData.duration || '');
        if (updateData.next_update != null && String(updateData.next_update).trim() !== '') {
          apiFormData.append('next_update', String(updateData.next_update).trim());
        }

        if (updateData.due_date !== undefined) {
          apiFormData.append('due_date', updateData.due_date || '');
        }
        if (updateData.assignees || updateData.assigned_to) {
          const assigneesRaw = updateData.assignees || updateData.assigned_to;
          const assigneesArray = Array.isArray(assigneesRaw) ? assigneesRaw : [assigneesRaw];
          const assigneesPayload = assigneesArray
            .map((a) => ({
              assignee_type: 'Role',
              assignee: typeof a === 'string' ? a : a?.name || a?.value || a?.label || '',
            }))
            .filter((a) => a.assignee);
          if (assigneesPayload.length > 0) {
            apiFormData.append('assignees', JSON.stringify(assigneesPayload));
          }
        }

        const tagsChanged = isBatchUpdate
          ? allChanges && Object.prototype.hasOwnProperty.call(allChanges, 'tags')
          : fieldNameOrChanges === 'tags';
        if (tagsChanged) {
          const toStringTag = (tag) =>
            typeof tag === 'string' ? tag : tag?.name || tag?.label || tag;
          const tagsValue = isBatchUpdate ? allChanges?.tags : value;
          const tagsArray = Array.isArray(tagsValue)
            ? tagsValue.map(toStringTag).filter(Boolean)
            : tagsValue
              ? [toStringTag(tagsValue)].filter(Boolean)
              : [];
          apiFormData.append('tags', JSON.stringify(tagsArray));
        }

        const existingAttachments =
          existingTask.attachments ||
          existingTask._attachments ||
          existingTask.attachments_info ||
          [];

        if (newAttachments && Array.isArray(newAttachments) && newAttachments.length > 0) {
          if (Array.isArray(existingAttachments) && existingAttachments.length > 0) {
            existingAttachments.forEach((attachment) => {
              const fileName =
                attachment?.file_name ||
                attachment?.filename ||
                attachment?.file ||
                attachment?.name ||
                attachment?.file_url ||
                '';
              if (fileName) {
                apiFormData.append('existing_attachment_names', fileName);
              }
            });
          }
          newAttachments.forEach((attachment) => {
            if (attachment.file) {
              apiFormData.append('attachment', attachment.file);
            }
          });
        }

        const result = await dispatch(updateVendorOnboardingTask(apiFormData)).unwrap();

        await fetchVendorOnboardingTaskList(debouncedSearchTerm);

        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: taskIdValue,
            subject: taskSubject,
            type: TASK_TYPE,
          }),
        ).unwrap();

        const taskData = response?.message?.data || response?.data || response;
        if (taskData) setSelectedTask(taskData);

        if (result?.message) {
          showSuccessToast(
            result?.message?.message || result?.message || 'Task updated successfully',
          );
        } else {
          showSuccessToast('Task updated successfully');
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task. Please try again.');
      }
    },
    [dispatch, fetchVendorOnboardingTaskList, debouncedSearchTerm, selectedTask, tasks],
  );

  const handleAssigneeUpdate = useCallback(
    async (taskId, assignees) => {
      await handleFieldUpdate(taskId, 'assigned_to', assignees);
    },
    [handleFieldUpdate],
  );

  const { handlePriorityUpdate, handleStatusUpdate, handleDueDateUpdate } =
    useTaskFieldUpdaters(handleFieldUpdate);

  const handleRefreshTask = useCallback(async () => {
    if (!selectedTask) return;

    try {
      const taskTitle = selectedTask.task_name || selectedTask.subject;

      const response = await dispatch(
        getParticularTaskDetail({
          tm_id: selectedTask.name,
          subject: taskTitle,
          type: TASK_TYPE,
        }),
      ).unwrap();

      const taskData = response?.message?.data || response?.data || response;
      if (taskData) setSelectedTask({ ...taskData });
    } catch (error) {
      showErrorToast(error);
    }
  }, [dispatch, selectedTask]);

  return (
    <div className='w-full flex flex-col gap-5 items-center justify-center'>
      <div className='w-full flex items-center justify-between gap-[16px]'>
        <div className='w-1/2 flex flex-col items-start justify-start gap-1'>
          <span className='text-text-main-900 text-label-sm'>Vendor Onboarding</span>
          <span className='text-text-sub-500 text-paragraph-xs'>
            Manage vendor onboarding tasks
          </span>
        </div>

        <div className='w-1/2 flex items-center justify-end gap-[16px]'>
          <div className='w-full'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  value={searchTerm}
                  onChange={handleSearchChange}
                  type='text'
                  placeholder='Search tasks'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='flex items-center gap-3'>
            <ClientTaskMasterFilterPopover
              tabConfig={TASK_FILTER_TAB_CONFIG}
              appliedFilters={appliedFilters}
              onAppliedFiltersChange={handleAppliedFiltersChange}
              filterCount={filterCount}
              tooltipContent='Filter'
              ariaLabel='Filter vendor onboarding tasks'
            />
            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              config={columnConfigHook}
              tooltipContent={<p>Manage columns</p>}
              trigger={
                <Button.Root variant='neutral' mode='stroke' size='small'>
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              type='button'
              onClick={handleAddTask}
              className='px-4 gap-[8px]'
            >
              <Button.Icon as={RiAddLine} />
              Add Task
            </Button.Root>
          </div>
        </div>
      </div>

      <div className='w-full overflow-x-auto'>
        <TasksTableCommon
          tasks={tasks}
          tableVariant={tableVariant}
          sorting={sorting}
          onTaskClick={handleTaskClick}
          onSortChange={handleSortChange}
          searchTerm={searchTerm}
          columns={visibleColumns}
          visibleColumnConfig={visibleColumns}
          columnLabels={columnLabelsMap}
          onAssigneeUpdate={handleAssigneeUpdate}
          assigneeOptions={assigneeOptions}
          assigneeOptionsLoading={assigneeOptionsLoading}
          onPriorityUpdate={handlePriorityUpdate}
          onStatusUpdate={handleStatusUpdate}
          onDueDateUpdate={handleDueDateUpdate}
        />
      </div>

      <TaskViewDrawerCommon
        isOpen={isViewDrawerOpen}
        onClose={() => {
          setIsViewDrawerOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onFieldUpdate={handleFieldUpdate}
        onRefresh={handleRefreshTask}
        tasks={tasks}
        onTaskChange={handleTaskChange}
        showRecurring={false}
        taskType={TASK_TYPE}
      />

      <CreateTaskDrawerCommon
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={isCreateVendorOnboardingTaskLoading}
        taskType={TASK_TYPE}
        showTagsInput={false}
        showRecurring={false}
      />
    </div>
  );
};

export default VendorOnboarding;
