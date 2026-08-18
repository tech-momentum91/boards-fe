import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAttachment2,
  RiCalendarLine,
  RiCloseLine,
  RiFlagLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Drawer from '@/components/ui/drawer';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Tag from '@/components/ui/tag';
import * as Textarea from '@/components/ui/textarea';
import AssigneeMultiSelect from '@/pages/boards/components/assignee-multi-select';
import { useBoardAttachments } from '@/pages/boards/attachments/useBoardAttachments';
import BoardAttachmentList from '@/pages/boards/attachments/BoardAttachmentList';
import {
  applyBoardTaskDetailToListTask,
  buildAssigneeUpdatePayload,
  buildCustomFieldsUpdatePayload,
  buildDueDateUpdatePayload,
  buildStartDateUpdatePayload,
  buildStatusUpdatePayload,
  buildTagsUpdatePayload,
  buildTaskFieldUpdatePayload,
  deleteBoardTaskAttachment,
  getBoardTask,
  listBoardTaskAttachments,
  normalizeBoardTaskDetail,
  updateBoardTask,
  uploadBoardTaskAttachment,
} from '@/services/tasks-service';
import { Datepicker } from '@/pages/boards/components/datepicker';
import FieldRow from '@/components/ui/field-row';
import { getPriorityColor, TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { parseToDate } from '@/utils/date-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  appendUniqueTags,
  parseCommaSeparatedTags,
} from '@/utils/task-utils';
import BoardTaskCommentsPanel from './BoardTaskCommentsPanel';
import BoardTaskStatusDropdown from './BoardTaskStatusDropdown';
import TaskCopyLinkMenu from '@/pages/boards/components/TaskCopyLinkMenu';
import BoardTaskViewDrawerSkeleton from './BoardTaskViewDrawerSkeleton';
import TaskCustomFieldCell from '../cells/TaskCustomFieldCell';
import TaskErpFieldCell from '../cells/TaskErpFieldCell';
import { getCustomColumnIcon } from '../utils/list-columns';
import {
  getCustomFieldDescription,
  normalizeCustomFieldValue,
  validateCustomFieldValue,
} from '../utils/custom-field-utils';
import {
  collectVisibleErpColumns,
  getTaskErpFieldValue,
  isErpColumn,
} from '../utils/erp-column-utils';
import { getTaskSystemListRedirectLink, getTaskSystemLink } from '../utils/system-link-utils';
import {
  resolveErpColumnValues,
  linkTaskToModule,
  unlinkTaskModule,
} from '@/services/system-list-service';
import TaskSystemLink from './TaskSystemLink';
import { resolveTaskIsClosedFromStatus } from '@/pages/boards/utils/task-statuses-utils';

function getFieldValue(task, localChanges, fieldName) {
  if (Object.prototype.hasOwnProperty.call(localChanges, fieldName)) {
    return localChanges[fieldName];
  }

  return task?.[fieldName];
}

function getLocalChangeKeysFromUpdateData(data = {}) {
  const keys = [];
  if ('title' in data) keys.push('title');
  if ('description' in data) keys.push('description');
  if ('status' in data) keys.push('status');
  if ('priority' in data) keys.push('priority');
  if ('start_date' in data) keys.push('startDate');
  if ('due_date' in data) keys.push('dueDate');
  if ('assignees' in data) keys.push('assignees');
  if ('tags' in data) keys.push('tags');
  if ('custom_fields' in data) keys.push('customFields');
  return keys;
}

