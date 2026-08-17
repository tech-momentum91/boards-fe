import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  RiCloseLine,
  RiAddLine,
  RiFlagLine,
  RiCalendarLine,
  RiUserLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiAttachment2,
  RiUploadLine,
  RiChat2Line,
  RiCheckLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as LinkButton from '@/components/ui/link-button';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import * as Tag from '@/components/ui/tag';
import FieldRow from '@/components/ui/field-row';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import AttachmentList from '@/components/ui/attachment-list';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Datepicker } from '@/components/ui/datepicker';
import CrmComment from './crm-comment';
import {
  fetchAclTaskDetail,
  updateAclTask,
  deleteAclTaskAttachment,
  fetchAclTaskActivities,
  addAclTaskComment,
} from '@/redux/settingSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import apiClient from '@/api/axios';
import { CrmLifecycleStagePill } from './crm-lifecycle-stage-pill';
import { DocumentFollowersPopover } from '@/components/document-subscribe';
import {
  getSubscriptionStatus,
  listDocumentSubscribers,
} from '@/services/document-subscribe-service';

const ACL_TASK_DOCTYPE = 'ACL Task';

const LEAD_CRM_TASK_TYPE_API =
  '/method/devx.devx_crm.doctype.lead_crm_task_type.lead_crm_task_type.get_lead_crm_task_types';

const STATUS_OPTIONS = ['Pending', 'Ongoing', 'Completed', 'On Hold'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const getStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'green';
  if (s === 'ongoing') return 'blue';
  if (s === 'on hold') return 'gray';
  return 'orange';
};

const getPriorityColor = (priority) => {
  const p = String(priority || '').toLowerCase();
  if (p === 'low') return 'green';
  if (p === 'medium') return 'orange';
  if (p === 'high') return 'red';
  if (p === 'urgent') return 'red';
  return 'gray';
};

const parseSafeDate = (dateString) => {
  if (!dateString) return undefined;
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }
  const cleaned = String(dateString)
    .replace(/(\d+)(st|nd|rd|th)/, '$1')
    .replace(/ (\d{2})$/, ' 20$1');
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const IMAGE_EXTENSIONS = new Set(['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP']);
const getAttachmentExtension = (fileName) => {
  if (!fileName || typeof fileName !== 'string') return '';
  const segments = fileName.split('.');
  return segments.length >= 2 ? segments.at(-1).toUpperCase() : '';
};

const apiUrl = import.meta.env.VITE_API_URL || '';

const buildFullFileUrl = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return fileUrl;
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  if (fileUrl.startsWith('/')) return `${apiUrl}${fileUrl}`;
  return `${apiUrl}/${fileUrl}`;
};

const normalizeActivitiesForDrawer = (activities) => {
  const comments = (activities?.comments ?? []).map((c) => {
    const user = c.user || {};
    const parent = c.parent_comment;
    return {
      ...c,
      id: c.name,
      user: {
        ...user,
        image: user.image ? buildFullFileUrl(user.image) : user.image,
      },
      custom_visible_to_client: c.visible_to_client,
      custom_parent_comment: parent ? parent.name || parent.id || true : null,
      parent_comment:
        parent && typeof parent === 'object'
          ? {
              ...parent,
              id: parent.name,
              user: parent.user
                ? {
                    ...parent.user,
                    image: parent.user.image
                      ? buildFullFileUrl(parent.user.image)
                      : parent.user.image,
                  }
                : parent.user,
            }
          : c.parent_comment,
      attachments: (c.attachments ?? []).map((a, i) => ({
        id: a.name || `att-${i}`,
        fileName: a.file_name || a.fileName || a.name,
        fileUrl: a.file_url ? buildFullFileUrl(a.file_url) : null,
      })),
      comment_doctype: 'ACL Task Comment',
    };
  });
  const history = (activities?.history ?? []).map((h) => {
    const user = h.user || {};
    return {
      ...h,
      user: {
        ...user,
        image: user.image ? buildFullFileUrl(user.image) : user.image,
      },
    };
  });
  return { comments, history };
};

