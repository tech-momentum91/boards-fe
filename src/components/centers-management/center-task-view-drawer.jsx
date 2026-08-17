import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RiCheckLine,
  RiAddLine,
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
import ClientTaskViewDrawerSkeleton from '@/components/clients-management/client-task-view-drawer-skeleton';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import {
  fetchCenterTaskDetail,
  fetchCenterTaskComments,
  updateCenterTaskInList,
  updateCenterTaskField,
} from '@/redux/centerSlice';
import { removeCrmTaskAttachment } from '@/redux/settingSlice';
import apiClient from '@/api/axios';
import { formatDateWithOrdinal, getMinCustomNextUpdateDate, parseToDate } from '@/utils/date-utils';
import { isCustomNextUpdateAfterDueDate } from '@/schemas/task-schema';
import { getFileExtension } from '@/utils/file-utils';
import {
  getPriorityColor,
  getStatusColor,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '@/components/clients-management/constants';
import FieldRow from '@/components/ui/field-row';
import * as Tag from '@/components/ui/tag';
import { cn } from '@/lib/utils';
import AttachmentList from '@/components/ui/attachment-list';
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';
import { useDispatch, useSelector } from 'react-redux';
import CenterTaskComments from '@/components/centers-management/center-task-comments';

const IMAGE_EXTENSIONS = new Set(['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const normalizeTaskAttachments = (task) => {
  if (!task) return [];
  const src = task?.custom_attachment || [];
  if (!Array.isArray(src)) return [];
  return src
    .map((attachment, index) => {
      const fileUrl = attachment?.attachment || '';
      if (!fileUrl) return null;
      let fileName =
        attachment?.file_name || attachment?.filename || attachment?.file || attachment?.title;
      if (!fileName && fileUrl) {
        const lastPart = (fileUrl.split('/').at(-1) || '').split('?')[0];
        fileName = lastPart.includes('_') ? lastPart.split('_').slice(1).join('_') : lastPart;
      }
      if (!fileName) fileName = attachment?.name || `attachment-${index}`;
      const extension = getFileExtension(fileName) || getFileExtension(fileUrl);
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
        childRowId: attachment?.name || attachment?.id,
      };
    })
    .filter(Boolean);
};

const getFieldValue = (task, localChanges, fieldName) => {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }
  if (task?.[fieldName] !== undefined && task?.[fieldName] !== null && task?.[fieldName] !== '') {
    return task[fieldName];
  }
  return '';
};