function applyTaskUpdateData(taskState, data) {
  const nextTask = { ...taskState };

  if ('title' in data) {
    nextTask.title = data.title ?? '';
  }
  if ('description' in data) {
    nextTask.description = data.description ?? '';
  }
  if ('status' in data) {
    nextTask.status = data.status ?? '';
  }
  if ('is_closed' in data) {
    nextTask.isClosed = data.is_closed === true || data.is_closed === 1 || data.is_closed === '1';
  }
  if ('priority' in data) {
    nextTask.priority = data.priority ?? '';
  }
  if ('start_date' in data) {
    nextTask.startDate = data.start_date ?? '';
  }
  if ('due_date' in data) {
    nextTask.dueDate = data.due_date ?? '';
  }
  if ('assignees' in data) {
    const assignees = Array.isArray(data.assignees) ? data.assignees : [];
    nextTask.assignees = assignees;
    nextTask.assignee = assignees[0] ?? '';
  }
  if ('tags' in data) {
    nextTask.tags = Array.isArray(data.tags) ? data.tags : [];
  }
  if ('custom_fields' in data) {
    const nextCustomFields =
      data.custom_fields && typeof data.custom_fields === 'object' ? data.custom_fields : {};
    nextTask.customFields = nextCustomFields;
  }
  if ('is_draft' in data) {
    nextTask.isDraft = data.is_draft === true || data.is_draft === 1 || data.is_draft === '1';
  }

  return nextTask;
}

