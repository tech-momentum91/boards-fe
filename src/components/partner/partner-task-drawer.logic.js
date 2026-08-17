import { useRef, useCallback, useMemo } from 'react';
import { getFileExtension } from '@/utils/file-utils';
import { normalizeTaskAssigneeEntry } from '@/utils/task-utils';
import {
  IMAGE_EXTENSIONS,
  normalizeTaskAttachments,
  getFieldValue,
  MAX_FILE_SIZE,
} from '@/components/client-onboarding/task-view-drawer-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { isCustomNextUpdateAfterDueDate } from '@/schemas/task-schema';
import { removeCrmTaskAttachment } from '@/redux/settingSlice';
import { fetchTaskComments } from '@/redux/clientDetailSlice';
import { updatePartnerTaskField, updateTaskAttachment } from '@/redux/partnerSlice';

// —— Attachment preview helpers ——

export function getAttachmentPreviewUrl(attachment) {
  if (!attachment) return null;

  if (attachment.isNew && attachment.file instanceof File) {
    return URL.createObjectURL(attachment.file);
  }

  const fileUrl =
    attachment.fileUrl ||
    attachment.file_url ||
    attachment.url ||
    attachment.file ||
    attachment.file_path ||
    attachment.attachment?.file_url ||
    attachment.attachment?.url ||
    (typeof attachment.attachment === 'string' ? attachment.attachment : null);

  if (!fileUrl) return null;

  if (fileUrl.startsWith('/')) {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    return `${apiUrl}${fileUrl}`;
  }
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return fileUrl;
}

export function isImageAttachment(attachment) {
  if (!attachment) return false;
  return Boolean(attachment.isImage);
}

// —— Tag helpers (drawer UI) ——

export function tagsToStrings(v) {
  if (Array.isArray(v)) {
    return v
      .map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.label || tag))
      .filter(Boolean);
  }
  if (v) {
    const one = typeof v === 'string' ? v : v?.name || v?.label || v;
    return one ? [one] : [];
  }
  return [];
}

function mapDrawerUiFieldToApiField(fieldName) {
  if (fieldName === 'task_name') return 'subject';
  if (fieldName === 'due_date') return 'exp_end_date';
  if (fieldName === 'assigned_to') return 'assignees';
  return fieldName;
}

export function usePartnerTaskDrawerDerived({ task, localChanges, newAttachments }) {
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

  const dueDate = useMemo(() => {
    const fromChanges = getFieldValue(task, localChanges, 'due_date');
    if (fromChanges != null && fromChanges !== '') return String(fromChanges).trim().split('T')[0];
    const exp = task?.exp_end_date ?? task?.due_date ?? task?.custom_due_date ?? '';
    return exp ? String(exp).trim().split('T')[0] : '';
  }, [task, localChanges]);

  const customNextUpdateDate = useMemo(() => {
    const fromLocal = getFieldValue(task, localChanges, 'custom_next_update_date');
    if (fromLocal != null && String(fromLocal).trim() !== '') {
      return String(fromLocal).trim().split('T')[0];
    }
    const raw = task?.custom_next_update_date;
    if (raw == null || raw === '') return '';
    return String(raw).trim().split('T')[0];
  }, [task, localChanges]);

  const assignedTo = useMemo(() => {
    const value = getFieldValue(task, localChanges, 'assigned_to');
    if (value !== undefined && value !== null && value !== '') {
      return Array.isArray(value) ? value : [value];
    }
    if (task?.assignee && Array.isArray(task.assignee) && task.assignee.length > 0) {
      return task.assignee.map((a) => normalizeTaskAssigneeEntry(a)).filter(Boolean);
    }
    if (task?.assignees) {
      const raw = task.assignees;
      const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return list.map((a) => normalizeTaskAssigneeEntry(a)).filter(Boolean);
    }
    return [];
  }, [task, localChanges]);

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
    if (localChanges.tags !== undefined && localChanges.tags !== null) {
      const value = localChanges.tags;
      if (Array.isArray(value)) return value;
      if (value) return [value];
      return [];
    }

    const taskValue = task?.tags;
    if (Array.isArray(taskValue) && taskValue.length > 0) return taskValue;
    if (taskValue) return [taskValue];

    return [];
  }, [task, localChanges]);

  const attachments = useMemo(() => {
    const existingAttachments = normalizeTaskAttachments(task);
    const formattedNewAttachments = newAttachments.map((file) => ({
      id: file.id,
      fileName: file.name,
      fileUrl: null,
      size: file.size,
      createdAt: file.uploadedAt || new Date().toISOString(),
      extension: getFileExtension(file.name),
      isImage: IMAGE_EXTENSIONS.has(getFileExtension(file.name)),
      isNew: true,
      file: file.file,
    }));

    return [...existingAttachments, ...formattedNewAttachments];
  }, [task, newAttachments]);

  return {
    taskTitle,
    priority,
    status,
    dueDate,
    customNextUpdateDate,
    assignedTo,
    assigneeDisplayValue,
    tags,
    attachments,
  };
}

