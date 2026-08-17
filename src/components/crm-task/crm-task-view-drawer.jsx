import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiUserLine,
  RiFlagLine,
  RiStickyNoteLine,
  RiAttachment2,
  RiPriceTag3Line,
  RiAddLine,
  RiDownloadLine,
  RiImage2Line,
  RiDeleteBinLine,
  RiCheckLine,
  RiUploadLine,
  RiLoader2Fill,
} from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import * as Checkbox from '@/components/ui/checkbox';
import * as Tag from '@/components/ui/tag';
import * as LinkButton from '@/components/ui/link-button';
import * as Input from '@/components/ui/input';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import FieldRow from '@/components/ui/field-row';
import {
  getPriorityColor,
  getStatusColor,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@/components/client-onboarding/constants';
import {
  normalizeTaskAttachments,
  MAX_FILE_SIZE,
} from '@/components/client-onboarding/task-view-drawer-utils';
import { formatFileSize } from '@/utils/file-utils';
import { formatDisplayDateTime } from '@/utils/date-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { removeCrmTaskAttachment, addLeadCrmTaskAttachment } from '@/redux/settingSlice';
import { CRM_TASK_MASTER_DEPARTMENT_OPTIONS } from '@/components/crm-task/crm-task-master-constants';
import { cn } from '@/lib/utils';
import { DocumentFollowersPopover } from '@/components/document-subscribe';
import {
  getSubscriptionStatus,
  listDocumentSubscribers,
} from '@/services/document-subscribe-service';
import { getCrmLeadOptions } from '@/api/crmLeads';

const CRM_TASK_MASTER_DOCTYPE = 'Lead CRM Task Master';

const CrmTaskViewDrawer = ({
  isOpen,
  onClose,
  task = null,
  taskType = 'account',
  lifecycleStages = [],
  onFetchDetail,
  onUpdate,
  onRefresh,
  isLoadingDetail = false,
  taskTypeOptions = [],
  /** Optional: when provided (e.g. CP Task Master), used instead of addLeadCrmTaskAttachment */
  onAddAttachment,
  /** Optional: when provided (e.g. CP Task Master), used instead of removeCrmTaskAttachment */
  onRemoveAttachment,
  /** When set (e.g. CP Task Master), overrides contact/lead tab detection for lifecycle UI. */
  showLifecycleFields: showLifecycleFieldsProp,
  /** Contact/Lead: CRM Stages Pipeline options (value = pipeline id). */
  pipelineOptions = [],
}) => {
  const dispatch = useDispatch();
  const [localChanges, setLocalChanges] = useState({});
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [imagePreviewErrors, setImagePreviewErrors] = useState({});
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [taskSubscribers, setTaskSubscribers] = useState([]);
  const [taskSubscribed, setTaskSubscribed] = useState(false);
  const [taskSubscribersLoading, setTaskSubscribersLoading] = useState(false);
  const [dropReasonOptions, setDropReasonOptions] = useState([]);
  const attachmentsListRef = useRef(null);
  const fileInputRef = useRef(null);

  const showLifecycleFields =
    showLifecycleFieldsProp !== undefined
      ? showLifecycleFieldsProp
      : taskType === 'contact' || taskType === 'lead';
  const setTriggerValue =
    localChanges.set_trigger === undefined ? task?.set_trigger : localChanges.set_trigger;
  const setTriggerOn = setTriggerValue === 1 || setTriggerValue === true || setTriggerValue === '1';
  const lifecycleEditable = showLifecycleFields && setTriggerOn;
  const triggerTypeRaw = String(localChanges.trigger_type ?? task?.trigger_type ?? '').trim();
  const isDropReasonTrigger = /drop/i.test(triggerTypeRaw);
  const triggerTypeValue = isDropReasonTrigger
    ? 'Drop Reason'
    : triggerTypeRaw
      ? 'Pipeline'
      : setTriggerOn
        ? 'Pipeline'
        : '';
  const TRIGGER_TYPE_OPTIONS = [
    { value: 'Pipeline', label: 'Pipeline' },
    { value: 'Drop Reason', label: 'Drop Reason' },
  ];
  const dropReasons = useMemo(() => {
    const raw = localChanges.drop_reason ?? task?.drop_reason ?? [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        /* plain string */
      }
      return [raw];
    }
    return [];
  }, [localChanges.drop_reason, task?.drop_reason]);

  useEffect(() => {
    if (!showLifecycleFields || !setTriggerOn || !isDropReasonTrigger) return;
    let cancelled = false;
    getCrmLeadOptions()
      .then((opts) => {
        if (!cancelled)
          setDropReasonOptions(Array.isArray(opts.lost_reason) ? opts.lost_reason : []);
      })
      .catch(() => {
        if (!cancelled) setDropReasonOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showLifecycleFields, setTriggerOn, isDropReasonTrigger]);

  const taskTitle = localChanges.task_name ?? task?.task_name ?? '';
  const status = localChanges.status ?? task?.status ?? '';
  const priority = localChanges.priority ?? task?.priority ?? '';
  const duration = localChanges.duration ?? task?.duration ?? '';
  const description = localChanges.description ?? task?.description ?? '';
  const tags = useMemo(() => {
    const t = localChanges.tags === undefined ? (task?.tags ?? []) : localChanges.tags;
    return Array.isArray(t) ? t : [];
  }, [localChanges.tags, task?.tags]);

  const departmentList = useMemo(() => {
    const dept = task?.department;
    if (!Array.isArray(dept) || dept.length === 0) return [];
    return dept
      .map((d) => {
        if (typeof d === 'string') return d.trim();
        if (d && typeof d === 'object') return String(d.assignee || d.user || '').trim();
        return '';
      })
      .filter(Boolean);
  }, [task?.department]);
  const departmentValue = useMemo(() => {
    if (localChanges.department === undefined) return departmentList;
    if (Array.isArray(localChanges.department)) return localChanges.department.filter(Boolean);
    const single = String(localChanges.department || '').trim();
    return single ? [single] : [];
  }, [localChanges.department, departmentList]);

  const typeValue = localChanges.type ?? task?.type ?? '';
  const pipelineValue = (localChanges.pipeline ?? task?.pipeline ?? '').trim();
  const lifecycleStageValue = localChanges.lifecycle_stage ?? task?.lifecycle_stage ?? '';
  const lifecycleStageStatusValue =
    localChanges.lifecycle_stage_status ?? task?.lifecycle_stage_status ?? '';
  const lifecycleStageStatuses = useMemo(() => {
    const raw =
      localChanges.lifecycle_stage_statuses ??
      task?.lifecycle_stage_statuses ??
      (lifecycleStageStatusValue ? [lifecycleStageStatusValue] : []);
    return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
  }, [
    localChanges.lifecycle_stage_statuses,
    task?.lifecycle_stage_statuses,
    lifecycleStageStatusValue,
  ]);

  const stagesForPipeline = useMemo(() => {
    const stages = lifecycleStages || [];
    if (!pipelineValue) return [];
    return stages.filter((s) => (s.pipeline || '').trim() === pipelineValue);
  }, [lifecycleStages, pipelineValue]);

  const stageStatusOptions = useMemo(() => {
    if (!lifecycleStageValue || stagesForPipeline.length === 0) return [];
    const stage = stagesForPipeline.find((s) => s.name === lifecycleStageValue);
    return stage?.crm_stage_status ?? [];
  }, [lifecycleStageValue, stagesForPipeline]);

  const statusBadgeLabel = (v) => {
    const row = stageStatusOptions.find((o) => (o.name || '') === v || (o.status || '') === v);
    return row?.status || String(v).split('-').pop() || v;
  };

  const attachments = useMemo(() => normalizeTaskAttachments(task), [task]);

  useEffect(() => {
    if (attachments.length === 0) {
      setCurrentAttachmentIndex(0);
      return;
    }
    setCurrentAttachmentIndex((previous) =>
      previous >= attachments.length ? attachments.length - 1 : previous,
    );
  }, [attachments.length]);

  const refreshTaskSubscribers = useCallback(async () => {
    if (!isOpen) return;
    const name = task?.name;
    if (name == null || name === '') return;
    const ref = String(name);
    setTaskSubscribersLoading(true);
    try {
      const [status, list] = await Promise.all([
        getSubscriptionStatus(CRM_TASK_MASTER_DOCTYPE, ref),
        listDocumentSubscribers(CRM_TASK_MASTER_DOCTYPE, ref),
      ]);
      setTaskSubscribed(Boolean(status?.subscribed));
      setTaskSubscribers(Array.isArray(list) ? list : []);
    } catch {
      // keep existing list on failure
    } finally {
      setTaskSubscribersLoading(false);
    }
  }, [isOpen, task?.name]);

  useEffect(() => {
    setTaskSubscribers([]);
    setTaskSubscribed(false);
  }, [task?.name]);

  useEffect(() => {
    if (!isOpen || !task?.name) return;
    refreshTaskSubscribers();
  }, [isOpen, task?.name, task?.modified, refreshTaskSubscribers]);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const getPreviewUrl = useCallback(
    (attachment) => {
      if (!attachment) return null;
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
      if (fileUrl.startsWith('/')) return `${apiUrl}${fileUrl}`;
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
      return `${apiUrl}/${fileUrl}`;
    },
    [apiUrl],
  );

  const handleAttachmentDownload = useCallback(
    async (attachment) => {
      if (!attachment) return;
      const fileUrl = getPreviewUrl(attachment);
      if (!fileUrl) return;
      try {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = attachment.fileName || 'attachment';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const response = await fetch(fileUrl, { method: 'GET' });
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        link.click();
        URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(fileUrl, '_blank');
      }
    },
    [getPreviewUrl],
  );

  const handleAttachmentView = useCallback(
    (attachment, event) => {
      if (event?.target?.closest('.attachment-actions')) return;
      if (!attachment) return;
      const fileUrl = getPreviewUrl(attachment);
      if (!fileUrl) return;
      const link = document.createElement('a');
      link.href = fileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    },
    [getPreviewUrl],
  );

  const isImageFile = useCallback((attachment) => {
    if (!attachment) return false;
    return attachment.isImage || false;
  }, []);

  const handleImageError = useCallback((attachmentId) => {
    setImagePreviewErrors((previous) => ({ ...previous, [attachmentId]: true }));
  }, []);

  const scrollToAttachment = useCallback((index) => {
    if (!attachmentsListRef.current) return;
    const target = attachmentsListRef.current.children?.[index];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

  const handleRemoveAttachment = useCallback(
    async (attachmentId, childRowId) => {
      if (!childRowId) {
        showErrorToast('Attachment ID not available');
        return;
      }
      try {
        if (onRemoveAttachment) {
          await onRemoveAttachment(attachmentId, childRowId);
        } else {
          await dispatch(
            removeCrmTaskAttachment({
              child_row_id: childRowId,
              child_doctype: 'Lead CRM Task Attachment',
            }),
          ).unwrap();
        }
        showSuccessToast('Attachment removed successfully');
        onRefresh?.();
      } catch (error) {
        showErrorToast(extractErrorMessage(error) || 'Failed to remove attachment');
      }
    },
    [dispatch, onRemoveAttachment, onRefresh],
  );

  const handleFileUpload = useCallback(
    async (files) => {
      if (!task?.name || !files?.length) return;
      setUploadError('');
      setIsUploading(true);
      const fileArray = [...files];
      const validFiles = fileArray.filter((file) => file.size <= MAX_FILE_SIZE);
      const invalidFiles = fileArray.filter((file) => file.size > MAX_FILE_SIZE);
      if (invalidFiles.length > 0) {
        const message = `The following file(s) exceed the 50 MB limit: ${invalidFiles.map((f) => f.name).join(', ')}`;
        setUploadError(message);
        showErrorToast(message);
        setIsUploading(false);
        return;
      }
      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }
      const failedUploads = [];
      for (const file of validFiles) {
        try {
          if (onAddAttachment) {
            await onAddAttachment(task.name, file);
          } else {
            await dispatch(
              addLeadCrmTaskAttachment({ task_id: task.name, attachment_file: file }),
            ).unwrap();
          }
        } catch (error) {
          failedUploads.push({ fileName: file.name, error: extractErrorMessage(error) });
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (failedUploads.length > 0) {
        const message =
          failedUploads.length === validFiles.length
            ? `Failed to upload all files: ${failedUploads.map((f) => f.fileName).join(', ')}`
            : `Failed to upload some files: ${failedUploads.map((f) => f.fileName).join(', ')}`;
        setUploadError(message);
        showErrorToast(message);
      }
      if (failedUploads.length < validFiles.length) {
        const successCount = validFiles.length - failedUploads.length;
        showSuccessToast(
          successCount === 1
            ? 'File uploaded successfully'
            : `${successCount} file(s) uploaded successfully`,
        );
        onRefresh?.();
      }
      setIsUploading(false);
    },
    [task?.name, dispatch, onAddAttachment, onRefresh],
  );

  const handleUploadButtonClick = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handleFileInputChange = useCallback(
    (event) => {
      const { files } = event.target;
      if (files?.length) handleFileUpload(files);
    },
    [handleFileUpload],
  );

  const handleFieldChange = useCallback(
    (field, value) => {
      const stagesForPv = (p) => {
        const list = lifecycleStages || [];
        const pv = (p ?? '').trim();
        if (!pv) return [];
        return list.filter((s) => (s.pipeline || '').trim() === pv);
      };
      const firstStatusForStageInStages = (stageName, stages) => {
        if (!stageName) return '';
        const stage = stages.find((s) => s.name === stageName);
        const row = stage?.crm_stage_status?.[0];
        return row?.name || row?.status || '';
      };
      setLocalChanges((previous) => {
        const effPipeline = (previous.pipeline ?? task?.pipeline ?? '').trim();
        if (field === 'pipeline') {
          const nextPv = (value ?? '').trim();
          const stages = stagesForPv(nextPv);
          const firstStage = stages[0];
          const nextStage = firstStage?.name ?? '';
          return {
            ...previous,
            pipeline: nextPv,
            lifecycle_stage: nextStage,
            lifecycle_stage_status: firstStatusForStageInStages(nextStage, stages),
            lifecycle_stage_statuses: [],
          };
        }
        if (field === 'lifecycle_stage') {
          const stages = stagesForPv(effPipeline);
          return {
            ...previous,
            lifecycle_stage: value,
            lifecycle_stage_status: firstStatusForStageInStages(value, stages),
            lifecycle_stage_statuses: [],
          };
        }
        if (field === 'set_trigger' && !value) {
          return {
            ...previous,
            set_trigger: value,
            trigger_type: '',
            pipeline: '',
            lifecycle_stage: '',
            lifecycle_stage_status: '',
            lifecycle_stage_statuses: [],
            drop_reason: [],
          };
        }
        if (field === 'set_trigger' && value) {
          const nextPv = (previous.pipeline ?? task?.pipeline ?? '').trim();
          const stages = stagesForPv(nextPv);
          const nextStage =
            previous.lifecycle_stage || task?.lifecycle_stage || stages[0]?.name || '';
          const nextStatus =
            previous.lifecycle_stage_status ||
            task?.lifecycle_stage_status ||
            firstStatusForStageInStages(nextStage, stages);
          return {
            ...previous,
            set_trigger: value,
            trigger_type: previous.trigger_type || task?.trigger_type || 'Pipeline',
            pipeline: nextPv,
            lifecycle_stage: nextStage,
            lifecycle_stage_status: nextStatus,
          };
        }
        if (field === 'trigger_type') {
          if (/drop/i.test(String(value || ''))) {
            return {
              ...previous,
              trigger_type: value,
              pipeline: '',
              lifecycle_stage: '',
              lifecycle_stage_status: '',
              lifecycle_stage_statuses: [],
            };
          }
          return {
            ...previous,
            trigger_type: value,
            drop_reason: [],
          };
        }
        return { ...previous, [field]: value };
      });
      if (onUpdate && task?.name) {
        const pipelineLabelFor = (pv) =>
          pipelineOptions.find((o) => (o.value || '').trim() === (pv || '').trim())?.label ?? '';
        const payload = {
          task_id: task.name,
          task_name: localChanges.task_name ?? task.task_name,
          description: localChanges.description ?? task.description,
          status: field === 'status' ? value : (localChanges.status ?? task.status),
          priority: field === 'priority' ? value : (localChanges.priority ?? task.priority),
          type: field === 'type' ? value : (localChanges.type ?? task.type),
          duration: field === 'duration' ? value : (localChanges.duration ?? task.duration),
          department: field === 'department' ? value : (localChanges.department ?? departmentList),
          set_trigger: localChanges.set_trigger ?? task?.set_trigger,
          pipeline: localChanges.pipeline ?? task?.pipeline,
          lifecycle_stage: localChanges.lifecycle_stage ?? task?.lifecycle_stage,
          lifecycle_stage_status:
            localChanges.lifecycle_stage_status ?? task?.lifecycle_stage_status,
          tags: localChanges.tags ?? task?.tags ?? [],
        };
        if (field === 'task_name') payload.task_name = value;
        if (field === 'description') payload.description = value;
        if (field === 'set_trigger') {
          payload.set_trigger = value;
          if (value) {
            const pv = (localChanges.pipeline ?? task?.pipeline ?? '').trim();
            const stages = stagesForPv(pv);
            const nextStage =
              localChanges.lifecycle_stage || task?.lifecycle_stage || stages[0]?.name || '';
            payload.trigger_type = localChanges.trigger_type || task?.trigger_type || 'Pipeline';
            payload.pipeline = pv;
            payload.pipeline_label = pipelineLabelFor(pv);
            payload.lifecycle_stage = nextStage;
            payload.lifecycle_stage_status =
              localChanges.lifecycle_stage_status ||
              task?.lifecycle_stage_status ||
              firstStatusForStageInStages(nextStage, stages);
          } else {
            payload.trigger_type = '';
            payload.pipeline = '';
            payload.pipeline_label = '';
            payload.lifecycle_stage = '';
            payload.lifecycle_stage_status = '';
            payload.drop_reason = [];
          }
        }
        if (field === 'trigger_type') {
          payload.trigger_type = value;
          if (/drop/i.test(String(value || ''))) {
            payload.pipeline = '';
            payload.pipeline_label = '';
            payload.lifecycle_stage = '';
            payload.lifecycle_stage_status = '';
          } else {
            payload.drop_reason = [];
          }
        }
        if (field === 'pipeline') {
          const nextPv = (value ?? '').trim();
          const stages = stagesForPv(nextPv);
          const firstStage = stages[0];
          payload.pipeline = nextPv;
          payload.pipeline_label = pipelineLabelFor(nextPv);
          payload.lifecycle_stage = firstStage?.name ?? '';
          payload.lifecycle_stage_status = firstStatusForStageInStages(firstStage?.name, stages);
        }
        if (field === 'lifecycle_stage') {
          const pv = (localChanges.pipeline ?? task?.pipeline ?? '').trim();
          const stages = stagesForPv(pv);
          payload.lifecycle_stage = value;
          payload.lifecycle_stage_status = firstStatusForStageInStages(value, stages);
        }
        if (field === 'lifecycle_stage_status') payload.lifecycle_stage_status = value;
        if (field === 'lifecycle_stage_statuses') {
          payload.lifecycle_stage_statuses = value;
          payload.lifecycle_stage_status = Array.isArray(value) ? value[0] || '' : value;
        }
        if (field === 'drop_reason') payload.drop_reason = value;
        if (field === 'tags') payload.tags = value;
        onUpdate(payload);
      }
    },
    [onUpdate, task, localChanges, departmentList, lifecycleStages, pipelineOptions],
  );

  const handlePrevious = useCallback(() => {
    if (task?.previous_task_id && onFetchDetail) onFetchDetail(task.previous_task_id);
  }, [task?.previous_task_id, onFetchDetail]);

  const handleNext = useCallback(() => {
    if (task?.next_task_id && onFetchDetail) onFetchDetail(task.next_task_id);
  }, [task?.next_task_id, onFetchDetail]);

  const handleAddTag = useCallback(() => {
    if (newTagValue.trim()) {
      const newTags = [...tags, newTagValue.trim()];
      setLocalChanges((previous) => ({ ...previous, tags: newTags }));
      setNewTagValue('');
      setTagInputVisible(false);
      if (onUpdate && task?.name) {
        onUpdate({
          task_id: task.name,
          task_name: task.task_name,
          description: task.description,
          status: task.status,
          priority: task.priority,
          type: task.type,
          duration: task.duration,
          department: departmentList,
          set_trigger: task.set_trigger,
          lifecycle_stage: task.lifecycle_stage,
          lifecycle_stage_status: task.lifecycle_stage_status,
          tags: newTags,
        });
      }
    }
  }, [newTagValue, tags, onUpdate, task, departmentList]);

  const handleRemoveTag = useCallback(
    (index) => {
      const newTags = tags.filter((_, i) => i !== index);
      setLocalChanges((previous) => ({ ...previous, tags: newTags }));
      if (onUpdate && task?.name) {
        onUpdate({
          task_id: task.name,
          task_name: task.task_name,
          description: task.description,
          status: task.status,
          priority: task.priority,
          type: task.type,
          duration: task.duration,
          department: departmentList,
          set_trigger: task.set_trigger,
          lifecycle_stage: task.lifecycle_stage,
          lifecycle_stage_status: task.lifecycle_stage_status,
          tags: newTags,
        });
      }
    },
    [tags, onUpdate, task, departmentList],
  );

  if (!isOpen || !task) return null;

  const hasPrevious = Boolean(task.previous_task_id);
  const hasNext = Boolean(task.next_task_id);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <Drawer.Content className='max-w-[600px]'>
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
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
              {task?.name ? (
                <DocumentFollowersPopover
                  referenceDoctype={CRM_TASK_MASTER_DOCTYPE}
                  referenceName={String(task.name)}
                  followers={taskSubscribers}
                  subscribed={taskSubscribed}
                  subscribersLoading={taskSubscribersLoading}
                  onRefreshSubscribers={refreshTaskSubscribers}
                  canManageOthers
                  internalOnlySearch
                />
              ) : null}
              <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
          <div className='px-6 pt-5 pb-6 flex flex-col gap-6'>
            <div className='flex flex-col gap-1'>
              <Textarea.Root
                variant='borderless'
                simple
                defaultValue={taskTitle}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) handleFieldChange('task_name', v);
                }}
                rows={1}
                className='field-sizing-content text-title-h5 text-text-main-900 p-1'
                placeholder='Task title'
              />
            </div>

            <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
              <FieldRow icon={RiPriceTag3Line} label='Status' editable>
                <SearchableSelect
                  variant='borderless'
                  value={status}
                  onValueChange={(v) => handleFieldChange('status', v)}
                  size='xsmall'
                  options={TASK_STATUS_OPTIONS}
                  placeholder='—'
                  showArrow={false}
                  renderTrigger={({ selectedOption }) => (
                    <Badge.Root
                      variant='light'
                      color={getStatusColor(status)}
                      className='text-nowrap'
                    >
                      {status || '—'}
                    </Badge.Root>
                  )}
                  renderOptionLabel={(option) => (
                    <Badge.Root
                      variant='light'
                      color={getStatusColor(option.value)}
                      className='text-nowrap'
                    >
                      {option.label ?? option.value}
                    </Badge.Root>
                  )}
                />
              </FieldRow>

              <FieldRow icon={RiUserLine} label='Department' editable>
                <SearchableSelect
                  variant='borderless'
                  multiple
                  value={departmentValue}
                  onValueChange={(v) =>
                    handleFieldChange('department', Array.isArray(v) ? v : v ? [v] : [])
                  }
                  size='xsmall'
                  options={CRM_TASK_MASTER_DEPARTMENT_OPTIONS}
                  placeholder='—'
                  showArrow={false}
                />
              </FieldRow>

              <FieldRow icon={RiFlagLine} label='Type' editable>
                <SearchableSelect
                  variant='borderless'
                  value={typeValue}
                  onValueChange={(v) => handleFieldChange('type', v)}
                  size='xsmall'
                  options={(taskTypeOptions || []).map((opt) => ({
                    value: opt.name ?? opt.type ?? opt.value,
                    label: opt.type ?? opt.label ?? opt.name,
                  }))}
                  placeholder='—'
                  showArrow={false}
                  renderTrigger={({ selectedOption }) =>
                    typeValue ? (
                      <span className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200'>
                        {typeValue}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
              </FieldRow>

              <FieldRow icon={RiFlagLine} label='Duration' editable>
                <div className='flex items-center gap-2'>
                  <Input.Root variant='borderless' size='small' className='max-w-[100px]'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        min={1}
                        value={duration ?? ''}
                        onChange={(e) =>
                          setLocalChanges((p) => ({ ...p, duration: e.target.value }))
                        }
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== '') handleFieldChange('duration', v);
                        }}
                        placeholder='—'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  <span className='text-paragraph-sm text-text-sub-500'>Days</span>
                </div>
              </FieldRow>

              <FieldRow icon={RiFlagLine} label='Priority' editable>
                <SearchableSelect
                  variant='borderless'
                  value={priority}
                  onValueChange={(v) => handleFieldChange('priority', v)}
                  size='xsmall'
                  options={TASK_PRIORITY_OPTIONS}
                  placeholder='—'
                  showArrow={false}
                  renderTrigger={({ selectedOption }) => (
                    <Badge.Root
                      variant='light'
                      color={getPriorityColor(priority)}
                      className='text-nowrap'
                    >
                      {priority || '—'}
                    </Badge.Root>
                  )}
                  renderOptionLabel={(option) => (
                    <Badge.Root
                      variant='light'
                      color={getPriorityColor(option.value)}
                      className='text-nowrap'
                    >
                      {option.label ?? option.value}
                    </Badge.Root>
                  )}
                />
              </FieldRow>

              {showLifecycleFields && (
                <>
                  <FieldRow icon={RiFlagLine} label='Set Trigger' editable={true}>
                    <div className='flex items-center pl-2 min-h-8'>
                      <Checkbox.Root
                        checked={setTriggerOn}
                        onCheckedChange={(checked) =>
                          handleFieldChange('set_trigger', checked ? 1 : 0)
                        }
                        disabled={isLoadingDetail}
                        id='set-trigger-view'
                      />
                    </div>
                  </FieldRow>
                  {setTriggerOn ? (
                    <FieldRow icon={RiFlagLine} label='Trigger Type' editable={lifecycleEditable}>
                      {lifecycleEditable ? (
                        <SearchableSelect
                          variant='borderless'
                          value={triggerTypeValue || 'Pipeline'}
                          onValueChange={(v) => handleFieldChange('trigger_type', v)}
                          size='xsmall'
                          options={TRIGGER_TYPE_OPTIONS}
                          placeholder='Select'
                          showArrow={false}
                        />
                      ) : (
                        <span className='text-paragraph-sm text-text-sub-500'>
                          {triggerTypeValue || '—'}
                        </span>
                      )}
                    </FieldRow>
                  ) : null}
                  {setTriggerOn && isDropReasonTrigger ? (
                    <FieldRow icon={RiFlagLine} label='Drop Reason' editable={lifecycleEditable}>
                      {lifecycleEditable ? (
                        <SearchableSelect
                          variant='borderless'
                          multiple
                          value={dropReasons}
                          onValueChange={(v) =>
                            handleFieldChange('drop_reason', Array.isArray(v) ? v : [])
                          }
                          size='xsmall'
                          options={dropReasonOptions}
                          placeholder='—'
                          showArrow={false}
                          triggerClassName='!h-auto !min-h-8 w-full min-w-0 max-w-full items-start py-1.5'
                          renderTrigger={() =>
                            dropReasons.length > 0 ? (
                              <div className='flex w-full min-w-0 flex-wrap items-center gap-1.5'>
                                {dropReasons.map((v) => (
                                  <span
                                    key={v}
                                    className='inline-flex max-w-full items-center rounded-full border border-stroke-soft-200 px-2 py-0.5 text-paragraph-xs font-medium leading-snug text-text-sub-600 break-words whitespace-normal'
                                  >
                                    {dropReasonOptions.find((o) => o.value === v)?.label || v}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '—'
                            )
                          }
                        />
                      ) : dropReasons.length > 0 ? (
                        <div className='flex w-full min-w-0 flex-wrap items-center gap-1.5'>
                          {dropReasons.map((v) => (
                            <span
                              key={v}
                              className='inline-flex max-w-full items-center rounded-full border border-stroke-soft-200 px-2 py-0.5 text-paragraph-xs font-medium leading-snug text-text-sub-600 break-words whitespace-normal'
                            >
                              {dropReasonOptions.find((o) => o.value === v)?.label || v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className='text-paragraph-sm text-text-sub-500'>—</span>
                      )}
                    </FieldRow>
                  ) : setTriggerOn ? (
                    <>
                      <FieldRow icon={RiFlagLine} label='Pipeline' editable={lifecycleEditable}>
                        {lifecycleEditable ? (
                          <SearchableSelect
                            variant='borderless'
                            value={pipelineValue || undefined}
                            onValueChange={(v) => handleFieldChange('pipeline', v)}
                            size='xsmall'
                            options={(pipelineOptions || []).map((o) => ({
                              value: o.value,
                              label: o.label,
                            }))}
                            placeholder='Select pipeline'
                            showArrow={false}
                            renderTrigger={({ selectedOption }) =>
                              pipelineOptions.find((o) => (o.value || '') === pipelineValue)
                                ?.label ||
                              task?.pipeline_label ||
                              pipelineValue ||
                              '—'
                            }
                          />
                        ) : (
                          <span className='text-paragraph-sm text-text-sub-500'>
                            {setTriggerOn
                              ? pipelineOptions.find((o) => (o.value || '') === pipelineValue)
                                  ?.label ||
                                task?.pipeline_label ||
                                pipelineValue ||
                                '—'
                              : '—'}
                          </span>
                        )}
                      </FieldRow>
                      <FieldRow
                        icon={RiFlagLine}
                        label='Lifecycle Stage'
                        editable={lifecycleEditable}
                      >
                        {lifecycleEditable ? (
                          <SearchableSelect
                            variant='borderless'
                            value={lifecycleStageValue}
                            onValueChange={(v) => handleFieldChange('lifecycle_stage', v)}
                            size='xsmall'
                            options={(stagesForPipeline || []).map((s) => ({
                              value: s.name,
                              label: s.stage,
                              color: s.color,
                            }))}
                            placeholder='—'
                            showArrow={false}
                            renderTrigger={({ selectedOption }) =>
                              lifecycleStageValue ? (
                                <span
                                  className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
                                  style={{
                                    backgroundColor: task?.lifecycle_stage_color
                                      ? `${task.lifecycle_stage_color}20`
                                      : 'var(--bg-weak-200, #f0f0f0)',
                                    color:
                                      task?.lifecycle_stage_color || 'var(--text-sub-600, #4a4a4a)',
                                    border: task?.lifecycle_stage_color
                                      ? `1px solid ${task.lifecycle_stage_color}`
                                      : '1px solid var(--stroke-soft-200, #e5e5e5)',
                                  }}
                                >
                                  {stagesForPipeline.find((s) => s.name === lifecycleStageValue)
                                    ?.stage ?? lifecycleStageValue}
                                </span>
                              ) : (
                                '—'
                              )
                            }
                            renderOptionLabel={(option) => (
                              <span className='flex items-center gap-2'>
                                {option.color && (
                                  <span
                                    className='size-3 rounded-full shrink-0'
                                    style={{ backgroundColor: option.color }}
                                  />
                                )}
                                {option.label}
                              </span>
                            )}
                          />
                        ) : (
                          (() => {
                            const displayStage =
                              (stagesForPipeline.find((s) => s.name === lifecycleStageValue)
                                ?.stage ??
                                lifecycleStageValue) ||
                              '—';
                            const color = task?.lifecycle_stage_color;
                            if (displayStage === '—')
                              return <span className='text-paragraph-sm text-text-sub-500'>—</span>;
                            return (
                              <span
                                className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
                                style={{
                                  backgroundColor: color
                                    ? `${color}20`
                                    : 'var(--bg-weak-200, #f0f0f0)',
                                  color: color || 'var(--text-sub-600, #4a4a4a)',
                                  border: color
                                    ? `1px solid ${color}`
                                    : '1px solid var(--stroke-soft-200, #e5e5e5)',
                                }}
                              >
                                {displayStage}
                              </span>
                            );
                          })()
                        )}
                      </FieldRow>
                      <FieldRow
                        icon={RiFlagLine}
                        label='Lifecycle Stage Status'
                        editable={lifecycleEditable}
                      >
                        {lifecycleEditable ? (
                          <SearchableSelect
                            variant='borderless'
                            multiple
                            value={lifecycleStageStatuses}
                            onValueChange={(v) =>
                              handleFieldChange(
                                'lifecycle_stage_statuses',
                                Array.isArray(v) ? v : [],
                              )
                            }
                            size='xsmall'
                            options={stageStatusOptions.map((s) => ({
                              value: s.name || s.status,
                              label: s.status,
                            }))}
                            placeholder='—'
                            showArrow={false}
                            renderTrigger={() =>
                              lifecycleStageStatuses.length > 0 ? (
                                <div className='flex flex-wrap items-center gap-1.5'>
                                  {lifecycleStageStatuses.map((v) => (
                                    <span
                                      key={v}
                                      className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200'
                                    >
                                      {statusBadgeLabel(v)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                '—'
                              )
                            }
                          />
                        ) : lifecycleStageStatuses.length > 0 ? (
                          <div className='flex flex-wrap items-center gap-1.5'>
                            {lifecycleStageStatuses.map((v) => (
                              <span
                                key={v}
                                className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200'
                              >
                                {statusBadgeLabel(v)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className='text-paragraph-sm text-text-sub-500'>—</span>
                        )}
                      </FieldRow>
                    </>
                  ) : null}
                </>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <RiStickyNoteLine className='size-5 text-neutral-500' />
                <span className='label-small text-text-sub-500'>Description</span>
              </div>
              {isDescriptionOpen || description ? (
                <Textarea.Root
                  rows={4}
                  placeholder='Add description'
                  value={description}
                  onChange={(e) => setLocalChanges((p) => ({ ...p, description: e.target.value }))}
                  onBlur={(e) => handleFieldChange('description', e.target.value.trim())}
                  className='min-h-[80px]'
                />
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
                      className='bg-error-lighter text-error-dark'
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
                        if (e.key === 'Enter') handleAddTag();
                      }}
                      className='bg-primary-lighter text-primary-dark'
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
                  >
                    <LinkButton.Icon as={RiAddLine} />
                    Add Tag
                  </LinkButton.Root>
                )}
              </div>

              {tags.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {tags.map((tag, index) => {
                    const tagDisplay = typeof tag === 'string' ? tag : tag.name || tag.label || tag;
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
                  accept='*/*'
                  onChange={handleFileInputChange}
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
              {attachments.length > 0 ? (
                <div className='flex flex-col gap-3'>
                  <div
                    ref={attachmentsListRef}
                    className='flex gap-4 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory'
                  >
                    {attachments.map((attachment, index) => {
                      const hasSize = attachment.size != null && attachment.size !== '';
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
                              <div
                                className='attachment-actions absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100'
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                {attachment.childRowId && (
                                  <CompactButton.Root
                                    size='large'
                                    variant='ghost'
                                    onClick={() =>
                                      handleRemoveAttachment(attachment.id, attachment.childRowId)
                                    }
                                    aria-label={`Delete ${attachment.fileName || 'attachment'}`}
                                    className='bg-white/90 hover:bg-white text-error-base'
                                  >
                                    <CompactButton.Icon as={RiDeleteBinLine} />
                                  </CompactButton.Root>
                                )}
                              </div>
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
                                    <FileFormatIcon.Root
                                      format={attachment.extension || 'FILE'}
                                      size='small'
                                      color='purple'
                                    />
                                  </div>
                                  <span className='text-paragraph-xs text-text-sub-500'>
                                    {getPreviewUrl(attachment)
                                      ? 'Preview unavailable'
                                      : 'No preview'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className='border-t border-stroke-soft-200 bg-white px-4 py-3 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
                              <div className='flex flex-col flex-1 min-w-0'>
                                <span
                                  className='label-small text-text-main-900 truncate block'
                                  title={attachment.fileName}
                                >
                                  {attachment.fileName}
                                </span>
                                <div className='mt-1 flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
                                  {hasSize && <span>{formatFileSize(attachment.size)}</span>}
                                  {!hasSize && !hasDate && <span>—</span>}
                                </div>
                                {hasDate && (
                                  <div className='mt-1 text-paragraph-xs text-text-sub-500'>
                                    {formatDisplayDateTime(attachment.createdAt)}
                                  </div>
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
              ) : (
                <span className='text-paragraph-sm text-text-sub-500'>No attachments</span>
              )}
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CrmTaskViewDrawer;