const normalizeAclTaskAttachments = (task) => {
  const attachmentsSource =
    task?.attachments ||
    task?._attachments ||
    task?.attachments_info ||
    task?.files ||
    task?.file_attachments ||
    [];
  if (!Array.isArray(attachmentsSource)) return [];
  return attachmentsSource
    .map((att, index) => {
      const fileName = att?.file_name || att?.filename || att?.title || att?.name;
      const rawFileUrl = att?.file_url || att?.url || att?.file || att?.fileUrl;
      if (!fileName && !rawFileUrl) return null;
      const ext = getAttachmentExtension(fileName || rawFileUrl || '');
      const fileUrl = rawFileUrl ? buildFullFileUrl(rawFileUrl) : null;
      return {
        id: att?.name || att?.id || `${fileName || 'file'}-${index}`,
        fileName: fileName || 'attachment',
        fileUrl,
        size: att?.file_size ?? att?.size ?? att?.file_size_bytes,
        createdAt: att?.creation || att?.created_at || att?.modified,
        extension: ext,
        isImage: IMAGE_EXTENSIONS.has(ext),
        childRowId: rawFileUrl || fileUrl,
      };
    })
    .filter(Boolean);
};

const truthyTrigger = (v) => Number(v) === 1 || v === true;

/** Matches CRM lead list status / tag pills (outline, rounded-full). */
const LIFECYCLE_STATUS_PILL_CLASS =
  'inline-flex w-max max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-stroke-soft-200 bg-white px-2.5 py-1 text-paragraph-xs font-medium leading-normal text-text-sub-600 text-center';

