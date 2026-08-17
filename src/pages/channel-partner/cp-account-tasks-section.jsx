import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import apiClient from '@/api/axios';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import {
  fetchCpAccountDetail,
  fetchCpAccountTasks,
  updateCpAccountTask,
  selectCpAccountTasksList,
  selectCpAccountTasksLoading,
  selectCpAccountTasksError,
} from '@/redux/cpAccountSlices';
import { createAclTask } from '@/redux/settingSlice';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import CpAccountTasksToolbar from './cp-account-tasks-toolbar';
import CrmTasksTable from '@/components/crm-tasks/crm-tasks-table';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useClientPagination } from '@/hooks/use-client-pagination';
import { DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';
import CrmCreateTaskDrawer from '@/components/crm-tasks/crm-create-task-drawer';
import CrmTaskViewDrawer from '@/components/crm-tasks/crm-task-view-drawer';
import { getSalesTeamUserList } from '@/api/crmAccounts';
import {
  DEFAULT_CP_ACCOUNT_TASKS_FILTERS,
  CP_ACCOUNT_TASKS_PERSISTED_KEYS,
  getCpAccountTasksFiltersStorageKey,
  mergeStoredCpAccountTasksFilters,
} from './constants';

const LEAD_CRM_TASK_TYPE_API =
  '/method/devx.devx_crm.doctype.lead_crm_task_type.lead_crm_task_type.get_lead_crm_task_types';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? [];
}

