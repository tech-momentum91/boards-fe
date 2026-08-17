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
  createPartnerMasterTask,
  updatePartnerMasterTask,
  getRolesWithDescription,
  getPartnerMasterColumnPreferences,
  savePartnerMasterColumnPreferences,
  getPartnerMasterTaskList,
  getParticularTaskDetail,
} from '@/redux/settingSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  buildTaskMasterListFilters,
  countTaskMasterAppliedFilters,
  normalizeAssignees,
} from '@/utils/task-utils';
import { useTaskFieldUpdaters } from '@/hooks/use-task-field-updaters';
import TaskViewDrawer from '@/components/client-onboarding/task-view-drawer-partner-master';
import TasksTableCommon from '@/components/client-onboarding/tasks-table-common';
import CreateTaskDrawerCommon from '@/components/client-onboarding/create-task-drawer-common';
import ClientTaskMasterFilterPopover from '@/components/client-onboarding/client-task-master-filter-popover';
import {
  PARTNER_TASK_MASTER_FILTER_OPTION,
  PARTNER_TASK_MASTER_FILTER_TAB_CONFIG,
  PARTNER_TASK_MASTER_FILTERS_KEY,
} from '@/components/partner/constants';

const TASK_TYPE = 'Partner Onboarding';

/** Partial `update_task_master` payload: only `task_id` + fields that changed */
function buildPartnerMasterSingleFieldFormData(taskIdValue, fieldName, value) {
  const form = new FormData();
  form.append('task_id', taskIdValue);

  switch (fieldName) {
    case 'priority':
      form.append('priority', value ?? '');
      break;
    case 'status':
      form.append('status', value ?? '');
      break;
    case 'due_date':
      form.append('due_date', value ?? '');
      break;
    case 'next_update':
      form.append('next_update', value != null && value !== '' ? String(value).trim() : '');
      break;
    case 'assigned_to': {
      const normalized = normalizeAssignees(value);
      form.append('assignees', JSON.stringify(normalized));
      break;
    }
    case 'task_name':
      form.append('subject', value ?? '');
      break;
    case 'tags': {
      const tags = Array.isArray(value) ? value : value ? [value] : [];
      form.append('tags', JSON.stringify(tags.filter(Boolean)));
      break;
    }
    default:
      form.append(String(fieldName), value ?? '');
  }

  return form;
}

function buildPartnerMasterBatchFormData(taskIdValue, changes) {
  const form = new FormData();
  form.append('task_id', taskIdValue);

  Object.entries(changes || {}).forEach(([key, val]) => {
    if (key === 'newAttachments') return;

    if (key === 'task_name') {
      form.append('subject', val ?? '');
      return;
    }
    if (key === 'assigned_to') {
      form.append('assignees', JSON.stringify(normalizeAssignees(val)));
      return;
    }
    if (key === 'tags') {
      const tags = Array.isArray(val) ? val : val ? [val] : [];
      form.append('tags', JSON.stringify(tags.filter(Boolean)));
      return;
    }
    if (
      [
        'description',
        'status',
        'priority',
        'duration',
        'next_update',
        'type',
        'due_date',
        'subject',
      ].includes(key)
    ) {
      form.append(key, val ?? '');
    }
  });

  return form;
}

function batchHasNonTagMasterFields(changes) {
  if (!changes || typeof changes !== 'object') return false;
  return Object.keys(changes).some((key) => key !== 'newAttachments');
}

