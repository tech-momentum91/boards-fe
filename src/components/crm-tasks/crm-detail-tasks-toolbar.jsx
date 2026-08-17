import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { RiAddLine, RiTaskLine, RiLayoutColumnLine } from 'react-icons/ri';
import apiClient from '@/api/axios';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Switch from '@/components/ui/switch';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import CircularProgress from '@/components/ui/circular-progress';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import CrmTasksTable from './crm-tasks-table';
import CrmTaskViewDrawer from './crm-task-view-drawer';
import CrmCreateTaskDrawer from './crm-create-task-drawer';
import CrmTasksFilterDropdown from './crm-tasks-filter-dropdown';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { createAclTask, fetchAclTasks, updateAclTask } from '@/redux/settingSlice';
import {
  DEFAULT_TASK_COLUMN_WIDTHS,
  DEFAULT_TASK_FILTERS,
  TASK_FILTER_PERSISTED_KEYS,
  countTaskFilters,
  getTasksFilterStorageKey,
  getTasksResizeEnabledKey,
  getTasksStorageKey,
  mergeStoredTaskFilters,
} from './constants';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useDebounce } from '@/hooks/use-debounce';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';
import { getSalesTeamUserList } from '@/api/crmAccounts';

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

function saveTaskResizeEnabled(resizeKey, enabled) {
  try {
    localStorage.setItem(resizeKey, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Shared Tasks toolbar for Contact, Account, and Lead detail pages.
 * @param {Object} props
 * @param {Object} props.entity - The contact, account, or lead object
 * @param {'contact'|'account'|'lead'} props.entityType - Entity type (account shows lifecycle fields)
 */
const CrmDetailTasksToolbar = ({ entity, entityType = 'contact' }) => {
  const dispatch = useDispatch();
  const storageKey = getTasksStorageKey(entityType);
  const resizeKey = getTasksResizeEnabledKey(entityType);
  /** Account-style editable lifecycle columns. */
  const showLifecycleFields = entityType === 'lead' || entityType === 'contact';
  /** Contact/Lead: show lifecycle stage/status for trigger-based tasks only; read-only. */
  const showLifecycleTriggerReadOnlyColumns = entityType === 'contact' || entityType === 'lead';

  const [search, setSearch] = useState('');
  const debouncedKeyword = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [tasksError, setTasksError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState(null);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() =>
    loadTaskWidthOverrides(storageKey),
  );
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() =>
    loadTaskResizeEnabled(resizeKey),
  );
  const [taskTypeOptions, setTaskTypeOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeOptionsLoading, setAssigneeOptionsLoading] = useState(true);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Single persisted filter slot (per entityType + entityId). The hook hydrates
  // synchronously from sessionStorage, so we render with the correct filters /
  // badge count on first paint — no `filtersInitialized` flag, no mirror state.
  const tasksFilterStorageKey = useMemo(
    () => (entity?.name && entityType ? getTasksFilterStorageKey(entityType, entity.name) : null),
    [entity?.name, entityType],
  );
  const [persistedTaskFilters, setPersistedTaskFilters] = usePersistedFilters({
    storageKey: tasksFilterStorageKey,
    defaultFilters: DEFAULT_TASK_FILTERS,
    persistIncludeKeys: TASK_FILTER_PERSISTED_KEYS,
    persistTrimStringArrays: true,
  });
  const appliedTaskFilters = useMemo(
    () => mergeStoredTaskFilters(persistedTaskFilters),
    [persistedTaskFilters],
  );

  // Two-track count: while the dropdown is open the user can stage selections
  // that haven't been committed yet — the dropdown reports those via
  // `setStagedFilterCount`. When closed we fall back to the count derived from
  // the persisted state so the badge is correct on first render too.
  const appliedFilterCount = useMemo(
    () => countTaskFilters(appliedTaskFilters),
    [appliedTaskFilters],
  );
  const [stagedFilterCount, setStagedFilterCount] = useState(appliedFilterCount);
  useEffect(() => {
    if (!isFilterDropdownOpen) {
      setStagedFilterCount(appliedFilterCount);
    }
  }, [appliedFilterCount, isFilterDropdownOpen]);
  const filterCount = isFilterDropdownOpen ? stagedFilterCount : appliedFilterCount;

  const filterDropdownRef = useRef(null);
  const tableRef = useRef(null);

  const apiFilters = useMemo(() => {
    const f = {};
    if (appliedTaskFilters.type?.length) f.type = appliedTaskFilters.type;
    if (appliedTaskFilters.priority?.length) f.priority = appliedTaskFilters.priority;
    if (appliedTaskFilters.status?.length) f.status = appliedTaskFilters.status;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [appliedTaskFilters]);

  const handleClearAllTaskFilters = useCallback(
    (e) => {
      e.stopPropagation();
      setPersistedTaskFilters(DEFAULT_TASK_FILTERS);
      setStagedFilterCount(0);
      setIsFilterDropdownOpen(false);
    },
    [setPersistedTaskFilters],
  );

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

  const columnWidths = useMemo(
    () => ({ ...DEFAULT_TASK_COLUMN_WIDTHS, ...columnWidthOverrides }),
    [columnWidthOverrides],
  );

  const handleColumnResize = useCallback(
    (columnId, width) => {
      setColumnWidthOverrides((previous) => {
        const next = { ...previous, [columnId]: width };
        saveTaskWidthOverrides(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const handleResizeEnabledChange = useCallback(
    (enabled) => {
      setResizeColumnsEnabled(enabled);
      saveTaskResizeEnabled(resizeKey, enabled);
    },
    [resizeKey],
  );

  const handleResetColumnSizes = useCallback(() => {
    setColumnWidthOverrides({});
    saveTaskWidthOverrides(storageKey, {});
  }, [storageKey]);

  const fetchTasks = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
      if (!entity?.name || !entityType) return;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setTasksLoading(true);
      }
      setTasksError(null);
      try {
        const data = await dispatch(
          fetchAclTasks({
            type: entityType,
            entityId: entity.name,
            keyword: debouncedKeyword,
            page: fetchPage,
            pageSize: pageSizeParam ?? pageSize,
            orderBy: 'creation',
            orderDir: 'desc',
            filters: apiFilters,
          }),
        ).unwrap();
        const rawResults = data?.results;
        const list = Array.isArray(rawResults) ? rawResults : [];
        if (append) {
          setTasks((prev) => [...prev, ...list]);
        } else {
          setTasks(list);
        }
        setPage(fetchPage);
        setTotalCount(data?.total_count ?? 0);
        setTotalPages(data?.total_pages ?? 1);
      } catch (error) {
        setTasksError(error?.message || error || 'Failed to load tasks');
        if (!append) {
          setTasks([]);
          setTotalCount(0);
          setTotalPages(0);
        }
      } finally {
        setTasksLoading(false);
        setIsLoadingMore(false);
      }
    },
    [entity?.name, entityType, debouncedKeyword, dispatch, apiFilters, pageSize],
  );

  const fetchTasksRef = useRef(fetchTasks);
  fetchTasksRef.current = fetchTasks;

  useEffect(() => {
    if (!entity?.name || !entityType) {
      setTasks([]);
      setTotalCount(0);
      setTotalPages(0);
      setPage(1);
      return;
    }
    fetchTasksRef.current(1, false);
  }, [entity?.name, entityType, debouncedKeyword, refreshKey, apiFilters]);

  const handlePageChange = useCallback(
    (nextPage) => {
      fetchTasks(nextPage, false);
    },
    [fetchTasks],
  );

  const handlePageSizeChange = useCallback(
    (newSize) => {
      setPageSize(newSize);
      fetchTasks(1, false, newSize);
    },
    [fetchTasks],
  );

  const handleCreateTask = useCallback(
    async (payload) => {
      if (!payload?.doc) return false;
      setIsCreateLoading(true);
      try {
        await dispatch(createAclTask(payload)).unwrap();
        showSuccessToast('Task created successfully');
        setRefreshKey((k) => k + 1);
        return true;
      } catch (error) {
        showErrorToast(error?.message || error || 'Failed to create task');
        return false;
      } finally {
        setIsCreateLoading(false);
      }
    },
    [dispatch],
  );

  const filteredTasks = tasks;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => String(task.status).toLowerCase() === 'completed',
  ).length;
  const completionPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const selectedTaskIndex =
    selectedTask == null ? -1 : filteredTasks.findIndex((t) => t.id === selectedTask.id);
  const hasPrevious = selectedTaskIndex > 0;
  const hasNext = selectedTaskIndex >= 0 && selectedTaskIndex < filteredTasks.length - 1;
  const handleNavigatePrevious = () => {
    if (hasPrevious) setSelectedTask(filteredTasks[selectedTaskIndex - 1]);
  };
  const handleNavigateNext = () => {
    if (hasNext) setSelectedTask(filteredTasks[selectedTaskIndex + 1]);
  };

  const emptyDescription =
    entityType === 'contact'
      ? 'Create a task to start tracking work for this contact.'
      : entityType === 'account'
        ? 'Create a task to start tracking work for this account.'
        : 'Create a task to start tracking work for this lead.';

  const handleFieldUpdate = useCallback(
    async (taskId, doc) => {
      try {
        await dispatch(updateAclTask({ taskId, doc })).unwrap();
        showSuccessToast('Saved');
        setRefreshKey((k) => k + 1);
      } catch (error) {
        showErrorToast(error?.message || error || 'Failed to update task');
      }
    },
    [dispatch],
  );

  const handleStatusUpdate = useCallback(
    (taskId, value) => handleFieldUpdate(taskId, { status: value }),
    [handleFieldUpdate],
  );
  const handlePriorityUpdate = useCallback(
    (taskId, value) => handleFieldUpdate(taskId, { priority: value }),
    [handleFieldUpdate],
  );
  const handleTypeUpdate = useCallback(
    (taskId, value) => handleFieldUpdate(taskId, { type: value }),
    [handleFieldUpdate],
  );

  const handleAssigneeChange = useCallback(
    async (taskId, values, prevValues) => {
      const normalizedAssignees = Array.isArray(values)
        ? values
            .map((v) => (typeof v === 'string' ? v : v.value || v.email || v.name || v))
            .filter(Boolean)
            .map((v) => (typeof v === 'string' ? v : v.value || v.email || v.name || v))
            .filter(Boolean)
        : [];
      try {
        await dispatch(updateAclTask({ taskId, doc: { assignees: normalizedAssignees } })).unwrap();
        showSuccessToast('Saved');
        setTasks((previous) =>
          previous.map((task) => (task.id === taskId ? { ...task, assignee: values } : task)),
        );
        if (selectedTask?.id === taskId) {
          setSelectedTask((prev) => (prev ? { ...prev, assignee: values } : prev));
        }
      } catch (error) {
        showErrorToast(error?.message || error || 'Failed to update assignees');
        setTasks((previous) =>
          previous.map((task) => (task.id === taskId ? { ...task, assignee: prevValues } : task)),
        );
      }
    },
    [dispatch, selectedTask?.id],
  );

  return (
    <div className='flex-1 flex flex-col min-h-0 bg-white'>
      <div className='flex-1 flex flex-col gap-4 px-6 pt-6 pb-0 min-h-0'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <RiTaskLine className='size-4 shrink-0 text-text-sub-500' />
              <span className='text-label-sm text-text-sub-500'>Tasks</span>
            </div>
            {/* <div className='inline-flex items-center justify-center gap-2 overflow-hidden rounded-md border-l border-away-dark/20 bg-away-light px-2 py-0.5'>
              <CircularProgress percentage={completionPercent} color='yellow' size={18} />
              <span className='text-label-sm font-normal text-away-dark'>{completionPercent}%</span>
              <span className='h-4 w-px shrink-0 bg-away-dark/30' aria-hidden />
              <span className='text-label-sm font-normal text-away-dark'>
                {completedTasks}/{totalTasks} Completed
              </span>
            </div> */}
          </div>

          <div className='flex items-center gap-3'>
            <Input.Root size='small' className='w-[220px]'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Search tasks...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>

            <Popover.Root
              open={isFilterDropdownOpen}
              onOpenChange={(open) => {
                const wasOpen = isFilterDropdownOpen;
                setIsFilterDropdownOpen(open);
                if (wasOpen && !open && filterDropdownRef.current) {
                  filterDropdownRef.current.handleClose();
                }
              }}
            >
              <Filter.TriggerButton
                filterCount={filterCount}
                onClear={handleClearAllTaskFilters}
                tooltipContent='Filter'
                ariaLabel='Filter tasks'
              />
              <CrmTasksFilterDropdown
                ref={filterDropdownRef}
                open={isFilterDropdownOpen}
                setFilterCount={setStagedFilterCount}
                onOpenChange={setIsFilterDropdownOpen}
                onFiltersChange={setPersistedTaskFilters}
                appliedFilters={appliedTaskFilters}
                taskTypeOptions={taskTypeOptions}
              />
            </Popover.Root>

            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              config={columnConfig}
              tooltipContent={<p>Manage columns</p>}
              trigger={
                <Button.Root variant='neutral' mode='stroke' size='small'>
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
              footer={
                <div className='w-full flex flex-col items-center gap-3'>
                  <div className='w-full flex items-center justify-between gap-2'>
                    <span className='text-paragraph-sm text-text-main-900'>Resize columns</span>
                    <Switch.Root
                      checked={resizeColumnsEnabled}
                      onCheckedChange={handleResizeEnabledChange}
                      className='h-5 w-8'
                    />
                  </div>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='w-full'
                    onClick={handleResetColumnSizes}
                  >
                    Reset column sizes
                  </Button.Root>
                </div>
              }
            />

            <button
              type='button'
              onClick={() => setIsCreateDrawerOpen(true)}
              className='inline-flex items-center gap-2 rounded-lg bg-primary-base px-3 py-2 text-label-sm font-medium text-white hover:bg-primary-darker transition-colors'
            >
              <RiAddLine className='size-4' />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        <PaginatedTableLayout
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        >
          <CrmTasksTable
            ref={tableRef}
            rows={filteredTasks}
            isLoading={tasksLoading}
            error={tasksError}
            onRetry={() => setRefreshKey((k) => k + 1)}
            columnWidths={columnWidths}
            onColumnResize={handleColumnResize}
            resizeEnabled={resizeColumnsEnabled}
            entityType={entityType}
            showLifecycleFields={showLifecycleFields}
            showLifecycleTriggerReadOnlyColumns={showLifecycleTriggerReadOnlyColumns}
            emptyMessage='No tasks'
            emptyDescription={emptyDescription}
            statusContext='CRM Tasks'
            enableStatusConfiguration
            onRowClick={(task) => {
              setSelectedTask(task);
              setIsDrawerOpen(true);
            }}
            onColumnConfigChange={setColumnConfig}
            onAssigneeChange={handleAssigneeChange}
            onStatusUpdate={handleStatusUpdate}
            onPriorityUpdate={handlePriorityUpdate}
            onTypeUpdate={handleTypeUpdate}
            taskTypeOptions={taskTypeOptions}
            assigneeOptions={assigneeOptions}
            assigneeOptionsLoading={assigneeOptionsLoading}
          />
        </PaginatedTableLayout>
      </div>

      <CrmTaskViewDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        showLifecycleFields={showLifecycleFields}
        lifecycleReadOnlySummary={showLifecycleTriggerReadOnlyColumns}
        assigneeOptions={assigneeOptions}
        assigneeOptionsLoading={assigneeOptionsLoading}
        showLeadReferenceCaption={entityType === 'contact'}
        task={
          selectedTask
            ? {
                id: selectedTask.id,
                title: selectedTask.task,
                status: selectedTask.status,
                assignees: selectedTask.assignee || [],
                type: selectedTask.type,
                dueDate: selectedTask.due_date,
                priority: selectedTask.priority,
                description: selectedTask.description,
                tags: selectedTask.tags || [],
                attachments: selectedTask.attachments || [],
                comments: selectedTask.comments || [],
                history: selectedTask.history || [],
                set_trigger: selectedTask.set_trigger,
                lifecycle_stage: selectedTask.lifecycle_stage,
                lifecycle_stage_status: selectedTask.lifecycle_stage_status,
                lifecycle_stage_color: selectedTask.lifecycle_stage_color,
                lead_reference: selectedTask.lead_reference,
                linked_lead_name: selectedTask.linked_lead_name,
              }
            : undefined
        }
        onTaskUpdate={(taskId, fieldName, value) => {
          const tableFieldMap = {
            title: 'task',
            assignees: 'assignee',
            dueDate: 'due_date',
          };
          const tableField = tableFieldMap[fieldName] ?? fieldName;

          setTasks((previous) =>
            previous.map((t) => {
              if (t.id !== taskId) return t;
              if (
                fieldName === 'comments' ||
                fieldName === 'history' ||
                fieldName === 'attachments'
              ) {
                return { ...t, [tableField]: value };
              }
              const displayField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
              const newHistoryItem = {
                id: Date.now().toString(),
                owner: 'Current User',
                action: `changed ${displayField} to ${Array.isArray(value) ? value.join(', ') : value}`,
                creation: new Date().toISOString(),
              };
              return {
                ...t,
                [tableField]: value,
                history: [newHistoryItem, ...(t.history || [])],
              };
            }),
          );
          if (selectedTask && selectedTask.id === taskId) {
            const tableFieldMap = {
              title: 'task',
              assignees: 'assignee',
              dueDate: 'due_date',
            };
            const tableField = tableFieldMap[fieldName] ?? fieldName;
            if (
              fieldName === 'comments' ||
              fieldName === 'history' ||
              fieldName === 'attachments'
            ) {
              setSelectedTask((prev) => ({ ...prev, [tableField]: value }));
              return;
            }
            const displayField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
            const newHistoryItem = {
              id: Date.now().toString(),
              owner: 'Current User',
              action: `changed ${displayField} to ${Array.isArray(value) ? value.join(', ') : value}`,
              creation: new Date().toISOString(),
            };
            setSelectedTask((prev) => ({
              ...prev,
              [tableField]: value,
              history: [newHistoryItem, ...(prev.history || [])],
            }));
          }
        }}
      />

      <CrmCreateTaskDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={isCreateLoading}
        showLifecycleFields={showLifecycleFields}
        entityType={entityType}
        entityId={entity?.name}
        assigneeOptions={assigneeOptions}
        assigneeOptionsLoading={assigneeOptionsLoading}
        defaultLifecycleStage={entity?.lifecycle_stage}
        defaultLifecycleStageStatus={
          entityType === 'lead' ? entity?.life_cycle_stage_status : entity?.lifecycle_stage_status
        }
        pipeline={entity?.pipeline}
      />
    </div>
  );
};

export default CrmDetailTasksToolbar;