function loadTaskWidthOverrides(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveTaskWidthOverrides(storageKey, overrides) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadTaskResizeEnabled(resizeKey) {
  try {
    const raw = localStorage.getItem(resizeKey);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

const CpAccountTasksSection = ({ account }) => {
  const dispatch = useDispatch();
  const tableRef = useRef(null);
  const showLifecycleFields = false;
  /** CP account tasks: no contact/lead-style trigger lifecycle summary in drawer/table. */
  const showLifecycleTriggerReadOnlyColumns = false;
  /** Serialize updates per task so we never send two concurrent update_acl_task calls for the same task (avoids "Record has changed since last read"). */
  const pendingTaskUpdatesRef = useRef(Object.create(null));
  const [search, setSearch] = useState('');
  // Per-cpAccount sessionStorage slot for the Tasks tab dropdown selections.
  // Each CP Account owns an independent slot so navigating between profiles
  // doesn't bleed filters.
  const tasksFiltersStorageKey = useMemo(
    () => getCpAccountTasksFiltersStorageKey(account?.id),
    [account?.id],
  );
  const [appliedTaskFilters, setAppliedTaskFilters] = usePersistedFilters({
    storageKey: tasksFiltersStorageKey,
    defaultFilters: DEFAULT_CP_ACCOUNT_TASKS_FILTERS,
    persistIncludeKeys: CP_ACCOUNT_TASKS_PERSISTED_KEYS,
    persistTrimStringArrays: true,
  });
  // Normalise hydrated snapshots so downstream `.length` reads can never
  // see `undefined` (a hand-truncated session slot would otherwise drop keys).
  const normalizedAppliedTaskFilters = useMemo(
    () => mergeStoredCpAccountTasksFilters(appliedTaskFilters),
    [appliedTaskFilters],
  );
  const debouncedSearch = useDebounce(search, 300);
  const apiFilters = useMemo(() => {
    const f = {};
    if (normalizedAppliedTaskFilters.type?.length) f.type = normalizedAppliedTaskFilters.type;
    if (normalizedAppliedTaskFilters.priority?.length)
      f.priority = normalizedAppliedTaskFilters.priority;
    if (normalizedAppliedTaskFilters.status?.length) f.status = normalizedAppliedTaskFilters.status;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [normalizedAppliedTaskFilters]);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskViewDrawerOpen, setIsTaskViewDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [taskTypeOptions, setTaskTypeOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeOptionsLoading, setAssigneeOptionsLoading] = useState(true);
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'cp-account-tasks-table',
    'compact',
  );

  const tasksList = useSelector(selectCpAccountTasksList);
  const tasksLoading = useSelector(selectCpAccountTasksLoading);
  const tasksError = useSelector(selectCpAccountTasksError);

  const reloadTasks = useCallback(() => {
    if (!account?.id) return;
    dispatch(
      fetchCpAccountTasks({
        cpAccountId: account.id,
        keyword: debouncedSearch,
        filters: apiFilters,
      }),
    );
  }, [account?.id, debouncedSearch, apiFilters, dispatch]);

  useEffect(() => {
    reloadTasks();
  }, [reloadTasks]);

  useEffect(() => {
    let isMounted = true;
    apiClient.get(LEAD_CRM_TASK_TYPE_API).then((response) => {
      const list = unwrapMessage(response);
      const arr = Array.isArray(list) ? list : list?.results || [];
      if (isMounted) setTaskTypeOptions(arr);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setAssigneeOptionsLoading(true);
    getSalesTeamUserList()
      .then((list) => {
        if (isMounted) setAssigneeOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (isMounted) setAssigneeOptions([]);
      })
      .finally(() => {
        if (isMounted) setAssigneeOptionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(() => (Array.isArray(tasksList) ? tasksList : []), [tasksList]);

  const { paginatedItems: paginatedRows, paginationProps } = useClientPagination(rows, {
    initialPageSize: DEFAULT_LIST_PAGE_SIZE,
    resetOnChange: [rows],
  });

  const { completedCount, totalCount } = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((t) => {
      const s = (t.status || '').toLowerCase();
      return s === 'closed' || s === 'completed' || s === 'done';
    }).length;
    return { completedCount: completed, totalCount: total };
  }, [rows]);

  // Keep selected task in sync with list (e.g. after refetch for attachments/comments)
  useEffect(() => {
    if (!selectedTask || rows.length === 0) return;
    const id = selectedTask.id ?? selectedTask.name;
    const fromList = rows.find((t) => (t.id ?? t.name) === id);
    if (fromList && fromList !== selectedTask) {
      setSelectedTask(fromList);
    }
  }, [rows]);

  const selectedTaskIndex =
    selectedTask == null
      ? -1
      : paginatedRows.findIndex((t) => (t.id ?? t.name) === (selectedTask.id ?? selectedTask.name));
  const hasPrevious = selectedTaskIndex > 0;
  const hasNext = selectedTaskIndex >= 0 && selectedTaskIndex < paginatedRows.length - 1;
  const handleNavigatePrevious = () => {
    if (hasPrevious) setSelectedTask(paginatedRows[selectedTaskIndex - 1]);
  };
  const handleNavigateNext = () => {
    if (hasNext) setSelectedTask(paginatedRows[selectedTaskIndex + 1]);
  };

  const emptyDescription = 'Create a task to start tracking work for this channel partner account.';

  const handleTaskSubmit = async (payload) => {
    if (!payload?.doc) return false;
    setIsTaskSubmitting(true);
    try {
      await dispatch(createAclTask(payload)).unwrap();
      showSuccessToast('Task created successfully');
      if (account?.id) {
        reloadTasks();
        dispatch(fetchCpAccountDetail(account.id));
      }
      return true;
    } catch (error) {
      showErrorToast(error?.message || error || 'Failed to create task');
      return false;
    } finally {
      setIsTaskSubmitting(false);
    }
  };

  const runQueuedTaskUpdate = useCallback(async (taskId, run) => {
    const key = String(taskId);
    const pending = pendingTaskUpdatesRef.current[key];
    pendingTaskUpdatesRef.current[key] = run;
    if (pending) {
      try {
        await pending;
      } catch {
        // Previous update already handled; continue with latest update
      }
    }
    await run;
  }, []);

  const handleListFieldUpdate = useCallback(
    async (taskId, patch) => {
      if (!account?.id) return;
      const runUpdate = (async () => {
        try {
          const updatedTask = await dispatch(
            updateCpAccountTask({
              task_row_id: taskId,
              ...patch,
            }),
          ).unwrap();
          showSuccessToast('Saved');
          setSelectedTask((prev) => {
            if (!prev) return prev;
            if ((prev.id ?? prev.name) !== taskId) return prev;
            return updatedTask ? { ...prev, ...updatedTask } : { ...prev, ...patch };
          });
        } catch (error) {
          showErrorToast(error?.message || error || 'Failed to update task');
          throw error;
        } finally {
          delete pendingTaskUpdatesRef.current[String(taskId)];
        }
      })();
      await runQueuedTaskUpdate(taskId, runUpdate);
    },
    [account?.id, dispatch, runQueuedTaskUpdate],
  );

  const handleStatusUpdate = useCallback(
    (taskId, value) => handleListFieldUpdate(taskId, { status: value }),
    [handleListFieldUpdate],
  );
  const handlePriorityUpdate = useCallback(
    (taskId, value) => handleListFieldUpdate(taskId, { priority: value }),
    [handleListFieldUpdate],
  );
  const handleTypeUpdate = useCallback(
    (taskId, value) => handleListFieldUpdate(taskId, { type: value }),
    [handleListFieldUpdate],
  );

  const handleAssigneeChange = useCallback(
    async (taskId, values, prevValues) => {
      if (!account?.id) return;

      const normalizedAssignees = Array.isArray(values)
        ? values
            .map((v) => (typeof v === 'string' ? v : v?.full_name || v?.name || v?.email || v))
            .filter(Boolean)
        : [];

      const runUpdate = (async () => {
        try {
          const updatedTask = await dispatch(
            updateCpAccountTask({
              cp_account_id: account.id,
              task_row_id: taskId,
              assignees: normalizedAssignees,
            }),
          ).unwrap();

          showSuccessToast('Saved');

          setSelectedTask((prev) => {
            if (!prev) return prev;
            if ((prev.id ?? prev.name) !== taskId) return prev;
            if (updatedTask) return { ...prev, ...updatedTask };
            return { ...prev, assignee: values, assignees: values };
          });
        } catch (error) {
          showErrorToast(error?.message || error || 'Failed to update assignees');
          setSelectedTask((prev) => {
            if (!prev) return prev;
            if ((prev.id ?? prev.name) !== taskId) return prev;
            return { ...prev, assignee: prevValues, assignees: prevValues };
          });
          throw error;
        } finally {
          delete pendingTaskUpdatesRef.current[String(taskId)];
        }
      })();

      await runQueuedTaskUpdate(taskId, runUpdate);

      reloadTasks();
    },
    [account?.id, reloadTasks, runQueuedTaskUpdate],
  );

  const handleTaskRowClick = useCallback((task) => {
    setSelectedTask(task);
    setIsTaskViewDrawerOpen(true);
  }, []);

  return (
    <div className='flex flex-col h-full min-h-0 gap-4 px-6 pt-4 pb-0'>
      <CpAccountTasksToolbar
        search={search}
        onSearchChange={setSearch}
        tableRef={tableRef}
        tableVariant={tableVariant}
        onTableVariantToggle={toggleTableVariant}
        onAddTask={() => setIsAddTaskOpen(true)}
        completedCount={completedCount}
        totalCount={totalCount}
        appliedFilters={normalizedAppliedTaskFilters}
        onFiltersChange={setAppliedTaskFilters}
        taskTypeOptions={taskTypeOptions}
      />

      <PaginatedTableLayout
        className='flex-1 min-h-0 rounded-xl border border-stroke-soft-200 bg-bg-white-0 overflow-hidden flex flex-col'
        {...paginationProps}
      >
        <CrmTasksTable
          ref={tableRef}
          rows={paginatedRows}
          isLoading={tasksLoading}
          error={tasksError}
          variant={tableVariant}
          entityType='cp_account'
          showLifecycleFields={showLifecycleFields}
          showLifecycleTriggerReadOnlyColumns={showLifecycleTriggerReadOnlyColumns}
          emptyMessage='No tasks'
          emptyDescription={emptyDescription}
          statusContext='CP Tasks'
          enableStatusConfiguration
          onRowClick={handleTaskRowClick}
          onAssigneeChange={handleAssigneeChange}
          onStatusUpdate={handleStatusUpdate}
          onPriorityUpdate={handlePriorityUpdate}
          onTypeUpdate={handleTypeUpdate}
          taskTypeOptions={taskTypeOptions}
          assigneeOptions={assigneeOptions}
          assigneeOptionsLoading={assigneeOptionsLoading}
        />
      </PaginatedTableLayout>

      <CrmCreateTaskDrawer
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSubmit={handleTaskSubmit}
        isLoading={isTaskSubmitting}
        showLifecycleFields={false}
        entityType='cp_account'
        entityId={account?.id ?? null}
        assigneeOptions={assigneeOptions}
        assigneeOptionsLoading={assigneeOptionsLoading}
      />

      <CrmTaskViewDrawer
        open={isTaskViewDrawerOpen}
        onOpenChange={(open) => {
          setIsTaskViewDrawerOpen(open);
          if (!open) setSelectedTask(null);
        }}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        showLifecycleFields={showLifecycleFields}
        lifecycleReadOnlySummary={showLifecycleTriggerReadOnlyColumns}
        assigneeOptions={assigneeOptions}
        assigneeOptionsLoading={assigneeOptionsLoading}
        showLeadReferenceCaption={false}
        task={
          selectedTask
            ? {
                id: selectedTask.id ?? selectedTask.name,
                title: selectedTask.subject ?? selectedTask.task ?? '',
                status: selectedTask.status,
                assignees: selectedTask.assignees ?? selectedTask.assignee ?? [],
                type: selectedTask.type,
                dueDate: selectedTask.due_date ?? selectedTask.exp_end_date,
                priority: selectedTask.priority,
                description: selectedTask.description,
                tags: selectedTask.tags ?? [],
                attachments: selectedTask.attachments ?? [],
                comments: selectedTask.comments ?? [],
                history: selectedTask.history ?? [],
                set_trigger: selectedTask.set_trigger,
                lifecycle_stage: selectedTask.lifecycle_stage,
                lifecycle_stage_status: selectedTask.lifecycle_stage_status,
                lifecycle_stage_color: selectedTask.lifecycle_stage_color,
                lead_reference: selectedTask.lead_reference,
                linked_lead_name: selectedTask.linked_lead_name,
              }
            : undefined
        }
        onTaskUpdate={() => {
          reloadTasks();
        }}
      />
    </div>
  );
};

export default CpAccountTasksSection;
