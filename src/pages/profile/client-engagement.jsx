import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as Input from '@/components/ui/input';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  createClientOnboardingTask,
  updateClientOnboardingTask,
  getClientEngagementTaskList,
  getParticularTaskDetail,
  getRolesWithDescription,
  getClientEngagementColumnPreferences,
  saveClientEngagementColumnPreferences,
  fetchScopedTaskTags,
} from '@/redux/settingSlice';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import {
  mapFrequencyToAPI,
  normalizeAssignees,
  buildTaskMasterListFilters,
  buildTaskMasterTagOptions,
  countTaskMasterAppliedFilters,
  shouldFetchScopedTaskTags,
} from '@/utils/task-utils';
import { useTaskFieldUpdaters } from '@/hooks/use-task-field-updaters';
import TaskViewDrawer from '@/components/client-onboarding/task-view-drawer-engagement';
import TasksTableCommon from '@/components/client-onboarding/tasks-table-common';
import CreateTaskDrawerCommon from '@/components/client-onboarding/create-task-drawer-common';
import ClientTaskMasterFilterPopover from '@/components/client-onboarding/client-task-master-filter-popover';
import {
  ENGAGEMENT_TASK_FILTER_TAB_CONFIG,
  TASK_FILTER_OPTION,
  CLIENT_TASK_MASTER_ENGAGEMENT_FILTERS_KEY,
} from '@/components/clients-management/constants';
import * as Tooltip from '@/components/ui/tooltip';