const apiToDrawerTask = (apiTask) => {
  if (!apiTask) return null;
  const expEnd = apiTask.exp_end_date;
  let dueDate = expEnd;
  if (expEnd && typeof expEnd === 'string' && expEnd.includes('-')) {
    const d = new Date(expEnd);
    if (!Number.isNaN(d.getTime())) {
      const day = d.getDate();
      const ord = (n) => (n > 3 && n < 21 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
      dueDate = `${day}${ord(day)} ${d.toLocaleString('default', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`;
    }
  }
  const assignees = Array.isArray(apiTask.assignees)
    ? apiTask.assignees.map((a) => ({
        name: a?.email || a?.name,
        full_name: a?.full_name || a?.name || a?.email,
        email: a?.email || a?.name,
        user_image: a?.user_image,
      }))
    : [];
  const lr = (apiTask.lead_reference || '').trim();
  const linkedLeadName = (apiTask.linked_lead_name || '').trim();
  const setTrigger = truthyTrigger(apiTask.set_trigger) || truthyTrigger(apiTask.setTrigger);
  const triggerTypeRaw = String(apiTask.trigger_type || apiTask.triggerType || '').trim();
  const triggerTypeLabel = /drop/i.test(triggerTypeRaw)
    ? 'Drop Reason'
    : /pipeline/i.test(triggerTypeRaw) || (setTrigger && !triggerTypeRaw)
      ? 'Pipeline'
      : triggerTypeRaw || '';
  const lifecycleStageLabel =
    apiTask.lifecycle_stage_display ?? apiTask.lifecycleStageLabel ?? apiTask.lifecycle_stage ?? '';
  const lifecycleStageStatusLabel =
    apiTask.lifecycle_stage_status_display ??
    apiTask.lifecycleStageStatusLabel ??
    apiTask.lifecycle_stage_status ??
    '';
  const lifecycleStageColor = apiTask.lifecycle_stage_color ?? apiTask.lifecycleStageColor ?? null;
  const pipelineLabel =
    apiTask.pipeline_display ?? apiTask.pipeline_label ?? apiTask.pipeline ?? '';
  const dropReasonRaw = apiTask.drop_reason ?? apiTask.dropReason;
  const dropReasonParts = Array.isArray(dropReasonRaw)
    ? dropReasonRaw
    : typeof dropReasonRaw === 'string' && dropReasonRaw.trim()
      ? (() => {
          try {
            const parsed = JSON.parse(dropReasonRaw);
            return Array.isArray(parsed) ? parsed : [dropReasonRaw];
          } catch {
            return [dropReasonRaw];
          }
        })()
      : [];
  const dropReasonLabel = dropReasonParts
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(', ');
  return {
    id: apiTask.name || apiTask.id,
    title: apiTask.subject || apiTask.task || apiTask.title || '',
    status: apiTask.status || '',
    assignees,
    type: apiTask.acl_type || apiTask.type || '',
    dueDate,
    priority: apiTask.priority || '',
    description: apiTask.description || '',
    tags: apiTask.tags || [],
    attachments: apiTask.attachments || [],
    comments: apiTask.comments || [],
    history: apiTask.history || [],
    leadReference: lr || undefined,
    linkedLeadName: linkedLeadName || undefined,
    setTrigger,
    triggerTypeLabel,
    pipelineLabel: pipelineLabel || '',
    lifecycleStageLabel: lifecycleStageLabel || '',
    lifecycleStageStatusLabel: lifecycleStageStatusLabel || '',
    lifecycleStageColor,
    dropReasonLabel,
  };
};

const CrmTaskViewDrawer = ({
  open,
  onOpenChange,
  task,
  onTaskUpdate,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
  showLifecycleFields = false,
  /** Contact/Lead detail: show lifecycle stage/status read-only; lock title when task is trigger-based. */
  lifecycleReadOnlySummary = false,
  assigneeOptions = [],
  assigneeOptionsLoading = false,
  /** When true (e.g. CRM Contact tasks), show "Lead: …" under title if task has lead_reference */
  showLeadReferenceCaption = false,
}) => {
  const dispatch = useDispatch();
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [displayTask, setDisplayTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [typeOptions, setTypeOptions] = useState([]);
  const [localDescription, setLocalDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [taskSubscribers, setTaskSubscribers] = useState([]);
  const [taskSubscribed, setTaskSubscribed] = useState(false);
  const [taskSubscribersLoading, setTaskSubscribersLoading] = useState(false);
  const lastFetchedIdRef = useRef(null);
  const fileInputRef = useRef(null);

  const taskId = task?.id;

  useEffect(() => {
    if (!open || !taskId) {
      lastFetchedIdRef.current = null;
      setDisplayTask(null);
      setLocalDescription('');
      setUploadError('');
      return;
    }
    if (lastFetchedIdRef.current === taskId) return;
    lastFetchedIdRef.current = taskId;
    setDisplayTask(null);

    // if (useTaskFromPropsOnly && task) {
    //   const base = apiToDrawerTask(task) || {
    //     id: task.id,
    //     title: task.title || task.task || task.subject || '',
    //     status: task.status || '',
    //     assignees: task.assignees || task.assignee || [],
    //     type: task.type || '',
    //     dueDate: task.dueDate || task.due_date,
    //     priority: task.priority || '',
    //     description: task.description || '',
    //     tags: task.tags || [],
    //     attachments: task.attachments || [],
    //   };
    //   setDisplayTask({ ...base, comments: task.comments || [], history: task.history || [] });
    //   setIsLoading(false);
    //   return;
    // }

    setIsLoading(true);
    Promise.all([
      dispatch(fetchAclTaskDetail(taskId)).unwrap(),
      dispatch(fetchAclTaskActivities(taskId))
        .unwrap()
        .catch(() => ({ comments: [], history: [] })),
    ])
      .then(([apiTask, activities]) => {
        const drawerTask = apiToDrawerTask(apiTask);
        const { comments, history } = normalizeActivitiesForDrawer(activities || {});
        drawerTask.comments = comments;
        drawerTask.history = history;
        setDisplayTask(drawerTask);
      })
      .catch((error) => {
        setDisplayTask(apiToDrawerTask(null));
        showErrorToast(error?.message || error || 'Failed to load task');
      })
      .finally(() => setIsLoading(false));
  }, [open, taskId, dispatch, task]);

  useEffect(() => {
    if (open && task && !displayTask && !isLoading) {
      const base = apiToDrawerTask({
        ...task,
        name: task.id,
        subject: task.title || task.task,
        task: task.title || task.task,
        acl_type: task.type,
        assignees: task.assignees || task.assignee,
      });
      if (base) {
        setDisplayTask({ ...base, comments: [], history: [] });
      }
    }
  }, [open, task, displayTask, isLoading]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    apiClient
      .get(LEAD_CRM_TASK_TYPE_API)
      .then((res) => {
        const data = res?.data?.message ?? res?.data ?? [];
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        if (mounted) setTypeOptions(list);
      })
      .catch(() => mounted && setTypeOptions([]));
    return () => {
      mounted = false;
    };
  }, [open]);

  const effectiveTask = displayTask || task;

  useEffect(() => {
    const desc = effectiveTask?.description ?? '';
    setLocalDescription(desc);
  }, [effectiveTask?.id, effectiveTask?.description]);

  const buildUpdateDoc = useCallback((field, value) => {
    const map = {
      title: 'subject',
      dueDate: 'exp_end_date',
      type: 'acl_type',
    };
    const k = map[field] ?? field;
    let v = value;
    if (field === 'dueDate' && typeof value === 'string' && value) {
      const m = value.match(/(\d+)\w+\s+(\w+)\s+(\d{2})/);
      if (m) {
        const months = {
          Jan: 1,
          Feb: 2,
          Mar: 3,
          Apr: 4,
          May: 5,
          Jun: 6,
          Jul: 7,
          Aug: 8,
          Sep: 9,
          Oct: 10,
          Nov: 11,
          Dec: 12,
        };
        const mo = months[m[2]];
        if (mo)
          v = `${m[3].startsWith('20') ? m[3] : `20${m[3]}`}-${String(mo).padStart(2, '0')}-${String(Number.parseInt(m[1], 10)).padStart(2, '0')}`;
      }
    }
    if (field === 'assignees') {
      v = Array.isArray(value)
        ? value.map((a) => (typeof a === 'string' ? a : a?.email || a?.name)).filter(Boolean)
        : [];
    }
    return { [k]: v };
  }, []);

  const handleFieldChange = useCallback(
    async (field, value) => {
      const tid = effectiveTask?.id || taskId;
      if (!tid) return;
      if (field === 'title' && truthyTrigger(effectiveTask?.setTrigger)) {
        return;
      }
      const doc = buildUpdateDoc(field, value);
      setDisplayTask((prev) => {
        const next = { ...prev };
        if (field === 'title') next.title = value;
        else if (field === 'status') next.status = value;
        else if (field === 'assignees') next.assignees = value;
        else if (field === 'type') next.type = value;
        else if (field === 'dueDate') next.dueDate = value;
        else if (field === 'priority') next.priority = value;
        else if (field === 'description') next.description = value;
        else if (field === 'tags') next.tags = value;
        return next;
      });
      setIsUpdating(true);
      try {
        await dispatch(updateAclTask({ taskId: tid, doc })).unwrap();
        const activities = await dispatch(fetchAclTaskActivities(tid)).unwrap();
        const { comments, history } = normalizeActivitiesForDrawer(activities);
        setDisplayTask((prev) => (prev ? { ...prev, comments, history } : prev));
        if (onTaskUpdate) {
          await Promise.resolve(onTaskUpdate(tid, field, value));
        }
      } catch (error) {
        showErrorToast(error?.message || error || 'Failed to update task');
      } finally {
        setIsUpdating(false);
      }
    },
    [effectiveTask?.id, effectiveTask?.setTrigger, taskId, buildUpdateDoc, dispatch, onTaskUpdate],
  );

  const refreshTaskComments = useCallback(async () => {
    const tid = effectiveTask?.id || taskId;
    if (!tid) return;
    const activities = await dispatch(fetchAclTaskActivities(tid)).unwrap();
    const { comments, history } = normalizeActivitiesForDrawer(activities);
    setDisplayTask((prev) => (prev ? { ...prev, comments, history } : prev));
  }, [effectiveTask?.id, taskId, dispatch]);

  const handleFileUpload = useCallback(
    async (files) => {
      const tid = effectiveTask?.id || taskId;
      if (!tid) {
        showErrorToast('Cannot upload: task not loaded');
        return;
      }

      const fileArray = [...files];
      if (fileArray.length === 0) return;

      setIsUploading(true);
      setUploadError('');

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
        const uploadPromises = validFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('doctype', 'ACL Task');
          formData.append('docname', tid);
          formData.append('is_private', 0);

          const response = await apiClient.post('/method/upload_file', formData);
          return response.data;
        });

        await Promise.all(uploadPromises);

        const result = await dispatch(fetchAclTaskDetail(tid)).unwrap();
        setDisplayTask(apiToDrawerTask(result));

        showSuccessToast('File(s) uploaded successfully');
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?._server_messages ||
          error?.message ||
          'Failed to upload file. Please try again.';
        setUploadError(errorMessage);
        showErrorToast(errorMessage);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [effectiveTask?.id, taskId, dispatch],
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

  const handleAddTag = useCallback(() => {
    const value = newTagValue.trim();
    if (value) {
      const currentTags = effectiveTask?.tags || [];
      if (!currentTags.includes(value)) {
        handleFieldChange('tags', [...currentTags, value]);
      }
    }
    setNewTagValue('');
    setIsAddingTag(false);
  }, [newTagValue, effectiveTask?.tags, handleFieldChange]);

  const handleRemoveTag = useCallback(
    (indexOrTag) => {
      const currentTags = effectiveTask?.tags || [];
      const next =
        typeof indexOrTag === 'number'
          ? currentTags.filter((_, i) => i !== indexOrTag)
          : currentTags.filter((t) => t !== indexOrTag);
      handleFieldChange('tags', next);
    },
    [effectiveTask?.tags, handleFieldChange],
  );

  const handleRemoveAttachment = useCallback(
    async (attachmentId, childRowId) => {
      const fileUrl = childRowId || attachmentId;
      if (!fileUrl || typeof fileUrl !== 'string') {
        showErrorToast('Cannot delete: file URL not available');
        return;
      }
      try {
        await dispatch(deleteAclTaskAttachment(fileUrl)).unwrap();
        const tid = effectiveTask?.id || taskId;
        if (tid) {
          const res = await dispatch(fetchAclTaskDetail(tid)).unwrap();
          setDisplayTask(apiToDrawerTask(res));
        }
        showSuccessToast('Attachment removed');
      } catch (error) {
        showErrorToast(error?.message || error || 'Failed to remove attachment');
      }
    },
    [dispatch, effectiveTask?.id, taskId],
  );

  const attachments = useMemo(() => normalizeAclTaskAttachments(displayTask), [displayTask]);

  const refreshTaskSubscribers = useCallback(async () => {
    if (!open) return;
    const name = effectiveTask?.id || taskId;
    if (name == null || name === '') return;
    const ref = String(name);
    setTaskSubscribersLoading(true);
    try {
      const [status, list] = await Promise.all([
        getSubscriptionStatus(ACL_TASK_DOCTYPE, ref),
        listDocumentSubscribers(ACL_TASK_DOCTYPE, ref),
      ]);
      setTaskSubscribed(Boolean(status?.subscribed));
      setTaskSubscribers(Array.isArray(list) ? list : []);
    } catch {
      // keep existing list on failure
    } finally {
      setTaskSubscribersLoading(false);
    }
  }, [open, effectiveTask?.id, taskId]);

  useEffect(() => {
    setTaskSubscribers([]);
    setTaskSubscribed(false);
  }, [taskId]);

  useEffect(() => {
    if (!open || !(effectiveTask?.id || taskId)) return;
    refreshTaskSubscribers();
  }, [open, effectiveTask?.id, taskId, displayTask?.modified, refreshTaskSubscribers]);

  if (!open || !task) return null;
  const t = effectiveTask || task;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[1200px]'>
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1'>
                <ButtonGroup.Root size='xsmall'>
                  <ButtonGroup.Item
                    onClick={onNavigatePrevious}
                    disabled={!hasPrevious}
                    aria-label='Previous task'
                  >
                    <ButtonGroup.Icon as={RiArrowLeftSLine} />
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    onClick={onNavigateNext}
                    disabled={!hasNext}
                    aria-label='Next task'
                  >
                    <ButtonGroup.Icon as={RiArrowRightSLine} />
                  </ButtonGroup.Item>
                </ButtonGroup.Root>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              {t?.id ? (
                <DocumentFollowersPopover
                  referenceDoctype={ACL_TASK_DOCTYPE}
                  referenceName={String(t.id)}
                  followers={taskSubscribers}
                  subscribed={taskSubscribed}
                  subscribersLoading={taskSubscribersLoading}
                  onRefreshSubscribers={refreshTaskSubscribers}
                  canManageOthers
                  internalOnlySearch
                />
              ) : null}
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={() => onOpenChange(false)}
                className='shrink-0'
              >
                <Button.Icon as={RiCloseLine} className='shrink-0' />
              </Button.Root>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-hidden flex flex-col min-h-0'>
          <div className='flex flex-1 min-h-0'>
            <div className='w-[420px] shrink-0 border-r border-stroke-soft-200 overflow-y-auto min-h-0'>
              <div className='px-6 pt-5 pb-6 flex flex-col gap-6'>
                <div>
                  {showLeadReferenceCaption && (t.leadReference || t.linkedLeadName) ? (
                    <div className='mb-3 flex min-w-0 flex-wrap items-center gap-2 px-1'>
                      <Badge.Root
                        variant='light'
                        color='green'
                        size='small'
                        className='shrink-0 font-semibold uppercase tracking-wide'
                      >
                        Lead
                      </Badge.Root>
                      <span className='min-w-0 truncate text-paragraph-sm font-semibold text-text-main-900'>
                        {t.linkedLeadName || t.leadReference}
                      </span>
                    </div>
                  ) : null}
                  {lifecycleReadOnlySummary && truthyTrigger(t.setTrigger) ? (
                    <div className='field-sizing-content min-h-10 p-1 text-title-h5 font-semibold text-text-main-900'>
                      {t.title || ''}
                    </div>
                  ) : (
                    <Textarea.Root
                      variant='borderless'
                      simple
                      value={t.title || ''}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      className='field-sizing-content text-title-h5 text-text-main-900 font-semibold p-1'
                      rows={1}
                      placeholder='Task Title'
                    />
                  )}
                </div>

                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  <FieldRow icon={RiPriceTag3Line} label='Status' editable={true}>
                    <Select.Root
                      variant='borderless'
                      value={t.status}
                      onValueChange={(value) => handleFieldChange('status', value)}
                      size='xsmall'
                    >
                      <Select.Trigger className='w-full' showArrow={false}>
                        <Select.Value asChild>
                          <Badge.Root
                            variant='light'
                            color={getStatusColor(t.status)}
                            size='small'
                            className='text-nowrap'
                          >
                            {t.status || 'Not Set'}
                          </Badge.Root>
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {STATUS_OPTIONS.map((opt) => (
                          <Select.Item key={opt} value={opt}>
                            <Badge.Root
                              variant='light'
                              color={getStatusColor(opt)}
                              size='small'
                              className='text-nowrap'
                            >
                              {opt}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>

                  <FieldRow icon={RiUserLine} label='Assignee' editable={true}>
                    <AssigneeMultiSelect
                      value={
                        Array.isArray(t.assignees) ? t.assignees : t.assignees ? [t.assignees] : []
                      }
                      onChange={(values) => {
                        handleFieldChange('assignees', values.length > 0 ? values : '');
                      }}
                      placeholder='Select assignees'
                      size='xsmall'
                      maxVisibleAvatars={3}
                      options={assigneeOptions}
                      optionsLoading={assigneeOptionsLoading}
                    />
                  </FieldRow>

                  <FieldRow icon={RiPriceTag3Line} label='Type' editable={true}>
                    <SearchableSelect
                      id='type'
                      value={t.type || ''}
                      onValueChange={(value) => handleFieldChange('type', value)}
                      options={typeOptions}
                      variant='borderless'
                      size='xsmall'
                      triggerClassName='w-full'
                      placeholder='Not Set'
                      searchPlaceholder='Search...'
                      emptyMessage='No task types available'
                      noResultsMessage='No task types found'
                      getOptionValue={(opt) => opt?.name ?? opt?.type ?? opt?.value ?? opt ?? ''}
                      getOptionLabel={(opt) =>
                        typeof opt === 'object'
                          ? (opt?.type ?? opt?.name ?? String(opt?.value ?? ''))
                          : String(opt)
                      }
                      isolateSearchKeyboard
                      renderTrigger={({ selectedLabel, placeholder }) => (
                        <Badge.Root
                          variant='stroke'
                          color='gray'
                          size='small'
                          className='text-nowrap text-text-sub-600 bg-bg-white-0 border-stroke-soft-200'
                        >
                          {selectedLabel || placeholder}
                        </Badge.Root>
                      )}
                      renderOptionLabel={(opt) => {
                        const label =
                          typeof opt === 'object'
                            ? (opt?.type ?? opt?.name ?? String(opt?.value ?? ''))
                            : String(opt);
                        return (
                          <Badge.Root
                            variant='stroke'
                            color='gray'
                            size='small'
                            className='text-nowrap text-text-sub-600 bg-bg-white-0 border-stroke-soft-200'
                          >
                            {label}
                          </Badge.Root>
                        );
                      }}
                      itemKeyPrefix='task-type-'
                    />
                  </FieldRow>

                  {lifecycleReadOnlySummary ? (
                    <>
                      <FieldRow icon={RiFlagLine} label='Trigger Type' editable={false}>
                        {t.triggerTypeLabel && truthyTrigger(t.setTrigger) ? (
                          <span className={LIFECYCLE_STATUS_PILL_CLASS}>{t.triggerTypeLabel}</span>
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>—</span>
                        )}
                      </FieldRow>
                      <FieldRow icon={RiFlagLine} label='Pipeline' editable={false}>
                        {t.pipelineLabel ? (
                          <span className={LIFECYCLE_STATUS_PILL_CLASS}>{t.pipelineLabel}</span>
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>—</span>
                        )}
                      </FieldRow>
                      <FieldRow icon={RiFlagLine} label='Lifecycle Stage' editable={false}>
                        {t.lifecycleStageLabel ? (
                          <CrmLifecycleStagePill
                            value={t.lifecycleStageLabel}
                            stageColor={t.lifecycleStageColor}
                          />
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>—</span>
                        )}
                      </FieldRow>
                      <FieldRow icon={RiFlagLine} label='Lifecycle Stage Status' editable={false}>
                        {t.lifecycleStageStatusLabel ? (
                          <span className={LIFECYCLE_STATUS_PILL_CLASS}>
                            {t.lifecycleStageStatusLabel}
                          </span>
                        ) : (
                          <span className='paragraph-small text-text-sub-500'>—</span>
                        )}
                      </FieldRow>
                      <FieldRow icon={RiFlagLine} label='Drop Reason' editable={false}>
                        <span className='paragraph-small text-text-main-900'>
                          {t.dropReasonLabel || '—'}
                        </span>
                      </FieldRow>
                    </>
                  ) : null}

                  <FieldRow icon={RiCalendarLine} label='Due Date' editable={true}>
                    <Datepicker
                      value={parseSafeDate(t.dueDate)}
                      onChange={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          handleFieldChange('dueDate', `${year}-${month}-${day}`);
                        } else {
                          handleFieldChange('dueDate', '');
                        }
                      }}
                      placeholder='Select a date'
                      variant='borderless'
                      size='xsmall'
                    />
                  </FieldRow>

                  <FieldRow icon={RiFlagLine} label='Priority' editable={true}>
                    <Select.Root
                      variant='borderless'
                      value={t.priority}
                      onValueChange={(value) => handleFieldChange('priority', value)}
                      size='xsmall'
                    >
                      <Select.Trigger className='w-full' showArrow={false}>
                        <Select.Value asChild>
                          <Badge.Root
                            variant='light'
                            color={getPriorityColor(t.priority)}
                            size='small'
                            className='text-nowrap'
                          >
                            {t.priority || 'Not Set'}
                          </Badge.Root>
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <Select.Item key={opt} value={opt}>
                            <Badge.Root
                              variant='light'
                              color={getPriorityColor(opt)}
                              size='small'
                              className='text-nowrap'
                            >
                              {opt}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>
                </div>

                <div className='flex flex-col gap-2 pt-2'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Description</span>
                  </div>
                  <Textarea.Root
                    variant='borderless'
                    simple
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value?.trim() ?? '';
                      if (value !== (t.description ?? '')) {
                        handleFieldChange('description', value);
                      }
                    }}
                    className='w-full field-sizing-content'
                    placeholder='Enter description'
                    rows={4}
                  />
                </div>

                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiPriceTag3Line size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Tags</span>
                  </div>

                  <div className='w-full'>
                    {isAddingTag ? (
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
                            setIsAddingTag(false);
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
                        onClick={() => setIsAddingTag(true)}
                      >
                        <LinkButton.Icon as={RiAddLine} />
                        Add Tag
                      </LinkButton.Root>
                    )}
                  </div>

                  {(t.tags?.length ?? 0) > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {t.tags.map((tag, index) => {
                        const tagDisplay =
                          typeof tag === 'string' ? tag : (tag?.name ?? tag?.label ?? String(tag));
                        return (
                          <Badge.Root
                            key={tagDisplay ? `${tagDisplay}-${index}` : `tag-${index}`}
                            size='small'
                            variant='stroke'
                            className='rounded-md bg-bg-weak-100 text-text-main-900 font-normal'
                          >
                            {tagDisplay}
                            <Tag.DismissButton onClick={() => handleRemoveTag(index)} />
                          </Badge.Root>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className='flex flex-col gap-3 pt-2 pb-6'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 text-text-sub-500'>
                      <RiAttachment2 size={20} className='text-neutral-400' />
                      <span className='label-small'>Attachments</span>
                    </div>
                    <div className='flex items-center gap-2'>
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
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Button.Icon as={RiUploadLine} className='p-0.5' />
                        <span>Upload Files</span>
                      </Button.Root>
                    </div>
                  </div>
                  {uploadError && (
                    <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                      <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <AttachmentList
                      attachments={attachments}
                      onRemove={(attachmentId, childRowId) =>
                        handleRemoveAttachment(attachmentId, childRowId)
                      }
                      disabled={isUploading}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className='flex flex-1 flex-col h-full overflow-y-auto bg-white border-l border-stroke-soft-200'>
              <div className='px-6 py-4 flex items-center gap-2 border-b border-stroke-soft-200 shrink-0 bg-white'>
                <RiChat2Line size={18} className='text-text-sub-500' />
                <span className='label-small text-text-sub-600'>Comments</span>
              </div>

              <div className='flex-1 flex flex-col h-full overflow-y-auto'>
                <CrmComment
                  taskId={t.id}
                  commentsData={{
                    comments: t.comments || [],
                    history: t.history || [],
                  }}
                  loading={isLoading}
                  commentDoctype='ACL Task Comment'
                  referenceDoctype={ACL_TASK_DOCTYPE}
                  referenceName={String(t.id)}
                  onRefreshSubscribers={refreshTaskSubscribers}
                  onCommentsMutated={refreshTaskComments}
                  onAddComment={async (
                    taskIdInner,
                    content,
                    attachments,
                    parentCommentId,
                    visibleToClient,
                  ) => {
                    try {
                      await dispatch(
                        addAclTaskComment({
                          aclTaskId: taskIdInner,
                          content,
                          attachments: attachments || [],
                          visibleToClient: visibleToClient ?? true,
                          parentCommentId: parentCommentId || null,
                        }),
                      ).unwrap();
                      const activities = await dispatch(
                        fetchAclTaskActivities(taskIdInner),
                      ).unwrap();
                      const { comments, history } = normalizeActivitiesForDrawer(activities);
                      setDisplayTask((prev) => (prev ? { ...prev, comments, history } : prev));
                      showSuccessToast('Comment added');
                    } catch (error) {
                      showErrorToast(error?.message || error || 'Failed to add comment');
                      throw error;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CrmTaskViewDrawer;