export default function BoardTaskViewDrawer({
  open = false,
  onOpenChange,
  taskId = null,
  tasks = [],
  onTaskChange,
  customColumns = [],
  statusGroups = [],
  allStatusGroups = [],
  isStatusLoading = false,
  onTaskUpdated,
  sidebarTree = [],
  currentListId = null,
}) {
  const [task, setTask] = useState(null);
  const [localChanges, setLocalChanges] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const currentTaskId = task?.id ?? taskId ?? null;

  const activeTaskIdRef = useRef(taskId);
  const loadTaskRequestIdRef = useRef(0);
  const persistRequestIdRef = useRef(0);
  const persistInFlightRef = useRef(0);

  useEffect(() => {
    activeTaskIdRef.current = taskId ?? null;
  }, [taskId]);

  const attachmentHook = useBoardAttachments(
    currentTaskId,
    {
      listFn: listBoardTaskAttachments,
      uploadFn: uploadBoardTaskAttachment,
      deleteFn: deleteBoardTaskAttachment,
    },
    !currentTaskId,
  );

  const loadTask = useCallback(async (id) => {
    if (!id) {
      setTask(null);
      setLoadError('');
      setIsLoading(false);
      return;
    }

    const requestId = ++loadTaskRequestIdRef.current;
    setIsLoading(true);
    setLoadError('');

    const result = await getBoardTask(id);

    const isStaleLoad = () =>
      loadTaskRequestIdRef.current !== requestId || activeTaskIdRef.current !== id;

    if (isStaleLoad()) {
      return;
    }

    setIsLoading(false);

    if (result.error) {
      setTask(null);
      setLoadError(result.error);
      showErrorToast(result.error);
      return;
    }

    setTask(result.data ?? null);
  }, []);

  useEffect(() => {
    if (!open) {
      setIsDrawerFullyOpen(false);
      return undefined;
    }

    const timer = setTimeout(() => setIsDrawerFullyOpen(true), 300);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTask(null);
      setLocalChanges({});
      setLoadError('');
      setTitleError('');
      setIsDescriptionOpen(false);
      setTagInputVisible(false);
      setNewTagValue('');
      setIsLoading(false);
      return;
    }

    loadTask(taskId);
  }, [loadTask, open, taskId]);

  useEffect(() => {
    if (task?.description) {
      setIsDescriptionOpen(true);
    }
  }, [task?.id, task?.description]);

  const currentTaskIndex = useMemo(() => {
    if (!taskId || !tasks?.length) {
      return -1;
    }

    return tasks.findIndex((entry) => entry.id === taskId);
  }, [taskId, tasks]);

  const listTask = useMemo(() => {
    if (currentTaskIndex < 0) {
      return null;
    }

    return tasks[currentTaskIndex] ?? null;
  }, [currentTaskIndex, tasks]);

  const hasPrevious = currentTaskIndex > 0;
  const hasNext = currentTaskIndex >= 0 && currentTaskIndex < tasks.length - 1;

  const handlePrevious = useCallback(() => {
    if (!hasPrevious) {
      return;
    }

    onTaskChange?.(tasks[currentTaskIndex - 1]?.id);
  }, [currentTaskIndex, hasPrevious, onTaskChange, tasks]);

  const handleNext = useCallback(() => {
    if (!hasNext) {
      return;
    }

    onTaskChange?.(tasks[currentTaskIndex + 1]?.id);
  }, [currentTaskIndex, hasNext, onTaskChange, tasks]);

  const taskTitle = useMemo(
    () => getFieldValue(task, localChanges, 'title') ?? '',
    [localChanges, task],
  );

  const taskDescription = useMemo(
    () => getFieldValue(task, localChanges, 'description') ?? '',
    [localChanges, task],
  );

  const taskStatus = useMemo(
    () => getFieldValue(task, localChanges, 'status') ?? '',
    [localChanges, task],
  );

  const taskPriority = useMemo(
    () => getFieldValue(task, localChanges, 'priority') ?? '',
    [localChanges, task],
  );

  const taskStartDate = useMemo(
    () => getFieldValue(task, localChanges, 'startDate') ?? '',
    [localChanges, task],
  );

  const taskDueDate = useMemo(
    () => getFieldValue(task, localChanges, 'dueDate') ?? '',
    [localChanges, task],
  );

  const taskAssignees = useMemo(() => {
    const value = getFieldValue(task, localChanges, 'assignees');
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [localChanges, task]);

  const taskTags = useMemo(() => {
    const value = getFieldValue(task, localChanges, 'tags');

    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((tag) => (typeof tag === 'string' ? tag : tag?.label || tag?.name || tag?.tag || ''))
        .map((tag) => String(tag).trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    return [];
  }, [localChanges, task]);

  const taskCustomFields = useMemo(() => {
    const value = getFieldValue(task, localChanges, 'customFields');
    return value && typeof value === 'object' ? value : {};
  }, [localChanges, task]);

  const taskSystemLink = useMemo(() => {
    const loadedTaskLink = getTaskSystemLink({ ...task, customFields: taskCustomFields });
    if (loadedTaskLink) {
      return loadedTaskLink;
    }

    return getTaskSystemLink(listTask);
  }, [listTask, task, taskCustomFields]);

  const taskSystemRedirectLink = useMemo(() => {
    const loadedTaskLink = getTaskSystemListRedirectLink({
      ...task,
      title: getFieldValue(task, localChanges, 'title') ?? task?.title,
      customFields: taskCustomFields,
    });
    if (loadedTaskLink) {
      return loadedTaskLink;
    }

    return getTaskSystemListRedirectLink(listTask);
  }, [listTask, localChanges, task, taskCustomFields]);

  const [erpValuesByLink, setErpValuesByLink] = useState({});

  useEffect(() => {
    const erpColumns = collectVisibleErpColumns(customColumns);
    if (!taskSystemLink || erpColumns.length === 0) {
      setErpValuesByLink({});
      return;
    }

    let isCancelled = false;

    resolveErpColumnValues({
      links: [
        {
          doctype: taskSystemLink.doctype,
          docname: taskSystemLink.docname,
          moduleId: taskSystemLink.moduleId,
        },
      ],
      columns: erpColumns,
    }).then((result) => {
      if (isCancelled || result.error) {
        return;
      }

      setErpValuesByLink(result.data ?? {});
    });

    return () => {
      isCancelled = true;
    };
  }, [customColumns, taskSystemLink]);

  const isDraftTask = Boolean(task?.isDraft);

  const buildMergedTaskPayload = useCallback(() => {
    const mergedTitle = String(getFieldValue(task, localChanges, 'title') ?? '').trim();
    const mergedStatus = getFieldValue(task, localChanges, 'status') ?? '';
    const isClosed = resolveTaskIsClosedFromStatus(mergedStatus, statusGroups, allStatusGroups);

    return {
      ...buildTaskFieldUpdatePayload('title', mergedTitle),
      description: getFieldValue(task, localChanges, 'description') ?? '',
      ...buildStatusUpdatePayload(mergedStatus, { isClosed }),
      ...buildTaskFieldUpdatePayload(
        'priority',
        getFieldValue(task, localChanges, 'priority') ?? '',
      ),
      ...buildStartDateUpdatePayload(getFieldValue(task, localChanges, 'startDate') ?? ''),
      ...buildDueDateUpdatePayload(getFieldValue(task, localChanges, 'dueDate') ?? ''),
      ...buildAssigneeUpdatePayload(taskAssignees),
      ...buildTagsUpdatePayload(taskTags),
      ...buildCustomFieldsUpdatePayload(taskCustomFields),
    };
  }, [
    allStatusGroups,
    localChanges,
    statusGroups,
    task,
    taskAssignees,
    taskCustomFields,
    taskTags,
  ]);

  const persistUpdate = useCallback(
    async (data, { successMessage } = {}) => {
      const currentTaskId = task?.id ?? taskId;

      if (!currentTaskId) {
        return { error: 'Task is required.' };
      }

      const requestId = ++persistRequestIdRef.current;
      const persistedKeys = getLocalChangeKeysFromUpdateData(data);

      persistInFlightRef.current += 1;
      setIsSaving(true);
      const result = await updateBoardTask({ taskId: currentTaskId, data });

      persistInFlightRef.current -= 1;
      if (persistInFlightRef.current === 0) {
        setIsSaving(false);
      }

      if (persistRequestIdRef.current !== requestId || activeTaskIdRef.current !== currentTaskId) {
        return result;
      }

      if (result.error) {
        showErrorToast(result.error);
        return result;
      }

      let patchedTask = null;
      setTask((prevTask) => {
        const base = prevTask ?? normalizeBoardTaskDetail(result.data ?? {});
        patchedTask = applyTaskUpdateData(base, data);
        return patchedTask;
      });

      if (persistedKeys.length > 0) {
        setLocalChanges((previous) => {
          const next = { ...previous };
          persistedKeys.forEach((key) => {
            delete next[key];
          });
          return next;
        });
      }

      if (onTaskUpdated && listTask?.id && patchedTask) {
        onTaskUpdated?.(
          applyBoardTaskDetailToListTask(
            {
              id: currentTaskId,
              title: patchedTask.title,
              description: patchedTask.description,
              status: patchedTask.status,
              priority: patchedTask.priority,
              startDate: patchedTask.startDate,
              dueDate: patchedTask.dueDate,
              assignee: patchedTask.assignee,
              assignees: patchedTask.assignees,
              assigneeDetails: patchedTask.assigneeDetails,
              isDraft: patchedTask.isDraft,
              isArchived: patchedTask.isArchived,
              isClosed: patchedTask.isClosed,
              customFields: patchedTask.customFields,
              tags: patchedTask.tags,
            },
            listTask,
          ),
        );
      }

      if (successMessage) {
        showSuccessToast(successMessage);
      }

      return result;
    },
    [listTask, onTaskUpdated, task, taskId],
  );

  const handleSaveDraft = useCallback(async () => {
    const mergedTitle = String(getFieldValue(task, localChanges, 'title') ?? '').trim();

    if (!mergedTitle) {
      setTitleError('Title is required');
      return;
    }

    setTitleError('');
    await persistUpdate(
      {
        ...buildMergedTaskPayload(),
        is_draft: 1,
      },
      { successMessage: 'Draft saved.' },
    );
  }, [buildMergedTaskPayload, localChanges, persistUpdate, task]);

  const handlePublishDraft = useCallback(async () => {
    const mergedTitle = String(getFieldValue(task, localChanges, 'title') ?? '').trim();

    if (!mergedTitle) {
      setTitleError('Title is required');
      return;
    }

    setTitleError('');
    await persistUpdate(
      {
        ...buildMergedTaskPayload(),
        is_draft: 0,
      },
      { successMessage: 'Task created.' },
    );
  }, [buildMergedTaskPayload, localChanges, persistUpdate, task]);

  const handleFieldChange = useCallback(
    async (fieldName, value) => {
      setLocalChanges((previous) => ({ ...previous, [fieldName]: value }));

      if (isDraftTask) {
        return;
      }

      let payload = {};

      switch (fieldName) {
        case 'title':
          payload = buildTaskFieldUpdatePayload('title', value);
          break;
        case 'description':
          payload = { description: value ?? '' };
          break;
        case 'status': {
          const isClosed = resolveTaskIsClosedFromStatus(value, statusGroups, allStatusGroups);
          payload = buildStatusUpdatePayload(value, { isClosed });
          break;
        }
        case 'priority':
          payload = buildTaskFieldUpdatePayload('priority', value);
          break;
        case 'startDate':
          payload = buildStartDateUpdatePayload(value);
          break;
        case 'dueDate':
          payload = buildDueDateUpdatePayload(value);
          break;
        case 'assignees':
          payload = buildAssigneeUpdatePayload(Array.isArray(value) ? value : []);
          break;
        case 'tags':
          payload = buildTagsUpdatePayload(value);
          break;
        default:
          payload = { [fieldName]: value };
      }

      await persistUpdate(payload);
    },
    [allStatusGroups, isDraftTask, persistUpdate, statusGroups],
  );

  const handleCustomFieldChange = useCallback(
    async (fieldKey, value) => {
      const column = customColumns.find((item) => item.key === fieldKey);
      if (isErpColumn(column)) {
        return;
      }

      const validationError = validateCustomFieldValue(column?.fieldType, value, column);

      if (validationError) {
        showErrorToast(validationError);
        return;
      }

      const normalizedValue = normalizeCustomFieldValue(column?.fieldType, value);
      const nextCustomFields = {
        ...taskCustomFields,
        [fieldKey]: normalizedValue,
      };

      setLocalChanges((previous) => ({
        ...previous,
        customFields: nextCustomFields,
      }));

      if (isDraftTask) {
        return;
      }

      await persistUpdate(buildCustomFieldsUpdatePayload(nextCustomFields));
    },
    [customColumns, isDraftTask, persistUpdate, taskCustomFields],
  );

  const handleErpLinkChange = useCallback(
    async (linkedTaskId, { moduleId, docname, fieldId }) => {
      if (!linkedTaskId) {
        return;
      }

      setIsSaving(true);

      try {
        const result = docname
          ? await linkTaskToModule({
              taskId: linkedTaskId,
              moduleId,
              docname,
              primaryColumnId: fieldId,
            })
          : await unlinkTaskModule(linkedTaskId);

        if (result.error) {
          showErrorToast(result.error);
          return;
        }

        const systemLink = result.data?.system_link;
        const nextCustomFields = { ...taskCustomFields };

        if (systemLink) {
          nextCustomFields._systemLink = systemLink;
        } else {
          delete nextCustomFields._systemLink;
        }

        setLocalChanges((previous) => ({
          ...previous,
          customFields: nextCustomFields,
        }));

        setTask((previous) =>
          previous
            ? {
                ...previous,
                customFields: nextCustomFields,
              }
            : previous,
        );

        onTaskUpdated?.({
          id: linkedTaskId,
          customFields: nextCustomFields,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [onTaskUpdated, taskCustomFields],
  );

  const handleCommentAdded = useCallback(
    ({ commentCount } = {}) => {
      // Comments panel already refreshed its own thread. Only patch the count so
      // the list "Comments" column stays in sync — never reload the drawer body.
      if (commentCount === undefined || commentCount === null || !task?.id) {
        return;
      }

      const nextCount = Number(commentCount);
      if (!Number.isFinite(nextCount)) {
        return;
      }

      setTask((previous) =>
        previous?.id === task.id ? { ...previous, commentCount: nextCount } : previous,
      );
      onTaskUpdated?.({ id: task.id, commentCount: nextCount });
    },
    [onTaskUpdated, task?.id],
  );

  const handleAddTag = useCallback(() => {
    const parsed = parseCommaSeparatedTags(newTagValue);
    if (parsed.length === 0) {
      return;
    }

    const nextTags = appendUniqueTags(taskTags, parsed);
    if (nextTags.length === taskTags.length) {
      setNewTagValue('');
      setTagInputVisible(false);
      return;
    }

    handleFieldChange('tags', nextTags);
    setNewTagValue('');
    setTagInputVisible(false);
  }, [handleFieldChange, newTagValue, taskTags]);

  const handleRemoveTag = useCallback(
    (index) => {
      const next = taskTags.filter((_, idx) => idx !== index);
      handleFieldChange('tags', next);
    },
    [handleFieldChange, taskTags],
  );

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  if (!open) {
    return null;
  }

  const showSkeleton = isLoading || !isDrawerFullyOpen || (!task && !loadError);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[1200px] overflow-hidden'>
        <Drawer.Header
          className='shrink-0 border-b border-stroke-soft-200 px-6 py-3'
          showCloseButton={false}
        >
          <div className='flex w-full items-center justify-between'>
            {showSkeleton ? (
              <>
                <div className='h-8 w-32 animate-pulse rounded bg-bg-weak-100' />
                <div className='h-8 w-8 animate-pulse rounded bg-bg-weak-100' />
              </>
            ) : (
              <>
                <div className='flex items-center gap-3'>
                  <ButtonGroup.Root size='xsmall'>
                    <ButtonGroup.Item onClick={handlePrevious} disabled={!hasPrevious}>
                      <ButtonGroup.Icon as={RiArrowLeftSLine} />
                    </ButtonGroup.Item>
                    <ButtonGroup.Item onClick={handleNext} disabled={!hasNext}>
                      <ButtonGroup.Icon as={RiArrowRightSLine} />
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>

                  {isDraftTask ? (
                    <Badge.Root variant='light' color='gray' className='uppercase'>
                      Draft
                    </Badge.Root>
                  ) : null}
                </div>

                <div className='flex items-center gap-2'>
                  <TaskCopyLinkMenu
                    taskId={task?.id || taskId}
                    disabled={isSaving || isDraftTask}
                  />
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
              </>
            )}
          </div>
        </Drawer.Header>

        <Drawer.Body className='min-h-0 flex-1 overflow-hidden p-0'>
          {showSkeleton ? (
            <BoardTaskViewDrawerSkeleton />
          ) : loadError ? (
            <div className='flex h-full items-center justify-center px-6 py-10'>
              <p className='text-paragraph-sm text-error-base'>{loadError}</p>
            </div>
          ) : (
            <div className='flex h-full min-h-0'>
              <div className='w-[422px] shrink-0 overflow-y-auto border-r border-stroke-soft-200'>
                <div className='flex flex-col gap-6 px-6 pb-6 pt-5'>
                  <div className='flex flex-col gap-1'>
                    <BoardTaskStatusDropdown
                      value={taskStatus}
                      onValueChange={(value) => handleFieldChange('status', value)}
                      groups={statusGroups}
                      allGroups={allStatusGroups}
                      disabled={isSaving}
                      isLoading={isStatusLoading}
                      showLabel={false}
                      iconOnly={Boolean(taskStatus)}
                    />

                    <Textarea.Root
                      key={`${task?.id || taskId}-title-${taskTitle}`}
                      variant='borderless'
                      simple
                      defaultValue={taskTitle}
                      onChange={() => titleError && setTitleError('')}
                      onBlur={(event) => {
                        const value = event.target.value.trim();

                        if (!value) {
                          setTitleError('Title is required');
                          return;
                        }

                        setTitleError('');

                        if (value !== String(task?.title ?? '').trim()) {
                          handleFieldChange('title', value);
                        }
                      }}
                      disabled={isSaving}
                      rows={1}
                      hasError={Boolean(titleError)}
                      placeholder='Enter task title'
                      className='field-sizing-content p-1 text-title-h5 text-text-main-900'
                    />
                    {titleError ? (
                      <span className='text-paragraph-xs text-error-base'>{titleError}</span>
                    ) : null}

                    {taskSystemRedirectLink ? (
                      <div className='pt-1'>
                        <TaskSystemLink
                          systemLink={taskSystemRedirectLink}
                          variant='button'
                          onNavigate={() => onOpenChange?.(false)}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div>
                    {isDescriptionOpen ? (
                      <Textarea.Root
                        value={taskDescription}
                        onChange={(event) =>
                          setLocalChanges((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                        onBlur={(event) => {
                          const value = event.target.value;
                          if (value !== String(task?.description ?? '')) {
                            handleFieldChange('description', value);
                          }
                        }}
                        rows={4}
                        placeholder='Add description'
                        disabled={isSaving}
                        maxLength={500}
                        className='min-h-[116px]'
                      >
                        <Textarea.CharCounter
                          current={taskDescription?.length || 0}
                          max={500}
                          className='text-text-sub-500'
                        />
                      </Textarea.Root>
                    ) : (
                      <button
                        type='button'
                        onClick={() => setIsDescriptionOpen(true)}
                        className='flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 hover:border-stroke-sub-300'
                      >
                        <RiStickyNoteLine className='size-5 text-text-soft-400' />
                        <span className='text-paragraph-md text-text-soft-400'>
                          Add description
                        </span>
                      </button>
                    )}
                  </div>

                  <div className='divide-y divide-stroke-soft-200 overflow-hidden rounded-xl border border-stroke-soft-200 bg-white'>
                    <FieldRow icon={RiUserLine} label='Assignee' editable>
                      <AssigneeMultiSelect
                        value={taskAssignees}
                        onChange={(values) =>
                          setLocalChanges((previous) => ({ ...previous, assignees: values }))
                        }
                        onBlur={(values) => {
                          const previous = (task?.assignees ?? []).join(',');
                          const next = (values ?? []).join(',');

                          if (previous !== next) {
                            handleFieldChange('assignees', values ?? []);
                          }
                        }}
                        disabled={isSaving}
                        placeholder='Select'
                        size='xsmall'
                        variant='borderless'
                      />
                    </FieldRow>

                    <FieldRow icon={RiCalendarLine} label='Start Date' editable>
                      <Datepicker
                        value={taskStartDate ? parseToDate(taskStartDate) : null}
                        onChange={(date) => {
                          const next = date ? format(date, 'yyyy-MM-dd') : '';
                          handleFieldChange('startDate', next);
                        }}
                        disabled={isSaving}
                        placeholder='DD / MM / YYYY'
                        size='xsmall'
                        variant='borderless'
                      />
                    </FieldRow>

                    <FieldRow icon={RiCalendarLine} label='Due Date' editable>
                      <Datepicker
                        value={taskDueDate ? parseToDate(taskDueDate) : null}
                        onChange={(date) => {
                          const next = date ? format(date, 'yyyy-MM-dd') : '';
                          handleFieldChange('dueDate', next);
                        }}
                        disabled={isSaving}
                        placeholder='DD / MM / YYYY'
                        size='xsmall'
                        variant='borderless'
                      />
                    </FieldRow>

                    <FieldRow icon={RiFlagLine} label='Priority' editable>
                      <Select.Root
                        variant='borderless'
                        value={taskPriority || undefined}
                        onValueChange={(value) =>
                          handleFieldChange('priority', value === '__clear__' ? '' : value)
                        }
                        disabled={isSaving}
                        size='xsmall'
                      >
                        <Select.Trigger>
                          <Select.Value placeholder='Select'>
                            {taskPriority ? (
                              <Badge.Root
                                variant='light'
                                color={getPriorityColor(taskPriority)}
                                className='text-nowrap uppercase'
                              >
                                {taskPriority}
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
                                className='text-nowrap uppercase'
                              >
                                {option.label}
                              </Badge.Root>
                            </Select.Item>
                          ))}
                          {taskPriority ? <Select.Item value='__clear__'>Clear</Select.Item> : null}
                        </Select.Content>
                      </Select.Root>
                    </FieldRow>

                    {customColumns.map((column) => {
                      const ColumnIcon = getCustomColumnIcon(column);
                      const isErp = isErpColumn(column);

                      return (
                        <FieldRow
                          key={column.key}
                          icon={ColumnIcon}
                          label={column.label}
                          required={!isErp && Boolean(column.config?.required)}
                          description={getCustomFieldDescription(column)}
                          editable
                          alignTop
                        >
                          {isErp ? (
                            <TaskErpFieldCell
                              column={column}
                              task={{ id: task?.id, customFields: taskCustomFields }}
                              value={getTaskErpFieldValue(
                                { customFields: taskCustomFields },
                                column,
                                erpValuesByLink,
                              )}
                              disabled={isSaving}
                              onLinkUpdate={handleErpLinkChange}
                            />
                          ) : (
                            <TaskCustomFieldCell
                              column={column}
                              value={taskCustomFields[column.key]}
                              disabled={isSaving}
                              taskId={task?.id}
                              onUpdate={(value) => handleCustomFieldChange(column.key, value)}
                            />
                          )}
                        </FieldRow>
                      );
                    })}
                  </div>

                  <div>
                    <div className='mb-2 flex items-center gap-2'>
                      <RiPriceTag3Line size={20} className='text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Tags</span>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                      {taskTags.map((tag, index) => {
                        const tagDisplay =
                          typeof tag === 'string' ? tag : tag.label || tag.name || tag;

                        return (
                          <Tag.Root key={`${tagDisplay}-${index}`} variant='stroke'>
                            <span className='text-label-xs text-text-sub-600'>{tagDisplay}</span>
                            <Tag.DismissButton
                              onClick={() => handleRemoveTag(index)}
                              aria-label={`Remove ${tagDisplay}`}
                            />
                          </Tag.Root>
                        );
                      })}

                      {tagInputVisible ? (
                        <div className='flex items-center gap-2'>
                          <Input.Root size='xsmall' className='w-36'>
                            <Input.Wrapper>
                              <Input.Input
                                value={newTagValue}
                                onChange={(event) => setNewTagValue(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleAddTag();
                                  }

                                  if (event.key === 'Escape') {
                                    setTagInputVisible(false);
                                    setNewTagValue('');
                                  }
                                }}
                                autoFocus
                                placeholder='Enter tag'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          <Button.Root size='xsmall' onClick={handleAddTag}>
                            Add
                          </Button.Root>
                          <Button.Root
                            size='xsmall'
                            variant='neutral'
                            mode='ghost'
                            onClick={() => {
                              setTagInputVisible(false);
                              setNewTagValue('');
                            }}
                          >
                            Cancel
                          </Button.Root>
                        </div>
                      ) : (
                        <button
                          type='button'
                          onClick={() => setTagInputVisible(true)}
                          className='flex items-center gap-1 rounded-md px-2 py-1 text-paragraph-sm text-text-sub-500 hover:bg-bg-weak-50'
                        >
                          <RiAddLine className='size-4' />
                          Add New Tag
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className='mb-2 flex items-center gap-2'>
                      <RiAttachment2 size={20} className='text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Attachments</span>
                    </div>
                    <BoardAttachmentList
                      hook={attachmentHook}
                      canUpload={Boolean(task?.id) && !isSaving}
                      canDelete
                      emptyLabel='No attachments yet.'
                    />
                  </div>
                </div>
              </div>

              <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
                <div className='shrink-0 border-b border-stroke-soft-200 px-6 py-3.5'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-text-sub-500' />
                    <span className='label-small text-text-sub-500'>Comments</span>
                  </div>
                </div>

                {task?.id ? (
                  <div className='min-h-0 flex-1 overflow-hidden'>
                    <BoardTaskCommentsPanel
                      taskId={task.id}
                      onCommentAdded={handleCommentAdded}
                      sidebarTree={sidebarTree}
                      currentListId={currentListId ?? task.listId ?? null}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </Drawer.Body>

        {isDraftTask && !showSkeleton && !loadError ? (
          <Drawer.Footer className='sticky bottom-0 z-10 shrink-0 border-t border-stroke-soft-200 bg-white px-6 py-4'>
            <div className='flex items-center justify-between gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancel
              </Button.Root>

              <div className='flex items-center gap-3'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  disabled={isSaving}
                  onClick={handleSaveDraft}
                >
                  {isSaving ? 'Saving...' : 'Save as Draft'}
                </Button.Root>
                <Button.Root
                  type='button'
                  variant='primary'
                  mode='filled'
                  disabled={isSaving}
                  onClick={handlePublishDraft}
                >
                  {isSaving ? 'Creating...' : 'Create'}
                </Button.Root>
              </div>
            </div>
          </Drawer.Footer>
        ) : null}
      </Drawer.Content>
    </Drawer.Root>
  );
}