export function usePartnerTaskDrawerTaskUpdates({
  task,
  localChanges,
  setLocalChanges,
  taskType,
  onRefresh,
  dispatch,
}) {
  const updateQueueRef = useRef(Promise.resolve());

  const updateTaskBatchViaAPI = useCallback(
    async (taskId, updates) => {
      if (!task || !taskId) return;

      try {
        const entries = Object.entries(updates || {}).filter(([k]) => k !== 'newAttachments');

        for (const [uiField, rawValue] of entries) {
          const apiField = mapDrawerUiFieldToApiField(uiField);

          if (apiField === 'assignees') {
            const currentAssigneesRaw =
              task?.assignees ?? task?.assigned_to ?? task?.assignee ?? [];
            const normalizedAssignees = Array.isArray(rawValue)
              ? rawValue
                  .map((v) => (typeof v === 'string' ? v : v.value || v.email || v.name || v))
                  .filter(Boolean)
              : rawValue
                ? [
                    typeof rawValue === 'string'
                      ? rawValue
                      : rawValue.value || rawValue.email || rawValue.name || rawValue,
                  ].filter(Boolean)
                : [];

            await dispatch(
              updatePartnerTaskField({
                taskName: taskId,
                fieldName: 'assignees',
                value: normalizedAssignees,
                currentAssignees: currentAssigneesRaw,
              }),
            ).unwrap();
            continue;
          }

          let apiValue = rawValue;
          if (apiField === 'tags') {
            apiValue = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
          }

          await dispatch(
            updatePartnerTaskField({
              taskName: taskId,
              fieldName: apiField,
              value: apiValue,
            }),
          ).unwrap();
        }

        if (onRefresh) {
          const subjectForRefresh =
            task?.task_name || task?.subject || updates?.task_name || updates?.subject || '';
          await onRefresh({
            task_id: taskId,
            subject: subjectForRefresh,
            task_type: taskType,
          });
        }

        if (taskId) {
          dispatch(fetchTaskComments({ taskName: taskId }));
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task');
        throw error;
      }
    },
    [task, taskType, onRefresh, dispatch],
  );

  const updateTaskViaAPI = useCallback(
    async (taskId, fieldName, value) => updateTaskBatchViaAPI(taskId, { [fieldName]: value }),
    [updateTaskBatchViaAPI],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      if (!task) return;

      const taskId = task?.name || task?.task_id || task?.id;
      if (!taskId) {
        showErrorToast('Task ID not available. Please reopen the task.');
        return;
      }

      if (fieldName === 'custom_next_update_date') {
        const s = value != null ? String(value).trim() : '';
        const dueStr = String(
          getFieldValue(task, localChanges, 'due_date') ||
            task?.exp_end_date ||
            task?.due_date ||
            '',
        )
          .trim()
          .split('T')[0];
        if (s && !isCustomNextUpdateAfterDueDate(dueStr, s)) {
          showErrorToast('Next update date must be after the due date');
          return;
        }
      }

      setLocalChanges((previous) => ({
        ...previous,
        [fieldName]: value,
      }));

      updateQueueRef.current = updateQueueRef.current
        .catch(() => {})
        .then(() => updateTaskViaAPI(taskId, fieldName, value));
    },
    [updateTaskViaAPI, task, localChanges, setLocalChanges],
  );

  return { handleFieldChange };
}

