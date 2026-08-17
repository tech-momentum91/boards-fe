import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiUserLine,
  RiFlagLine,
  RiStickyNoteLine,
  RiAttachment2,
  RiUploadCloud2Line,
  RiUploadLine,
  RiImage2Line,
  RiDownloadLine,
  RiPriceTag3Line,
  RiAddLine,
  RiCheckLine,
  RiLoader2Fill,
  RiCalendarLine,
  RiTimeLine,
  RiRepeatLine,
  RiDeleteBinLine,
  RiBuilding4Line,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import * as CompactButton from '@/components/ui/compact-button';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import {
  formatDateToYYYYMMDD,
  formatDisplayDateTime,
  getMinCustomNextUpdateDate,
  parseToDate,
} from '@/utils/date-utils';
import { isCustomNextUpdateAfterDueDate } from '@/schemas/task-schema';
import * as Input from '@/components/ui/input';
import { Datepicker } from '@/components/ui/datepicker';
import FieldRow from '@/components/ui/field-row';
import * as Tag from '@/components/ui/tag';
import * as LinkButton from '@/components/ui/link-button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Popover from '@/components/ui/popover';
import * as Label from '@/components/ui/label';
import * as Tooltip from '@/components/ui/tooltip';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import {
  FALLBACK_PRIORITY_OPTIONS,
  getPriorityColor,
  getStatusColor,
  IMAGE_EXTENSIONS,
  MAX_FILE_SIZE,
  normalizeTaskAttachments,
  getFieldValue,
  sanitizeUnsignedIntegerInput,
} from './task-view-drawer-utils';
import {
  resolveEventCenterDisplayLabels,
  collectCenterIdsFromTask,
} from '@/components/client-onboarding/task-view-drawer-utils';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import {
  RECURRING_FREQUENCY_OPTIONS,
  MONTH_OPTIONS,
} from '@/components/client-onboarding/constants';
import { TASK_STATUS_OPTIONS } from '@/components/clients-management/constants';
import { EVENT_CENTER_NAME_MAX } from '@/components/event-management/constant';

// Monthly recurring date options (1-31)
const MONTHLY_RECURRING_DATE_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const n = i + 1;
  return { value: String(n), label: `${n}` };
});

import {
  addCrmTaskAttachment,
  removeCrmTaskAttachment,
  getParticularTaskDetail,
  getClientOnboardingTaskList,
  getClientExitTaskList,
  getClientEngagementTaskList,
  getRolesWithDescription,
  getVendorOnboardingTaskList,
} from '@/redux/settingSlice';
import { useDispatch } from 'react-redux';
import apiClient from '@/api/axios';
import {
  normalizeAssignees,
  normalizeTaskAssigneeEntry,
  joinAssigneeIds,
} from '@/utils/task-utils';
import {
  filterAssigneeIdsByCenters,
  normalizeCenterIds,
} from '@/components/event-management/event-task-assignee-utils';

