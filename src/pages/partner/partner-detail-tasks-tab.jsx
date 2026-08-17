import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as Input from '@/components/ui/input';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  createPartnerCrmTask,
  fetchPartnerCrmTaskList,
  getPartnerCrmTaskDetail,
  fetchPartnerMasterAssigneesByRoles,
  selectPartnerMasterAssignees,
  updatePartnerTaskField,
} from '@/redux/partnerSlice';
import { fetchTaskColumnList, updateTaskColumnList } from '@/redux/clientDetailSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { normalizeAssignees } from '@/utils/task-utils';
import { useTaskFieldUpdaters } from '@/hooks/use-task-field-updaters';
import TaskViewDrawerPartnerCrm from '@/components/partner/partner-task-drawer';
import TasksTableCommon from '@/components/client-onboarding/tasks-table-common';
import CreateTaskDrawerCommon from '@/components/client-onboarding/create-task-drawer-common';
import * as Tooltip from '@/components/ui/tooltip';
import {
  PARTNER_INDIVIDUAL_CRM_TASK_STATUS_OPTIONS,
  PARTNER_INDIVIDUAL_CRM_TASK_DEFAULT_STATUS,
} from '@/components/partner/constants';
import { useScopedTaskStatusOptions } from '@/hooks/use-status-options';

const PARTNER_CRM_TASKS_TABLE_ID = 'partner-onboarding-crm-tasks';

const normalizeAssigneesForDiff = (input) => {
  if (!input) return [];

  let value = input;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        value = trimmed;
      }
    } else if (trimmed.includes(',')) {
      value = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return normalizeAssignees(value);
};

function computeExpEndDateForPartnerCreate(formData) {
  const direct = formData.next_update_date != null ? String(formData.next_update_date).trim() : '';
  return direct;
}

function mapTaskTableFieldToApiField(fieldName) {
  if (fieldName === 'task_name') return 'subject';
  if (fieldName === 'due_date') return 'exp_end_date';
  return fieldName;
}

/** Normalize get_task_detailed_view payload (aligned with vendor task detail unwrap). */
function extractPartnerTaskDetail(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return payload.data ?? payload.message?.data ?? payload.message ?? payload;
}

