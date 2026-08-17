import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import * as Input from '@/components/ui/input';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import * as Switch from '@/components/ui/switch';
import CrmTasksTableCommon from '@/components/crm-task/crm-tasks-table-common';
import {
  getCrmColumnDefsForTab,
  DEFAULT_CRM_COLUMN_WIDTHS,
} from '@/components/crm-task/crm-task-columns';
import CrmTaskCreateDrawer from '@/components/crm-task/crm-task-create-drawer';
import CrmTaskViewDrawer from '@/components/crm-task/crm-task-view-drawer';
import CrmTaskMasterFilterPopover from '@/components/crm-task/crm-task-master-filter-popover';
import {
  CRM_TASK_MASTER_FILTER_OPTION,
  buildCrmTaskMasterListFilters,
  countCrmTaskMasterAppliedFilters,
  getCpTaskMasterFiltersStorageKey,
} from '@/components/crm-task/crm-task-master-constants';
import apiClient from '@/api/axios';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import {
  mergeLeadCrmTaskListRow,
  listRowUpdatesFromLeadCrmPayload,
} from '@/utils/crm-lead-task-list-patch';
import {
  getCrmTaskMasterColumnPreferences,
  saveCrmTaskMasterColumnPreferences,
  getLeadCrmTaskDetail,
  updateLeadCrmTaskMaster,
} from '@/redux/settingSlice';

const CP_TASK_TABS = [
  { id: 'cp_account', label: 'CP Account' },
  { id: 'cp_contact', label: 'CP Contact' },
];

const VALID_TAB_IDS = new Set(CP_TASK_TABS.map((t) => t.id));

/** Route tab id → Lead CRM Task Master `task_type` (e.g. CP Account, CP Contact). */
const TAB_ID_TO_TASK_TYPE = {
  cp_account: 'CP Account',
  cp_contact: 'CP Contact',
};

function getTabFromSearchParams(searchParams) {
  const id = (searchParams.get('tab') || '').toLowerCase();
  return VALID_TAB_IDS.has(id) ? id : 'cp_account';
}

const LEAD_CRM_TASK_TYPE_API =
  '/method/devx.devx_crm.doctype.lead_crm_task_type.lead_crm_task_type.get_lead_crm_task_types';

const LEAD_CRM_TASK_VIEW_API =
  '/method/devx.devx_crm.doctype.lead_crm_task_master.lead_crm_task_master.get_lead_crm_task_view';

const LEAD_CRM_TASK_CREATE_API =
  '/method/devx.devx_crm.doctype.lead_crm_task_master.lead_crm_task_master.create_lead_crm_task_master';

const CRM_STAGES_API =
  '/method/devx.devx_crm.doctype.crm_status_master.crm_status_master.get_crm_stages';

const PAGE_SIZE = 20;

const CP_TASK_MASTER_WIDTH_STORAGE_KEY = 'cp-task-master-column-widths';

function getWidthStorageKey(tabId) {
  return `${CP_TASK_MASTER_WIDTH_STORAGE_KEY}-${tabId}`;
}

