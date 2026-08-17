import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiUserLine,
  RiCalendarLine,
  RiFlagLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiAttachment2,
  RiUploadCloud2Line,
  RiUploadLine,
  RiAlertFill,
  RiCheckLine,
  RiAddLine,
  RiRepeatLine,
  RiBuilding4Line,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import { Datepicker } from '@/components/ui/datepicker';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import TaskComments from '@/components/clients-management/task-comments';
import { TaskCenterNameBadge } from '@/components/client-onboarding/tasks-table-common';
import ClientTaskViewDrawerSkeleton from '@/components/clients-management/client-task-view-drawer-skeleton';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import {
  fetchTaskDetail,
  fetchTaskComments,
  selectTaskDetail,
  selectTaskComments,
  updateTaskField,
  updateTaskInList,
  refreshClientStatisticsIfCompletionChanged,
} from '@/redux/clientDetailSlice';
import { removeCrmTaskAttachment } from '@/redux/settingSlice';
import apiClient from '@/api/axios';
import { formatDateWithOrdinal, getMinCustomNextUpdateDate, parseToDate } from '@/utils/date-utils';
import { isCustomNextUpdateAfterDueDate } from '@/schemas/task-schema';
import { getFileExtension } from '@/utils/file-utils';
import {
  getPriorityColor,
  getStatusColor,
  RECURRING_FREQUENCY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '@/components/clients-management/constants';
import FieldRow from '@/components/ui/field-row';
import * as Tag from '@/components/ui/tag';
import * as Label from '@/components/ui/label';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import AttachmentList from '@/components/ui/attachment-list';
import { MONTH_OPTIONS } from '@/constants/constants';
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';

const IMAGE_EXTENSIONS = new Set(['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

const MONTHLY_RECURRING_DATE_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const n = i + 1;
  return { value: String(n), label: `${n}` };
});

const normalizeTaskAttachments = (task) => {
  if (!task) return [];

  const attachmentsSource = task?.custom_attachment || [];

  if (!Array.isArray(attachmentsSource)) return [];

  return attachmentsSource
    .map((attachment, index) => {
      const fileUrl = attachment?.attachment || '';

      if (!fileUrl) return null;

      // Extract filename from URL if not provided directly
      // URL format: https://s3.../Task/UOVJISK0_BGb426aab426aa.png
      // Extract the part after the last '/' and remove any query params
      let fileName =
        attachment?.file_name || attachment?.filename || attachment?.file || attachment?.title;

      if (!fileName && fileUrl) {
        // Extract filename from URL
        const urlParts = fileUrl.split('/');
        const lastPart = urlParts.at(-1) || '';
        // Remove any query parameters
        fileName = lastPart.split('?')[0];
        // Remove the prefix (e.g., "UOVJISK0_") if present
        const underscoreIndex = fileName.indexOf('_');
        if (underscoreIndex > 0) {
          fileName = fileName.slice(underscoreIndex + 1);
        }
      }

      if (!fileName) {
        // Fallback: use the attachment name as filename
        fileName = attachment?.name || `attachment-${index}`;
      }

      // Try to get extension from fileName first, then from fileUrl if not found
      let extension = getFileExtension(fileName);
      if (!extension && fileUrl) {
        extension = getFileExtension(fileUrl);
      }

      const size =
        attachment?.file_size ||
        attachment?.size ||
        attachment?.file_size_bytes ||
        attachment?.content_length ||
        attachment?.bytes;
      const createdAt =
        attachment?.creation ||
        attachment?.created_at ||
        attachment?.modified ||
        attachment?.timestamp;

      return {
        id: attachment?.name || attachment?.id || `${fileName}-${index}`,
        fileName,
        fileUrl,
        size,
        createdAt,
        extension,
        isImage: IMAGE_EXTENSIONS.has(extension),
        childRowId: attachment?.name || attachment?.id, // For delete functionality - use name as child_row_id
      };
    })
    .filter(Boolean);
};

// Helper to get field value with fallback
const getFieldValue = (task, localChanges, fieldName) => {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }

  if (task?.[fieldName] !== undefined && task?.[fieldName] !== null && task?.[fieldName] !== '') {
    return task[fieldName];
  }
  return '';
};