const ClientEngagement = () => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState(null); // { field: 'priority', direction: 'asc' } or null
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeOptionsLoading, setAssigneeOptionsLoading] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(TASK_FILTER_OPTION);
  const [filterCount, setFilterCount] = useState(0);

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: CLIENT_TASK_MASTER_ENGAGEMENT_FILTERS_KEY,
    defaultFilters: TASK_FILTER_OPTION,
  });

  const dispatch = useDispatch();

  // Roles list for assignee dropdowns (Client Task Master uses Role assignees)
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

  const { isLoading: isCreateTaskLoading } = useSelector(
    (state) => state.setting.clientOnboarding.createTask,
  );

  const { data: clientEngagementTaskList } = useSelector(
    (state) => state.setting.clientEngagement.getList,
  );

  const { data: columnPreferences } = useSelector(
    (state) => state.setting.clientEngagement.columnPreferences,
  );

  // Table variant management with localStorage persistence (default to compact)
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'client-engagement-table',
    'compact',
  );

  // React table ID for column arrangement persistence
  const react_table_id = 'client-engagement-tasks';

  // Debounce search
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Get tasks from API
  const tasks = useMemo(() => clientEngagementTaskList?.results || [], [clientEngagementTaskList]);
  const totalTasks = useMemo(() => {
    const n =
      clientEngagementTaskList?.total_tasks ??
      clientEngagementTaskList?.total_count ??
      clientEngagementTaskList?.count ??
      tasks.length;
    const asNum = Number(n);
    return Number.isFinite(asNum) ? asNum : tasks.length;
  }, [clientEngagementTaskList, tasks.length]);

  useEffect(() => {
    if (filtersInitialized) return;
    const merged = { ...TASK_FILTER_OPTION, ...persistedFilters };
    setAppliedFilters(merged);
    setFilterCount(countTaskMasterAppliedFilters(merged));
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactFiltersForSessionStorage(appliedFilters, TASK_FILTER_OPTION);
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  const [scopedTaskTags, setScopedTaskTags] = useState([]);

  useEffect(() => {
    const scope = { doctype: 'Task Master', taskType: 'Client Engagement' };
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
  }, [dispatch]);

  const tagOptions = useMemo(
    () => buildTaskMasterTagOptions(tasks, appliedFilters?.tags, [], scopedTaskTags),
    [tasks, appliedFilters?.tags, scopedTaskTags],
  );

  const handleAppliedFiltersChange = useCallback((nextFilters) => {
    setAppliedFilters(nextFilters);
    setFilterCount(countTaskMasterAppliedFilters(nextFilters));
  }, []);

  // Get columns from API response
  // The API response structure is: { message: { columns: [...], results: [...] } }
  // Redux stores action.payload?.message in data, so clientEngagementTaskList should be the message object
  // Also check columnPreferences which is extracted separately in the reducer
  const apiColumns = useMemo(() => {
    // Try multiple sources: direct from task list, from message, or from columnPreferences
    return (
      clientEngagementTaskList?.columns ||
      clientEngagementTaskList?.message?.columns ||
      columnPreferences ||
      []
    );
  }, [clientEngagementTaskList, columnPreferences]);

  // Map API column IDs to table column IDs
  const apiColumnIdMap = useMemo(
    () => ({
      task_name: 'task',
      assignees: 'assigned_to',
      duration: 'duration',
      tags: 'tags',
      priority: 'priority',
      status: 'status',
      recurrence_period: 'recurrence_period',
    }),
    [],
  );

  /**
   * IMPORTANT: keep `defaultColumns` stable.
   * `useColumnConfig` reloads preferences whenever `defaultColumns` changes; deriving defaults
   * from API-provided columns can create a render -> refetch loop (get_list_pref).
   */
  const allColumnDefs = useMemo(
    () => [
      { id: 'task', label: 'Task', visible: true },
      { id: 'assigned_to', label: 'Assignee', visible: true },
      { id: 'duration', label: 'Duration', visible: true },
      { id: 'tags', label: 'Tags', visible: true },
      { id: 'priority', label: 'Priority', visible: true },
      { id: 'status', label: 'Status', visible: true },
      { id: 'recurrence_period', label: 'Recurrence Period', visible: true },
    ],
    [],
  );

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(allColumnDefs),
    [allColumnDefs],
  );

  // Use column config hook with backend API integration
  const columnConfigHook = useColumnConfig(
    react_table_id,
    defaultColumnConfig,
    async (cols) => {
      await dispatch(
        saveClientEngagementColumnPreferences({ columns: cols, react_table_id }),
      ).unwrap();
    },
    async () => {
      const result = await dispatch(
        getClientEngagementColumnPreferences({ react_table_id }),
      ).unwrap();
      return result?.message || result?.data || result || [];
    },
    { autoSave: true, debounce: 300 },
  );

  // Get visible columns from column config
  const visibleColumns = useMemo(() => {
    return columnConfigHook.visibleColumns
      .filter((col) => col.id !== 'task_type' && col.id !== 'task_name')
      .map((col) => ({
        id: col.id,
        label: col.label || col.id,
      }));
  }, [columnConfigHook.visibleColumns]);

  // Create column labels map from API columns - use exact labels from API
  const columnLabelsMap = useMemo(() => {
    const labelsMap = {};
    if (apiColumns && apiColumns.length > 0) {
      apiColumns.forEach((apiCol) => {
        // Map API column ID to table column ID
        const tableColumnId = apiColumnIdMap[apiCol.id] || apiCol.id;
        let label = apiCol.label || apiCol.id;
        // Override "Assignees" to "Assignee"
        if (label === 'Assignees' || label.toLowerCase() === 'assignees') {
          label = 'Assignee';
        }
        labelsMap[tableColumnId] = label;
      });
    }
    // Return the map (will be empty if no API columns, which is fine - table will use defaults)
    return labelsMap;
  }, [apiColumns, apiColumnIdMap]);

  // Handle search change
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // Handle sort change for any field
  const handleSortChange = useCallback((field) => {
    setSorting((currentSorting) => {
      // If clicking the same field, cycle: null -> asc -> desc -> null
      if (currentSorting?.field === field) {
        if (currentSorting.direction === 'asc') {
          return { field, direction: 'desc' };
        }
        if (currentSorting.direction === 'desc') {
          return null;
        }
      }
      // If clicking a different field or no current sort, start with asc
      return { field, direction: 'asc' };
    });
  }, []);

  // Handle add task
  const handleAddTask = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  // Handle create task
  const handleCreateTask = useCallback(
    async (formData) => {
      const apiFormData = new FormData();

      apiFormData.append('subject', formData.taskTitle);
      apiFormData.append('description', formData.description);
      apiFormData.append('status', formData.status);
      apiFormData.append('priority', formData.priority);
      apiFormData.append('type', 'Client Engagement');
      apiFormData.append('duration', formData.duration);
      if (formData.next_update != null && String(formData.next_update).trim() !== '') {
        apiFormData.append('next_update', String(formData.next_update).trim());
      }
      // Send assignees as JSON stringified array
      if (Array.isArray(formData.assignedTo) && formData.assignedTo.length > 0) {
        apiFormData.append('assignees', JSON.stringify(formData.assignedTo));
      } else if (formData.assignedTo) {
        // Handle case where it might be a string or single value
        apiFormData.append('assignees', JSON.stringify([formData.assignedTo]));
      }
      // Determine if recurring based on recurrence_period
      const isRecurring = formData.recurrence_period && formData.recurrence_period !== 'One Time';
      apiFormData.append('is_recurring', isRecurring ? '1' : '0');

      if (isRecurring && formData.recurrence_period) {
        apiFormData.append('recurrence_period', formData.recurrence_period);

        // Handle different recurrence types with appropriate date fields
        if (formData.recurrence_period === 'Monthly') {
          const monthlyDate = formData.recurrence_date;
          if (
            monthlyDate !== undefined &&
            monthlyDate !== null &&
            String(monthlyDate).trim() !== ''
          ) {
            apiFormData.append('recurrence_date', String(monthlyDate));
          }
        } else if (formData.recurrence_period === 'Quarterly') {
          const quarterlyDate = formData.recurrence_quarterly_date;
          if (
            quarterlyDate !== undefined &&
            quarterlyDate !== null &&
            String(quarterlyDate).trim() !== ''
          ) {
            apiFormData.append('recurrence_quarterly_date', String(quarterlyDate));
          }
        } else if (formData.recurrence_period === 'Yearly') {
          const yearlyDate = formData.recurrence_date;
          if (yearlyDate !== undefined && yearlyDate !== null && String(yearlyDate).trim() !== '') {
            apiFormData.append('recurrence_date', String(yearlyDate));
          }
          const yearlyMonth = formData.recurrence_month;
          if (
            yearlyMonth !== undefined &&
            yearlyMonth !== null &&
            String(yearlyMonth).trim() !== ''
          ) {
            apiFormData.append('recurrence_month', String(yearlyMonth));
          }
        }
        // One Time doesn't need any recurrence date fields
      }

      formData.attachment?.forEach((item) => {
        if (item.file) {
          apiFormData.append('attachment', item.file);
        }
      });

      if (formData.tagArr.length > 0) {
        apiFormData.append('tags', JSON.stringify(formData.tagArr));
      }

      try {
        const result = await dispatch(createClientOnboardingTask(apiFormData)).unwrap();

        dispatch(
          getClientEngagementTaskList({
            task_type: 'Client Engagement',
            keyword: debouncedSearchTerm.trim() || undefined,
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
    [dispatch, debouncedSearchTerm],
  );

  const fetchClientEngagementTaskList = useCallback(
    async (keyword = '', orderBy = null, filters = appliedFilters) => {
      try {
        const payload = {
          task_type: 'Client Engagement',
          keyword: keyword.trim() || undefined,
        };

        if (orderBy?.field && orderBy?.direction) {
          payload.order_by = `${orderBy.field} ${orderBy.direction}`;
        }

        const apiFilters = buildTaskMasterListFilters(filters, { includeRecurring: true });
        if (Object.keys(apiFilters).length > 0) {
          payload.filters = JSON.stringify(apiFilters);
        }

        await dispatch(getClientEngagementTaskList(payload)).unwrap();
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage);
      }
    },
    [dispatch, appliedFilters],
  );

  // Fetch tasks on mount and when debounced search term, sorting, or filters change
  useEffect(() => {
    if (!filtersInitialized) return;
    fetchClientEngagementTaskList(debouncedSearchTerm, sorting);
  }, [
    debouncedSearchTerm,
    sorting,
    appliedFilters,
    filtersInitialized,
    fetchClientEngagementTaskList,
  ]);

  // Handle task row click to open view drawer
  const handleTaskClick = useCallback(
    async (task) => {
      const taskTitleValue = task.task_name || task.subject;
      if (!taskTitleValue) return;

      try {
        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: task.name,
            subject: taskTitleValue,
            type: 'Client Engagement',
          }),
        ).unwrap();

        const taskData = response?.message?.data || response?.data || response;
        if (taskData) {
          setSelectedTask(taskData);
          setIsViewDrawerOpen(true);
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage);
      }
    },
    [dispatch],
  );

  // Handle task change for navigation (back/forward)
  const handleTaskChange = useCallback(
    async (taskId) => {
      if (!taskId) return;

      try {
        // Find the task in the list to get the correct subject/task_name
        const taskFromList = tasks.find(
          (t) => (t.name || t.id || t.subject || t.task_name) === taskId,
        );
        const taskSubject = taskFromList?.task_name || taskFromList?.subject || taskId;

        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: taskId,
            subject: taskSubject,
            type: 'Client Engagement',
          }),
        ).unwrap();

        const taskData = response?.message?.data || response?.data || response;

        if (taskData) {
          setSelectedTask(taskData);
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage);
      }
    },
    [dispatch, tasks],
  );

  // Handle field update in view drawer
  const handleFieldUpdate = useCallback(
    async (taskId, fieldNameOrChanges, value) => {
      // Find task from tasks list if selectedTask is not available (for inline editing)
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
        // Get existing task data
        const taskIdValue = existingTask.name || existingTask.task_id || taskId;
        let taskSubject = existingTask.subject || existingTask.task_name || taskId;

        // Check if this is a batch update (all changes) or single field update
        const isBatchUpdate =
          typeof fieldNameOrChanges === 'object' &&
          fieldNameOrChanges !== null &&
          !Array.isArray(fieldNameOrChanges);

        // Prepare the update payload by merging existing data with changes
        const updateData = { ...existingTask };
        let newAttachments = null;

        let allChanges = null;
        if (isBatchUpdate) {
          // Batch update - merge all changes
          allChanges = fieldNameOrChanges;
          Object.entries(allChanges).forEach(([key, value_]) => {
            if (key === 'newAttachments') {
              newAttachments = value_;
            } else if (key !== 'tags') {
              // Skip tags - they will be handled separately
              // Map field names to API expected format
              if (key === 'task_name') {
                updateData.subject = value_;
                // Update taskSubject to use the new value
                taskSubject = value_ || taskSubject;
              } else if (key === 'assigned_to') {
                updateData.assignees = value_;
              } else {
                // Directly update the field, prioritizing changes over existing data
                updateData[key] = value_;
              }
            }
          });
        } else {
          // Single field update
          const fieldName = fieldNameOrChanges;
          if (fieldName === 'task_name') {
            updateData.subject = value;
            // Update taskSubject to use the new value
            taskSubject = value || taskSubject;
          } else if (fieldName === 'assigned_to') {
            updateData.assignees = value;
          } else {
            updateData[fieldName] = value;
          }
        }

        const tagsChanged = isBatchUpdate
          ? allChanges && Object.prototype.hasOwnProperty.call(allChanges, 'tags')
          : fieldNameOrChanges === 'tags';

        const isOnlyTagsUpdate = isBatchUpdate
          ? allChanges &&
            Object.keys(allChanges).length === 1 &&
            Object.prototype.hasOwnProperty.call(allChanges, 'tags')
          : fieldNameOrChanges === 'tags';

        // If this update is ONLY tags, skip the main "update task" API entirely.
        if (isOnlyTagsUpdate) {
          const taskIdValue = existingTask.name || existingTask.task_id || taskId;
          const tagsValue = isBatchUpdate ? allChanges?.tags : value;

          const toStringTag = (tag) =>
            typeof tag === 'string' ? tag : tag?.name || tag?.label || tag;

          const tagsArray = Array.isArray(tagsValue)
            ? tagsValue.map(toStringTag).filter(Boolean)
            : tagsValue
              ? [toStringTag(tagsValue)].filter(Boolean)
              : [];

          try {
            const fd = new FormData();
            fd.append('task_id', taskIdValue);
            fd.append('tags', JSON.stringify(tagsArray));
            await dispatch(updateClientOnboardingTask(fd)).unwrap();
          } catch (tagError) {
            console.error('Failed to update tags:', tagError);
            const tagErrorMessage = extractErrorMessage(tagError);
            showErrorToast(`Failed to update tags: ${tagErrorMessage}`);
          }

          await fetchClientEngagementTaskList(debouncedSearchTerm, sorting);

          // Refresh selected task detail to get updated tags
          const taskTitleValue = existingTask.subject || existingTask.task_name;
          if (taskTitleValue) {
            try {
              const response = await dispatch(
                getParticularTaskDetail({
                  subject: taskTitleValue,
                  type: 'Client Engagement',
                }),
              ).unwrap();
              const taskData = response?.message?.data || response?.data || response;
              if (taskData) setSelectedTask(taskData);
            } catch {
              // ignore detail refresh failures for tag-only updates
            }
          }

          showSuccessToast('Tags updated successfully');
          return;
        }

        // Build FormData with all required fields
        const apiFormData = new FormData();

        // Required fields from API
        apiFormData.append('task_id', taskIdValue);
        apiFormData.append('subject', updateData.subject || taskSubject);
        apiFormData.append('description', updateData.description || '');
        apiFormData.append('status', updateData.status || '');
        apiFormData.append('priority', updateData.priority || '');
        apiFormData.append('type', updateData.type || 'Client Engagement');
        apiFormData.append('duration', updateData.duration || '');
        if (updateData.next_update != null && String(updateData.next_update).trim() !== '') {
          apiFormData.append('next_update', String(updateData.next_update).trim());
        }

        // Handle due_date if present
        if (updateData.due_date !== undefined) {
          apiFormData.append('due_date', updateData.due_date || '');
        }

        // Handle recurring task fields (Client Engagement specific)
        const isRecurring =
          updateData.is_recurring === 1 ||
          updateData.is_recurring === '1' ||
          updateData.is_recurring === true;
        apiFormData.append('is_recurring', isRecurring ? '1' : '0');
        if (isRecurring && updateData.recurrence_period) {
          // Ensure frequency is in API format (it should already be, but map it to be safe)
          const frequencyValue =
            mapFrequencyToAPI(updateData.recurrence_period) || updateData.recurrence_period;
          apiFormData.append('recurrence_period', frequencyValue);

          // Handle different recurrence types with appropriate date fields
          if (frequencyValue === 'Monthly' && updateData.recurrence_date) {
            apiFormData.append('recurrence_date', updateData.recurrence_date);
          } else if (frequencyValue === 'Quarterly') {
            if (updateData.recurrence_quarterly_date || updateData.recurrence_quarterly_date) {
              const quarterlyDate =
                updateData.recurrence_quarterly_date || updateData.recurrence_quarterly_date;
              apiFormData.append('recurrence_quarterly_date', quarterlyDate);
            }
          } else if (frequencyValue === 'Yearly') {
            if (updateData.recurrence_date) {
              apiFormData.append('recurrence_date', updateData.recurrence_date);
            }
            if (updateData.recurrence_month) {
              apiFormData.append('recurrence_month', updateData.recurrence_month);
            }
          }
        }

        // Handle assignees as JSON stringified array
        // Normalize assignees to strings (emails only) before sending
        if (updateData.assignees || updateData.assigned_to) {
          const assignees = updateData.assignees || updateData.assigned_to;
          const normalizedAssignees = normalizeAssignees(assignees);

          if (normalizedAssignees.length > 0) {
            apiFormData.append('assignees', JSON.stringify(normalizedAssignees));
          }
        }

        // Include tags in the same update_task_master call when changed
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

        // Handle attachments - preserve existing and add new ones
        const existingAttachments =
          existingTask.attachments ||
          existingTask._attachments ||
          existingTask.attachments_info ||
          [];

        // If there are new attachments, we need to preserve existing ones
        if (newAttachments && Array.isArray(newAttachments) && newAttachments.length > 0) {
          // Send existing attachment file names first (as strings to preserve them)
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

          // Then add new attachments as files
          newAttachments.forEach((attachment) => {
            if (attachment.file) {
              apiFormData.append('attachments', attachment.file);
            }
          });
        }

        // Send update request
        const result = await dispatch(updateClientOnboardingTask(apiFormData)).unwrap();

        // Refresh task list
        await fetchClientEngagementTaskList(debouncedSearchTerm);

        // Refresh selected task detail to get updated tags
        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: taskIdValue,
            subject: taskSubject,
            type: 'Client Engagement',
          }),
        ).unwrap();

        const taskData = response?.message?.data || response?.data || response;
        if (taskData) {
          setSelectedTask(taskData);
        }

        // Show success message
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
    [dispatch, fetchClientEngagementTaskList, debouncedSearchTerm, selectedTask, tasks],
  );

  // Handle inline field update from table
  const handleAssigneeUpdate = useCallback(
    async (taskId, assignees) => {
      const normalizedAssignees = normalizeAssignees(assignees);
      await handleFieldUpdate(taskId, 'assigned_to', normalizedAssignees);
    },
    [handleFieldUpdate],
  );

  // Use common field update handlers
  const { handlePriorityUpdate, handleStatusUpdate, handleDueDateUpdate } =
    useTaskFieldUpdaters(handleFieldUpdate);

  // Handle refresh task in view drawer
  const handleRefreshTask = useCallback(async () => {
    if (!selectedTask) return;

    try {
      const taskTitle = selectedTask.task_name || selectedTask.subject;
      const taskId = selectedTask.name || selectedTask.task_id;

      const response = await dispatch(
        getParticularTaskDetail({
          tm_id: taskId,
          subject: taskTitle,
          type: 'Client Engagement',
        }),
      ).unwrap();

      const taskData = response?.message?.data || response?.data || response;
      if (taskData) {
        setSelectedTask({ ...taskData });
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      showErrorToast(errorMessage);
    }
  }, [dispatch, selectedTask]);

  return (
    <div className='w-full flex flex-col gap-5 items-center justify-center'>
      <div className='w-full flex items-center justify-between gap-[16px]'>
        <div className='w-1/2 flex flex-col items-start justify-start gap-1'>
          <span className='text-text-main-900 text-label-sm'>Client Engagement</span>
          <span className='text-text-sub-500 text-paragraph-xs'>
            Manage client engagement tasks
          </span>
        </div>

        <div className='w-1/2 flex items-center justify-end gap-[16px]'>
          <div className='w-full'>
            <Input.Root size='small' className=''>
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
              tabConfig={ENGAGEMENT_TASK_FILTER_TAB_CONFIG}
              appliedFilters={appliedFilters}
              onAppliedFiltersChange={handleAppliedFiltersChange}
              tagOptions={tagOptions}
              filterCount={filterCount}
              tooltipContent='Filter'
              ariaLabel='Filter client engagement tasks'
            />
            {/* <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <TableVariantToggle variant={tableVariant} onToggle={toggleTableVariant} />
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
                <Button.Root variant='neutral' mode='stroke' size='small' className=''>
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

      {/* Table */}
      <div className='w-full overflow-x-auto'>
        <TasksTableCommon
          tasks={tasks}
          tableVariant={tableVariant}
          sorting={sorting}
          onTaskClick={handleTaskClick}
          onSortChange={handleSortChange}
          showRecurring={true}
          searchTerm={searchTerm}
          columns={visibleColumns}
          visibleColumnConfig={visibleColumns.length > 0 ? visibleColumns : null}
          columnLabels={columnLabelsMap}
          onAssigneeUpdate={handleAssigneeUpdate}
          assigneeOptions={assigneeOptions}
          assigneeOptionsLoading={assigneeOptionsLoading}
          onPriorityUpdate={handlePriorityUpdate}
          onStatusUpdate={handleStatusUpdate}
          onDueDateUpdate={handleDueDateUpdate}
        />
      </div>

      {/* Task View Drawer */}
      <TaskViewDrawer
        isOpen={isViewDrawerOpen}
        onClose={() => {
          setIsViewDrawerOpen(false);
          setSelectedTask(null);
          fetchClientEngagementTaskList(debouncedSearchTerm, sorting);
        }}
        task={selectedTask}
        onFieldUpdate={handleFieldUpdate}
        onRefresh={handleRefreshTask}
        tasks={tasks}
        onTaskChange={handleTaskChange}
      />

      {/* Create Task Drawer */}
      <CreateTaskDrawerCommon
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={isCreateTaskLoading}
        taskType='Client Engagement'
        showTagsInput={false}
        showRecurring={true}
      />
    </div>
  );
};

export default ClientEngagement;