const CenterTaskViewDrawer = ({
  isOpen = false,
  onClose,
  taskId = null,
  taskType = 'Center Preboarding',
  tasks = [],
  onTaskChange,
  permissions = { canEdit: true },
}) => {
  const dispatch = useDispatch();
  const taskDetail = useSelector((state) => state.center.taskDetail);
  const taskComments = useSelector((state) => state.center.taskComments);
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

  useEffect(() => {
    if (!taskDetail.isLoading && task) setHasLoadedInitialData(true);
  }, [taskDetail.isLoading, task]);

  useEffect(() => {
    if (!taskComments.isLoading && taskComments.data) setHasLoadedCommentsInitial(true);
  }, [taskComments.isLoading, taskComments.data]);

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

  const commentsLoading = useMemo(() => {
    if (!isOpen || !taskId) return false;
    if (!hasLoadedCommentsInitial) return taskComments.isLoading;
    return false;
  }, [isOpen, taskId, taskComments.isLoading, hasLoadedCommentsInitial]);

  const isLoading = useMemo(() => {
    return isOpen && taskId && !hasLoadedInitialData && taskDetail.isLoading;
  }, [isOpen, taskId, hasLoadedInitialData, taskDetail.isLoading]);

  useEffect(() => {
    if (!isOpen || !taskId) {
      lastFetchedTaskIdRef.current = null;
      fetchPromiseRef.current = null;
      return;
    }

    const currentTask = tasks.find((t) => t.name === taskId || t.id === taskId);
    if (!currentTask) return;

    if (lastFetchedTaskIdRef.current !== taskId && !fetchPromiseRef.current) {
      const currentTaskId = taskId;
      lastFetchedTaskIdRef.current = currentTaskId;
      const detailPromise = dispatch(
        fetchCenterTaskDetail({
          task_id: currentTask.name || currentTask.id || taskId,
          task_type: taskType,
        }),
      );
      fetchPromiseRef.current = detailPromise;
      detailPromise.finally(() => {
        if (lastFetchedTaskIdRef.current === currentTaskId) fetchPromiseRef.current = null;
      });
    }
  }, [isOpen, taskId, taskType, tasks, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    if (task?.name) dispatch(fetchCenterTaskComments({ taskName: task.name }));
  }, [isOpen, task?.name, dispatch]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setIsDrawerFullyOpen(true), 300);
      return () => clearTimeout(t);
    }
    setIsDrawerFullyOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setLocalChanges({});
      setUploadError('');
      setDragActive(false);
      setTagInputVisible(false);
      setNewTagValue('');
      return;
    }
    setLocalChanges({});
    setUploadError('');
    setDragActive(false);
    setTagInputVisible(false);
    setNewTagValue('');
  }, [isOpen, taskId, setDragActive]);

  const currentTaskIndex = useMemo(() => {
    if (!taskId || !tasks?.length) return -1;
    return tasks.findIndex((t) => t.name === taskId || t.id === taskId);
  }, [taskId, tasks]);
  const hasPrevious = currentTaskIndex > 0;
  const hasNext = currentTaskIndex >= 0 && currentTaskIndex < tasks.length - 1;

  const handlePrevious = useCallback(() => {
    if (!hasPrevious) return;
    const prev = tasks[currentTaskIndex - 1];
    onTaskChange?.(prev.name || prev.id, taskType);
  }, [hasPrevious, tasks, currentTaskIndex, onTaskChange, taskType]);

  const handleNext = useCallback(() => {
    if (!hasNext) return;
    const next = tasks[currentTaskIndex + 1];
    onTaskChange?.(next.name || next.id, taskType);
  }, [hasNext, tasks, currentTaskIndex, onTaskChange, taskType]);

  const taskTitle = useMemo(
    () => getFieldValue(task, localChanges, 'subject') || '',
    [task, localChanges],
  );
  const priority = useMemo(
    () => getFieldValue(task, localChanges, 'priority'),
    [task, localChanges],
  );
  const status = useMemo(() => getFieldValue(task, localChanges, 'status'), [task, localChanges]);
  const attachments = useMemo(() => normalizeTaskAttachments(task), [task]);

  useEffect(() => setTitleError(''), [taskTitle]);

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
      setLocalChanges((p) => ({ ...p, [fieldName]: value }));

      try {
        if (fieldName === 'assignees') {
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
            updateCenterTaskField({
              taskName: currentTaskId,
              fieldName: 'assignees',
              value: normalizedAssignees,
              currentAssignees: task?.assignees ?? [],
            }),
          ).unwrap();
        } else {
          const payload = { task_id: currentTaskId, [fieldName]: value };
          if (fieldName === 'tags')
            payload.tags = Array.isArray(value) ? value : value ? [value] : [];
          await apiClient.post('/method/devx.dev_x.api.document_task.update_ref_doc_task', payload);
        }

        if (currentTaskId) {
          dispatch(fetchCenterTaskDetail({ task_id: currentTaskId, task_type: taskType })).then(
            (res) => {
              if (fetchCenterTaskDetail.fulfilled.match(res)) {
                dispatch(updateCenterTaskInList({ taskData: res.payload, taskType }));
              }
            },
          );
          dispatch(fetchCenterTaskComments({ taskName: currentTaskId }));
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task field. Please try again.');
      }
    },
    [dispatch, task, taskId, taskType, localChanges],
  );

  const dueDateEffective = useMemo(
    () =>
      String(getFieldValue(task, localChanges, 'exp_end_date') || '')
        .trim()
        .split('T')[0],
    [task, localChanges],
  );

  const customNextUpdateDateValue = useMemo(() => {
    if (Object.prototype.hasOwnProperty.call(localChanges, 'custom_next_update_date')) {
      return String(localChanges.custom_next_update_date ?? '')
        .trim()
        .split('T')[0];
    }
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

  const handleRemoveAttachment = useCallback(
    async (_attachmentId, childRowId) => {
      if (!childRowId) return showErrorToast('Attachment ID not available');
      if (!permissions.canEdit)
        return showErrorToast('You do not have permission to delete attachments');
      try {
        await dispatch(
          removeCrmTaskAttachment({ child_row_id: childRowId, child_doctype: 'Task Attachment' }),
        ).unwrap();
        const refreshTaskId = task?.name || taskId;
        if (refreshTaskId) {
          await dispatch(
            fetchCenterTaskDetail({ task_id: refreshTaskId, task_type: taskType }),
          ).unwrap();
        }
        showSuccessToast('Attachment removed successfully');
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to remove attachment');
      }
    },
    [dispatch, permissions.canEdit, task, taskId, taskType],
  );

  const handleFileUpload = useCallback(
    async (files) => {
      if (!taskId || !permissions.canEdit) return;
      const fileArray = [...files];
      if (fileArray.length === 0) return;

      const invalidFiles = fileArray.filter((f) => f.size > MAX_FILE_SIZE).map((f) => f.name);
      if (invalidFiles.length > 0) {
        const msg = `The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`;
        setUploadError(msg);
        showErrorToast(msg);
        return;
      }

      setIsUploading(true);
      setUploadError('');
      try {
        const currentTaskId = task?.name || taskId;
        const formData = new FormData();
        formData.append('task_id', currentTaskId);
        fileArray.forEach((file) => formData.append('attachment_file', file));
        await apiClient.post(
          '/method/devx.dev_x.api.document_task.upload_task_attachment',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
        await dispatch(fetchCenterTaskDetail({ task_id: currentTaskId, task_type: taskType }));
        await dispatch(fetchCenterTaskComments({ taskName: currentTaskId }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        showSuccessToast('Attachment uploaded successfully');
      } catch (error) {
        setUploadError('Failed to upload file. Please try again.');
        showErrorToast(error, { defaultMessage: 'Failed to upload file. Please try again.' });
      } finally {
        setIsUploading(false);
      }
    },
    [taskId, task, permissions.canEdit, dispatch, taskType],
  );

  useEffect(() => {
    onFilesDropRef.current = handleFileUpload;
    return () => {
      onFilesDropRef.current = null;
    };
  }, [handleFileUpload]);

  const handleUploadButtonClick = useCallback(() => fileInputRef.current?.click(), []);
  const handleFileInputChange = useCallback(
    (event) => {
      const { files } = event.target;
      if (files?.length) handleFileUpload(files);
    },
    [handleFileUpload],
  );

  const taskTags = useMemo(() => {
    const tagsValue = getFieldValue(task, localChanges, 'tags') || '';
    if (!tagsValue) return [];
    if (Array.isArray(tagsValue)) return tagsValue;
    if (typeof tagsValue === 'string')
      return tagsValue
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    return [];
  }, [task, localChanges]);

  const handleAddTag = useCallback(() => {
    if (!newTagValue.trim()) return;
    const trimmed = newTagValue.trim();
    const existing = taskTags.map((t) => String(t).toLowerCase());
    if (existing.includes(trimmed.toLowerCase())) {
      setNewTagValue('');
      setTagInputVisible(false);
      return;
    }
    handleFieldChange('tags', [...taskTags, trimmed]);
    setNewTagValue('');
    setTagInputVisible(false);
  }, [newTagValue, taskTags, handleFieldChange]);

  const handleRemoveTag = useCallback(
    (index) => {
      const next = taskTags.filter((_, idx) => idx !== index);
      handleFieldChange('tags', next.length > 0 ? next : '');
    },
    [taskTags, handleFieldChange],
  );

  if (!isOpen) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={onClose}>
      <Drawer.Content className='max-w-[1200px]'>
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
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  onClick={onClose}
                  className='shrink-0'
                >
                  <Button.Icon as={RiCloseLine} className='shrink-0' />
                </Button.Root>
              </>
            )}
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
          {isLoading || !task || !isDrawerFullyOpen ? (
            <ClientTaskViewDrawerSkeleton />
          ) : taskDetail.error ? (
            <div className='flex items-center justify-center h-full'>
              <p className='text-paragraph-sm text-error-base'>{taskDetail.error}</p>
            </div>
          ) : (
            <div className='flex h-full'>
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
                {dragActive && (
                  <>
                    <div
                      className='absolute top-0 left-0 right-0 z-50 bg-information-lighter/80 backdrop-blur-sm border-2 border-dashed border-information-base pointer-events-none'
                      style={{ height: overlayHeight, minHeight: '100%' }}
                    />
                    <div
                      className='absolute left-0 right-0 z-50 flex items-center justify-center pointer-events-none'
                      style={{ top: messageTop, transform: 'translateY(-50%)' }}
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
                  <div className='flex flex-col gap-1'>
                    <Textarea.Root
                      key={`${task?.name || taskId || 'title'}-${taskTitle || ''}`}
                      variant='borderless'
                      simple
                      defaultValue={taskTitle || ''}
                      onChange={() => titleError && setTitleError('')}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (!value) return setTitleError('Title is required');
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

                  <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                    <FieldRow icon={RiPriceTag3Line} label='Status' editable={permissions.canEdit}>
                      <Select.Root
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
                    </FieldRow>

                    <FieldRow icon={RiUserLine} label='Assignee' editable={permissions.canEdit}>
                      <AssigneeMultiSelect
                        value={(() => {
                          const value = getFieldValue(task, localChanges, 'assignees');
                          return Array.isArray(value) ? value : value ? [value] : [];
                        })()}
                        onChange={(values) =>
                          setLocalChanges((p) => ({
                            ...p,
                            assignees: values.length > 0 ? values : '',
                          }))
                        }
                        onBlur={(values) =>
                          handleFieldChange('assignees', values?.length ? values : '')
                        }
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
                        const dateValue = dueDate ? parseToDate(dueDate) : undefined;
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
                      <Select.Root
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
                    </FieldRow>
                  </div>

                  <div className='flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <RiStickyNoteLine size={20} className='text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Description</span>
                    </div>
                    <Textarea.Root
                      variant='borderless'
                      simple
                      value={getFieldValue(task, localChanges, 'description') || ''}
                      onChange={(e) =>
                        setLocalChanges((p) => ({ ...p, description: e.target.value }))
                      }
                      onBlur={(e) => handleFieldChange('description', e.target.value.trim())}
                      disabled={!permissions.canEdit}
                      className='w-full field-sizing-content'
                      placeholder='Enter description'
                    />
                  </div>

                  <div className='flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <RiPriceTag3Line size={20} className='text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Tags</span>
                    </div>
                    {taskTags.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {taskTags.map((tag, idx) => {
                          const display =
                            typeof tag === 'string' ? tag : tag.label || tag.name || tag;
                          return (
                            <Tag.Root key={idx} variant='stroke'>
                              <span className='text-label-xs text-text-sub-600'>{display}</span>
                              {permissions.canEdit && (
                                <Tag.DismissButton
                                  onClick={() => handleRemoveTag(idx)}
                                  aria-label={`Remove ${display}`}
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
                  </div>

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
                              className='p-0.5'
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
                            ? (attachmentId, childRowId) =>
                                handleRemoveAttachment(attachmentId, childRowId)
                            : undefined
                        }
                        disabled={isUploading}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className='flex flex-1 flex-col h-full overflow-y-auto'>
                <div className='border-b border-stroke-soft-200 px-6 py-3.5'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-text-sub-500' />
                    <span className='label-small text-text-sub-500'>Comments</span>
                  </div>
                </div>
                {task && (
                  <CenterTaskComments
                    taskName={task.name}
                    loading={commentsLoading}
                    onRefreshData={() => {
                      if (task.name && taskType) {
                        dispatch(
                          fetchCenterTaskDetail({ task_id: task.name, task_type: taskType }),
                        );
                      }
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CenterTaskViewDrawer;