const PartnerDetailTasksTab = ({ partnerDocName }) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const isCreateLoading = useSelector(
    (state) => state.partner.partnerCrmTasks.createTask.isLoading,
  );
  const isLoading = useSelector((state) => state.partner.partnerCrmTasks.getList.isLoading);

  const partnerTaskList = useSelector((state) => state.partner.partnerCrmTasks.getList.data);
  const isLoadingMore = useSelector((state) => state.partner.partnerCrmTasks.getList.isLoadingMore);
  const hasMore = useSelector((state) => state.partner.partnerCrmTasks.getList.has_more);
  const currentPage = useSelector((state) => state.partner.partnerCrmTasks.getList.page);
  const pageSize = useSelector((state) => state.partner.partnerCrmTasks.getList.page_size);
  const { users: partnerSalesAssignees, status: partnerMasterAssigneesStatus } = useSelector(
    selectPartnerMasterAssignees,
  );
  const partnerSalesAssigneesLoading =
    partnerMasterAssigneesStatus === 'loading' || partnerMasterAssigneesStatus === 'idle';

  const dispatch = useDispatch();
  const [statusOptionsKey, setStatusOptionsKey] = useState(0);
  const { options: partnerTaskStatusOptions } = useScopedTaskStatusOptions({
    context: 'Partner Onboarding',
    fallback: PARTNER_INDIVIDUAL_CRM_TASK_STATUS_OPTIONS,
    refreshKey: statusOptionsKey,
  });

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'partner-detail-crm-tasks-table',
    'compact',
  );

  console.log('tableVariant is ....', tableVariant);
  console.log('toggleTableVariant is ....', toggleTableVariant);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const tasks = useMemo(() => {
    const rows = partnerTaskList?.results || [];
    return rows.map((r) => ({
      ...r,
      name: r?.name || r?.task_id || r?.id || r?.subject || r?.task_name,
      task_id: r?.task_id || r?.name || r?.id,
      due_date: r.due_date || r.exp_end_date || r.custom_due_date || '',
      task_name: r.task_name || r.subject,
    }));
  }, [partnerTaskList]);

  const apiColumns = useMemo(
    () => partnerTaskList?.columns || partnerTaskList?.message?.columns || [],
    [partnerTaskList],
  );

  const apiColumnIdMap = useMemo(
    () => ({
      task_name: 'task',
      assignees: 'assigned_to',
      duration: 'due_date',
      exp_end_date: 'due_date',
      due_date: 'due_date',
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
      { id: 'due_date', label: 'Due Date', visible: true },
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
    PARTNER_CRM_TASKS_TABLE_ID,
    defaultColumnConfig,
    async (cols) => {
      await dispatch(
        updateTaskColumnList({ columns: cols, react_table_id: PARTNER_CRM_TASKS_TABLE_ID }),
      ).unwrap();
    },
    async () => {
      const result = await dispatch(
        fetchTaskColumnList({ react_table_id: PARTNER_CRM_TASKS_TABLE_ID }),
      ).unwrap();
      return result?.message || result?.data || result || [];
    },
    { autoSave: true, debounce: 300 },
  );

  const visibleColumns = useMemo(() => {
    return columnConfigHook.visibleColumns
      .filter((col) => col.id !== 'task_type' && col.id !== 'task_name')
      .map((col) => {
        if (col.id === 'duration') {
          return { id: 'due_date', label: 'Due Date' };
        }
        return {
          id: col.id,
          label: col.label || col.id,
        };
      });
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

  const fetchList = useCallback(
    async (keyword = '', orderBy = null, { page = 1, page_size = 20, append = false } = {}) => {
      if (!partnerDocName) return;
      try {
        const payload = {
          partnerDocName,
          keyword: keyword.trim() || '',
          page,
          page_size,
          append,
        };
        if (orderBy?.field && orderBy?.direction) {
          const sortField = orderBy.field === 'due_date' ? 'exp_end_date' : orderBy.field;
          payload.order_by = `${sortField} ${orderBy.direction}`;
        }
        await dispatch(fetchPartnerCrmTaskList(payload)).unwrap();
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage);
      }
    },
    [dispatch, partnerDocName],
  );

  useEffect(() => {
    if (!partnerDocName) return;
    fetchList(debouncedSearchTerm, sorting, { page: 1, page_size: pageSize, append: false });
  }, [debouncedSearchTerm, sorting, fetchList, partnerDocName]);

  const handleLoadMore = useCallback(() => {
    if (!partnerDocName) return;
    if (isLoading || isLoadingMore || !hasMore) return;
    fetchList(debouncedSearchTerm, sorting, {
      page: (Number(currentPage) || 1) + 1,
      page_size: Number(pageSize) || 20,
      append: true,
    });
  }, [
    partnerDocName,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchList,
    debouncedSearchTerm,
    sorting,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    dispatch(fetchPartnerMasterAssigneesByRoles());
  }, [dispatch]);

  const handleCreateTask = useCallback(
    async (formData) => {
      if (!partnerDocName) {
        showErrorToast('Partner is not loaded yet.');
        return false;
      }

      const expEnd = computeExpEndDateForPartnerCreate(formData);
      if (!expEnd) {
        showErrorToast('Please set a due date.');
        return false;
      }

      const apiFormData = new FormData();
      apiFormData.append('subject', formData.taskTitle);
      apiFormData.append('description', formData.description || '');
      apiFormData.append('status', formData.status);
      apiFormData.append('priority', formData.priority);
      apiFormData.append('type', 'Partner Onboarding');
      apiFormData.append('exp_end_date', expEnd);
      const nextUpdate = String(formData.custom_next_update_date || '').trim();
      if (nextUpdate) {
        apiFormData.append('custom_next_update_date', nextUpdate);
      }
      apiFormData.append('custom_ref_doctype', 'Partner');
      apiFormData.append('custom_ref_docname', partnerDocName);

      const assigneeList = formData.assignedTo ? [formData.assignedTo].flat().filter(Boolean) : [];
      if (assigneeList.length > 0) {
        apiFormData.append('assignees', JSON.stringify(assigneeList));
      }

      formData.attachment?.forEach((item) => {
        if (item?.file) {
          apiFormData.append('attachments', item.file);
        }
      });

      if (formData.tagArr?.length > 0) {
        apiFormData.append('tags', JSON.stringify(formData.tagArr));
      }

      try {
        const result = await dispatch(createPartnerCrmTask(apiFormData)).unwrap();
        await fetchList(debouncedSearchTerm, sorting);
        showSuccessToast(
          result?.message?.message || result?.message || 'Task created successfully',
        );
        return true;
      } catch (error) {
        showErrorToast(error);
        return false;
      }
    },
    [dispatch, partnerDocName, fetchList, debouncedSearchTerm, sorting],
  );

  const handleTaskClick = useCallback(
    async (task) => {
      const taskId = task.name || task.task_id || task.id;
      if (!taskId) return;

      try {
        const response = await dispatch(
          getPartnerCrmTaskDetail({
            task_id: taskId,
            task_type: 'Partner Onboarding',
            partner: partnerDocName,
          }),
        ).unwrap();

        const taskData = extractPartnerTaskDetail(response);

        if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
          setSelectedTask(taskData);
          setIsViewDrawerOpen(true);
        }
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, partnerDocName],
  );

  const handleTaskChange = useCallback(
    async (taskId) => {
      if (!taskId) return;

      try {
        const taskFromList = tasks.find(
          (t) => (t.name || t.task_id || t.id || t.subject || t.task_name) === taskId,
        );
        const resolvedId =
          taskFromList?.name || taskFromList?.task_id || taskFromList?.id || taskId;

        const response = await dispatch(
          getPartnerCrmTaskDetail({
            task_id: resolvedId,
            task_type: 'Partner Onboarding',
            partner: partnerDocName,
          }),
        ).unwrap();

        const taskData = extractPartnerTaskDetail(response);

        if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
          setSelectedTask(taskData);
        }
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, tasks, partnerDocName],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, fieldName, value) => {
      if (!taskId || !fieldName) return;

      try {
        const apiField = mapTaskTableFieldToApiField(fieldName);
        let apiValue = value;
        if (apiField === 'tags') {
          apiValue = Array.isArray(value)
            ? value
                .map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.label || tag))
                .filter(Boolean)
            : value
              ? [
                  typeof value === 'string' ? value : value?.name || value?.label || String(value),
                ].filter(Boolean)
              : [];
        }

        await dispatch(
          updatePartnerTaskField({
            taskName: taskId,
            fieldName: apiField,
            value: apiValue,
          }),
        ).unwrap();

        await fetchList(debouncedSearchTerm, sorting);
        showSuccessToast('Task updated successfully');
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task. Please try again.');
      }
    },
    [dispatch, fetchList, debouncedSearchTerm, sorting],
  );

  const handleAssigneeUpdate = useCallback(
    async (taskId, assignees) => {
      if (!taskId) return;
      const nextAssignees = normalizeAssigneesForDiff(assignees);
      const row = (Array.isArray(tasks) ? tasks : []).find(
        (t) => String(t?.name || t?.task_id || t?.id) === String(taskId),
      );
      const currentAssigneesRaw =
        row?.assignees || row?.assigned_to || row?.assignedTo || row?.assignee || [];

      try {
        await dispatch(
          updatePartnerTaskField({
            taskName: taskId,
            fieldName: 'assignees',
            value: nextAssignees,
            currentAssignees: currentAssigneesRaw,
          }),
        ).unwrap();

        await fetchList(debouncedSearchTerm, sorting);
        showSuccessToast('Task updated successfully');
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update assignee. Please try again.');
      }
    },
    [dispatch, tasks, fetchList, debouncedSearchTerm, sorting],
  );

  const { handlePriorityUpdate, handleStatusUpdate, handleDueDateUpdate } =
    useTaskFieldUpdaters(handleFieldUpdate);

  const handleRefreshTask = useCallback(
    async (refreshInfo) => {
      const taskId =
        refreshInfo?.task_id || selectedTask?.name || selectedTask?.task_id || selectedTask?.id;
      if (!taskId) return;

      try {
        const response = await dispatch(
          getPartnerCrmTaskDetail({
            task_id: taskId,
            task_type: 'Partner Onboarding',
            partner: partnerDocName,
          }),
        ).unwrap();

        const taskData = extractPartnerTaskDetail(response);
        if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
          setSelectedTask({ ...taskData });
        }
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, selectedTask, partnerDocName],
  );

  if (!partnerDocName) {
    return (
      <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-500'>
        Save the partner to load onboarding tasks for this record.
      </div>
    );
  }

  return (
    <div className='w-full flex flex-col gap-5 py-4'>
      <div className='w-full flex items-center justify-between gap-[16px]'>
        <div className='w-full max-w-[450px]'>
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
        <div className='w-1/2 flex items-center justify-end gap-[16px]'>
          <div className='flex items-center gap-3'>
            {/* <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <TableVariantToggle variant={tableVariant}/>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {tableVariant === 'compact' ? 'Switch to default view' : 'Switch to compact view'}
              </Tooltip.Content>
            </Tooltip.Root> */}
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
          onPriorityUpdate={handlePriorityUpdate}
          onStatusUpdate={handleStatusUpdate}
          onDueDateUpdate={handleDueDateUpdate}
          taskStatusOptions={partnerTaskStatusOptions}
          statusConfigScope={{
            doctype: 'Task',
            field: 'status',
            context: 'Partner Onboarding',
            fieldLabel: 'Partner Tasks',
          }}
          onStatusConfigSaved={() => setStatusOptionsKey((value) => value + 1)}
          fixedAssigneeOptions={partnerSalesAssignees}
          fixedAssigneeOptionsLoading={partnerSalesAssigneesLoading}
          enableScrollPagination={true}
          hasMore={Boolean(hasMore)}
          isLoadingMore={Boolean(isLoadingMore)}
          onLoadMore={handleLoadMore}
        />
      </div>

      <TaskViewDrawerPartnerCrm
        isOpen={isViewDrawerOpen}
        onClose={() => {
          setIsViewDrawerOpen(false);
          setSelectedTask(null);
          fetchList(debouncedSearchTerm, sorting);
        }}
        task={selectedTask}
        onFieldUpdate={handleFieldUpdate}
        onRefresh={handleRefreshTask}
        tasks={tasks}
        onTaskChange={handleTaskChange}
        assigneeSelectItems={partnerSalesAssignees}
        assigneeSelectLoading={partnerSalesAssigneesLoading}
      />

      <CreateTaskDrawerCommon
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={isCreateLoading}
        taskType='Partner Onboarding'
        showTagsInput
        showRecurring={false}
        statusOptions={partnerTaskStatusOptions}
        defaultStatusKeyword={PARTNER_INDIVIDUAL_CRM_TASK_DEFAULT_STATUS}
        dueDateMode
        assigneeSelectItems={partnerSalesAssignees}
        assigneeSelectLoading={partnerSalesAssigneesLoading}
      />
    </div>
  );
};

export default PartnerDetailTasksTab;