const PartnerMaster = () => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeOptionsLoading, setAssigneeOptionsLoading] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(PARTNER_TASK_MASTER_FILTER_OPTION);
  const [filterCount, setFilterCount] = useState(0);

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: PARTNER_TASK_MASTER_FILTERS_KEY,
    defaultFilters: PARTNER_TASK_MASTER_FILTER_OPTION,
    persistIncludeKeys: ['status', 'priority'],
    persistTrimStringArrays: true,
  });

  const isCreateLoading = useSelector((state) => state.setting.partnerMaster.createTask.isLoading);

  const partnerTaskList = useSelector((state) => state.setting.partnerMaster.getList.data);
  const columnPreferences = useSelector(
    (state) => state.setting.partnerMaster.columnPreferences.data,
  );

  const dispatch = useDispatch();

  // Use the SAME assignee flow as client task masters: Roles list from settings
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

  const { variant: tableVariant } = useTableVariant('partner-master-table', 'compact');

  const react_table_id = 'partner-master-tasks';

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (filtersInitialized) return;
    const merged = { ...PARTNER_TASK_MASTER_FILTER_OPTION, ...persistedFilters };
    setAppliedFilters(merged);
    setFilterCount(countTaskMasterAppliedFilters(merged));
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactFiltersForSessionStorage(
      appliedFilters,
      PARTNER_TASK_MASTER_FILTER_OPTION,
    );
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

  const tasks = useMemo(() => partnerTaskList?.results || [], [partnerTaskList]);

  const apiColumns = useMemo(() => {
    // Important: don't derive column defs from columnPreferences state.
    // Column preferences are user visibility/order settings; using them as "column schema"
    // causes the table schema to change after preferences load and can trigger render loops.
    return partnerTaskList?.columns || partnerTaskList?.message?.columns || [];
  }, [partnerTaskList]);

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

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(allColumnDefs),
    [allColumnDefs],
  );

  const columnConfigHook = useColumnConfig(
    react_table_id,
    defaultColumnConfig,
    async (cols) => {
      await dispatch(
        savePartnerMasterColumnPreferences({ columns: cols, react_table_id }),
      ).unwrap();
    },
    async () => {
      const result = await dispatch(getPartnerMasterColumnPreferences({ react_table_id })).unwrap();
      return result?.message || result?.data || result || [];
    },
    { autoSave: true, debounce: 300 },
  );

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
        if (currentSorting.direction === 'asc') {
          return { field, direction: 'desc' };
        }
        if (currentSorting.direction === 'desc') {
          return null;
        }
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
        const result = await dispatch(createPartnerMasterTask(apiFormData)).unwrap();

        dispatch(
          getPartnerMasterTaskList({
            task_type: TASK_TYPE,
            keyword: debouncedSearchTerm.trim() || undefined,
            ...(Object.keys(buildTaskMasterListFilters(appliedFilters)).length > 0
              ? { filters: JSON.stringify(buildTaskMasterListFilters(appliedFilters)) }
              : {}),
          }),
        );

        if (result?.message) {
          showSuccessToast(result?.message?.message || 'Task created successfully');
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

  const fetchPartnerTaskList = useCallback(
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

        await dispatch(getPartnerMasterTaskList(payload)).unwrap();
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage);
      }
    },
    [dispatch, appliedFilters],
  );

  useEffect(() => {
    if (!filtersInitialized) return;
    fetchPartnerTaskList(debouncedSearchTerm, sorting);
  }, [debouncedSearchTerm, sorting, appliedFilters, filtersInitialized, fetchPartnerTaskList]);

  const handleTaskClick = useCallback(
    async (task) => {
      const taskTitle = task.task_name || task.subject;
      if (!taskTitle) return;

      try {
        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: task.name || task.task_id || task.id,
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
            tm_id: taskFromList?.name || taskFromList?.task_id || taskId,
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
        let allChanges = null;

        if (isBatchUpdate) {
          allChanges = fieldNameOrChanges;
          Object.entries(allChanges).forEach(([key, value_]) => {
            if (key === 'task_name') {
              updateData.subject = value_;
              taskSubject = value_ || taskSubject;
            } else if (key === 'assigned_to') {
              updateData.assignees = value_;
            } else {
              updateData[key] = value_;
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

        const apiFormData = isBatchUpdate
          ? buildPartnerMasterBatchFormData(taskIdValue, allChanges)
          : buildPartnerMasterSingleFieldFormData(taskIdValue, fieldNameOrChanges, value);

        const shouldCallMasterUpdate = isBatchUpdate
          ? batchHasNonTagMasterFields(allChanges)
          : true;

        const result = shouldCallMasterUpdate
          ? await dispatch(updatePartnerMasterTask(apiFormData)).unwrap()
          : null;

        const tagsChanged = isBatchUpdate
          ? Boolean(allChanges && Object.prototype.hasOwnProperty.call(allChanges, 'tags'))
          : fieldNameOrChanges === 'tags';

        // Inline edits: refresh only the listview so the row reflects latest data.
        await fetchPartnerTaskList(debouncedSearchTerm, sorting);

        if (shouldCallMasterUpdate && result?.message) {
          showSuccessToast(
            result?.message?.message || result?.message || 'Task updated successfully',
          );
        } else if (shouldCallMasterUpdate) {
          showSuccessToast('Task updated successfully');
        } else if (tagsChanged) {
          showSuccessToast('Tags updated successfully');
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task. Please try again.');
      }
    },
    [dispatch, fetchPartnerTaskList, debouncedSearchTerm, sorting, selectedTask, tasks],
  );

  const handleAssigneeUpdate = useCallback(
    async (taskId, assignees) => {
      const normalizedAssignees = normalizeAssignees(assignees);
      await handleFieldUpdate(taskId, 'assigned_to', normalizedAssignees);
    },
    [handleFieldUpdate],
  );

  const { handlePriorityUpdate, handleStatusUpdate, handleDueDateUpdate } =
    useTaskFieldUpdaters(handleFieldUpdate);

  const handleRefreshTask = useCallback(
    async (refreshInfo) => {
      if (!selectedTask && !refreshInfo?.subject) return;

      try {
        const taskTitle = refreshInfo?.subject || selectedTask?.task_name || selectedTask?.subject;

        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: selectedTask.name || selectedTask.task_id || selectedTask.id,
            subject: taskTitle,
            type: TASK_TYPE,
          }),
        ).unwrap();

        const taskData = response?.message?.data || response?.data || response;
        if (taskData) {
          setSelectedTask({ ...taskData });
        }
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, selectedTask],
  );

  return (
    <div className='w-full flex flex-col gap-5 items-center justify-center'>
      <div className='w-full flex items-center justify-between gap-[16px]'>
        <div className='w-1/2 flex flex-col items-start justify-start gap-1'>
          <span className='text-text-main-900 text-label-sm'>Partner Master Tasks</span>
          <span className='text-text-sub-500 text-paragraph-xs'>
            Configure default tasks for newly created partners
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
              tabConfig={PARTNER_TASK_MASTER_FILTER_TAB_CONFIG}
              appliedFilters={appliedFilters}
              onAppliedFiltersChange={handleAppliedFiltersChange}
              filterCount={filterCount}
              tooltipContent='Filter'
              ariaLabel='Filter partner task master tasks'
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

      <TaskViewDrawer
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
      />

      <CreateTaskDrawerCommon
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={isCreateLoading}
        taskType={TASK_TYPE}
        showTagsInput={false}
        showRecurring={false}
      />
    </div>
  );
};

export default PartnerMaster;