// Main task view drawer component
const TaskViewDrawerCommon = ({
  isOpen = false,
  onClose,
  task = null,
  onFieldUpdate,
  onRefresh,
  showRecurring = false, // Show recurring task fields (for Client Engagement)
  taskType = 'Client Onboarding', // Task type for API calls (Client Onboarding, Client Exiting, Client Engagement)
  tasks = [], // List of tasks for navigation
  onTaskChange, // Callback when navigating to different task
  assigneeSelectItems,
  assigneeSelectLoading = false,
  /** Optional right-side panel (Activities/Comments). When provided, drawer becomes two-column. */
  sidePanel = null,
  sidePanelTitle = 'Activity',
  /** When true, show Due Date instead of Duration (e.g. Event/Partner CRM tasks). */
  dueDateMode = false,
  /**
   * Event task **master** (settings-style): Active/Inactive status row instead of CRM document-task statuses.
   */
  eventTaskMasterMode = false,
  /**
   * Optional override for uploading a task attachment (used by Event Tasks).
   * Signature: ({ task_id, attachment_file }) => thunkAction (createAsyncThunk)
   */
  uploadTaskAttachmentThunk,
  /** Event Tasks: map center id → label (from event-linked centers). */
  eventCenterOptions = [],
  /** Full center rows (with zone) for the Task Master center picker. */
  eventCenters = [],
  /** Event Tasks (document): limit assignee picker/chips to these center ids. */
  assigneeCenterScopeIds = [],
}) => {
  const [localChanges, setLocalChanges] = useState({});
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const [titleError, setTitleError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState('100%');
  const [messageTop, setMessageTop] = useState('50%');
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [newAttachments, setNewAttachments] = useState([]); // Store new files locally
  const [removedExistingAttachmentIds, setRemovedExistingAttachmentIds] = useState(() => new Set());
  const [imagePreviewErrors, setImagePreviewErrors] = useState({});
  const [recurrencePopoverOpen, setRecurrencePopoverOpen] = useState(false);
  const [editRecurrencePeriod, setEditRecurrencePeriod] = useState('One Time');
  const [editRecurrenceDate, setEditRecurrenceDate] = useState('');
  const [editRecurrenceMonth, setEditRecurrenceMonth] = useState('');
  const [roles, setRoles] = useState([]);
  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const attachmentsListRef = useRef(null);
  const updateQueueRef = useRef(Promise.resolve());
  const lastFetchedTaskIdRef = useRef(null);

  const dispatch = useDispatch();

  // Memoized computed values
  const taskTitle = useMemo(
    () =>
      getFieldValue(task, localChanges, 'task_name') ||
      getFieldValue(task, localChanges, 'subject'),
    [task, localChanges],
  );

  const priority = useMemo(
    () => getFieldValue(task, localChanges, 'priority'),
    [task, localChanges],
  );

  const status = useMemo(() => getFieldValue(task, localChanges, 'status'), [task, localChanges]);

  const showEventTaskCenter = taskType === 'Event Tasks';
  const canEditEventTaskCenters = showEventTaskCenter && eventTaskMasterMode;

  const eventCenterPickerCenters = useMemo(() => {
    if (Array.isArray(eventCenters) && eventCenters.length > 0) return eventCenters;
    return (eventCenterOptions || []).map((o) => ({
      name: o.value,
      center_name: o.label,
      value: o.value,
      label: o.label,
      zone: o.zone || 'Unassigned',
    }));
  }, [eventCenters, eventCenterOptions]);

  const selectedEventCenterIds = useMemo(() => {
    if (!showEventTaskCenter || !task) return [];
    if (localChanges.centers !== undefined) {
      return normalizeCenterIds(localChanges.centers);
    }
    return collectCenterIdsFromTask({ ...task, ...localChanges });
  }, [showEventTaskCenter, task, localChanges]);

  const eventCenterLabels = useMemo(() => {
    if (!showEventTaskCenter || !task) return [];
    return resolveEventCenterDisplayLabels(
      { ...task, ...localChanges, centers: selectedEventCenterIds },
      eventCenterOptions,
    );
  }, [showEventTaskCenter, task, eventCenterOptions, localChanges, selectedEventCenterIds]);

  const renderEventCenterBadge = useCallback((label) => {
    const text = String(label || '').trim();
    if (!text) {
      return (
        <Badge.Root variant='light' color='gray' className='text-nowrap'>
          Not Set
        </Badge.Root>
      );
    }
    const centerMatch = text.match(/^(.+?)\s*\(([^)]+)\)$/);
    const centerName = centerMatch ? centerMatch[1].trim() : text;
    const centerCode = centerMatch ? centerMatch[2] : null;
    const isTruncated = centerName.length > EVENT_CENTER_NAME_MAX;
    const displayName = isTruncated
      ? `${centerName.slice(0, EVENT_CENTER_NAME_MAX)}..`
      : centerName;
    const fullLabel = centerCode ? `${centerName} (${centerCode})` : centerName;

    const badge = (
      <Badge.Root variant='light' color='gray' className='text-nowrap'>
        {displayName}
        {centerCode ? <span className='text-text-sub-400 ml-1'>({centerCode})</span> : null}
      </Badge.Root>
    );

    if (!isTruncated) return badge;

    return (
      <Tooltip.Root delayDuration={200}>
        <Tooltip.Trigger asChild>
          <span className='inline-flex max-w-full'>{badge}</span>
        </Tooltip.Trigger>
        <Tooltip.Content side='top' size='xsmall'>
          {fullLabel}
        </Tooltip.Content>
      </Tooltip.Root>
    );
  }, []);

  const eventTaskStatusSelectOptions = useMemo(() => {
    const current = String(status || '').trim();
    const base = TASK_STATUS_OPTIONS;
    if (!current || base.some((o) => o.value === current)) return base;
    return [{ value: current, label: current, color: 'gray', percentage: 100 }, ...base];
  }, [status]);

  const duration = useMemo(
    () => getFieldValue(task, localChanges, 'duration'),
    [task, localChanges],
  );

  /** Days until next update; API key `next_update` (legacy list/detail may expose numeric `next_update_date`). */
  const nextUpdate = useMemo(() => {
    const fromLocal = getFieldValue(task, localChanges, 'next_update');
    if (fromLocal !== undefined && fromLocal !== null && String(fromLocal).trim() !== '') {
      return String(fromLocal).trim();
    }
    const raw = task?.next_update;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      return String(raw).trim();
    }
    const legacy = task?.next_update_date;
    if (legacy !== undefined && legacy !== null && String(legacy).trim() !== '') {
      const s = String(legacy).trim();
      if (/^\d+$/.test(s)) return s;
    }
    return '';
  }, [task, localChanges]);

  const dueDate = useMemo(
    () =>
      getFieldValue(task, localChanges, 'exp_end_date') ||
      getFieldValue(task, localChanges, 'due_date') ||
      '',
    [task, localChanges],
  );

  const customNextUpdateDate = useMemo(() => {
    if (Object.prototype.hasOwnProperty.call(localChanges, 'custom_next_update_date')) {
      const fromLocal = localChanges.custom_next_update_date;
      if (fromLocal == null || String(fromLocal).trim() === '') return '';
      return String(fromLocal).trim().split('T')[0];
    }
    const raw = task?.custom_next_update_date;
    if (raw == null || raw === '') return '';
    return String(raw).trim().split('T')[0];
  }, [task, localChanges]);

  // Recurring task fields (only for Client Engagement)
  const isRecurring = useMemo(() => {
    if (!showRecurring) return false;
    const value = getFieldValue(task, localChanges, 'is_recurring');
    return value === 1 || value === '1' || value === true;
  }, [task, localChanges, showRecurring]);

  const frequency = useMemo(() => {
    if (!showRecurring) return '';
    const value = getFieldValue(task, localChanges, 'recurrence_period');
    return value || '';
  }, [task, localChanges, showRecurring]);

  // Sync recurrence edit form from task (engagement only)
  useEffect(() => {
    if (!showRecurring || !task) return;
    const period =
      getFieldValue(task, localChanges, 'custom_recurrence_period') ||
      getFieldValue(task, localChanges, 'recurrence_period') ||
      getFieldValue(task, localChanges, 'recurring_type') ||
      getFieldValue(task, localChanges, 'recurring') ||
      'One Time';
    const normalized =
      typeof period === 'string'
        ? period.charAt(0).toUpperCase() + period.slice(1).toLowerCase()
        : 'One Time';
    const periodOption =
      RECURRING_FREQUENCY_OPTIONS.find((o) => o.value.toLowerCase() === normalized.toLowerCase())
        ?.value || 'One Time';
    setEditRecurrencePeriod(periodOption);
    // Get date value - check custom_ prefix first, then fallback to old fields
    const dateValue =
      getFieldValue(task, localChanges, 'custom_recurrence_date') ||
      getFieldValue(task, localChanges, 'recurrence_date') ||
      getFieldValue(task, localChanges, 'recurrence_quaterly_date') ||
      getFieldValue(task, localChanges, 'recurrence_quarterly_date') ||
      '';
    setEditRecurrenceDate(dateValue ? String(dateValue) : '');
    // Get month value for Yearly recurrence - check custom_ prefix first
    const monthValue =
      getFieldValue(task, localChanges, 'custom_recurrence_month') ||
      getFieldValue(task, localChanges, 'recurrence_month') ||
      '';
    setEditRecurrenceMonth(monthValue ? String(monthValue) : '');
  }, [showRecurring, task, localChanges]);

  const assignedTo = useMemo(() => {
    const value = getFieldValue(task, localChanges, 'assigned_to');
    if (value !== undefined && value !== null && value !== '') {
      return Array.isArray(value) ? value : [value];
    }
    if (task?.assignee && Array.isArray(task.assignee) && task.assignee.length > 0) {
      return task.assignee.map((a) => normalizeTaskAssigneeEntry(a)).filter(Boolean);
    }
    if (task?.assignees) {
      let raw = task.assignees;
      // Some APIs may return stringified JSON for assignees
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          // ignore parse failure; treat as plain string
        }
      }
      const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return list.map((a) => normalizeTaskAssigneeEntry(a)).filter(Boolean);
    }
    return [];
  }, [task, localChanges]);

  const scopedAssignedTo = useMemo(() => {
    const scope = Array.isArray(assigneeCenterScopeIds) ? assigneeCenterScopeIds : [];
    if (scope.length === 0) return assignedTo;
    return filterAssigneeIdsByCenters(assignedTo, assigneeSelectItems, scope, {
      keepUnknown: true,
    });
  }, [assignedTo, assigneeSelectItems, assigneeCenterScopeIds]);

  // Single assignee/role value for display and dropdown (first item or raw string)
  const assigneeDisplayValue = useMemo(() => {
    if (Array.isArray(assignedTo) && assignedTo.length > 0) {
      const first = assignedTo[0];
      if (typeof first === 'string') return first;
      return first?.value ?? '';
    }
    if (typeof assignedTo === 'string') return assignedTo;
    return '';
  }, [assignedTo]);

  const tags = useMemo(() => {
    const normalizeToStrings = (input) => {
      const arr = Array.isArray(input) ? input : input ? [input] : [];
      return arr
        .map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.label || tag))
        .map((tag) => (tag == null ? '' : String(tag).trim()))
        .filter(Boolean);
    };

    // First check localChanges (user's unsaved changes)
    if (localChanges.tags !== undefined && localChanges.tags !== null) {
      return normalizeToStrings(localChanges.tags);
    }

    // Then check task object
    const taskValue = task?.tags;
    const fromTask = normalizeToStrings(taskValue);
    if (fromTask.length > 0) return fromTask;

    // Fallback: `_user_tags` sometimes arrives as ",tag1,tag2"
    if (typeof task?._user_tags === 'string' && task._user_tags.trim()) {
      const parts = task._user_tags
        .split(',')
        .map((t) => String(t).trim())
        .filter(Boolean);
      if (parts.length > 0) return parts;
    }

    return [];
  }, [task, localChanges]);

  // Combine existing attachments with new ones
  const attachments = useMemo(() => {
    const existingAttachments = normalizeTaskAttachments(task).filter((att) => {
      const key = att?.childRowId || att?.id;
      if (!key) return true;
      return !removedExistingAttachmentIds.has(String(key));
    });

    // Convert new attachments to the same format
    const formattedNewAttachments = newAttachments.map((file) => ({
      id: file.id,
      fileName: file.name,
      fileUrl: null, // Will be created via object URL
      size: file.size,
      createdAt: file.uploadedAt || new Date().toISOString(),
      extension: getFileExtension(file.name),
      isImage: IMAGE_EXTENSIONS.has(getFileExtension(file.name)),
      isNew: true, // Flag to identify new attachments
      file: file.file, // Store the actual File object for preview
    }));

    return [...existingAttachments, ...formattedNewAttachments];
  }, [task, newAttachments, removedExistingAttachmentIds]);

  useEffect(() => {
    if (attachments.length === 0) {
      setCurrentAttachmentIndex(0);
      return;
    }

    setCurrentAttachmentIndex((previous) => {
      if (previous >= attachments.length) return attachments.length - 1;
      return previous;
    });
  }, [attachments.length]);

  // Reset local changes when drawer opens or task changes
  useEffect(() => {
    if (!isOpen) {
      setLocalChanges({});
      setUploadError('');
      setDragActive(false);
      setTagInputVisible(false);
      setNewTagValue('');
      setNewAttachments([]);
      setRemovedExistingAttachmentIds(new Set());
      setImagePreviewErrors({});
      setIsDescriptionOpen(false);
      return;
    }
    // If task has description, open the description field
    const description = getFieldValue(task, localChanges, 'description');
    setIsDescriptionOpen(Boolean(description && description.trim()));
  }, [isOpen, task?.name, task?.subject, task?.description]);

  useEffect(() => {
    setTitleError('');
  }, [taskTitle]);

  // Tags are now included in detailed view; no separate "get tags" call needed.
  useEffect(() => {
    if (!isOpen) {
      lastFetchedTaskIdRef.current = null;
    }
  }, [isOpen]);

  // Fetch roles for assignee dropdown (same as create drawer)
  useEffect(() => {
    if (!isOpen || assigneeSelectItems !== undefined) return;
    const fetchRoles = async () => {
      try {
        const response = await dispatch(getRolesWithDescription()).unwrap();
        const list = response?.message ?? response ?? [];
        setRoles(Array.isArray(list) ? list : []);
      } catch {
        // ignore
      }
    };
    fetchRoles();
  }, [isOpen, dispatch, assigneeSelectItems]);

  const scrollToAttachment = useCallback((index) => {
    if (!attachmentsListRef.current) return;
    const target = attachmentsListRef.current.children?.[index];
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, []);

  const handleAttachmentNav = useCallback(
    (direction) => {
      if (attachments.length === 0) return;

      setCurrentAttachmentIndex((previous) => {
        const nextIndex = Math.min(Math.max(previous + direction, 0), attachments.length - 1);
        requestAnimationFrame(() => scrollToAttachment(nextIndex));
        return nextIndex;
      });
    },
    [attachments.length, scrollToAttachment],
  );

  // Batch update multiple fields in a single API call
  const updateTaskBatchViaAPI = useCallback(
    async (taskId, updates) => {
      if (!task || !taskId) return;

      try {
        // Get current task data and merge with local changes and new updates
        const currentTaskData = { ...task, ...localChanges, ...updates };
        const updateData = { ...currentTaskData };

        // Build FormData payload according to settings API specification
        const apiFormData = new FormData();

        // Required fields for settings API
        const taskIdValue = task?.name || task?.task_id || taskId;
        apiFormData.append('task_id', taskIdValue);

        // Map field names to settings API format
        // task_name (from subject or task_name)
        const taskName =
          updateData.task_name || updateData.subject || task?.task_name || task?.subject || '';
        apiFormData.append('task_name', taskName);

        // description
        apiFormData.append('description', updateData.description || '');

        // status
        apiFormData.append('status', updateData.status || '');

        // priority
        apiFormData.append('priority', updateData.priority || '');

        // task_type (from type or taskType)
        const taskTypeValue = updateData.task_type || updateData.type || taskType || '';
        apiFormData.append('task_type', taskTypeValue);

        // duration
        if (
          updateData.duration !== undefined &&
          updateData.duration !== null &&
          updateData.duration !== ''
        ) {
          apiFormData.append('duration', String(updateData.duration));
        }

        const nextUpVal = updateData.next_update ?? updateData.next_update_date;
        if (nextUpVal !== undefined && nextUpVal !== null && String(nextUpVal).trim() !== '') {
          apiFormData.append('next_update', String(nextUpVal).trim());
        }

        // Handle assignees as JSON stringified array
        if (updateData.assignees || updateData.assigned_to) {
          const assignees = updateData.assignees || updateData.assigned_to;
          const normalizedAssignees = normalizeAssignees(assignees);
          if (normalizedAssignees.length > 0) {
            apiFormData.append('assignees', JSON.stringify(normalizedAssignees));
          }
        }

        // Handle tags - always send existing tags in payload
        // Get tags from updates, localChanges, or task
        let tagsToSend = [];
        if (updateData.tags !== undefined) {
          // Tags were explicitly updated
          if (Array.isArray(updateData.tags)) {
            tagsToSend = updateData.tags;
          } else if (updateData.tags) {
            tagsToSend = [updateData.tags];
          }
        } else if (localChanges.tags !== undefined) {
          // Tags in local changes
          if (Array.isArray(localChanges.tags)) {
            tagsToSend = localChanges.tags;
          } else if (localChanges.tags) {
            tagsToSend = [localChanges.tags];
          }
        } else if (task?.tags) {
          // Get existing tags from task
          tagsToSend = Array.isArray(task.tags) ? task.tags : [task.tags];
        } else if (typeof task?._user_tags === 'string' && task._user_tags.trim()) {
          // Fallback: `_user_tags` sometimes arrives as ",tag1,tag2"
          tagsToSend = task._user_tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        }
        // Always append tags (even if empty array) to preserve existing tags
        apiFormData.append('tags', JSON.stringify(tagsToSend));

        // Handle recurrence fields (for Client Engagement) - map to settings API format
        if (showRecurring) {
          // is_recurring field - send 1 if checked, 0 if unchecked
          const isRecurringValue =
            updateData.is_recurring === undefined
              ? task?.is_recurring === undefined
                ? 0
                : task.is_recurring
              : updateData.is_recurring;
          // Normalize to 1 or 0: treat 1, '1', or true as 1, everything else as 0
          const normalizedIsRecurring =
            isRecurringValue === 1 || isRecurringValue === '1' || isRecurringValue === true ? 1 : 0;
          apiFormData.append('is_recurring', String(normalizedIsRecurring));

          // recurrence_period (from custom_recurrence_period or recurrence_period)
          if (updateData.custom_recurrence_period || updateData.recurrence_period) {
            const period = updateData.custom_recurrence_period || updateData.recurrence_period;
            apiFormData.append('recurrence_period', period);
          }
          // recurrence_date (from custom_recurrence_date or recurrence_date)
          if (updateData.custom_recurrence_date || updateData.recurrence_date) {
            const date = updateData.custom_recurrence_date || updateData.recurrence_date;
            apiFormData.append('recurrence_date', date);
          }
          // recurrence_month (from custom_recurrence_month or recurrence_month)
          if (updateData.custom_recurrence_month || updateData.recurrence_month) {
            const month = updateData.custom_recurrence_month || updateData.recurrence_month;
            apiFormData.append('recurrence_month', month);
          }
          // recurrence_quarterly_date (from recurrence_quarterly_date)
          if (updateData.recurrence_quarterly_date || updateData.recurrence_quaterly_date) {
            const quarterlyDate =
              updateData.recurrence_quarterly_date || updateData.recurrence_quaterly_date;
            apiFormData.append('recurrence_quarterly_date', quarterlyDate);
          }
        }

        // Call the settings API endpoint with PUT method
        await apiClient.put('/method/devx.api.task_master.update_task_master', apiFormData);

        // Refresh task detail after successful update
        if (onRefresh) {
          await onRefresh();
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task');
        throw error;
      }
    },
    [task, localChanges, taskType, showRecurring, onRefresh],
  );

  // Update task using the new API endpoint (single field)
  const updateTaskViaAPI = useCallback(
    async (taskId, fieldName, value) => {
      // If parent provides updater (e.g. Events/Partner CRM), delegate to it.
      if (onFieldUpdate) {
        return onFieldUpdate(taskId, fieldName, value);
      }
      // Otherwise fallback to settings master updater.
      return updateTaskBatchViaAPI(taskId, { [fieldName]: value });
    },
    [updateTaskBatchViaAPI, onFieldUpdate],
  );

  // Handle field change with optimistic update
  const handleFieldChange = useCallback(
    (fieldName, value) => {
      if (!task) return;

      const taskId = task?.name || task?.subject;

      // Update local state immediately for smooth UX
      setLocalChanges((previous) => ({
        ...previous,
        [fieldName]: value,
      }));

      // Queue API update to prevent concurrent saves
      updateQueueRef.current = updateQueueRef.current
        .catch(() => {}) // keep chain alive
        .then(() => updateTaskViaAPI(taskId, fieldName, value));
    },
    [updateTaskViaAPI, task],
  );

  const handleFieldChangeRef = useRef(handleFieldChange);
  handleFieldChangeRef.current = handleFieldChange;

  const handleEventCentersChange = useCallback(
    (value) => {
      const next = normalizeCenterIds(value);
      const prevSorted = [...selectedEventCenterIds].sort();
      const nextSorted = [...next].sort();
      const same =
        nextSorted.length === prevSorted.length &&
        nextSorted.every((id, i) => id === prevSorted[i]);
      if (same) return;
      if (next.length === 0) {
        showErrorToast('Select at least one center.');
        return;
      }
      handleFieldChange('centers', next);
    },
    [selectedEventCenterIds, handleFieldChange],
  );

  useEffect(() => {
    if (!isOpen || !dueDateMode || eventTaskMasterMode || !task) return;
    const next = String(customNextUpdateDate ?? '').trim();
    const due = String(dueDate ?? '').trim();
    if (!next || !due) return;
    if (isCustomNextUpdateAfterDueDate(due, next)) return;
    if (Object.prototype.hasOwnProperty.call(localChanges, 'custom_next_update_date')) return;
    handleFieldChangeRef.current('custom_next_update_date', '');
  }, [isOpen, dueDateMode, eventTaskMasterMode, dueDate, customNextUpdateDate, task, localChanges]);

  const handleFileUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;
      if (!task) {
        showErrorToast('Task data not available. Please refresh and try again.');
        return;
      }

      setUploadError('');
      setIsUploading(true);

      const fileArray = [...files];
      const validFiles = [];
      const invalidFiles = [];

      // Validate file sizes
      fileArray.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        const errorMessage = `The following file(s) exceed the 50 MB limit: ${invalidFiles.join(', ')}`;
        setUploadError(errorMessage);
        showErrorToast(errorMessage);
        setIsUploading(false);
        return;
      }

      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }

      try {
        // Get task_id from task.name (the "name" field from getParticularTaskDetail)
        const taskId = task?.name;
        if (!taskId) {
          throw new Error('Task ID not available');
        }

        if (uploadTaskAttachmentThunk) {
          await dispatch(
            uploadTaskAttachmentThunk({
              task_id: taskId,
              attachments: validFiles,
            }),
          ).unwrap();
        } else {
          await dispatch(
            addCrmTaskAttachment({
              task_id: taskId,
              attachments: validFiles,
            }),
          ).unwrap();
        }

        // Refresh task detail to get updated attachments
        const taskSubject = task?.subject || task?.task_name || taskId;
        if (onRefresh) {
          try {
            await onRefresh({ task_id: taskId, subject: taskSubject, task_type: taskType });
          } catch (error) {
            console.error('Failed to refresh task detail:', error);
          }
        } else if (taskSubject) {
          try {
            await dispatch(
              getParticularTaskDetail({
                tm_id: taskId,
                subject: taskSubject,
                type: taskType,
              }),
            ).unwrap();
          } catch (error) {
            console.error('Failed to refresh task detail:', error);
            // Don't throw - the upload was successful, just the refresh failed
          }
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        showSuccessToast(
          validFiles.length === 1
            ? 'File uploaded successfully'
            : `${validFiles.length} file(s) uploaded successfully`,
        );
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        setUploadError(errorMessage);
        showErrorToast(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [task, dispatch, taskType, onRefresh, uploadTaskAttachmentThunk],
  );

  const handleUploadButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Remove attachment (new or existing)
  const handleRemoveAttachment = useCallback(
    async (attachmentId, childRowId) => {
      // Check if it's a new attachment
      const isNewAttachment = newAttachments.some((att) => att.id === attachmentId);

      if (isNewAttachment) {
        // Remove from new attachments
        setNewAttachments((previous) => {
          const fileToRemove = previous.find((file) => file.id === attachmentId);
          // Clean up object URL if it exists
          if (fileToRemove?.file instanceof File) {
            const url = URL.createObjectURL(fileToRemove.file);
            if (url) URL.revokeObjectURL(url);
          }
          return previous.filter((file) => file.id !== attachmentId);
        });

        // Remove from error state
        setImagePreviewErrors((previous) => {
          const newState = { ...previous };
          delete newState[attachmentId];
          return newState;
        });
      } else {
        // For existing attachments, call the API to remove
        if (!childRowId) {
          showErrorToast('Attachment ID not available');
          return;
        }

        try {
          const tmId = task?.name || task?.task_id;
          // Optimistically remove from UI immediately
          setRemovedExistingAttachmentIds((previous) => {
            const next = new Set(previous);
            next.add(String(childRowId));
            return next;
          });

          const attachmentChildDoctype =
            taskType === 'Event Tasks' && !eventTaskMasterMode
              ? 'Task Attachment'
              : 'Task Master Attachment';

          // Call the remove attachment API
          await dispatch(
            removeCrmTaskAttachment({
              child_row_id: childRowId,
              child_doctype: attachmentChildDoctype,
            }),
          ).unwrap();

          // Refresh task detail to get updated attachments
          const taskSubject = task?.subject || task?.task_name || task?.name;
          if (taskSubject) {
            try {
              await dispatch(
                getParticularTaskDetail({
                  tm_id: tmId,
                  subject: taskSubject,
                  type: taskType,
                }),
              ).unwrap();

              // Update the task data via onRefresh callback if available
              if (onRefresh) {
                await onRefresh();
              }

              showSuccessToast('Attachment removed successfully');
            } catch (error) {
              console.error('Failed to refresh task detail:', error);
              // Still show success since the removal was successful
              showSuccessToast('Attachment removed successfully');
            }
          } else {
            showSuccessToast('Attachment removed successfully');
          }
        } catch (error) {
          const errorMessage = extractErrorMessage(error);
          // Revert optimistic removal if API failed
          setRemovedExistingAttachmentIds((previous) => {
            const next = new Set(previous);
            next.delete(String(childRowId));
            return next;
          });
          showErrorToast(errorMessage || 'Failed to remove attachment');
        }
      }
    },
    [newAttachments, dispatch, task, taskType, eventTaskMasterMode, onRefresh],
  );

  // Get preview URL for file
  const getPreviewUrl = useCallback((attachment) => {
    if (!attachment) return null;

    // For new files
    if (attachment.isNew && attachment.file instanceof File) {
      return URL.createObjectURL(attachment.file);
    }

    // For existing files from API - try multiple possible URL fields
    const fileUrl =
      attachment.fileUrl ||
      attachment.file_url ||
      attachment.url ||
      attachment.file ||
      attachment.file_path ||
      attachment.attachment?.file_url ||
      attachment.attachment?.url ||
      (typeof attachment.attachment === 'string' ? attachment.attachment : null);

    if (fileUrl) {
      // If it's a relative path, construct full URL
      if (fileUrl.startsWith('/')) {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        return `${apiUrl}${fileUrl}`;
      }
      // If it's already a full URL, return as is
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        return fileUrl;
      }
      // Otherwise return as is (might be a relative path without leading slash)
      return fileUrl;
    }

    return null;
  }, []);

  const handleAttachmentDownload = useCallback(
    async (attachment) => {
      if (!attachment) return;

      // Get the file URL using the same logic as preview
      const fileUrl = getPreviewUrl(attachment);

      if (!fileUrl) {
        showErrorToast('File URL not available');
        return;
      }

      // For new files (blob URLs), download directly
      if (attachment.isNew && attachment.file instanceof File) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = attachment.fileName || attachment.file.name || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Don't revoke URL here as it's managed by getPreviewUrl
        return;
      }

      // For existing files from server, try to download via fetch to handle CORS
      try {
        const response = await fetch(fileUrl, {
          method: 'GET',
          headers: {
            // Include any auth headers if needed
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = attachment.fileName || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: open in new tab if fetch fails (CORS issue)
        const link = document.createElement('a');
        link.href = fileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [getPreviewUrl],
  );

  // Handle attachment view (open in new tab)
  const handleAttachmentView = useCallback(
    (attachment, event) => {
      // Prevent triggering if clicking on action buttons
      if (event?.target?.closest('.attachment-actions')) {
        return;
      }

      if (!attachment) return;

      // Get the file URL using the same logic as preview
      const fileUrl = getPreviewUrl(attachment);

      if (!fileUrl) {
        showErrorToast('File URL not available');
        return;
      }

      // Open file in new tab for viewing
      const link = document.createElement('a');
      link.href = fileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [getPreviewUrl],
  );

  // Check if file is an image
  const isImageFile = useCallback((attachment) => {
    if (!attachment) return false;
    return attachment.isImage || false;
  }, []);

  // Handle image preview error
  const handleImageError = useCallback((attachmentId) => {
    setImagePreviewErrors((previous) => ({ ...previous, [attachmentId]: true }));
  }, []);

  const handleFileInputChange = useCallback(
    (event) => {
      const { files } = event.target;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload],
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  // Update overlay height and message position when drag becomes active
  useEffect(() => {
    if (dragActive && leftPanelRef.current) {
      const updateOverlay = () => {
        if (leftPanelRef.current) {
          const { scrollHeight } = leftPanelRef.current;
          const viewportHeight = leftPanelRef.current.clientHeight;
          setOverlayHeight(`${Math.max(scrollHeight, viewportHeight)}px`);

          const { scrollTop } = leftPanelRef.current;
          const centerY = scrollTop + viewportHeight / 2;
          setMessageTop(`${centerY}px`);
        }
      };

      updateOverlay();

      const handleScroll = () => {
        updateOverlay();
      };

      if (leftPanelRef.current) {
        leftPanelRef.current.addEventListener('scroll', handleScroll);
      }

      return () => {
        if (leftPanelRef.current) {
          leftPanelRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [dragActive, task]);

  const handleAddTag = useCallback(() => {
    if (newTagValue.trim()) {
      const newTags = [...tags, newTagValue.trim()];
      handleFieldChange('tags', newTags);
      setNewTagValue('');
      setTagInputVisible(false);
    }
  }, [newTagValue, tags, handleFieldChange]);

  const handleRemoveTag = useCallback(
    (index) => {
      const newTags = tags.filter((_, index_) => index_ !== index);
      handleFieldChange('tags', newTags);
    },
    [tags, handleFieldChange],
  );

  // Handle save all changes
  const handleSaveAll = useCallback(async () => {
    if (!task) return;

    const taskId = task?.name || task?.task_id || task?.id || task?.subject || task?.task_name;
    if (!taskId) return;

    setIsSaving(true);
    try {
      // Wait for all queued updates to complete
      await updateQueueRef.current;

      // Prepare all changes including new attachments
      const allChanges = {
        ...localChanges,
      };

      // Add new attachments if any
      if (newAttachments.length > 0) {
        allChanges.newAttachments = newAttachments;
      }

      // Send all changes together in a single update
      await onFieldUpdate?.(taskId, allChanges);

      // Clear local changes and new attachments after successful save
      setLocalChanges({});
      setNewAttachments([]);
      setImagePreviewErrors({});

      // Refresh task data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to save changes. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [task, localChanges, newAttachments, onFieldUpdate, onRefresh]);

  // Handle cancel - reset local changes and close
  const handleCancel = useCallback(() => {
    setLocalChanges({});
    setTagInputVisible(false);
    setNewTagValue('');
    setNewAttachments([]);
    setImagePreviewErrors({});
    onClose?.();
  }, [onClose]);

  // Handle close - fetch task list and then close
  const handleClose = useCallback(async () => {
    try {
      // Call the appropriate fetchlist API based on taskType
      const payload = {
        task_type: taskType,
      };

      if (taskType === 'Client Onboarding') {
        await dispatch(getClientOnboardingTaskList(payload)).unwrap();
      } else if (taskType === 'Client Exiting') {
        await dispatch(getClientExitTaskList(payload)).unwrap();
      } else if (taskType === 'Client Engagement') {
        await dispatch(getClientEngagementTaskList(payload)).unwrap();
      } else if (taskType === 'Vendor Onboarding') {
        await dispatch(getVendorOnboardingTaskList(payload)).unwrap();
      }
    } catch (error) {
      // Silently fail - don't prevent closing the drawer
      console.error('Failed to fetch task list:', error);
    } finally {
      // Always call onClose regardless of API call result
      onClose?.();
    }
  }, [dispatch, taskType, onClose]);

  // Navigation logic for back/forward
  const currentTaskIndex = useMemo(() => {
    if (!task || !tasks || tasks.length === 0) return -1;
    const taskId = task?.name || task?.subject || task?.task_name;
    if (!taskId) return -1;
    return tasks.findIndex(
      (t) =>
        (t.name || t.id || t.subject || t.task_name) === taskId ||
        (t.name || t.id || t.subject || t.task_name) ===
          (task?.name || task?.subject || task?.task_name),
    );
  }, [task, tasks]);

  const hasPrevious = currentTaskIndex > 0;
  const hasNext = currentTaskIndex >= 0 && currentTaskIndex < tasks.length - 1;

  const handlePrevious = useCallback(() => {
    if (!hasPrevious || !onTaskChange) return;
    const previousTask = tasks[currentTaskIndex - 1];
    if (previousTask) {
      const taskId =
        previousTask.name || previousTask.id || previousTask.subject || previousTask.task_name;
      onTaskChange(taskId);
    }
  }, [hasPrevious, currentTaskIndex, tasks, onTaskChange]);

  const handleNext = useCallback(() => {
    if (!hasNext || !onTaskChange) return;
    const nextTask = tasks[currentTaskIndex + 1];
    if (nextTask) {
      const taskId = nextTask.name || nextTask.id || nextTask.subject || nextTask.task_name;
      onTaskChange(taskId);
    }
  }, [hasNext, currentTaskIndex, tasks, onTaskChange]);

  // Don't render if not open
  if (!isOpen || !task) return null;

  const hasSidePanel = Boolean(sidePanel);

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleClose}>
      <Drawer.Content className={hasSidePanel ? 'max-w-[1200px]' : 'max-w-[600px]'}>
        {/* Header */}
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-2'>
              {tasks && tasks.length > 0 && (
                <ButtonGroup.Root size='xsmall'>
                  <ButtonGroup.Item onClick={handlePrevious} disabled={!hasPrevious}>
                    <ButtonGroup.Icon as={RiArrowLeftSLine} />
                  </ButtonGroup.Item>
                  <ButtonGroup.Item onClick={handleNext} disabled={!hasNext}>
                    <ButtonGroup.Icon as={RiArrowRightSLine} />
                  </ButtonGroup.Item>
                </ButtonGroup.Root>
              )}
            </div>
            <div className='flex items-center gap-3'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={handleClose}
                className='shrink-0'
              >
                <Button.Icon as={RiCloseLine} className='shrink-0' />
              </Button.Root>
            </div>
          </div>
        </Drawer.Header>

        {/* Body */}
        <Drawer.Body
          className={hasSidePanel ? 'flex-1 p-0 overflow-hidden' : 'flex-1 p-0 overflow-y-auto'}
        >
          <div className={hasSidePanel ? 'flex h-full min-h-0' : ''}>
            <div
              ref={leftPanelRef}
              className={cn(
                hasSidePanel
                  ? 'w-[422px] shrink-0 border-r border-stroke-soft-200 overflow-y-auto relative'
                  : 'w-full overflow-y-auto relative',
                dragActive && 'overflow-y-hidden',
              )}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              {/* Drag and Drop Overlay */}
              {dragActive && (
                <>
                  <div
                    className='absolute top-0 left-0 right-0 z-50 bg-information-lighter/80 backdrop-blur-sm border-2 border-dashed border-information-base pointer-events-none'
                    style={{
                      height: overlayHeight,
                      minHeight: '100%',
                    }}
                  />
                  <div
                    className='absolute left-0 right-0 z-50 flex items-center justify-center pointer-events-none'
                    style={{
                      top: messageTop,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <div className='flex flex-col items-center gap-4'>
                      <RiUploadCloud2Line className='size-16 text-information-base' />
                      <div className='flex flex-col items-center gap-2'>
                        <p className='label-large text-information-base font-semibold'>
                          Drop files here
                        </p>
                        <p className='text-paragraph-sm text-text-sub-600'>
                          All file types, up to 50 MB per file
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className='px-6 pt-5 pb-6 flex flex-col gap-6'>
                {/* Title Section */}
                <div className='flex flex-col gap-1'>
                  <Textarea.Root
                    key={`${task?.name || task?.subject || 'title'}-${taskTitle || ''}`}
                    variant='borderless'
                    simple
                    defaultValue={taskTitle || ''}
                    onChange={() => {
                      if (titleError) setTitleError('');
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (!value) {
                        setTitleError('Title is required');
                        return;
                      }
                      setTitleError('');
                      handleFieldChange('task_name', value);
                    }}
                    rows={1}
                    hasError={Boolean(titleError)}
                    placeholder='Enter task title'
                    aria-invalid={Boolean(titleError)}
                    className='field-sizing-content text-title-h5 text-text-main-900 p-1'
                  />
                  {titleError && (
                    <span className='text-paragraph-xs text-error-base'>{titleError}</span>
                  )}
                </div>

                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Description</span>
                  </div>
                  {isDescriptionOpen ? (
                    <Textarea.Root
                      rows={4}
                      placeholder='Add description'
                      value={getFieldValue(task, localChanges, 'description') || ''}
                      onChange={(e) => {
                        const { value } = e.target;
                        setLocalChanges((previous) => ({
                          ...previous,
                          description: value,
                        }));
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        handleFieldChange('description', value);
                      }}
                      maxLength={200}
                      className='min-h-[116px]'
                    >
                      <Textarea.CharCounter
                        current={(getFieldValue(task, localChanges, 'description') || '').length}
                        max={200}
                        className='text-text-sub-500'
                      />
                    </Textarea.Root>
                  ) : (
                    <button
                      type='button'
                      onClick={() => setIsDescriptionOpen(true)}
                      className='flex gap-1 w-full items-center border border-transparent hover:border-stroke-sub-300 cursor-pointer px-2 py-1.5 rounded-10'
                    >
                      <RiStickyNoteLine className='size-5 text-text-soft-400' />
                      <span className='text-paragraph-md text-text-soft-400'>Add description</span>
                    </button>
                  )}
                </div>

                {/* Details Section - Table-like Format */}
                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  <FieldRow icon={RiPriceTag3Line} label='Status' editable={true}>
                    <SearchableSelect
                      variant='borderless'
                      value={status}
                      onValueChange={(value) => handleFieldChange('status', value)}
                      size='xsmall'
                      options={
                        !eventTaskMasterMode
                          ? eventTaskStatusSelectOptions
                          : [
                              { value: 'Active', label: 'Active' },
                              { value: 'Inactive', label: 'Inactive' },
                            ]
                      }
                      placeholder='Not Set'
                      renderTrigger={({ selectedOption }) => (
                        <Badge.Root
                          variant='light'
                          color={getStatusColor(status)}
                          className='text-nowrap'
                        >
                          {status || 'Not Set'}
                        </Badge.Root>
                      )}
                      renderOptionLabel={(option) => (
                        <Badge.Root
                          variant='light'
                          color={getStatusColor(option.value)}
                          className='text-nowrap'
                        >
                          {option.label}
                        </Badge.Root>
                      )}
                    />
                  </FieldRow>

                  <FieldRow icon={RiFlagLine} label='Priority' editable={true}>
                    <SearchableSelect
                      variant='borderless'
                      value={priority}
                      onValueChange={(value) => handleFieldChange('priority', value)}
                      size='xsmall'
                      options={FALLBACK_PRIORITY_OPTIONS}
                      placeholder='Not Set'
                      renderTrigger={({ selectedOption }) => (
                        <Badge.Root
                          variant='light'
                          color={getPriorityColor(priority)}
                          className='text-nowrap'
                        >
                          {priority || 'Not Set'}
                        </Badge.Root>
                      )}
                      renderOptionLabel={(option) => (
                        <Badge.Root
                          variant='light'
                          color={getPriorityColor(option.value)}
                          className='text-nowrap'
                        >
                          {option.value}
                        </Badge.Root>
                      )}
                    />
                  </FieldRow>

                  {showEventTaskCenter ? (
                    <FieldRow
                      icon={RiBuilding4Line}
                      label='Center'
                      editable={canEditEventTaskCenters}
                    >
                      {canEditEventTaskCenters ? (
                        eventCenterPickerCenters.length === 0 ? (
                          <p className='text-paragraph-sm text-text-sub-500'>
                            No centers on this event yet. Add centers under Basic Details first.
                          </p>
                        ) : (
                          <CenterAccessDropdown
                            centers={eventCenterPickerCenters}
                            selectedCenters={selectedEventCenterIds}
                            onChange={handleEventCentersChange}
                            requireAtLeastOne
                            onRejectEmpty={() => showErrorToast('Select at least one center.')}
                            showCityCode={false}
                            sequentialZoneLabels
                            buttonVariant='neutral'
                            buttonMode='ghost'
                            className='w-full min-w-0 max-w-full'
                          />
                        )
                      ) : eventCenterLabels.length > 0 ? (
                        <div className='flex flex-wrap items-center gap-2'>
                          {eventCenterLabels.map((center, index) => (
                            <React.Fragment key={`${center}-${index}`}>
                              {renderEventCenterBadge(center)}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        renderEventCenterBadge(null)
                      )}
                    </FieldRow>
                  ) : null}

                  <FieldRow icon={RiUserLine} label='Assignee' editable={true}>
                    {assigneeSelectItems !== undefined ? (
                      assigneeSelectLoading ? (
                        <span className='text-paragraph-sm text-text-soft-400'>
                          Loading assignees...
                        </span>
                      ) : (
                        <AssigneeMultiSelect
                          value={scopedAssignedTo}
                          options={assigneeSelectItems}
                          optionsLoading={assigneeSelectLoading}
                          onBlur={(values) => {
                            const prev = joinAssigneeIds(scopedAssignedTo);
                            const next = joinAssigneeIds(values);
                            if (prev === next) return;

                            setLocalChanges((previous) => ({
                              ...previous,
                              assigned_to: Array.isArray(values) ? values : [],
                            }));
                            handleFieldChange('assigned_to', values);
                          }}
                          placeholder='Select assignees'
                          maxVisibleAvatars={3}
                          variant='borderless'
                          size='small'
                        />
                      )
                    ) : (
                      <SearchableSelect
                        variant='borderless'
                        value={assigneeDisplayValue}
                        onValueChange={(value) => {
                          setLocalChanges((previous) => ({
                            ...previous,
                            assigned_to: value,
                          }));
                          handleFieldChange('assigned_to', value);
                        }}
                        size='xsmall'
                        options={(roles || []).map((role) => {
                          const value = role?.name ?? role?.role ?? role?.value ?? String(role);
                          const label = role?.name ?? role?.description ?? role?.role ?? value;
                          return { value, label };
                        })}
                        placeholder='Not Set'
                      />
                    )}
                  </FieldRow>

                  {dueDateMode ? (
                    <>
                      <FieldRow icon={RiCalendarLine} label='Due Date' editable={true}>
                        <Datepicker
                          value={dueDate ? parseToDate(dueDate) : null}
                          onChange={(date) => {
                            handleFieldChange(
                              'exp_end_date',
                              date ? formatDateToYYYYMMDD(date) : '',
                            );
                          }}
                          placeholder='Select date'
                          variant='borderless'
                          size='xsmall'
                          className='min-h-8'
                        />
                      </FieldRow>
                      <FieldRow icon={RiCalendarLine} label='Next Update Date' editable={true}>
                        <Datepicker
                          value={customNextUpdateDate ? parseToDate(customNextUpdateDate) : null}
                          onChange={(date) => {
                            const s = date ? formatDateToYYYYMMDD(date) : '';
                            const dueStr = String(dueDate || '').trim();
                            if (s && !isCustomNextUpdateAfterDueDate(dueStr, s)) {
                              showErrorToast('Next update date must be after the due date');
                              return;
                            }
                            handleFieldChange('custom_next_update_date', s);
                          }}
                          min={getMinCustomNextUpdateDate(dueDate)}
                          placeholder='Select date'
                          variant='borderless'
                          size='xsmall'
                          className='min-h-8'
                        />
                      </FieldRow>
                    </>
                  ) : (
                    <FieldRow icon={RiCalendarLine} label='Duration' editable={true}>
                      <div className=' items-center justify-start gap-2'>
                        <Input.Root variant='borderless' size='small' className=''>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              inputMode='numeric'
                              autoComplete='off'
                              value={duration || ''}
                              onChange={(e) => {
                                const v = sanitizeUnsignedIntegerInput(e.target.value);
                                setLocalChanges((previous) => ({
                                  ...previous,
                                  duration: v,
                                }));
                              }}
                              onBlur={(e) => {
                                const value = sanitizeUnsignedIntegerInput(e.target.value.trim());
                                handleFieldChange('duration', value);
                              }}
                              placeholder='Enter duration'
                            />

                            <Input.Affix>Days</Input.Affix>
                          </Input.Wrapper>
                        </Input.Root>
                      </div>
                    </FieldRow>
                  )}

                  {!dueDateMode && (
                    <FieldRow icon={RiTimeLine} label='Next update' editable={true}>
                      <div className=' items-center justify-start gap-2'>
                        <Input.Root variant='borderless' size='small' className=''>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              inputMode='numeric'
                              autoComplete='off'
                              value={nextUpdate || ''}
                              onChange={(e) => {
                                const v = sanitizeUnsignedIntegerInput(e.target.value);
                                setLocalChanges((previous) => ({
                                  ...previous,
                                  next_update: v,
                                }));
                              }}
                              onBlur={(e) => {
                                const value = sanitizeUnsignedIntegerInput(e.target.value.trim());
                                handleFieldChange('next_update', value);
                              }}
                              placeholder='Enter days'
                            />
                            <Input.Affix>Days</Input.Affix>
                          </Input.Wrapper>
                        </Input.Root>
                      </div>
                    </FieldRow>
                  )}

                  {/* Recurring Task Fields (only for Client Engagement) */}
                  {showRecurring && (
                    <>
                      <FieldRow icon={RiRepeatLine} label='Recurring Task' editable={true}>
                        <div className='flex items-center gap-2 w-full'>
                          <Checkbox.Root
                            checked={isRecurring}
                            onCheckedChange={(checked) => {
                              setLocalChanges((previous) => ({
                                ...previous,
                                is_recurring: checked ? 1 : 0,
                              }));
                              handleFieldChange('is_recurring', checked ? 1 : 0);
                            }}
                            id='recurring-task-checkbox'
                          />
                          <span className='text-paragraph-sm text-text-main-900'>
                            This is a recurring task
                          </span>
                        </div>
                      </FieldRow>

                      {isRecurring && (
                        <FieldRow icon={RiRepeatLine} label='Recurring' editable={true}>
                          <Popover.Root
                            open={recurrencePopoverOpen}
                            onOpenChange={(open) => {
                              setRecurrencePopoverOpen(open);
                              if (!open) {
                                const period =
                                  getFieldValue(task, localChanges, 'recurrence_period') ||
                                  'One Time';
                                const normalized =
                                  typeof period === 'string'
                                    ? period.charAt(0).toUpperCase() + period.slice(1).toLowerCase()
                                    : 'One Time';
                                setEditRecurrencePeriod(
                                  RECURRING_FREQUENCY_OPTIONS.find(
                                    (o) => o.value.toLowerCase() === normalized.toLowerCase(),
                                  )?.value || 'One Time',
                                );
                                // Get date value - check both recurrence_date and recurrence_quaterly_date
                                const dateValue =
                                  getFieldValue(task, localChanges, 'recurrence_date') ||
                                  getFieldValue(task, localChanges, 'recurrence_quaterly_date') ||
                                  getFieldValue(task, localChanges, 'custom_recurrence_date') ||
                                  '';
                                setEditRecurrenceDate(dateValue ? String(dateValue) : '');
                                // Get month value for Yearly recurrence
                                const monthValue =
                                  getFieldValue(task, localChanges, 'recurrence_month') ||
                                  getFieldValue(task, localChanges, 'custom_recurrence_month') ||
                                  '';
                                setEditRecurrenceMonth(monthValue ? String(monthValue) : '');
                              }
                            }}
                          >
                            <Popover.Anchor asChild>
                              <button
                                type='button'
                                className={cn(
                                  'text-left text-paragraph-sm text-text-main-900 px-2 py-1 rounded hover:bg-bg-weak-50 transition-colors cursor-pointer',
                                )}
                                onClick={() => {
                                  // Initialize recurrence period from task data
                                  const period =
                                    getFieldValue(task, localChanges, 'recurrence_period') ||
                                    getFieldValue(task, localChanges, 'recurring_type') ||
                                    getFieldValue(task, localChanges, 'recurring') ||
                                    'One Time';
                                  const normalized =
                                    typeof period === 'string'
                                      ? period.charAt(0).toUpperCase() +
                                        period.slice(1).toLowerCase()
                                      : 'One Time';
                                  const normalizedPeriod =
                                    RECURRING_FREQUENCY_OPTIONS.find(
                                      (o) => o.value.toLowerCase() === normalized.toLowerCase(),
                                    )?.value || 'One Time';
                                  setEditRecurrencePeriod(normalizedPeriod);

                                  // Initialize recurrence date based on period type
                                  if (
                                    normalizedPeriod === 'Monthly' ||
                                    normalizedPeriod === 'Yearly'
                                  ) {
                                    // For Monthly and Yearly, use recurrence_date
                                    const dateValue =
                                      getFieldValue(task, localChanges, 'recurrence_date') ||
                                      getFieldValue(task, localChanges, 'recurrence_date') ||
                                      getFieldValue(task, localChanges, 'custom_recurrence_date') ||
                                      '';
                                    setEditRecurrenceDate(dateValue ? String(dateValue) : '');
                                  } else if (normalizedPeriod === 'Quarterly') {
                                    // For Quarterly, use recurrence_quarterly_date
                                    const quarterlyDateValue =
                                      getFieldValue(
                                        task,
                                        localChanges,
                                        'recurrence_quarterly_date',
                                      ) ||
                                      getFieldValue(
                                        task,
                                        localChanges,
                                        'recurrence_quarterly_date',
                                      ) ||
                                      getFieldValue(
                                        task,
                                        localChanges,
                                        'recurrence_quaterly_date',
                                      ) ||
                                      '';
                                    setEditRecurrenceDate(
                                      quarterlyDateValue ? String(quarterlyDateValue) : '',
                                    );
                                  } else {
                                    setEditRecurrenceDate('');
                                  }

                                  // Initialize recurrence month for Yearly
                                  if (normalizedPeriod === 'Yearly') {
                                    const monthValue =
                                      getFieldValue(task, localChanges, 'recurrence_month') ||
                                      getFieldValue(task, localChanges, 'recurrence_month') ||
                                      getFieldValue(
                                        task,
                                        localChanges,
                                        'custom_recurrence_month',
                                      ) ||
                                      '';
                                    setEditRecurrenceMonth(monthValue ? String(monthValue) : '');
                                  } else {
                                    setEditRecurrenceMonth('');
                                  }

                                  setRecurrencePopoverOpen(true);
                                }}
                              >
                                {(() => {
                                  const recurring =
                                    getFieldValue(task, localChanges, 'recurrence_period') ||
                                    getFieldValue(task, localChanges, 'recurring_type') ||
                                    getFieldValue(task, localChanges, 'recurring');
                                  if (!recurring) {
                                    return <span className='text-text-sub-400'>--</span>;
                                  }
                                  return (
                                    <span>
                                      {String(recurring).charAt(0).toUpperCase() +
                                        String(recurring).slice(1).toLowerCase()}
                                    </span>
                                  );
                                })()}
                              </button>
                            </Popover.Anchor>
                            <Popover.Content
                              className='w-[360px] p-4'
                              align='end'
                              side='right'
                              sideOffset={8}
                            >
                              <p className='text-subheading-2xsmall text-text-soft-400 uppercase tracking-wide mb-4'>
                                Edit recurrence
                              </p>
                              <div className='flex flex-col gap-4'>
                                <div className='flex flex-col gap-1'>
                                  <Label.Root className='text-label-sm text-text-main-900 font-medium'>
                                    Recurrence
                                  </Label.Root>
                                  <SearchableSelect
                                    size='small'
                                    value={editRecurrencePeriod}
                                    onValueChange={(value) => {
                                      setEditRecurrencePeriod(value);
                                      if (value === 'One Time') {
                                        setEditRecurrenceDate('');
                                        setEditRecurrenceMonth('');
                                      } else if (value === 'Monthly' || value === 'Yearly') {
                                        // For Monthly and Yearly, load from recurrence_date
                                        const dateValue =
                                          getFieldValue(task, localChanges, 'recurrence_date') ||
                                          getFieldValue(task, localChanges, 'recurrence_date') ||
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'custom_recurrence_date',
                                          ) ||
                                          '';
                                        setEditRecurrenceDate(dateValue ? String(dateValue) : '');
                                        if (value === 'Yearly') {
                                          // For Yearly, also load the month
                                          const monthValue =
                                            getFieldValue(task, localChanges, 'recurrence_month') ||
                                            getFieldValue(task, localChanges, 'recurrence_month') ||
                                            getFieldValue(
                                              task,
                                              localChanges,
                                              'custom_recurrence_month',
                                            ) ||
                                            '';
                                          setEditRecurrenceMonth(
                                            monthValue ? String(monthValue) : '',
                                          );
                                        } else {
                                          setEditRecurrenceMonth('');
                                        }
                                      } else if (value === 'Quarterly') {
                                        // For Quarterly, load from recurrence_quarterly_date
                                        const quarterlyDateValue =
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'recurrence_quarterly_date',
                                          ) ||
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'recurrence_quarterly_date',
                                          ) ||
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'recurrence_quaterly_date',
                                          ) ||
                                          '';
                                        setEditRecurrenceDate(
                                          quarterlyDateValue ? String(quarterlyDateValue) : '',
                                        );
                                        setEditRecurrenceMonth('');
                                      }
                                    }}
                                    options={RECURRING_FREQUENCY_OPTIONS}
                                    showArrow={true}
                                  />
                                </div>
                                {(editRecurrencePeriod === 'Monthly' ||
                                  editRecurrencePeriod === 'Quarterly') && (
                                  <div className='flex flex-col gap-1'>
                                    <Label.Root className='text-label-sm text-text-main-900 font-medium'>
                                      Recurring Date
                                    </Label.Root>
                                    <SearchableSelect
                                      size='small'
                                      value={editRecurrenceDate}
                                      onValueChange={setEditRecurrenceDate}
                                      options={MONTHLY_RECURRING_DATE_OPTIONS}
                                      placeholder='Select date'
                                      showArrow={true}
                                    />
                                  </div>
                                )}
                                {editRecurrencePeriod === 'Yearly' && (
                                  <>
                                    <div className='flex flex-col gap-1'>
                                      <Label.Root className='text-label-sm text-text-main-900 font-medium'>
                                        Recurrence Date
                                      </Label.Root>
                                      <SearchableSelect
                                        size='small'
                                        value={editRecurrenceDate}
                                        onValueChange={setEditRecurrenceDate}
                                        options={MONTHLY_RECURRING_DATE_OPTIONS}
                                        placeholder='Select date'
                                        showArrow={true}
                                      />
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                      <Label.Root className='text-label-sm text-text-main-900 font-medium'>
                                        Recurrence Month
                                      </Label.Root>
                                      <SearchableSelect
                                        size='small'
                                        value={editRecurrenceMonth}
                                        onValueChange={setEditRecurrenceMonth}
                                        options={MONTH_OPTIONS}
                                        placeholder='Select month'
                                        showArrow={true}
                                      />
                                    </div>
                                  </>
                                )}
                                <div className='flex gap-2 pt-2'>
                                  <Button.Root
                                    type='button'
                                    variant='neutral'
                                    mode='stroke'
                                    size='small'
                                    onClick={() => {
                                      const period =
                                        getFieldValue(task, localChanges, 'recurrence_period') ||
                                        getFieldValue(task, localChanges, 'recurring_type') ||
                                        getFieldValue(task, localChanges, 'recurring') ||
                                        'One Time';
                                      const normalized =
                                        typeof period === 'string'
                                          ? period.charAt(0).toUpperCase() +
                                            period.slice(1).toLowerCase()
                                          : 'One Time';
                                      const normalizedPeriod =
                                        RECURRING_FREQUENCY_OPTIONS.find(
                                          (o) => o.value.toLowerCase() === normalized.toLowerCase(),
                                        )?.value || 'One Time';
                                      setEditRecurrencePeriod(normalizedPeriod);

                                      // Get date value based on period type
                                      if (
                                        normalizedPeriod === 'Monthly' ||
                                        normalizedPeriod === 'Yearly'
                                      ) {
                                        // For Monthly and Yearly, use recurrence_date
                                        const dateValue =
                                          getFieldValue(task, localChanges, 'recurrence_date') ||
                                          getFieldValue(task, localChanges, 'recurrence_date') ||
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'custom_recurrence_date',
                                          ) ||
                                          '';
                                        setEditRecurrenceDate(dateValue ? String(dateValue) : '');
                                      } else if (normalizedPeriod === 'Quarterly') {
                                        // For Quarterly, use recurrence_quarterly_date
                                        const quarterlyDateValue =
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'recurrence_quarterly_date',
                                          ) ||
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'recurrence_quarterly_date',
                                          ) ||
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'recurrence_quaterly_date',
                                          ) ||
                                          '';
                                        setEditRecurrenceDate(
                                          quarterlyDateValue ? String(quarterlyDateValue) : '',
                                        );
                                      } else {
                                        setEditRecurrenceDate('');
                                      }

                                      // Get month value for Yearly recurrence
                                      if (normalizedPeriod === 'Yearly') {
                                        const monthValue =
                                          getFieldValue(task, localChanges, 'recurrence_month') ||
                                          getFieldValue(task, localChanges, 'recurrence_month') ||
                                          getFieldValue(
                                            task,
                                            localChanges,
                                            'custom_recurrence_month',
                                          ) ||
                                          '';
                                        setEditRecurrenceMonth(
                                          monthValue ? String(monthValue) : '',
                                        );
                                      } else {
                                        setEditRecurrenceMonth('');
                                      }
                                      setRecurrencePopoverOpen(false);
                                    }}
                                  >
                                    Cancel
                                  </Button.Root>
                                  <Button.Root
                                    type='button'
                                    variant='primary'
                                    mode='filled'
                                    size='small'
                                    onClick={async () => {
                                      const taskId = task?.name || task?.subject;
                                      if (!taskId) return;

                                      // Build batch update object with all recurrence fields
                                      const updates = {
                                        custom_recurrence_period: editRecurrencePeriod,
                                        recurrence_period: editRecurrencePeriod, // Keep for backward compatibility
                                      };

                                      // Update recurrence_date based on period type
                                      if (
                                        editRecurrencePeriod === 'Monthly' &&
                                        editRecurrenceDate
                                      ) {
                                        updates.recurrence_date = editRecurrenceDate; // Backend field
                                        updates.custom_recurrence_date = editRecurrenceDate;
                                        updates.recurrence_date = editRecurrenceDate; // Keep for backward compatibility
                                      } else if (
                                        editRecurrencePeriod === 'Quarterly' &&
                                        editRecurrenceDate
                                      ) {
                                        updates.recurrence_quarterly_date = editRecurrenceDate; // Backend field
                                        updates.recurrence_quarterly_date = editRecurrenceDate;
                                        updates.recurrence_quaterly_date = editRecurrenceDate; // Keep for backward compatibility
                                      } else if (editRecurrencePeriod === 'Yearly') {
                                        // For Yearly, update both recurrence_date and recurrence_month
                                        if (editRecurrenceDate) {
                                          updates.recurrence_date = editRecurrenceDate; // Backend field
                                          updates.custom_recurrence_date = editRecurrenceDate;
                                          updates.recurrence_date = editRecurrenceDate; // Keep for backward compatibility
                                        }
                                        if (editRecurrenceMonth) {
                                          updates.recurrence_month = editRecurrenceMonth; // Backend field
                                          updates.custom_recurrence_month = editRecurrenceMonth;
                                          updates.recurrence_month = editRecurrenceMonth; // Keep for backward compatibility
                                        }
                                      } else if (editRecurrencePeriod === 'One Time') {
                                        // Clear recurrence dates if One Time
                                        updates.custom_recurrence_period = '';
                                        updates.recurrence_date = '';
                                        updates.recurrence_quarterly_date = '';
                                        updates.recurrence_month = '';
                                        updates.custom_recurrence_date = '';
                                        updates.custom_recurrence_month = '';
                                        updates.recurrence_quarterly_date = '';
                                        updates.recurrence_date = '';
                                        updates.recurrence_quaterly_date = '';
                                        updates.recurrence_month = '';
                                      }

                                      // Update local state immediately
                                      setLocalChanges((previous) => ({
                                        ...previous,
                                        ...updates,
                                      }));

                                      // Send all updates in a single API call
                                      try {
                                        await updateTaskBatchViaAPI(taskId, updates);
                                        setRecurrencePopoverOpen(false);
                                      } catch {
                                        // Error is already handled in updateTaskBatchViaAPI
                                      }
                                    }}
                                    disabled={
                                      (editRecurrencePeriod === 'Monthly' ||
                                        editRecurrencePeriod === 'Quarterly') &&
                                      !editRecurrenceDate
                                        ? true
                                        : editRecurrencePeriod === 'Yearly' &&
                                            (!editRecurrenceDate || !editRecurrenceMonth)
                                          ? true
                                          : false
                                    }
                                  >
                                    Save
                                  </Button.Root>
                                </div>
                              </div>
                            </Popover.Content>
                          </Popover.Root>
                        </FieldRow>
                      )}
                    </>
                  )}
                </div>

                {/* Tags Section */}
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiPriceTag3Line size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Tags</span>
                  </div>

                  <div className='w-full'>
                    {tagInputVisible ? (
                      <div className='flex items-center gap-2'>
                        <Input.Root className='flex-1' size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              placeholder='Enter tag'
                              value={newTagValue}
                              onChange={(e) => setNewTagValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTag();
                                }
                              }}
                              autoFocus
                            />
                          </Input.Wrapper>
                        </Input.Root>
                        <Button.Root
                          variant='neutral'
                          mode='ghost'
                          size='xsmall'
                          className='bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]'
                          onClick={() => {
                            setTagInputVisible(false);
                            setNewTagValue('');
                          }}
                        >
                          <Button.Icon as={RiCloseLine} />
                        </Button.Root>
                        <Button.Root
                          variant='neutral'
                          mode='ghost'
                          size='xsmall'
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTag();
                            }
                          }}
                          className='bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]'
                          onClick={handleAddTag}
                        >
                          <Button.Icon as={RiCheckLine} />
                        </Button.Root>
                      </div>
                    ) : (
                      <LinkButton.Root
                        variant='primary'
                        size='small'
                        onClick={() => setTagInputVisible(true)}
                        className=''
                      >
                        <LinkButton.Icon as={RiAddLine} />
                        Add Tag
                      </LinkButton.Root>
                    )}
                  </div>

                  {tags.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {tags.map((tag, index) => {
                        const tagDisplay = String(
                          typeof tag === 'string' ? tag : tag?.name || tag?.label || tag,
                        ).trim();
                        if (!tagDisplay) return null;
                        return (
                          <Badge.Root key={`${tagDisplay}-${index}`} size='small' variant='stroke'>
                            {tagDisplay}
                            <Tag.DismissButton onClick={() => handleRemoveTag(index)} />
                          </Badge.Root>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Attachments Section */}
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <RiAttachment2 className='size-5 text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Attachments</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type='file'
                      multiple
                      className='hidden'
                      onChange={handleFileInputChange}
                      accept='*/*'
                    />
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      className='gap-1'
                      onClick={handleUploadButtonClick}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Button.Icon as={RiLoader2Fill} className='p-0.5 animate-spin' />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Button.Icon as={RiUploadLine} className='p-0.5' />
                          <span>Upload Files</span>
                        </>
                      )}
                    </Button.Root>
                  </div>
                  {uploadError && (
                    <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                      <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div className='flex flex-col gap-3'>
                      <div
                        ref={attachmentsListRef}
                        className='flex gap-4 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory'
                      >
                        {attachments.map((attachment, index) => {
                          const hasSize =
                            attachment.size !== null &&
                            attachment.size !== undefined &&
                            attachment.size !== '';
                          const hasDate = Boolean(attachment.createdAt);

                          return (
                            <div
                              key={attachment.id || `${attachment.fileName}-${index}`}
                              className='w-[220px] shrink-0 snap-start'
                            >
                              <div
                                className='group relative flex h-full flex-col overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100 cursor-pointer hover:border-stroke-sub-300 transition-colors'
                                onClick={(e) => handleAttachmentView(attachment, e)}
                              >
                                <div className='relative flex size-[176px] w-full items-center justify-center bg-bg-weak-100'>
                                  {/* Action buttons */}
                                  <div
                                    className='attachment-actions absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100'
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Download button - show for all attachments with a valid URL */}
                                    {getPreviewUrl(attachment) && (
                                      <CompactButton.Root
                                        size='large'
                                        variant='ghost'
                                        onClick={() => handleAttachmentDownload(attachment)}
                                        aria-label={`Download ${attachment.fileName || 'attachment'}`}
                                        className='bg-white/90 hover:bg-white'
                                      >
                                        <CompactButton.Icon as={RiDownloadLine} />
                                      </CompactButton.Root>
                                    )}
                                    {/* Delete button for existing files */}
                                    {!attachment.isNew && attachment.childRowId && (
                                      <CompactButton.Root
                                        size='large'
                                        variant='ghost'
                                        onClick={() =>
                                          handleRemoveAttachment(
                                            attachment.id,
                                            attachment.childRowId,
                                          )
                                        }
                                        aria-label={`Delete ${attachment.fileName || 'attachment'}`}
                                        className='bg-white/90 hover:bg-white text-error-base'
                                      >
                                        <CompactButton.Icon as={RiDeleteBinLine} />
                                      </CompactButton.Root>
                                    )}
                                    {/* Remove button for new files */}
                                    {attachment.isNew && (
                                      <CompactButton.Root
                                        size='large'
                                        variant='ghost'
                                        onClick={() => handleRemoveAttachment(attachment.id)}
                                        aria-label={`Remove ${attachment.fileName || 'attachment'}`}
                                        className='bg-white/90 hover:bg-white text-error-base'
                                      >
                                        <CompactButton.Icon as={RiCloseLine} />
                                      </CompactButton.Root>
                                    )}
                                  </div>

                                  {/* Preview */}
                                  {isImageFile(attachment) &&
                                  getPreviewUrl(attachment) &&
                                  !imagePreviewErrors[attachment.id] ? (
                                    <img
                                      src={getPreviewUrl(attachment)}
                                      alt={attachment.fileName}
                                      className='h-full w-full object-cover'
                                      loading='lazy'
                                      onError={() => handleImageError(attachment.id)}
                                    />
                                  ) : (
                                    <div className='flex flex-col items-center justify-center gap-2 px-3 text-center text-text-sub-500'>
                                      <div className='flex size-10 items-center justify-center rounded-lg border border-stroke-soft-200 bg-white shadow-sm'>
                                        <RiImage2Line className='size-5 text-text-sub-500' />
                                      </div>
                                      <span className='text-paragraph-xs text-text-sub-500'>
                                        Preview unavailable
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className='border-t border-stroke-soft-200 bg-white px-4 py-3 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
                                  <div className='flex items-center gap-2 min-w-0'>
                                    <FileFormatIcon.Root
                                      format={attachment.extension || 'FILE'}
                                      size='small'
                                      color='purple'
                                    />
                                    <div className='flex flex-col flex-1 min-w-0'>
                                      <div className='flex items-center gap-1'>
                                        <span
                                          className='label-small text-text-main-900 truncate'
                                          title={attachment.fileName}
                                        >
                                          {attachment.fileName}
                                        </span>
                                        {attachment.isNew && (
                                          <Badge.Root
                                            variant='light'
                                            color='blue'
                                            size='small'
                                            className='shrink-0'
                                          >
                                            New
                                          </Badge.Root>
                                        )}
                                      </div>
                                      <div className='mt-1 flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
                                        {hasSize && <span>{formatFileSize(attachment.size)}</span>}
                                        {!hasSize && !hasDate && <span>--</span>}
                                      </div>
                                      <div className='mt-1 flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
                                        {hasDate && (
                                          <span>{formatDisplayDateTime(attachment.createdAt)}</span>
                                        )}
                                      </div>
                                    </div>
                                    {!attachment.isNew && attachment.childRowId && (
                                      <CompactButton.Root
                                        size='small'
                                        variant='ghost'
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveAttachment(
                                            attachment.id,
                                            attachment.childRowId,
                                          );
                                        }}
                                        aria-label={`Delete ${attachment.fileName || 'attachment'}`}
                                        className='text-[var(--color-text-sub-500)]'
                                      >
                                        <CompactButton.Icon as={RiDeleteBinLine} />
                                      </CompactButton.Root>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {attachments.length > 1 && (
                        <div className='flex items-center justify-center gap-2 text-paragraph-xs text-text-sub-500'>
                          <CompactButton.Root
                            size='large'
                            variant='ghost'
                            onClick={() => handleAttachmentNav(-1)}
                            disabled={currentAttachmentIndex === 0}
                            className='shrink-0'
                          >
                            <CompactButton.Icon as={RiArrowLeftSLine} />
                          </CompactButton.Root>
                          <span className='min-w-[52px] text-center'>
                            {currentAttachmentIndex + 1}/{attachments.length}
                          </span>
                          <CompactButton.Root
                            size='large'
                            variant='ghost'
                            onClick={() => handleAttachmentNav(1)}
                            disabled={currentAttachmentIndex === attachments.length - 1}
                            className='shrink-0'
                          >
                            <CompactButton.Icon as={RiArrowRightSLine} />
                          </CompactButton.Root>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {hasSidePanel && (
              <div className='flex flex-1 flex-col min-h-0 h-full overflow-hidden'>
                <div className='border-b border-stroke-soft-200 px-6 py-3.5 shrink-0'>
                  <span className='label-small text-text-sub-500'>{sidePanelTitle}</span>
                </div>
                <div className='flex-1 min-h-0 overflow-y-auto'>{sidePanel}</div>
              </div>
            )}
          </div>
        </Drawer.Body>

        {/* Footer */}
        {/* <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
          <div className='flex flex-col gap-3 p-6 sm:flex-row sm:justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              className='w-full sm:w-auto'
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='medium'
              className='w-full sm:w-auto'
              onClick={handleSaveAll}
              disabled={
                isSaving || (Object.keys(localChanges).length === 0 && newAttachments.length === 0)
              }
            >
              {isSaving ? (
                <>
                  <Button.Icon as={RiLoader2Fill} className='animate-spin' />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button.Root>
          </div>
        </Drawer.Footer> */}
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default TaskViewDrawerCommon;