function loadWidthOverrides(tabId) {
  try {
    const raw = localStorage.getItem(getWidthStorageKey(tabId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(tabId, overrides) {
  try {
    localStorage.setItem(getWidthStorageKey(tabId), JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

const RESIZE_ENABLED_STORAGE_KEY = 'cp-task-master-resize-enabled';

function getResizeEnabledStorageKey(tabId) {
  return `${RESIZE_ENABLED_STORAGE_KEY}-${tabId}`;
}

function loadResizeEnabled(tabId) {
  try {
    const raw = localStorage.getItem(getResizeEnabledStorageKey(tabId));
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(tabId, enabled) {
  try {
    localStorage.setItem(getResizeEnabledStorageKey(tabId), String(enabled));
  } catch {
    // ignore
  }
}

const unwrapFrappeMessage = (response) => response?.data?.message ?? response?.data;

function taskTypeForTab(tabId) {
  return TAB_ID_TO_TASK_TYPE[tabId] ?? 'CP Account';
}

const CpTaskMaster = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParameter = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => getTabFromSearchParams(searchParams));
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [taskTypeOptions, setTaskTypeOptions] = useState([]);
  const [lifecycleStages, setLifecycleStages] = useState([]);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState({});
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(true);
  const [refreshListKey, setRefreshListKey] = useState(0);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(CRM_TASK_MASTER_FILTER_OPTION);
  const [filterCount, setFilterCount] = useState(0);

  const filterStorageKey = getCpTaskMasterFiltersStorageKey(activeTab);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: filterStorageKey,
    defaultFilters: CRM_TASK_MASTER_FILTER_OPTION,
  });

  const taskDetail = useSelector((state) => state.setting.crmTaskMaster?.taskDetail);
  const taskDetailData = taskDetail?.data ?? null;
  const taskDetailLoading = taskDetail?.isLoading ?? false;

  const { variant: tableVariant } = useTableVariant(`cp-task-master-table-${activeTab}`, 'compact');

  useEffect(() => {
    setFiltersInitialized(false);
  }, [activeTab]);

  useEffect(() => {
    if (filtersInitialized) return;
    const merged = { ...CRM_TASK_MASTER_FILTER_OPTION, ...persistedFilters };
    setAppliedFilters(merged);
    setFilterCount(countCrmTaskMasterAppliedFilters(merged));
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized, activeTab]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactFiltersForSessionStorage(appliedFilters, CRM_TASK_MASTER_FILTER_OPTION);
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  const handleAppliedFiltersChange = useCallback((nextFilters) => {
    setAppliedFilters(nextFilters);
    setFilterCount(countCrmTaskMasterAppliedFilters(nextFilters));
  }, []);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const listFiltersPayload = useMemo(
    () => buildCrmTaskMasterListFilters(appliedFilters),
    [appliedFilters],
  );
  const listFiltersString = useMemo(() => JSON.stringify(listFiltersPayload), [listFiltersPayload]);

  const columnDefs = useMemo(() => getCrmColumnDefsForTab(activeTab), [activeTab]);
  const defaultColumnConfig = useMemo(() => prepareColumnsForConfig(columnDefs), [columnDefs]);

  const react_table_id = `cp-task-master-${activeTab}`;

  const columnConfigHook = useColumnConfig(
    react_table_id,
    defaultColumnConfig,
    async (cols) => {
      await dispatch(
        saveCrmTaskMasterColumnPreferences({ columns: cols, react_table_id }),
      ).unwrap();
    },
    async () => {
      const result = await dispatch(getCrmTaskMasterColumnPreferences({ react_table_id })).unwrap();
      return result?.message ?? result?.data ?? result ?? [];
    },
    { autoSave: true, debounce: 300 },
  );

  const visibleColumns = useMemo(() => {
    return columnConfigHook.visibleColumns.map((col) => ({
      id: col.id,
      label: col.label || col.id,
    }));
  }, [columnConfigHook.visibleColumns]);

  const columnWidths = useMemo(
    () => ({
      ...DEFAULT_CRM_COLUMN_WIDTHS,
      ...columnWidthOverrides,
    }),
    [columnWidthOverrides],
  );

  const handleColumnResize = useCallback(
    (columnId, width) => {
      setColumnWidthOverrides((previous) => {
        const next = { ...previous, [columnId]: width };
        saveWidthOverrides(activeTab, next);
        return next;
      });
    },
    [activeTab],
  );

  useEffect(() => {
    setColumnWidthOverrides(loadWidthOverrides(activeTab));
    setResizeColumnsEnabled(loadResizeEnabled(activeTab));
  }, [activeTab]);

  const handleResizeEnabledChange = useCallback(
    (enabled) => {
      setResizeColumnsEnabled(enabled);
      saveResizeEnabled(activeTab, enabled);
    },
    [activeTab],
  );

  const handleResetColumnSizes = useCallback(() => {
    setColumnWidthOverrides({});
    saveWidthOverrides(activeTab, {});
  }, [activeTab]);

  useEffect(() => {
    const id = getTabFromSearchParams(searchParams);
    setActiveTab(id);
  }, [tabParameter, searchParams]);

  const handleTabChange = useCallback(
    (value) => {
      setActiveTab(value);
      setSearchParams({ tab: value });
    },
    [setSearchParams],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearchTerm, sorting?.field, sorting?.direction, listFiltersString]);

  useEffect(() => {
    if (!filtersInitialized) return undefined;

    let isMounted = true;

    const fetchTasks = async () => {
      setTasksLoading(true);
      try {
        const task_type = taskTypeForTab(activeTab);
        const order_by = sorting?.field
          ? `${sorting.field} ${sorting.direction === 'asc' ? 'asc' : 'desc'}`
          : undefined;

        const params = {
          task_type,
          keyword: debouncedSearchTerm.trim() || undefined,
          order_by,
          page,
          page_size: PAGE_SIZE,
        };

        if (Object.keys(listFiltersPayload).length > 0) {
          params.filters = JSON.stringify(listFiltersPayload);
        }

        const response = await apiClient.get(LEAD_CRM_TASK_VIEW_API, { params });
        const data = unwrapFrappeMessage(response) ?? response?.data ?? {};

        if (!isMounted) return;

        setTasks(Array.isArray(data.results) ? data.results : []);
        setTotalCount(typeof data.total_count === 'number' ? data.total_count : 0);
        setTotalPages(typeof data.total_pages === 'number' ? data.total_pages : 0);
      } catch (error) {
        const errorMessage = extractErrorMessage(error) || 'Failed to load tasks.';
        showErrorToast(errorMessage);
        if (isMounted) setTasks([]);
      } finally {
        if (isMounted) setTasksLoading(false);
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    debouncedSearchTerm,
    sorting?.field,
    sorting?.direction,
    page,
    refreshListKey,
    filtersInitialized,
    listFiltersString,
    listFiltersPayload,
  ]);

  useEffect(() => {
    let isMounted = true;

    const fetchTaskTypes = async () => {
      try {
        const response = await apiClient.get(LEAD_CRM_TASK_TYPE_API);
        const message = unwrapFrappeMessage(response);
        const list = Array.isArray(message) ? message : message?.results || [];
        if (isMounted) {
          setTaskTypeOptions(list);
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error) || 'Unable to load task types.';
        showErrorToast(errorMessage);
      }
    };

    fetchTaskTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchLifecycleStages = async () => {
      try {
        const response = await apiClient.get(CRM_STAGES_API);
        const message = unwrapFrappeMessage(response);
        const list = Array.isArray(message) ? message : (message?.results ?? []);
        if (isMounted) {
          setLifecycleStages(list);
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error) || 'Unable to load lifecycle stages.';
        showErrorToast(errorMessage);
        if (isMounted) setLifecycleStages([]);
      }
    };

    fetchLifecycleStages();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSortChange = useCallback((field) => {
    setSorting((current) => {
      if (current?.field === field) {
        if (current.direction === 'asc') return { field, direction: 'desc' };
        if (current.direction === 'desc') return null;
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const handleAddTask = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const orderByParameter = useMemo(() => {
    if (!sorting?.field) return undefined;
    return `${sorting.field} ${sorting.direction === 'asc' ? 'asc' : 'desc'}`;
  }, [sorting?.field, sorting?.direction]);

  const handleTaskClick = useCallback(
    async (row) => {
      const taskName = row?.name;
      if (!taskName) return;
      try {
        await dispatch(
          getLeadCrmTaskDetail({
            name: taskName,
            task_type: taskTypeForTab(activeTab),
            keyword: debouncedSearchTerm.trim() || undefined,
            order_by: orderByParameter,
          }),
        ).unwrap();
        setIsViewDrawerOpen(true);
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to load task detail'));
      }
    },
    [dispatch, activeTab, debouncedSearchTerm, orderByParameter],
  );

  const handleFetchDetail = useCallback(
    (taskName) => {
      if (!taskName) return;
      dispatch(
        getLeadCrmTaskDetail({
          name: taskName,
          task_type: taskTypeForTab(activeTab),
          keyword: debouncedSearchTerm.trim() || undefined,
          order_by: orderByParameter,
        }),
      );
    },
    [dispatch, activeTab, debouncedSearchTerm, orderByParameter],
  );

  const handleUpdateTask = useCallback(
    async (payload) => {
      try {
        await dispatch(updateLeadCrmTaskMaster(payload)).unwrap();
        const listUpdates = listRowUpdatesFromLeadCrmPayload(payload);
        setTasks((previous) =>
          mergeLeadCrmTaskListRow(previous, payload.task_id, listUpdates, lifecycleStages),
        );
        await dispatch(
          getLeadCrmTaskDetail({
            name: payload.task_id,
            task_type: taskTypeForTab(activeTab),
            keyword: debouncedSearchTerm.trim() || undefined,
            order_by: orderByParameter,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to update task'));
        throw error;
      }
    },
    [dispatch, activeTab, debouncedSearchTerm, orderByParameter, lifecycleStages],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, fieldName, value) => {
      try {
        const payload = { task_id: taskId, [fieldName]: value };
        await dispatch(updateLeadCrmTaskMaster(payload)).unwrap();
        const updates = { [fieldName]: value };
        setTasks((previous) => mergeLeadCrmTaskListRow(previous, taskId, updates, lifecycleStages));
        if (taskDetailData?.name === taskId) {
          dispatch(
            getLeadCrmTaskDetail({
              name: taskId,
              task_type: taskTypeForTab(activeTab),
              keyword: debouncedSearchTerm.trim() || undefined,
              order_by: orderByParameter,
            }),
          );
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to update task'));
      }
    },
    [
      dispatch,
      activeTab,
      debouncedSearchTerm,
      orderByParameter,
      taskDetailData?.name,
      lifecycleStages,
    ],
  );

  const handlePriorityUpdate = useCallback(
    (taskId, priority) => handleFieldUpdate(taskId, 'priority', priority),
    [handleFieldUpdate],
  );
  const handleStatusUpdate = useCallback(
    (taskId, status) => handleFieldUpdate(taskId, 'status', status),
    [handleFieldUpdate],
  );
  const handleTypeUpdate = useCallback(
    (taskId, type) => handleFieldUpdate(taskId, 'type', type),
    [handleFieldUpdate],
  );

  const handleCloseViewDrawer = useCallback(() => {
    setIsViewDrawerOpen(false);
  }, []);

  const handleCreateTask = useCallback(
    async (formData) => {
      setIsCreateLoading(true);
      try {
        const taskTypeValue = taskTypeForTab(activeTab);
        const payload = new FormData();
        payload.append('task_name', formData.taskTitle ?? '');
        payload.append('task_type', taskTypeValue);
        payload.append('type', formData.type ?? '');
        payload.append(
          'department',
          Array.isArray(formData.department)
            ? JSON.stringify(formData.department)
            : (formData.department ?? ''),
        );
        payload.append('duration', String(formData.duration ?? ''));
        payload.append('priority', formData.priority ?? '');
        payload.append('status', formData.status ?? '');
        payload.append('description', formData.description ?? '');
        payload.append('set_trigger', formData.set_trigger ? '1' : '0');
        if (formData.set_trigger) {
          payload.append('trigger_type', 'Type');
          if (formData.cp_type?.length) {
            payload.append(
              'cp_account_type',
              Array.isArray(formData.cp_type) ? JSON.stringify(formData.cp_type) : formData.cp_type,
            );
          }
        }
        const tagList = formData.tagArr ?? [];
        if (tagList.length > 0) {
          payload.append('tags', JSON.stringify(tagList));
        }
        const attachmentList = formData.attachment ?? [];
        if (Array.isArray(attachmentList)) {
          attachmentList.forEach((item) => {
            if (item?.file instanceof File) {
              payload.append('attachment', item.file);
            }
          });
        }
        const response = await apiClient.post(LEAD_CRM_TASK_CREATE_API, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const result = unwrapFrappeMessage(response);
        if (result?.task_id) {
          setIsDrawerOpen(false);
          setRefreshListKey((k) => k + 1);
          return true;
        }
        return false;
      } catch (error) {
        const errorMessage = extractErrorMessage(error, 'Failed to create task');
        showErrorToast(errorMessage);
        return false;
      } finally {
        setIsCreateLoading(false);
      }
    },
    [activeTab],
  );

  const showLifecycleFields = false;

  return (
    <div className='w-full flex flex-col gap-4 items-center justify-center'>
      <div className='w-full'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={handleTabChange}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none h-12 gap-6'
          >
            {CP_TASK_TABS.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>
      </div>

      <div className='w-full flex items-center justify-between gap-4'>
        <div className='w-full max-w-[320px]'>
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

        <div className='flex items-center gap-3 shrink-0'>
          <CrmTaskMasterFilterPopover
            appliedFilters={appliedFilters}
            onAppliedFiltersChange={handleAppliedFiltersChange}
            taskTypeOptions={taskTypeOptions}
            filterCount={filterCount}
            tooltipContent='Filter'
            ariaLabel={`Filter ${taskTypeForTab(activeTab)} tasks`}
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

      <div className='w-full overflow-x-auto mt-2'>
        {tasksLoading ? (
          <div className='py-8 text-center text-muted-fg'>Loading tasks…</div>
        ) : (
          <CrmTasksTableCommon
            tasks={tasks}
            tableVariant={tableVariant}
            sorting={sorting}
            onSortChange={handleSortChange}
            onTaskClick={handleTaskClick}
            searchTerm={searchTerm}
            columns={visibleColumns}
            visibleColumnConfig={visibleColumns}
            columnWidths={columnWidths}
            onColumnResize={resizeColumnsEnabled ? handleColumnResize : undefined}
            onPriorityUpdate={handlePriorityUpdate}
            onStatusUpdate={handleStatusUpdate}
            onTypeUpdate={handleTypeUpdate}
            taskTypeOptions={taskTypeOptions}
            lifecycleStages={lifecycleStages}
            statusContext='CP Tasks'
            showLifecycleFields={showLifecycleFields}
          />
        )}
        {!tasksLoading && totalPages > 1 && (
          <div className='mt-3 flex items-center justify-between'>
            <span className='text-sm text-muted-fg'>
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <div className='flex gap-2'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button.Root>
            </div>
          </div>
        )}
      </div>

      <CrmTaskCreateDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={isCreateLoading}
        taskType={activeTab}
        taskTypeOptions={taskTypeOptions}
        lifecycleStages={lifecycleStages}
        showLifecycleFields={showLifecycleFields}
      />

      <CrmTaskViewDrawer
        isOpen={isViewDrawerOpen}
        onClose={handleCloseViewDrawer}
        task={taskDetailData}
        taskType={activeTab}
        lifecycleStages={lifecycleStages}
        taskTypeOptions={taskTypeOptions}
        onFetchDetail={handleFetchDetail}
        onUpdate={handleUpdateTask}
        onRefresh={() => taskDetailData?.name && handleFetchDetail(taskDetailData.name)}
        isLoadingDetail={taskDetailLoading}
        showLifecycleFields={showLifecycleFields}
      />
    </div>
  );
};

export default CpTaskMaster;
