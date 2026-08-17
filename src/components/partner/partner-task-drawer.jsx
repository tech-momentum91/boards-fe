import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiStickyNoteLine,
  RiUploadCloud2Line,
  RiUploadLine,
  RiAttachment2,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Textarea from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getFieldValue } from '@/components/client-onboarding/task-view-drawer-utils';
import { getRolesWithDescription } from '@/redux/settingSlice';
import { useDispatch } from 'react-redux';
import TaskComments from '@/components/clients-management/task-comments';
import AttachmentList from '@/components/ui/attachment-list';
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';

import {
  usePartnerTaskDrawerDerived,
  usePartnerTaskDrawerTaskUpdates,
  usePartnerTaskDrawerAttachments,
  getAttachmentPreviewUrl,
} from '@/components/partner/partner-task-drawer.logic';
import { isCustomNextUpdateAfterDueDate } from '@/schemas/task-schema';
import {
  PartnerTaskDrawerDragOverlay,
  PartnerTaskDrawerFormFields,
  PartnerTaskDrawerTagsSection,
} from '@/components/partner/partner-task-drawer.views';

/**
 * Partner-scoped CRM task drawer — document_task APIs via `updatePartnerTaskField` (same pattern as vendor onboarding).
 * Layout mirrors the client task view drawer (details left, comments right); assignee stays multi-select when options are provided.
 */