// Main task view drawer component
const ClientTaskViewDrawer = ({
  isOpen = false,
  onClose,
  taskId = null,
  taskType = 'onboarding', // 'onboarding' | 'engagement' | 'exit'
  tasks = [], // List of tasks for navigation
  /** When opening outside client detail (e.g. My Tasks), list is empty — pass Task.subject from the row */
  taskSubjectFallback = null,
  onTaskChange,
  permissions = { canEdit: true },
}) => {
  const dispatch = useDispatch();
  const taskDetail = useSelector(selectTaskDetail);
  const taskComments = useSelector(selectTaskComments);
  const task = taskDetail?.data;
  const [localChanges, setLocalChanges] = useState({});
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [hasLoadedCommentsInitial, setHasLoadedCommentsInitial] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [recurrencePopoverOpen, setRecurrencePopoverOpen] = useState(false);
  const [editRecurrencePeriod, setEditRecurrencePeriod] = useState('One Time');
  const [editRecurrenceDate, setEditRecurrenceDate] = useState('');
  const [editRecurrenceMonth, setEditRecurrenceMonth] = useState('');
  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const onFilesDropRef = useRef(null);
  const { dragActive, setDragActive, overlayHeight, messageTop, handleDrag, handleDrop } =
    useDragAndDrop({
      containerRef: leftPanelRef,
      onFilesDrop: (files) => onFilesDropRef.current?.(files),
      triggerDependency: task,
    });
  const lastFetchedTaskIdRef = useRef(null);
  const fetchPromiseRef = useRef(null);
  const previousTaskIdRef = useRef(null);
  const previousCommentsTaskIdRef = useRef(null);

  const listTaskRow = useMemo(
    () => tasks.find((t) => t.name === taskId || t.id === taskId) ?? null,
    [tasks, taskId],
  );

  /** Merge list row (has `center` from get_task_list_view) with detail payload. */
  const taskForCenterDisplay = useMemo(() => {
    if (!listTaskRow && !task) return null;
    const merged = { ...listTaskRow, ...task };
    // Detail API may only return `custom_center` (id); keep list `center` for display name.
    if (listTaskRow?.center != null && listTaskRow.center !== '') {
      merged.center = task?.center ?? listTaskRow.center;
    }
    return merged;
  }, [listTaskRow, task]);

  const getSubjectForDetailFetch = useCallback(() => {
    if (listTaskRow?.subject) return listTaskRow.subject;
    if (taskSubjectFallback) return taskSubjectFallback;
    if (task?.subject) return task.subject;
    return null;
  }, [listTaskRow, taskSubjectFallback, task]);

  // Track first successful load per task to avoid skeleton during background refetches
  useEffect(() => {
    if (!taskDetail.isLoading && task) {
      setHasLoadedInitialData(true);
    }
  }, [taskDetail.isLoading, task]);

  // Sync recurrence edit form from task (engagement only)
  useEffect(() => {
    if (taskType !== 'engagement' || !task) return;
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
    const dateValue =
      getFieldValue(task, localChanges, 'custom_recurrence_date') ||
      getFieldValue(task, localChanges, 'recurrence_date') ||
      '';
    setEditRecurrenceDate(dateValue ? String(dateValue) : '');
    // Get month value for Yearly recurrence
    const monthValue =
      getFieldValue(task, localChanges, 'custom_recurrence_month') ||
      getFieldValue(task, localChanges, 'recurrence_month') ||
      '';
    setEditRecurrenceMonth(monthValue ? String(monthValue) : '');
  }, [taskType, task, localChanges]);

  // Reset initial-load flag when switching tasks or closing the drawer
  useEffect(() => {
    if (!isOpen) {
      setHasLoadedInitialData(false);
      previousTaskIdRef.current = null;
      return;
    }

    if (previousTaskIdRef.current !== taskId) {
      setHasLoadedInitialData(false);
      previousTaskIdRef.current = taskId;
    }
  }, [isOpen, taskId]);

  // Track first comments load per task to avoid showing loading on refetch
  useEffect(() => {
    if (!taskComments.isLoading && taskComments.data) {
      setHasLoadedCommentsInitial(true);
    }
  }, [taskComments.isLoading, taskComments.data]);

  // Reset comments initial-load flag when switching tasks or closing the drawer
  useEffect(() => {
    if (!isOpen) {
      setHasLoadedCommentsInitial(false);
      previousCommentsTaskIdRef.current = null;
      return;
    }

    if (previousCommentsTaskIdRef.current !== taskId) {
      setHasLoadedCommentsInitial(false);
      previousCommentsTaskIdRef.current = taskId;
    }
  }, [isOpen, taskId]);

  // Show loading skeleton only on the first load for comments
  const commentsLoading = useMemo(() => {
    if (!isOpen || !taskId) return false;
    if (!hasLoadedCommentsInitial) return taskComments.isLoading;
    return false;
  }, [isOpen, taskId, taskComments.isLoading, hasLoadedCommentsInitial]);

  // Show loading skeleton only on the first load for a task
  const isLoading = useMemo(() => {
    return isOpen && taskId && !hasLoadedInitialData && taskDetail.isLoading;
  }, [isOpen, taskId, hasLoadedInitialData, taskDetail.isLoading]);

  // Fetch task details when drawer opens or taskId changes
  useEffect(() => {
    if (!isOpen || !taskId) {
      lastFetchedTaskIdRef.current = null;
      fetchPromiseRef.current = null;
      return;
    }

    const subject = getSubjectForDetailFetch();
    if (!subject) {
      return;
    }

    // Only fetch if task ID changed and we don't have an in-flight request
    if (lastFetchedTaskIdRef.current !== taskId && !fetchPromiseRef.current) {
      const currentTaskId = taskId;
      lastFetchedTaskIdRef.current = currentTaskId;

      const detailPromise = dispatch(
        fetchTaskDetail({
          task_id: taskId,
          task_type: taskType,
        }),
      );

      fetchPromiseRef.current = detailPromise;

      const res = detailPromise
        .then((response) => {})
        .catch((error) => {})
        .finally(() => {
          if (lastFetchedTaskIdRef.current === currentTaskId) {
            fetchPromiseRef.current = null;
          }
        });
    }

    return () => {
      if (lastFetchedTaskIdRef.current !== taskId) {
        fetchPromiseRef.current = null;
      }
    };
  }, [isOpen, taskId, taskType, tasks, dispatch, getSubjectForDetailFetch]);

  // Defer heavy rendering until drawer animation completes
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        setIsDrawerFullyOpen(true);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setIsDrawerFullyOpen(false);
    }
  }, [isOpen]);

  // Reset refs and local changes when drawer opens or task changes
  useEffect(() => {
    if (!isOpen) {
      setLocalChanges({});
      setUploadError('');
      setDragActive(false);
      setTagInputVisible(false);
      setNewTagValue('');
      return;
    }

    if (taskId && lastFetchedTaskIdRef.current !== taskId) {
      setLocalChanges({});
      setUploadError('');
      setDragActive(false);
      setTagInputVisible(false);
      setNewTagValue('');
    }
  }, [isOpen, taskId]);

  // Get current task index for navigation
  const currentTaskIndex = useMemo(() => {
    if (!taskId || !tasks || tasks.length === 0) return -1;
    return tasks.findIndex((t) => t.name === taskId || t.id === taskId);
  }, [taskId, tasks]);

  const hasPrevious = currentTaskIndex > 0;
  const hasNext = currentTaskIndex >= 0 && currentTaskIndex < tasks.length - 1;

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (!hasPrevious) return;
    const previousTask = tasks[currentTaskIndex - 1];
    if (previousTask && onTaskChange) {
      onTaskChange(previousTask.name || previousTask.id, taskType);
    }
  }, [hasPrevious, currentTaskIndex, tasks, onTaskChange, taskType]);

  const handleNext = useCallback(() => {
    if (!hasNext) return;
    const nextTask = tasks[currentTaskIndex + 1];
    if (nextTask && onTaskChange) {
      onTaskChange(nextTask.name || nextTask.id, taskType);
    }
  }, [hasNext, currentTaskIndex, tasks, onTaskChange, taskType]);

  const getOriginalFieldValue = useCallback(
    (fieldName) => {
      if (!task && !taskId) return '';

      // Special handling for assignees: prioritize assignees array from API
      if (fieldName === 'assignees') {
        if (task?.assignees && Array.isArray(task.assignees) && task.assignees.length > 0) {
          return task.assignees;
        }
        return task?.[fieldName] || '';
      }

      if (
        task?.[fieldName] !== undefined &&
        task?.[fieldName] !== null &&
        task?.[fieldName] !== ''
      ) {
        return task[fieldName];
      }

      return '';
    },
    [task, taskId],
  );

  // Handle field change with optimistic update
  const handleFieldChange = useCallback(
    async (fieldName, value) => {
      if (!task && !taskId) return;

      if (fieldName === 'custom_next_update_date') {
        const s = value != null ? String(value).trim() : '';
        const dueStr = String(getFieldValue(task, localChanges, 'exp_end_date') || '')
          .trim()
          .split('T')[0];
        if (s && !isCustomNextUpdateAfterDueDate(dueStr, s)) {
          showErrorToast('Next update date must be after the due date');
          return;
        }
      }

      const currentTaskId = task?.name || taskId;
      const currentValue = getOriginalFieldValue(fieldName);

      // Normalize values for comparison - extract identifiers from both
      const normalizeForCompare = (value_) => {
        if (!value_ || (Array.isArray(value_) && value_.length === 0)) return '';
        if (Array.isArray(value_)) {
          // Extract identifiers (strings) from array
          const ids = value_
            .map((v) => {
              if (typeof v === 'string') return v;
              if (v && typeof v === 'object') return v.value || v.email || v.name || v;
              return String(v);
            })
            .filter(Boolean)
            .sort();
          return ids.join(',');
        }
        if (typeof value_ === 'object' && value_ !== null) {
          return value_.value || value_.email || value_.name || String(value_);
        }
        return String(value_ || '');
      };

      const currentNormalized = normalizeForCompare(currentValue);
      const newNormalized = normalizeForCompare(value);

      // Only update if value actually changed
      // For assignees field, always allow update (comparison might fail due to format differences)
      if (fieldName !== 'assignees' && currentNormalized === newNormalized) {
        return; // No change, don't trigger API
      }

      // Update local state immediately for smooth UX
      setLocalChanges((previous) => ({
        ...previous,
        [fieldName]: value,
      }));

      try {
        // Assignees add/remove should use assignment APIs (same as ticket management),
        // not update_ref_doc_task.
        if (fieldName === 'assignees') {
          // Normalize assignees to array of strings
          const normalizedAssignees = Array.isArray(value)
            ? value
                .map((v) => (typeof v === 'string' ? v : v.value || v.email || v.name || v))
                .filter(Boolean)
            : value
              ? [
                  typeof value === 'string'
                    ? value
                    : value.value || value.email || value.name || value,
                ].filter(Boolean)
              : [];

          await dispatch(
            updateTaskField({
              taskName: currentTaskId,
              fieldName: 'assignees',
              value: normalizedAssignees,
              currentAssignees: getOriginalFieldValue('assignees') ?? task?.assignees ?? [],
              taskType,
            }),
          ).unwrap();

          // Refresh task detail using stable task_id
          if (currentTaskId) {
            dispatch(
              fetchTaskDetail({
                task_id: currentTaskId,
                task_type: taskType,
              }),
            ).then((detailResult) => {
              if (fetchTaskDetail.fulfilled.match(detailResult)) {
                const updatedTask = detailResult.payload;
                if (updatedTask) {
                  dispatch(updateTaskInList({ taskData: updatedTask, taskType }));
                }
              }
            });
          }

          if (currentTaskId) {
            dispatch(fetchTaskComments({ taskName: currentTaskId }));
          }

          return;
        }

        // Build payload with task_id and the field to update
        const payload = {
          task_id: currentTaskId,
          [fieldName]: value,
        };

        // Handle special cases for assignees and tags (arrays)
        if (fieldName === 'assignees') {
          // Normalize assignees to array of strings
          let normalizedAssignees = [];
          if (Array.isArray(value)) {
            normalizedAssignees = value
              .map((v) => (typeof v === 'string' ? v : v.value || v.email || v.name || v))
              .filter(Boolean);
          } else if (value) {
            const assigneeValue =
              typeof value === 'string' ? value : value.value || value.email || value.name || value;
            if (assigneeValue) {
              normalizedAssignees = [assigneeValue];
            }
          }
          payload.assignees = normalizedAssignees;
        } else if (fieldName === 'tags') {
          // Ensure tags is an array
          if (Array.isArray(value)) {
            payload.tags = value;
          } else if (value) {
            payload.tags = [value];
          } else {
            payload.tags = [];
          }
        }

        // Send update using the same API as recurrence updates
        const response = await apiClient.post(
          '/method/devx.dev_x.api.document_task.update_ref_doc_task',
          payload,
        );

        if (response.data?.message || response.data) {
          if (fieldName === 'status') {
            dispatch(refreshClientStatisticsIfCompletionChanged(currentValue, value, taskType));
          }

          // Refresh task detail using stable task_id (subject can change on update)
          if (currentTaskId) {
            dispatch(
              fetchTaskDetail({
                task_id: currentTaskId,
                task_type: taskType,
              }),
            ).then((detailResult) => {
              // Update the task in the list after fetching updated details
              if (fetchTaskDetail.fulfilled.match(detailResult)) {
                const updatedTask = detailResult.payload;
                if (updatedTask) {
                  dispatch(updateTaskInList({ taskData: updatedTask, taskType }));
                }
              }
            });
          }
          // Refresh comments/activities after field update
          if (currentTaskId) {
            dispatch(fetchTaskComments({ taskName: currentTaskId }));
          }
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task field. Please try again.');
      }
    },
    [
      task,
      taskId,
      localChanges,
      getOriginalFieldValue,
      dispatch,
      tasks,
      taskType,
      getSubjectForDetailFetch,
    ],
  );

  const dueDateEffective = useMemo(
    () =>
      String(getFieldValue(task, localChanges, 'exp_end_date') || '')
        .trim()
        .split('T')[0],
    [task, localChanges],
  );

  const customNextUpdateDateValue = useMemo(() => {
    const v = getFieldValue(task, localChanges, 'custom_next_update_date');
    if (v != null && String(v).trim() !== '') return String(v).trim().split('T')[0];
    const raw = task?.custom_next_update_date;
    return raw != null && raw !== '' ? String(raw).trim().split('T')[0] : '';
  }, [task, localChanges]);

  useEffect(() => {
    if (!isOpen || !task) return;
    const next = String(customNextUpdateDateValue ?? '').trim();
    const due = String(dueDateEffective ?? '').trim();
    if (!next || !due) return;
    if (isCustomNextUpdateAfterDueDate(due, next)) return;
    handleFieldChange('custom_next_update_date', '');
  }, [isOpen, task, dueDateEffective, customNextUpdateDateValue, handleFieldChange]);

  // Batch update recurrence fields in a single API call
  const handleRecurrenceBatchUpdate = useCallback(
    async (updates) => {
      if (!task && !taskId) return;

      const currentTaskId = task?.name || taskId;

      try {
        // Build payload with all recurrence fields
        const payload = {
          task_id: currentTaskId,
          ...updates,
        };

        // Update local state immediately for smooth UX
        setLocalChanges((previous) => ({
          ...previous,
          ...updates,
        }));

        // Send batch update
        const response = await apiClient.post(
          '/method/devx.dev_x.api.document_task.update_ref_doc_task',
          payload,
        );

        if (response.data?.message || response.data) {
          // Refresh task detail using stable task_id (subject can change after edits)
          if (currentTaskId) {
            dispatch(
              fetchTaskDetail({
                task_id: currentTaskId,
                task_type: taskType,
              }),
            ).then((detailResult) => {
              if (fetchTaskDetail.fulfilled.match(detailResult)) {
                const updatedTask = detailResult.payload;
                if (updatedTask) {
                  dispatch(updateTaskInList({ taskData: updatedTask, taskType }));
                }
              }
            });
          }
          // Refresh comments/activities after field update
          if (currentTaskId) {
            dispatch(fetchTaskComments({ taskName: currentTaskId }));
          }
          showSuccessToast('Recurrence updated successfully');
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update recurrence. Please try again.');
      }
    },
    [task, taskId, dispatch, tasks, taskType, getSubjectForDetailFetch],
  );

  // Memoized computed values
  const taskTitle = useMemo(() => {
    const titleValue = getFieldValue(task, localChanges, 'subject');
    if (titleValue !== null && titleValue !== undefined) {
      return titleValue;
    }
    return '';
  }, [task, localChanges]);

  useEffect(() => {
    setTitleError('');
  }, [taskTitle]);

  const priority = useMemo(
    () => getFieldValue(task, localChanges, 'priority'),
    [task, localChanges],
  );
  const status = useMemo(() => getFieldValue(task, localChanges, 'status'), [task, localChanges]);
  const attachments = useMemo(() => normalizeTaskAttachments(task), [task]);

  // Remove attachment
  const handleRemoveAttachment = useCallback(
    async (attachmentId, childRowId) => {
      if (!childRowId) {
        showErrorToast('Attachment ID not available');
        return;
      }

      if (!permissions.canEdit) {
        showErrorToast('You do not have permission to delete attachments');
        return;
      }

      try {
        // Call the remove attachment API
        await dispatch(
          removeCrmTaskAttachment({
            child_row_id: childRowId,
            child_doctype: 'Task Attachment',
          }),
        ).unwrap();

        // Refresh task detail to get updated attachments.
        // IMPORTANT: `get_task_detailed_view` expects the Task id/name, not the human `subject`.
        const refreshTaskId = task?.name || taskId;
        if (refreshTaskId) {
          try {
            await dispatch(
              fetchTaskDetail({
                task_id: refreshTaskId,
                task_type: taskType,
              }),
            ).unwrap();
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
        showErrorToast(errorMessage || 'Failed to remove attachment');
      }
    },
    [dispatch, tasks, taskId, taskType, permissions.canEdit, getSubjectForDetailFetch],
  );

  const handleFileUpload = useCallback(
    async (files) => {
      if (!taskId || !permissions.canEdit) return;

      const fileArray = [...files];
      if (fileArray.length === 0) return;

      setIsUploading(true);
      setUploadError('');

      // Validate file sizes
      const validFiles = [];
      const invalidFiles = [];

      fileArray.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        const errorMessage = `The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`;
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
        const currentTaskId = task?.name || taskId;
        const formData = new FormData();
        formData.append('task_id', currentTaskId);
        validFiles.forEach((file) => formData.append('attachment_file', file));

        await apiClient.post(
          'method/devx.dev_x.api.document_task.upload_task_attachment',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );

        // Refresh task detail to get updated attachments.
        // IMPORTANT: `get_task_detailed_view` expects the Task id/name, not the human `subject`.
        if (currentTaskId) {
          await dispatch(
            fetchTaskDetail({
              task_id: currentTaskId,
              task_type: taskType,
            }),
          );
        }

        // Refresh comments/activities after file upload
        if (currentTaskId) {
          await dispatch(fetchTaskComments({ taskName: currentTaskId }));
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        showSuccessToast(
          validFiles.length === 1
            ? 'Attachment uploaded successfully'
            : `${validFiles.length} attachment(s) uploaded successfully`,
        );
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?._server_messages ||
          error.message ||
          'Failed to upload file. Please try again.';
        setUploadError(errorMessage);
        showErrorToast(error, {
          defaultMessage: 'Failed to upload file. Please try again.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [taskId, task, permissions.canEdit, dispatch, tasks, taskType, getSubjectForDetailFetch],
  );

  useEffect(() => {
    onFilesDropRef.current = handleFileUpload;
    return () => {
      onFilesDropRef.current = null;
    };
  }, [handleFileUpload]);

  const handleUploadButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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

  // Get tags array
  const taskTags = useMemo(() => {
    const tagsValue = getFieldValue(task, localChanges, 'tags') || '';
    if (!tagsValue) return [];
    if (Array.isArray(tagsValue)) return tagsValue;
    if (typeof tagsValue === 'string') {
      return tagsValue
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return [];
  }, [task, localChanges]);

  // Handle adding a tag
  const handleAddTag = useCallback(() => {
    if (!newTagValue.trim()) return;

    const trimmedTag = newTagValue.trim();
    // Check if tag already exists
    const existingTags = taskTags.map((tag) =>
      typeof tag === 'string' ? tag.toLowerCase() : String(tag).toLowerCase(),
    );
    if (existingTags.includes(trimmedTag.toLowerCase())) {
      setNewTagValue('');
      setTagInputVisible(false);
      return;
    }

    const newTags = [...taskTags, trimmedTag];
    handleFieldChange('tags', newTags);
    setNewTagValue('');
    setTagInputVisible(false);
  }, [newTagValue, taskTags, task, handleFieldChange]);

  // Handle removing a tag
  const handleRemoveTag = useCallback(
    (index) => {
      const newTags = taskTags.filter((_, index_) => index_ !== index);
      handleFieldChange('tags', newTags.length > 0 ? newTags : '');
    },
    [taskTags, task, handleFieldChange],
  );

  // Get assignees array
  const assignees = useMemo(() => {
    const assigneesValue = getFieldValue(task, localChanges, 'assignees');
    if (!assigneesValue) return [];
    return Array.isArray(assigneesValue) ? assigneesValue : [assigneesValue];
  }, [task, localChanges]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={onClose}>
      <Drawer.Content className='max-w-[1200px]'>
        {/* Header */}
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
            {isLoading || !isDrawerFullyOpen ? (
              <>
                <div className='h-8 w-32 bg-bg-weak-100 rounded animate-pulse' />
                <div className='flex items-center gap-3'>
                  <div className='h-8 w-16 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-8 w-8 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </>
            ) : (
              <>
                <div className='flex items-center gap-2'>
                  <ButtonGroup.Root size='xsmall'>
                    <ButtonGroup.Item onClick={handlePrevious} disabled={!hasPrevious}>
                      <ButtonGroup.Icon as={RiArrowLeftSLine} />
                    </ButtonGroup.Item>
                    <ButtonGroup.Item onClick={handleNext} disabled={!hasNext}>
                      <ButtonGroup.Icon as={RiArrowRightSLine} />
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>
                </div>
                <div className='flex items-center gap-3'>
                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    onClick={onClose}
                    className='shrink-0'
                  >
                    <Button.Icon as={RiCloseLine} className='shrink-0' />
                  </Button.Root>
                </div>
              </>
            )}
          </div>
        </Drawer.Header>

        {/* Body */}
        <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
          {isLoading || !task || !isDrawerFullyOpen ? (
            <ClientTaskViewDrawerSkeleton />
          ) : taskDetail.error ? (
            <div className='flex items-center justify-center h-full'>
              <div className='flex flex-col items-center gap-2'>
                <p className='text-paragraph-sm text-error-base'>{taskDetail.error}</p>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  onClick={() => {
                    const subject = getSubjectForDetailFetch();
                    if (subject) {
                      dispatch(
                        fetchTaskDetail({
                          subject,
                          type: taskType,
                        }),
                      );
                    }
                  }}
                >
                  Retry
                </Button.Root>
              </div>
            </div>
          ) : task ? (
            <div className='flex h-full'>
              {/* Left Panel - Task Details */}
              <div
                ref={leftPanelRef}
                className={cn(
                  'w-[422px] border-r border-stroke-soft-200 overflow-y-auto relative',
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
                            All file types, up to 10 MB per file
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div className='px-6 pt-5 pb-0 flex flex-col gap-6'>
                  {/* Task Title */}
                  <div className='flex flex-col gap-1'>
                    <Textarea.Root
                      key={`${task?.name || taskId || 'title'}-${taskTitle || ''}`}
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
                        handleFieldChange('subject', value);
                      }}
                      disabled={!permissions.canEdit}
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

                  {/* Details Section */}
                  <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                    <FieldRow icon={RiBuilding4Line} label='Center'>
                      <TaskCenterNameBadge task={taskForCenterDisplay} />
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='Status' editable={permissions.canEdit}>
                      {permissions.canEdit ? (
                        <Select.Root
                          hasError={false}
                          value={status}
                          onValueChange={(value) => handleFieldChange('status', value)}
                          disabled={!permissions.canEdit}
                          size='xsmall'
                          variant='borderless'
                        >
                          <Select.Trigger id='status' className='w-full' showArrow={false}>
                            <Select.Value placeholder='Select' asChild>
                              {status ? (
                                <Badge.Root
                                  variant='light'
                                  color={getStatusColor(status)}
                                  className='text-nowrap'
                                >
                                  {String(status).toUpperCase()}
                                </Badge.Root>
                              ) : (
                                'Select'
                              )}
                            </Select.Value>
                          </Select.Trigger>
                          <Select.Content>
                            {TASK_STATUS_OPTIONS.map((option) => (
                              <Select.Item key={option.value} value={option.value}>
                                <Badge.Root
                                  variant='light'
                                  color={getStatusColor(option.value)}
                                  className='text-nowrap'
                                >
                                  {String(option.value).toUpperCase()}
                                </Badge.Root>
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      ) : (
                        <Badge.Root
                          variant='light'
                          color={getStatusColor(status)}
                          className='text-nowrap'
                        >
                          {status ? String(status).toUpperCase() : '--'}
                        </Badge.Root>
                      )}
                    </FieldRow>

                    <FieldRow icon={RiUserLine} label='Assignee' editable={permissions.canEdit}>
                      <AssigneeMultiSelect
                        value={(() => {
                          const value = getFieldValue(task, localChanges, 'assignees');
                          return Array.isArray(value) ? value : value ? [value] : [];
                        })()}
                        onChange={(values) => {
                          setLocalChanges((previous) => ({
                            ...previous,
                            assignees: values.length > 0 ? values : '',
                          }));
                        }}
                        onBlur={(values) => {
                          const assigneeValue =
                            Array.isArray(values) && values.length > 0 ? values : '';
                          handleFieldChange('assignees', assigneeValue);
                        }}
                        disabled={!permissions.canEdit}
                        placeholder='Select assignees'
                        size='xsmall'
                      />
                    </FieldRow>

                    <FieldRow icon={RiCalendarLine} label='Due Date' editable={permissions.canEdit}>
                      {(() => {
                        const dueDate = getFieldValue(task, localChanges, 'exp_end_date');
                        if (!permissions.canEdit) {
                          return (
                            <span className='text-paragraph-sm text-text-main-900'>
                              {dueDate ? formatDateWithOrdinal(dueDate) : '--'}
                            </span>
                          );
                        }
                        const dateValue = dueDate
                          ? (() => {
                              const [year, month, day] = dueDate.split('-').map(Number);
                              return new Date(year, month - 1, day);
                            })()
                          : undefined;
                        return (
                          <Datepicker
                            value={dateValue}
                            onChange={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                handleFieldChange('exp_end_date', `${year}-${month}-${day}`);
                              } else {
                                handleFieldChange('exp_end_date', '');
                              }
                            }}
                            disabled={!permissions.canEdit}
                            placeholder='Select a date'
                            variant='borderless'
                            size='xsmall'
                          />
                        );
                      })()}
                    </FieldRow>

                    <FieldRow
                      icon={RiCalendarLine}
                      label='Next Update Date'
                      editable={permissions.canEdit}
                    >
                      {(() => {
                        if (!permissions.canEdit) {
                          return (
                            <span className='text-paragraph-sm text-text-main-900'>
                              {customNextUpdateDateValue
                                ? formatDateWithOrdinal(customNextUpdateDateValue)
                                : '--'}
                            </span>
                          );
                        }
                        return (
                          <Datepicker
                            value={
                              customNextUpdateDateValue
                                ? parseToDate(customNextUpdateDateValue)
                                : null
                            }
                            onChange={(date) => {
                              if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                const s = `${y}-${m}-${d}`;
                                if (!isCustomNextUpdateAfterDueDate(dueDateEffective, s)) {
                                  showErrorToast('Next update date must be after the due date');
                                  return;
                                }
                                handleFieldChange('custom_next_update_date', s);
                              } else {
                                handleFieldChange('custom_next_update_date', '');
                              }
                            }}
                            disabled={!permissions.canEdit}
                            min={getMinCustomNextUpdateDate(dueDateEffective)}
                            placeholder='Select a date'
                            variant='borderless'
                            size='xsmall'
                          />
                        );
                      })()}
                    </FieldRow>

                    <FieldRow icon={RiFlagLine} label='Priority' editable={permissions.canEdit}>
                      {permissions.canEdit ? (
                        <Select.Root
                          hasError={false}
                          value={priority}
                          onValueChange={(value) => handleFieldChange('priority', value)}
                          disabled={!permissions.canEdit}
                          size='xsmall'
                          variant='borderless'
                        >
                          <Select.Trigger id='priority' className='w-full' showArrow={false}>
                            <Select.Value placeholder='Select' asChild>
                              {priority ? (
                                <Badge.Root
                                  variant='light'
                                  color={getPriorityColor(priority)}
                                  className='text-nowrap'
                                >
                                  {priority}
                                </Badge.Root>
                              ) : (
                                'Select'
                              )}
                            </Select.Value>
                          </Select.Trigger>
                          <Select.Content>
                            {TASK_PRIORITY_OPTIONS.map((option) => (
                              <Select.Item key={option.value} value={option.value}>
                                <Badge.Root
                                  variant='light'
                                  color={getPriorityColor(option.value)}
                                  className='text-nowrap'
                                >
                                  {option.label}
                                </Badge.Root>
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      ) : (
                        <Badge.Root
                          variant='light'
                          color={getPriorityColor(priority)}
                          className='text-nowrap'
                        >
                          {priority || '--'}
                        </Badge.Root>
                      )}
                    </FieldRow>

                    {/* Engagement: Recurrence FieldRow with popover */}
                    {taskType === 'engagement' && (
                      <FieldRow
                        icon={RiRepeatLine}
                        label='Recurring'
                        editable={permissions.canEdit}
                      >
                        <Popover.Root
                          open={recurrencePopoverOpen}
                          onOpenChange={(open) => {
                            setRecurrencePopoverOpen(open);
                            if (!open) {
                              const period =
                                getFieldValue(task, localChanges, 'custom_recurrence_period') ||
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
                              const dateValue =
                                getFieldValue(task, localChanges, 'custom_recurrence_date') ||
                                getFieldValue(task, localChanges, 'recurrence_date') ||
                                '';
                              setEditRecurrenceDate(dateValue ? String(dateValue) : '');
                              // Get month value for Yearly recurrence
                              const monthValue =
                                getFieldValue(task, localChanges, 'custom_recurrence_month') ||
                                getFieldValue(task, localChanges, 'recurrence_month') ||
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
                                !permissions.canEdit && 'cursor-default hover:bg-transparent',
                              )}
                              onClick={() => permissions.canEdit && setRecurrencePopoverOpen(true)}
                              disabled={!permissions.canEdit}
                            >
                              {(() => {
                                const recurring =
                                  getFieldValue(task, localChanges, 'custom_recurrence_period') ||
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
                                <Select.Root
                                  size='small'
                                  value={editRecurrencePeriod}
                                  onValueChange={(value) => {
                                    setEditRecurrencePeriod(value);
                                    if (value === 'One Time') {
                                      setEditRecurrenceDate('');
                                      setEditRecurrenceMonth('');
                                    } else if (value !== 'Yearly') {
                                      setEditRecurrenceMonth('');
                                    }
                                  }}
                                  disabled={!permissions.canEdit}
                                >
                                  <Select.Trigger className='w-full'>
                                    <Select.Value />
                                  </Select.Trigger>
                                  <Select.Content>
                                    {RECURRING_FREQUENCY_OPTIONS.map((option) => (
                                      <Select.Item key={option.value} value={option.value}>
                                        {option.label}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
                              </div>
                              {(editRecurrencePeriod === 'Monthly' ||
                                editRecurrencePeriod === 'Quarterly') && (
                                <div className='flex flex-col gap-1'>
                                  <Label.Root className='text-label-sm text-text-main-900 font-medium'>
                                    Monthly Recurring Date
                                  </Label.Root>
                                  <Select.Root
                                    size='small'
                                    value={editRecurrenceDate}
                                    onValueChange={setEditRecurrenceDate}
                                    disabled={!permissions.canEdit}
                                  >
                                    <Select.Trigger className='w-full'>
                                      <Select.Value placeholder='Select date' />
                                    </Select.Trigger>
                                    <Select.Content>
                                      {MONTHLY_RECURRING_DATE_OPTIONS.map((opt) => (
                                        <Select.Item key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </Select.Item>
                                      ))}
                                    </Select.Content>
                                  </Select.Root>
                                </div>
                              )}
                              {editRecurrencePeriod === 'Yearly' && (
                                <>
                                  <div className='flex flex-col gap-1'>
                                    <Label.Root className='text-label-sm text-text-main-900 font-medium'>
                                      Recurrence Date
                                    </Label.Root>
                                    <Select.Root
                                      size='small'
                                      value={editRecurrenceDate}
                                      onValueChange={setEditRecurrenceDate}
                                      disabled={!permissions.canEdit}
                                    >
                                      <Select.Trigger className='w-full'>
                                        <Select.Value placeholder='Select date' />
                                      </Select.Trigger>
                                      <Select.Content>
                                        {MONTHLY_RECURRING_DATE_OPTIONS.map((opt) => (
                                          <Select.Item key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </Select.Item>
                                        ))}
                                      </Select.Content>
                                    </Select.Root>
                                  </div>
                                  <div className='flex flex-col gap-1'>
                                    <Label.Root className='text-label-sm text-text-main-900 font-medium'>
                                      Recurrence Month
                                    </Label.Root>
                                    <Select.Root
                                      size='small'
                                      value={editRecurrenceMonth}
                                      onValueChange={setEditRecurrenceMonth}
                                      disabled={!permissions.canEdit}
                                    >
                                      <Select.Trigger className='w-full'>
                                        <Select.Value placeholder='Select month' />
                                      </Select.Trigger>
                                      <Select.Content>
                                        {MONTH_OPTIONS.map((month) => (
                                          <Select.Item key={month} value={month}>
                                            {month}
                                          </Select.Item>
                                        ))}
                                      </Select.Content>
                                    </Select.Root>
                                  </div>
                                </>
                              )}
                              {permissions.canEdit && (
                                <div className='flex gap-2 pt-2'>
                                  <Button.Root
                                    type='button'
                                    variant='neutral'
                                    mode='stroke'
                                    size='small'
                                    onClick={() => {
                                      const period =
                                        getFieldValue(
                                          task,
                                          localChanges,
                                          'custom_recurrence_period',
                                        ) ||
                                        getFieldValue(task, localChanges, 'recurrence_period') ||
                                        'One Time';
                                      const normalized =
                                        typeof period === 'string'
                                          ? period.charAt(0).toUpperCase() +
                                            period.slice(1).toLowerCase()
                                          : 'One Time';
                                      setEditRecurrencePeriod(
                                        RECURRING_FREQUENCY_OPTIONS.find(
                                          (o) => o.value.toLowerCase() === normalized.toLowerCase(),
                                        )?.value || 'One Time',
                                      );
                                      const dateValue =
                                        getFieldValue(
                                          task,
                                          localChanges,
                                          'custom_recurrence_date',
                                        ) ||
                                        getFieldValue(task, localChanges, 'recurrence_date') ||
                                        '';
                                      setEditRecurrenceDate(dateValue ? String(dateValue) : '');
                                      // Get month value for Yearly recurrence
                                      const monthValue =
                                        getFieldValue(
                                          task,
                                          localChanges,
                                          'custom_recurrence_month',
                                        ) ||
                                        getFieldValue(task, localChanges, 'recurrence_month') ||
                                        '';
                                      setEditRecurrenceMonth(monthValue ? String(monthValue) : '');
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
                                      // Build batch update payload with all recurrence fields
                                      const updates = {
                                        custom_recurrence_period: editRecurrencePeriod,
                                      };

                                      // Handle date and month based on period type
                                      if (
                                        editRecurrencePeriod === 'Monthly' ||
                                        editRecurrencePeriod === 'Quarterly'
                                      ) {
                                        // For Monthly/Quarterly: send custom_recurrence_date
                                        updates.custom_recurrence_date = editRecurrenceDate || '';
                                        // Clear month if it was set
                                        updates.custom_recurrence_month = '';
                                      } else if (editRecurrencePeriod === 'Yearly') {
                                        // For Yearly: send both custom_recurrence_date and custom_recurrence_month
                                        updates.custom_recurrence_date = editRecurrenceDate || '';
                                        updates.custom_recurrence_month = editRecurrenceMonth || '';
                                      } else if (editRecurrencePeriod === 'One Time') {
                                        // Clear all recurrence fields for One Time
                                        updates.custom_recurrence_date = '';
                                        updates.custom_recurrence_month = '';
                                      }

                                      // Send all updates in a single API call
                                      await handleRecurrenceBatchUpdate(updates);
                                      setRecurrencePopoverOpen(false);
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
                              )}
                            </div>
                          </Popover.Content>
                        </Popover.Root>
                      </FieldRow>
                    )}
                  </div>

                  {/* Description Section */}
                  <div className='flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <RiStickyNoteLine size={20} className='text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Description</span>
                    </div>
                    {permissions.canEdit ? (
                      <Textarea.Root
                        variant='borderless'
                        simple
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
                        disabled={!permissions.canEdit}
                        className='w-full field-sizing-content'
                        placeholder='Enter description'
                      />
                    ) : (
                      <p className='text-paragraph-sm text-text-main-900'>
                        {getFieldValue(task, localChanges, 'description') ||
                          'No description provided'}
                      </p>
                    )}
                  </div>

                  {/* Tags Section */}
                  <div className='flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <RiPriceTag3Line size={20} className='text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Tags</span>
                    </div>
                    {taskTags.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {taskTags.map((tag, index) => {
                          const tagDisplay =
                            typeof tag === 'string' ? tag : tag.label || tag.name || tag;
                          return (
                            <Tag.Root key={index} variant='stroke'>
                              <span className='text-label-xs text-text-sub-600'>{tagDisplay}</span>
                              {permissions.canEdit && (
                                <Tag.DismissButton
                                  onClick={() => handleRemoveTag(index)}
                                  aria-label={`Remove ${tagDisplay}`}
                                />
                              )}
                            </Tag.Root>
                          );
                        })}
                      </div>
                    )}
                    {permissions.canEdit && (
                      <>
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
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setTagInputVisible(false);
                                      setNewTagValue('');
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
                              className='bg-error-lighter text-error-base shrink-0 w-8 h-8 p-[6px]'
                              onClick={() => {
                                setTagInputVisible(false);
                                setNewTagValue('');
                              }}
                              aria-label='Cancel adding tag'
                            >
                              <Button.Icon as={RiCloseLine} className='size-5' />
                            </Button.Root>
                            <Button.Root
                              variant='neutral'
                              mode='ghost'
                              size='xsmall'
                              className='bg-primary-lighter text-primary-base shrink-0 w-8 h-8 p-[6px]'
                              onClick={handleAddTag}
                              aria-label='Add tag'
                            >
                              <Button.Icon as={RiCheckLine} className='size-5' />
                            </Button.Root>
                          </div>
                        ) : (
                          <LinkButton.Root
                            variant='primary'
                            size='small'
                            underline
                            onClick={() => setTagInputVisible(true)}
                            className='w-fit'
                          >
                            <LinkButton.Icon as={RiAddLine} />
                            <span>Add New Tag</span>
                          </LinkButton.Root>
                        )}
                      </>
                    )}
                    {!permissions.canEdit && taskTags.length === 0 && (
                      <p className='text-paragraph-sm text-text-soft-400'>No tags</p>
                    )}
                  </div>

                  {/* Attachments Section */}
                  <div className='flex flex-col gap-2 pb-6'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <RiAttachment2 className='size-5 text-text-sub-500' />
                        <span className='label-small text-text-sub-500'>Attachments</span>
                      </div>
                      {permissions.canEdit && (
                        <>
                          <input
                            ref={fileInputRef}
                            type='file'
                            multiple
                            className='hidden'
                            onChange={handleFileInputChange}
                            accept='*/*'
                            disabled={isUploading}
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
                            <Button.Icon
                              as={isUploading ? RiUploadCloud2Line : RiUploadLine}
                              className={isUploading ? 'animate-pulse p-0.5' : 'p-0.5'}
                            />
                            <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
                          </Button.Root>
                        </>
                      )}
                    </div>
                    {uploadError && (
                      <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                        <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
                      </div>
                    )}
                    {attachments.length > 0 && (
                      <AttachmentList
                        attachments={attachments}
                        onRemove={
                          permissions.canEdit
                            ? (attachmentId, childRowId) => {
                                // Use childRowId if provided, otherwise find it from attachments
                                if (childRowId) {
                                  handleRemoveAttachment(attachmentId, childRowId);
                                } else {
                                  const attachment = attachments.find(
                                    (att) =>
                                      att.id === attachmentId || att.childRowId === attachmentId,
                                  );
                                  const foundChildRowId =
                                    attachment?.childRowId || attachment?.name || attachmentId;
                                  handleRemoveAttachment(attachmentId, foundChildRowId);
                                }
                              }
                            : undefined
                        }
                        disabled={isUploading}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel - Comments */}
              <div className='flex flex-1 flex-col h-full overflow-y-auto'>
                <div className='border-b border-stroke-soft-200 px-6 py-3.5'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-text-sub-500' />
                    <span className='label-small text-text-sub-500'>Comments</span>
                  </div>
                </div>
                {task && (
                  <TaskComments
                    taskName={task.name}
                    loading={commentsLoading}
                    onRefreshData={() => {
                      // Refresh using stable task_id (subject can change after edits)
                      if (task.name) {
                        dispatch(
                          fetchTaskDetail({
                            task_id: task.name,
                            task_type: taskType,
                          }),
                        );
                      }
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className='flex items-center justify-center h-full'>
              <p className='text-paragraph-sm text-text-sub-500'>Task not found</p>
            </div>
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ClientTaskViewDrawer;