export function usePartnerTaskDrawerAttachments({
  task,
  dispatch,
  onRefresh,
  newAttachments,
  setNewAttachments,
  setUploadError,
  setIsUploading,
  setDragActive = () => {},
  fileInputRef,
  setImagePreviewErrors,
}) {
  const getPreviewUrl = useCallback((attachment) => getAttachmentPreviewUrl(attachment), []);

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
        const taskId = task?.name || task?.task_id || task?.id;
        if (!taskId) {
          throw new Error('Task ID not available');
        }

        const failedUploads = [];
        for (const file of validFiles) {
          try {
            await dispatch(
              updateTaskAttachment({
                task_id: taskId,
                attachment_file: file,
              }),
            ).unwrap();
          } catch (error) {
            const errorMessage = extractErrorMessage(error);
            failedUploads.push({ fileName: file.name, error: errorMessage });
          }
        }

        if (failedUploads.length > 0) {
          const failedNames = failedUploads.map((f) => f.fileName).join(', ');
          const errorMessage =
            failedUploads.length === validFiles.length
              ? `Failed to upload all files: ${failedNames}`
              : `Failed to upload some files: ${failedNames}`;
          setUploadError(errorMessage);
          showErrorToast(errorMessage);

          if (failedUploads.length === validFiles.length) {
            setIsUploading(false);
            return;
          }
        }

        if (onRefresh) {
          try {
            await onRefresh({ task_id: taskId });
          } catch (error) {
            console.error('Failed to refresh task detail:', error);
          }
        }

        dispatch(fetchTaskComments({ taskName: taskId }));

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        if (failedUploads.length < validFiles.length) {
          const successCount = validFiles.length - failedUploads.length;
          showSuccessToast(
            successCount === 1
              ? 'File uploaded successfully'
              : `${successCount} file(s) uploaded successfully`,
          );
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        setUploadError(errorMessage);
        showErrorToast(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [task, dispatch, onRefresh, setUploadError, setIsUploading, fileInputRef],
  );

  const handleRemoveAttachment = useCallback(
    async (attachmentId, childRowId) => {
      const isNewAttachment = newAttachments.some((att) => att.id === attachmentId);

      if (isNewAttachment) {
        setNewAttachments((previous) => {
          const fileToRemove = previous.find((file) => file.id === attachmentId);
          if (fileToRemove?.file instanceof File) {
            const url = URL.createObjectURL(fileToRemove.file);
            if (url) URL.revokeObjectURL(url);
          }
          return previous.filter((file) => file.id !== attachmentId);
        });

        setImagePreviewErrors((previous) => {
          const newState = { ...previous };
          delete newState[attachmentId];
          return newState;
        });
      } else {
        if (!childRowId) {
          showErrorToast('Attachment ID not available');
          return;
        }

        try {
          await dispatch(
            removeCrmTaskAttachment({
              child_row_id: childRowId,
              child_doctype: 'Task Attachment',
            }),
          ).unwrap();

          const refreshId = task?.name || task?.task_id || task?.id;
          if (refreshId && onRefresh) {
            try {
              await onRefresh({ task_id: refreshId });
            } catch (error) {
              console.error('Failed to refresh task detail:', error);
            }
          }
          if (refreshId) {
            dispatch(fetchTaskComments({ taskName: refreshId }));
          }
          showSuccessToast('Attachment removed successfully');
        } catch (error) {
          const errorMessage = extractErrorMessage(error);
          showErrorToast(errorMessage || 'Failed to remove attachment');
        }
      }
    },
    [newAttachments, dispatch, task, onRefresh, setNewAttachments, setImagePreviewErrors],
  );

  const handleAttachmentDownload = useCallback(
    async (attachment) => {
      if (!attachment) return;

      const fileUrl = getPreviewUrl(attachment);

      if (!fileUrl) {
        showErrorToast('File URL not available');
        return;
      }

      if (attachment.isNew && attachment.file instanceof File) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = attachment.fileName || attachment.file.name || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      try {
        const response = await fetch(fileUrl, { method: 'GET', headers: {} });

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

  const handleAttachmentView = useCallback(
    (attachment, event) => {
      if (event?.target?.closest('.attachment-actions')) {
        return;
      }

      if (!attachment) return;

      const fileUrl = getPreviewUrl(attachment);

      if (!fileUrl) {
        showErrorToast('File URL not available');
        return;
      }

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

  const isImageFile = useCallback((attachment) => isImageAttachment(attachment), []);

  const handleImageError = useCallback(
    (attachmentId) => {
      setImagePreviewErrors((previous) => ({ ...previous, [attachmentId]: true }));
    },
    [setImagePreviewErrors],
  );

  const handleFileInputChange = useCallback(
    (event) => {
      const { files } = event.target;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload],
  );

  const handleUploadButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [fileInputRef]);

  const handleDrag = useCallback(
    (e) => {
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
    },
    [setDragActive],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload, setDragActive],
  );

  return {
    getPreviewUrl,
    handleFileUpload,
    handleRemoveAttachment,
    handleAttachmentDownload,
    handleAttachmentView,
    isImageFile,
    handleImageError,
    handleFileInputChange,
    handleUploadButtonClick,
    handleDrag,
    handleDrop,
  };
}