const TaskViewDrawerPartnerCrm = ({
  isOpen = false,
  onClose,
  task = null,
  onFieldUpdate: _onFieldUpdate,
  onRefresh,
  taskType = 'Partner Onboarding',
  tasks = [],
  onTaskChange,
  assigneeSelectItems,
  assigneeSelectLoading = false,
}) => {
  const [localChanges, setLocalChanges] = useState({});
  const [titleError, setTitleError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [newAttachments, setNewAttachments] = useState([]);
  const [, setImagePreviewErrors] = useState({});
  const [roles, setRoles] = useState([]);

  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const onFilesDropRef = useRef(null);

  const { dragActive, overlayHeight, messageTop, handleDrag, handleDrop } = useDragAndDrop({
    containerRef: leftPanelRef,
    onFilesDrop: (files) => onFilesDropRef.current?.(files),
    triggerDependency: task,
  });

  const dispatch = useDispatch();
  const taskDocId = task?.name || task?.task_id || task?.id;

  const {
    taskTitle,
    priority,
    status,
    dueDate,
    customNextUpdateDate,
    assignedTo,
    assigneeDisplayValue,
    tags,
    attachments,
  } = usePartnerTaskDrawerDerived({ task, localChanges, newAttachments });

  const { handleFieldChange } = usePartnerTaskDrawerTaskUpdates({
    task,
    localChanges,
    setLocalChanges,
    taskType,
    onRefresh,
    dispatch,
  });

  useEffect(() => {
    if (!isOpen || !task) return;
    const next = String(customNextUpdateDate ?? '').trim();
    const due = String(dueDate ?? '').trim();
    if (!next || !due) return;
    if (isCustomNextUpdateAfterDueDate(due, next)) return;
    handleFieldChange('custom_next_update_date', '');
  }, [isOpen, task, dueDate, customNextUpdateDate, handleFieldChange]);

  const {
    handleFileUpload,
    handleRemoveAttachment,
    handleAttachmentDownload,
    handleFileInputChange,
    handleUploadButtonClick,
  } = usePartnerTaskDrawerAttachments({
    task,
    dispatch,
    onRefresh,
    newAttachments,
    setNewAttachments,
    setUploadError,
    setIsUploading,
    fileInputRef,
    setImagePreviewErrors,
  });

  useEffect(() => {
    onFilesDropRef.current = handleFileUpload;
    return () => {
      onFilesDropRef.current = null;
    };
  }, [handleFileUpload]);

  useEffect(() => {
    if (!isOpen) {
      setLocalChanges({});
      setUploadError('');
      setTagInputVisible(false);
      setNewTagValue('');
      setNewAttachments([]);
      setImagePreviewErrors({});
    }
  }, [isOpen]);

  const attachmentsForList = useMemo(() => {
    if (!attachments) return [];

    const seen = new Set();

    return attachments
      .map((a, index) => {
        const fileUrl = a.file_url || a.attachment || a.fileUrl || '';

        let fileName = fileUrl ? fileUrl.split('/').pop()?.split('?')[0] : `file-${index}`;

        if (fileName.includes('_')) {
          fileName = fileName.split('_').slice(1).join('_');
        }
        const id = a.name || a.id;

        if (!id || !fileUrl) return null;

        if (seen.has(id)) return null;
        seen.add(id);

        return {
          id,
          fileUrl: `${fileUrl}`,
          fileName,
          childRowId: a.name,
        };
      })
      .filter(Boolean);
  }, [attachments]);
  // console.log('Normalized attachments for list:', attachmentsForList);
  useEffect(() => {
    setTitleError('');
  }, [taskTitle]);

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

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleOpenChange = useCallback(
    (open) => {
      if (!open) {
        onClose?.();
      }
    },
    [onClose],
  );

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

  if (!isOpen || !task) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Content className='max-w-[1200px]'>
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
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
          <div className='flex h-full min-h-0'>
            <div
              ref={leftPanelRef}
              className={cn(
                'w-[422px] border-r border-stroke-soft-200 overflow-y-auto relative shrink-0',
                dragActive && 'overflow-y-hidden',
              )}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              {dragActive && (
                <PartnerTaskDrawerDragOverlay
                  overlayHeight={overlayHeight}
                  messageTop={messageTop}
                />
              )}

              <div className='px-6 pt-5 pb-0 flex flex-col gap-6'>
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

                <PartnerTaskDrawerFormFields
                  status={status}
                  priority={priority}
                  dueDate={dueDate}
                  customNextUpdateDate={customNextUpdateDate}
                  assignedTo={assignedTo}
                  assigneeDisplayValue={assigneeDisplayValue}
                  roles={roles}
                  assigneeSelectItems={assigneeSelectItems}
                  assigneeSelectLoading={assigneeSelectLoading}
                  handleFieldChange={handleFieldChange}
                  setLocalChanges={setLocalChanges}
                />

                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-text-sub-500' />
                    <span className='label-small text-text-sub-500'>Description</span>
                  </div>
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
                    className='w-full field-sizing-content'
                    placeholder='Enter description'
                  />
                </div>

                <PartnerTaskDrawerTagsSection
                  tagInputVisible={tagInputVisible}
                  setTagInputVisible={setTagInputVisible}
                  newTagValue={newTagValue}
                  setNewTagValue={setNewTagValue}
                  tags={tags}
                  handleAddTag={handleAddTag}
                  handleRemoveTag={handleRemoveTag}
                />

                <div className='flex flex-col gap-2 pb-6'>
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
                  </div>
                  {uploadError && (
                    <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                      <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
                    </div>
                  )}
                  {attachmentsForList.length > 0 && (
                    <AttachmentList
                      attachments={attachmentsForList}
                      onDownload={handleAttachmentDownload}
                      onRemove={(attachmentId, childRowId) => {
                        if (childRowId) {
                          handleRemoveAttachment(attachmentId, childRowId);
                        } else {
                          const att = attachments.find(
                            (a) => a.id === attachmentId || a.childRowId === attachmentId,
                          );
                          const foundChildRowId = att?.childRowId || att?.name || attachmentId;
                          handleRemoveAttachment(attachmentId, foundChildRowId);
                        }
                      }}
                      disabled={isUploading}
                      emptyStateDescription='All file types, up to 50 MB per file.'
                    />
                  )}
                </div>
              </div>
            </div>

            <div className='flex flex-1 flex-col min-h-0 h-full overflow-y-auto'>
              <div className='border-b border-stroke-soft-200 px-6 py-3.5 shrink-0'>
                <div className='flex items-center gap-2'>
                  <RiStickyNoteLine size={20} className='text-text-sub-500' />
                  <span className='label-small text-text-sub-500'>Comments</span>
                </div>
              </div>
              <TaskComments
                taskName={taskDocId}
                onRefreshData={() => {
                  if (taskDocId) onRefresh?.({ task_id: taskDocId });
                }}
              />
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default TaskViewDrawerPartnerCrm;
