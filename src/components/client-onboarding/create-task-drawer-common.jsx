import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import _ from 'lodash';
import {
  RiFileList2Line,
  RiStickyNoteLine,
  RiUserLine,
  RiBuildingLine,
  RiPriceTag3Line,
  RiLoader2Fill,
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningFill,
  RiAddLine,
  RiAttachment2,
  RiUploadLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import * as Tag from '@/components/ui/tag';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as LinkButton from '@/components/ui/link-button';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import ErrorText from '@/components/ui/error-text';
import * as Textarea from '@/components/ui/textarea';
import AttachmentList from '@/components/ui/attachment-list';
import { Datepicker } from '@/components/ui/datepicker';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import EventTaskAssigneeMultiSelect from '@/components/ui/event-task-assignee-multi-select';
import { isBefore, startOfDay } from 'date-fns';
import { formatDateToYYYYMMDD, getMinCustomNextUpdateDate, parseToDate } from '@/utils/date-utils';
import {
  createTaskDrawerCommonSchema,
  createTaskDrawerCommonOptionalPrioritySchema,
  createTaskDrawerCommonWithCentersSchema,
  createTaskDrawerCommonWithCentersOptionalPrioritySchema,
  createTaskDrawerPartnerDueDateSchema,
  createTaskDrawerEventTaskWithCentersSchema,
  createTaskDrawerEventTaskWithCentersOptionalPrioritySchema,
  defaultCreateTaskDrawerCommonValues,
} from '@/schemas/task-schema';
import { MONTH_OPTIONS } from '@/constants/constants';
import {
  getPriorityColor,
  getStatusColor,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  RECURRING_FREQUENCY_OPTIONS,
} from '@/components/client-onboarding/constants';
import { getRolesWithDescription } from '@/redux/settingSlice';
import { useDispatch } from 'react-redux';
import { sanitizeUnsignedIntegerInput } from '@/components/client-onboarding/task-view-drawer-utils';
import { cn } from '@/utils/cn';
import {
  filterAssigneeIdsByCenters,
  normalizeAssigneeIds,
  normalizeCenterIds,
} from '@/components/event-management/event-task-assignee-utils';

const CreateTaskDrawerCommon = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  taskType = 'Client Onboarding',
  showTagsInput = false, // Show tags input (Client Onboarding style) vs simple input
  showRecurring = false, // Show recurring task checkbox (Client Engagement)
  /** Override for Partner detail CRM tasks vs master (Active/Inactive) */
  statusOptions = TASK_STATUS_OPTIONS,
  /** First matching option is used as default when status is empty (e.g. 'Active' or 'Open') */
  defaultStatusKeyword = 'Active',
  /** Partner detail tasks: single required due date instead of duration + next update (days) */
  dueDateMode = false,
  /** Event Tasks: require at least one center from the event’s linked centers */
  requireEventCenters = false,
  /** Options for event center multi-select (subset of event’s centers) */
  eventCenterOptions = [],
  /** Full center rows (with zone) for CenterAccessDropdown in Event Task drawer */
  eventCenters = [],
  /** When set, assignee dropdown uses these users (e.g. sales team) instead of role names */
  assigneeSelectItems,
  assigneeSelectLoading = false,
  /** Event Tasks: role checkboxes (CRM Team / Facility Team / Operation Head) above users */
  assigneeRoleOptions,
  /** Event Tasks: role → users groups from `get_users_by_roles` */
  assigneeRoleGroups,
  /** When false, Priority is optional (no asterisk / no zod required). Default true. */
  requirePriority = true,
  /** Override drawer header (default: "Create New Task" + taskType line) */
  drawerTitle,
  drawerDescription,
}) => {
  const validationSchema = useMemo(() => {
    if (requireEventCenters && dueDateMode) {
      return requirePriority
        ? createTaskDrawerEventTaskWithCentersSchema
        : createTaskDrawerEventTaskWithCentersOptionalPrioritySchema;
    }
    if (requireEventCenters) {
      return requirePriority
        ? createTaskDrawerCommonWithCentersSchema
        : createTaskDrawerCommonWithCentersOptionalPrioritySchema;
    }
    if (dueDateMode) return createTaskDrawerPartnerDueDateSchema;
    return requirePriority
      ? createTaskDrawerCommonSchema
      : createTaskDrawerCommonOptionalPrioritySchema;
  }, [requireEventCenters, dueDateMode, requirePriority]);
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const roleOptions = useMemo(() => {
    return (roles || []).map((role) => {
      const value = role?.name ?? role?.role ?? role?.value ?? String(role);
      const label = role?.name ?? role?.description ?? role?.role ?? value;
      return { value, label };
    });
  }, [roles]);

  // Tags handling - two different styles
  const [tagArray, setTagArray] = useState([]);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [tags, setTags] = useState('');

  const dispatch = useDispatch();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    trigger,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: defaultCreateTaskDrawerCommonValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedRecurrencePeriod = watch('recurrence_period');
  const watchedStatus = watch('status');
  const watchedPriority = watch('priority');
  const watchedDueDate = watch('next_update_date');
  const watchedCustomNextUpdate = watch('custom_next_update_date');
  const watchedEventCenter = watch('eventCenter');
  const watchedAssignedTo = watch('assignedTo');
  const dueDateDocumentTaskMode = dueDateMode;
  const selectedEventCenterIds = useMemo(
    () => (requireEventCenters ? normalizeCenterIds(watchedEventCenter) : []),
    [requireEventCenters, watchedEventCenter],
  );

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

  // When only one event center is linked, auto-select it (CenterAccessDropdown is read-only in that case).
  useEffect(() => {
    if (!isOpen || !requireEventCenters) return;
    const ids = eventCenterPickerCenters
      .map((c) => String(c?.name ?? c?.value ?? '').trim())
      .filter(Boolean);
    if (ids.length !== 1) return;
    const current = normalizeCenterIds(watchedEventCenter);
    if (current.length === 0) {
      setValue('eventCenter', [ids[0]], { shouldValidate: isSubmitted });
    }
  }, [
    isOpen,
    requireEventCenters,
    eventCenterPickerCenters,
    watchedEventCenter,
    setValue,
    isSubmitted,
  ]);

  // When centers change, drop assignees who do not belong to the selected center(s).
  useEffect(() => {
    if (!isOpen || !requireEventCenters) return;
    if (selectedEventCenterIds.length === 0) return;
    if (!Array.isArray(assigneeSelectItems)) return;

    const current = normalizeAssigneeIds(watchedAssignedTo);
    const next = filterAssigneeIdsByCenters(current, assigneeSelectItems, selectedEventCenterIds, {
      keepUnknown: true,
    });
    if (current.length === next.length && current.every((id, i) => id === next[i])) {
      return;
    }
    setValue('assignedTo', next, { shouldValidate: isSubmitted });
  }, [
    isOpen,
    requireEventCenters,
    selectedEventCenterIds,
    assigneeSelectItems,
    watchedAssignedTo,
    setValue,
    isSubmitted,
  ]);
  const minCustomNextUpdateDate = useMemo(
    () => (dueDateDocumentTaskMode ? getMinCustomNextUpdateDate(watchedDueDate) : undefined),
    [dueDateDocumentTaskMode, watchedDueDate],
  );

  useEffect(() => {
    if (!dueDateDocumentTaskMode || !isOpen) return;
    const next = String(watchedCustomNextUpdate ?? '').trim();
    if (!next || !minCustomNextUpdateDate) return;
    const selected = parseToDate(next);
    if (!selected) return;
    if (isBefore(startOfDay(selected), minCustomNextUpdateDate)) {
      setValue('custom_next_update_date', '');
    }
  }, [isOpen, dueDateDocumentTaskMode, minCustomNextUpdateDate, watchedCustomNextUpdate, setValue]);

  useEffect(() => {
    if (!dueDateDocumentTaskMode || !isOpen) return;
    const due = String(watchedDueDate ?? '').trim();
    const next = String(watchedCustomNextUpdate ?? '').trim();
    if (!due && !next) {
      clearErrors('custom_next_update_date');
      return;
    }
    void trigger(['next_update_date', 'custom_next_update_date']);
  }, [
    isOpen,
    watchedDueDate,
    watchedCustomNextUpdate,
    trigger,
    clearErrors,
    dueDateDocumentTaskMode,
  ]);

  const normalizedAssigneeSelectItems = useMemo(() => {
    if (!Array.isArray(assigneeSelectItems)) return [];
    return assigneeSelectItems.map((item, i) => {
      const value = item.value ?? item.user_id ?? item.email ?? item.name;
      const label = item.label ?? item.full_name ?? item.name ?? value ?? `User ${i + 1}`;
      return {
        ...item,
        value,
        label,
        full_name: item.full_name ?? label,
      };
    });
  }, [assigneeSelectItems]);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      reset(defaultCreateTaskDrawerCommonValues);
      setAttachments([]);
      setFileError(null);
      setTagArray([]);
      setTags('');
      setTagInputVisible(false);
      setNewTagValue('');
      setIsDescriptionOpen(false);
      setValue('tagArr', []);
      setValue('eventCenter', []);
      setValue('recurrence_period', 'One Time');
      setValue('recurrence_date', '');
      setValue('recurrence_quarterly_date', '');
      setValue('recurrence_month', '');
      setValue('custom_next_update_date', '');
    }
  }, [isOpen, reset, setValue]);

  useEffect(() => {
    if (assigneeSelectItems !== undefined) return;
    const fetchRoles = async () => {
      try {
        const response = await dispatch(getRolesWithDescription()).unwrap();
        const list = response?.message ?? response ?? [];
        setRoles(Array.isArray(list) ? list : []);
      } catch {
        // console.log('error in handleGetRoles', error);
      }
    };
    fetchRoles();
  }, [assigneeSelectItems, dispatch]);

  // Default status when empty (Active for master/settings tasks, Open for partner detail tasks)
  useEffect(() => {
    if (!watchedStatus && statusOptions.length > 0) {
      const preferred = statusOptions.find(
        (s) => (s?.value || s?.label || s) === defaultStatusKeyword,
      );
      if (preferred) {
        const val = preferred?.value || preferred?.label || defaultStatusKeyword;
        setValue('status', val);
      } else {
        const firstStatus = statusOptions[0];
        const firstValue = firstStatus?.value || firstStatus?.label || firstStatus;
        if (firstValue) {
          setValue('status', firstValue);
        }
      }
    }
  }, [watchedStatus, setValue, statusOptions, defaultStatusKeyword]);

  // Reset recurrence fields when recurrence_period is "One Time" or empty
  useEffect(() => {
    if (!watchedRecurrencePeriod || watchedRecurrencePeriod === 'One Time') {
      setValue('recurrence_date', '');
      setValue('recurrence_month', '');
    }
  }, [watchedRecurrencePeriod, setValue]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleFileUpload = useCallback((files) => {
    setFileError(null);
    const validFiles = [];
    const invalidFiles = [];

    [...files].forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push({
          id: Date.now() + Math.random(),
          file,
          name: file.name,
          fileName: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          createdAt: new Date(),
        });
      }
    });

    if (invalidFiles.length > 0) {
      setFileError(`The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setAttachments((previous) => [...previous, ...validFiles]);
    }
  }, []);

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

  const removeAttachment = useCallback((id) => {
    setAttachments((previous) => {
      const fileToRemove = previous.find((file) => file.id === id || file.id === id);
      // Clean up object URL if it exists
      if (fileToRemove && fileToRemove.file && fileToRemove.file instanceof File) {
        // The AttachmentList component handles blob URL cleanup
      }
      return previous.filter((file) => file.id !== id);
    });
  }, []);

  const handleTagInput = useCallback(
    (e) => {
      if (e.key === 'Enter' && newTagValue.trim()) {
        e.preventDefault();
        const newTag = newTagValue.trim();
        if (!tagArray.includes(newTag)) {
          const updatedTags = [...tagArray, newTag];
          setTagArray(updatedTags);
          setValue('tagArr', updatedTags);
        }
        setNewTagValue('');
      }
    },
    [newTagValue, tagArray, setValue],
  );

  const handleAddTag = useCallback(() => {
    if (newTagValue.trim()) {
      const newTag = newTagValue.trim();
      if (!tagArray.includes(newTag)) {
        const updatedTags = [...tagArray, newTag];
        setTagArray(updatedTags);
        setValue('tagArr', updatedTags);
      }
      setNewTagValue('');
      setTagInputVisible(false);
    }
  }, [newTagValue, tagArray, setValue]);

  const removeTag = useCallback(
    (tagToRemove) => {
      const updatedTags = tagArray.filter((tag) => tag !== tagToRemove);
      setTagArray(updatedTags);
      setValue('tagArr', updatedTags);
    },
    [tagArray, setValue],
  );

  const handleSimpleTagInput = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.target.value.trim()) {
          const newTag = e.target.value.trim();
          if (!tagArray.includes(newTag)) {
            const updatedTags = [...tagArray, newTag];
            setTagArray(updatedTags);
            setValue('tagArr', updatedTags);
            setTags('');
          }
        }
      }
    },
    [tagArray, setValue, tags],
  );

  const removeSimpleTag = useCallback(
    (tagToRemove) => {
      const updatedTags = tagArray.filter((tag) => tag !== tagToRemove);
      setTagArray(updatedTags);
      setValue('tagArr', updatedTags);
    },
    [tagArray, setValue],
  );

  const onSubmitForm = useCallback(
    async (data) => {
      const formData = {
        taskTitle: _.upperFirst(data.taskTitle),
        description: data.description || '',
        status: data.status,
        priority: data.priority,
        duration: data.duration,
        next_update: data.next_update || '',
        next_update_date: data.next_update_date || '',
        custom_next_update_date: data.custom_next_update_date || '',
        assignedTo: data.assignedTo,
        attachment: attachments,
        tagArr: data.tagArr || [],
        eventCenter: Array.isArray(data.eventCenter)
          ? data.eventCenter.map((v) => String(v).trim()).filter(Boolean)
          : data.eventCenter
            ? [String(data.eventCenter).trim()].filter(Boolean)
            : [],
        recurrence_period: data.recurrence_period || '',
        recurrence_date: data.recurrence_date || '',
        recurrence_quarterly_date: data.recurrence_quarterly_date || '',
        recurrence_month: data.recurrence_month || '',
      };

      const success = await onSubmit(formData);
      if (success) {
        reset(defaultCreateTaskDrawerCommonValues);
        setAttachments([]);
        setTagArray([]);
        setTags('');
        onClose();
      }
    },
    [onSubmit, attachments, reset, onClose],
  );

  const handleClose = useCallback(() => {
    if (!isLoading) {
      reset(defaultCreateTaskDrawerCommonValues);
      setAttachments([]);
      setTagArray([]);
      setTags('');
      onClose();
    }
  }, [isLoading, reset, onClose]);

  const fileInputId = `file-upload-${taskType.replaceAll(/\s+/g, '-').toLowerCase()}`;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <Drawer.Content
        className='relative flex h-full max-w-[560px] flex-col overflow-hidden'
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag and Drop Overlay */}
        {dragActive && (
          <div className='absolute inset-0 z-50 bg-information-lighter/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-information-base rounded-lg pointer-events-none'>
            <div className='flex flex-col items-center gap-4'>
              <RiUploadCloud2Line className='size-16 text-information-base' />
              <div className='flex flex-col items-center gap-2'>
                <p className='label-large text-information-base font-semibold'>Drop files here</p>
                <p className='text-paragraph-sm text-text-sub-600'>
                  All file types, up to 10 MB per file
                </p>
              </div>
            </div>
          </div>
        )}

        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiFileList2Line size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>
                {drawerTitle ?? 'Create New Task'}
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                {drawerDescription ??
                  `Add below details to create a new ${taskType.toLowerCase()} task.`}
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form
          onSubmit={handleSubmit(onSubmitForm)}
          className='flex flex-1 flex-col overflow-hidden'
        >
          <Drawer.Body className='flex-1 overflow-y-auto px-6 pb-6 pt-4'>
            <div className='flex flex-col gap-5'>
              {/* Task Title */}
              <div className='flex flex-col gap-4'>
                <div>
                  <Controller
                    name='taskTitle'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        {...field}
                        id='taskTitle'
                        hasError={isSubmitted && Boolean(errors.taskTitle)}
                        placeholder='Enter task title'
                        className='field-sizing-content text-lg'
                        simple
                      />
                    )}
                  />
                  {isSubmitted && errors.taskTitle && (
                    <ErrorText>{errors.taskTitle.message}</ErrorText>
                  )}
                </div>

                {/* Description */}
                <div>
                  {isDescriptionOpen ? (
                    <Controller
                      name='description'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          {...field}
                          rows={4}
                          placeholder='Add description'
                          maxLength={200}
                          className='min-h-[116px]'
                        >
                          <Textarea.CharCounter
                            current={field.value?.length || 0}
                            max={200}
                            className='text-text-sub-500'
                          />
                        </Textarea.Root>
                      )}
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
                  {isSubmitted && errors.description && (
                    <ErrorText>{errors.description.message}</ErrorText>
                  )}
                </div>
              </div>

              {/* Assignment Details */}
              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiUserLine className='size-5 text-text-sub-500' />
                  <Label.Root className='text-label-md text-text-sub-500'>
                    Assignment Details
                  </Label.Root>
                </div>
                <div className='flex flex-col gap-4'>
                  {requireEventCenters ? (
                    <>
                      {/* Row 1: Center | Assignee */}
                      <div className='flex gap-[18px]'>
                        <div className='flex-1 flex min-w-0 flex-col gap-1'>
                          <div className='flex items-center gap-2'>
                            <RiBuildingLine className='size-5 text-text-sub-500' />
                            <Label.Root className='text-label-sm text-text-main-900'>
                              Center <Label.Asterisk />
                            </Label.Root>
                          </div>
                          {eventCenterPickerCenters.length === 0 ? (
                            <p className='text-paragraph-sm text-text-sub-500'>
                              No centers on this event yet. Add centers under Basic Details first.
                            </p>
                          ) : (
                            <Controller
                              name='eventCenter'
                              control={control}
                              render={({ field }) => (
                                <>
                                  <CenterAccessDropdown
                                    centers={eventCenterPickerCenters}
                                    selectedCenters={Array.isArray(field.value) ? field.value : []}
                                    onChange={(value) =>
                                      field.onChange(
                                        Array.isArray(value) ? value : value ? [value] : [],
                                      )
                                    }
                                    applyImmediately
                                    showCityCode={false}
                                    sequentialZoneLabels
                                    className={cn(
                                      'w-full min-w-0',
                                      isSubmitted &&
                                        Boolean(errors.eventCenter) &&
                                        'ring-1 ring-error-base',
                                    )}
                                  />
                                  {isSubmitted && errors.eventCenter && (
                                    <ErrorText>{errors.eventCenter.message}</ErrorText>
                                  )}
                                </>
                              )}
                            />
                          )}
                        </div>
                        <div className='flex-1 flex min-w-0 flex-col gap-1'>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Assignee <Label.Asterisk />
                          </Label.Root>
                          <Controller
                            name='assignedTo'
                            control={control}
                            render={({ field }) => (
                              <>
                                {assigneeSelectLoading ? (
                                  <span className='text-paragraph-sm text-text-soft-400 py-1.5 block'>
                                    Loading assignees...
                                  </span>
                                ) : (
                                  <EventTaskAssigneeMultiSelect
                                    value={field.value}
                                    onChange={(values) => field.onChange(values)}
                                    placeholder='Select assignees'
                                    roleOptions={assigneeRoleOptions}
                                    roleGroups={assigneeRoleGroups}
                                    userOptions={assigneeSelectItems || []}
                                    userOptionsLoading={assigneeSelectLoading}
                                    selectedCenterIds={selectedEventCenterIds}
                                    variant='stroke'
                                    size='small'
                                    hasError={isSubmitted && Boolean(errors.assignedTo)}
                                  />
                                )}
                                {isSubmitted && errors.assignedTo && (
                                  <ErrorText>{errors.assignedTo.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </div>
                      </div>

                      {/* Row 2: Priority | Status */}
                      <div className='flex gap-[18px]'>
                        <div className='flex-1 flex min-w-0 flex-col gap-1'>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Priority
                            {requirePriority ? (
                              <span className='text-icon-soft-400'> *</span>
                            ) : null}
                          </Label.Root>
                          <Controller
                            name='priority'
                            control={control}
                            render={({ field }) => (
                              <>
                                <SearchableSelect
                                  hasError={isSubmitted && Boolean(errors.priority)}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  size='xsmall'
                                  options={TASK_PRIORITY_OPTIONS}
                                  placeholder='Select'
                                  showArrow={true}
                                  renderTrigger={() =>
                                    field.value ? (
                                      <Badge.Root
                                        variant='light'
                                        color={getPriorityColor(field.value)}
                                        className='text-nowrap'
                                      >
                                        {field.value}
                                      </Badge.Root>
                                    ) : (
                                      'Select'
                                    )
                                  }
                                  renderOptionLabel={(option) => (
                                    <Badge.Root
                                      variant='light'
                                      color={getPriorityColor(option.value)}
                                      className='text-nowrap'
                                    >
                                      {option.label}
                                    </Badge.Root>
                                  )}
                                />
                                {isSubmitted && errors.priority && (
                                  <ErrorText>{errors.priority.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </div>
                        <div className='flex-1 flex min-w-0 flex-col gap-1'>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Status <span className='text-icon-soft-400'>*</span>
                          </Label.Root>
                          <Controller
                            name='status'
                            control={control}
                            render={({ field }) => (
                              <>
                                <SearchableSelect
                                  hasError={isSubmitted && Boolean(errors.status)}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  size='xsmall'
                                  options={statusOptions.map((option) => {
                                    const optionValue = option.value || option.label || option;
                                    return {
                                      value: optionValue,
                                      label: String(optionValue).toUpperCase(),
                                    };
                                  })}
                                  placeholder='Select'
                                  showArrow={true}
                                  renderTrigger={() =>
                                    field.value ? (
                                      <Badge.Root
                                        variant='light'
                                        color={getStatusColor(field.value)}
                                        className='text-nowrap'
                                      >
                                        {String(field.value).toUpperCase()}
                                      </Badge.Root>
                                    ) : (
                                      'Select'
                                    )
                                  }
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
                                {isSubmitted && errors.status && (
                                  <ErrorText>{errors.status.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </div>
                      </div>

                      {/* Row 3: Due date | Next Update Date (Task) OR Duration | Next update days (Task Master) */}
                      <div className='flex gap-[18px]'>
                        <div className='flex-1 flex min-w-0 flex-col gap-1'>
                          {dueDateMode ? (
                            <>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Due date <span className='text-icon-soft-400'>*</span>
                              </Label.Root>
                              <Controller
                                name='next_update_date'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <Datepicker
                                      value={field.value ? parseToDate(field.value) : null}
                                      onChange={(date) => {
                                        field.onChange(date ? formatDateToYYYYMMDD(date) : '');
                                      }}
                                      placeholder='Select date'
                                      size='small'
                                      hasError={isSubmitted && Boolean(errors.next_update_date)}
                                      variant='default'
                                      className='min-h-8'
                                    />
                                    {isSubmitted && errors.next_update_date && (
                                      <ErrorText>{errors.next_update_date.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </>
                          ) : (
                            <>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Duration <span className='text-icon-soft-400'>*</span>
                              </Label.Root>
                              <Controller
                                name='duration'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <Input.Root
                                      size='xsmall'
                                      hasError={isSubmitted && Boolean(errors.duration)}
                                    >
                                      <Input.Wrapper>
                                        <Input.Input
                                          ref={field.ref}
                                          name={field.name}
                                          value={field.value ?? ''}
                                          onBlur={field.onBlur}
                                          type='text'
                                          inputMode='numeric'
                                          autoComplete='off'
                                          onChange={(e) =>
                                            field.onChange(
                                              sanitizeUnsignedIntegerInput(e.target.value),
                                            )
                                          }
                                          placeholder='Enter duration'
                                        />
                                        <Input.Affix>days</Input.Affix>
                                      </Input.Wrapper>
                                    </Input.Root>
                                    {isSubmitted && errors.duration && (
                                      <ErrorText>{errors.duration.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </>
                          )}
                        </div>
                        <div className='flex-1 flex min-w-0 flex-col gap-1'>
                          {dueDateMode ? (
                            <>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Next Update Date
                              </Label.Root>
                              <Controller
                                name='custom_next_update_date'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <Datepicker
                                      value={field.value ? parseToDate(field.value) : null}
                                      onChange={(date) => {
                                        field.onChange(date ? formatDateToYYYYMMDD(date) : '');
                                      }}
                                      min={minCustomNextUpdateDate}
                                      placeholder='Select date'
                                      size='small'
                                      hasError={
                                        isSubmitted && Boolean(errors.custom_next_update_date)
                                      }
                                      variant='default'
                                      className='min-h-8'
                                    />
                                    {isSubmitted && errors.custom_next_update_date && (
                                      <ErrorText>
                                        {errors.custom_next_update_date.message}
                                      </ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </>
                          ) : (
                            <>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Next update
                              </Label.Root>
                              <Controller
                                name='next_update'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <Input.Root
                                      size='xsmall'
                                      hasError={isSubmitted && Boolean(errors.next_update)}
                                    >
                                      <Input.Wrapper>
                                        <Input.Input
                                          ref={field.ref}
                                          name={field.name}
                                          value={field.value ?? ''}
                                          onBlur={field.onBlur}
                                          type='text'
                                          inputMode='numeric'
                                          autoComplete='off'
                                          onChange={(e) =>
                                            field.onChange(
                                              sanitizeUnsignedIntegerInput(e.target.value),
                                            )
                                          }
                                          placeholder='Enter days'
                                        />
                                        <Input.Affix>days</Input.Affix>
                                      </Input.Wrapper>
                                    </Input.Root>
                                    {isSubmitted && errors.next_update && (
                                      <ErrorText>{errors.next_update.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* First Row: Assignee + Duration (default) or Assignee + Due date (partner detail) */}
                      <div className='flex gap-[18px]'>
                        <div className='flex-1 flex flex-col gap-1'>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Assignee <Label.Asterisk />
                          </Label.Root>
                          <Controller
                            name='assignedTo'
                            control={control}
                            render={({ field }) => (
                              <>
                                {Array.isArray(assigneeRoleOptions) ? (
                                  assigneeSelectLoading ? (
                                    <span className='text-paragraph-sm text-text-soft-400 py-1.5 block'>
                                      Loading assignees...
                                    </span>
                                  ) : (
                                    <EventTaskAssigneeMultiSelect
                                      value={field.value}
                                      onChange={(values) => field.onChange(values)}
                                      placeholder='Select assignees'
                                      roleOptions={assigneeRoleOptions}
                                      roleGroups={assigneeRoleGroups}
                                      userOptions={assigneeSelectItems || []}
                                      userOptionsLoading={assigneeSelectLoading}
                                      selectedCenterIds={selectedEventCenterIds}
                                      variant='stroke'
                                      size='small'
                                      hasError={isSubmitted && Boolean(errors.assignedTo)}
                                    />
                                  )
                                ) : assigneeSelectItems !== undefined ? (
                                  assigneeSelectLoading ? (
                                    <span className='text-paragraph-sm text-text-soft-400 py-1.5 block'>
                                      Loading assignees...
                                    </span>
                                  ) : (
                                    <AssigneeMultiSelect
                                      value={field.value}
                                      onChange={(values) => field.onChange(values)}
                                      placeholder='Select assignees'
                                      maxVisibleAvatars={3}
                                      fixedAssigneeOptions={assigneeSelectItems}
                                      fixedAssigneeOptionsLoading={assigneeSelectLoading}
                                      variant='stroke'
                                      size='small'
                                      hasError={isSubmitted && Boolean(errors.assignedTo)}
                                    />
                                  )
                                ) : (
                                  <SearchableSelect
                                    hasError={isSubmitted && Boolean(errors.assignedTo)}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    size='xsmall'
                                    options={roleOptions}
                                    placeholder='Select'
                                    showArrow={true}
                                  />
                                )}
                                {isSubmitted && errors.assignedTo && (
                                  <ErrorText>{errors.assignedTo.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </div>
                        <div className='flex-1 flex flex-col gap-1'>
                          {dueDateMode ? (
                            <>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Due date <span className='text-icon-soft-400'>*</span>
                              </Label.Root>
                              <Controller
                                name='next_update_date'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <Datepicker
                                      value={field.value ? parseToDate(field.value) : null}
                                      onChange={(date) => {
                                        field.onChange(date ? formatDateToYYYYMMDD(date) : '');
                                      }}
                                      placeholder='Select date'
                                      size='small'
                                      hasError={isSubmitted && Boolean(errors.next_update_date)}
                                      variant='default'
                                      className='min-h-8'
                                    />
                                    {isSubmitted && errors.next_update_date && (
                                      <ErrorText>{errors.next_update_date.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </>
                          ) : (
                            <>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Duration <span className='text-icon-soft-400'>*</span>
                              </Label.Root>
                              <Controller
                                name='duration'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <Input.Root
                                      size='xsmall'
                                      hasError={isSubmitted && Boolean(errors.duration)}
                                    >
                                      <Input.Wrapper>
                                        <Input.Input
                                          ref={field.ref}
                                          name={field.name}
                                          value={field.value ?? ''}
                                          onBlur={field.onBlur}
                                          type='text'
                                          inputMode='numeric'
                                          autoComplete='off'
                                          onChange={(e) =>
                                            field.onChange(
                                              sanitizeUnsignedIntegerInput(e.target.value),
                                            )
                                          }
                                          placeholder='Enter duration'
                                        />
                                        <Input.Affix>days</Input.Affix>
                                      </Input.Wrapper>
                                    </Input.Root>
                                    {isSubmitted && errors.duration && (
                                      <ErrorText>{errors.duration.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {!dueDateMode ? (
                        <>
                          <div className='flex gap-[18px]'>
                            <div className='flex-1 flex min-w-0 flex-col gap-1'>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Priority
                                {requirePriority ? (
                                  <span className='text-icon-soft-400'> *</span>
                                ) : null}
                              </Label.Root>
                              <Controller
                                name='priority'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <SearchableSelect
                                      hasError={isSubmitted && Boolean(errors.priority)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      size='xsmall'
                                      options={TASK_PRIORITY_OPTIONS}
                                      placeholder='Select'
                                      showArrow={true}
                                      renderTrigger={() =>
                                        field.value ? (
                                          <Badge.Root
                                            variant='light'
                                            color={getPriorityColor(field.value)}
                                            className='text-nowrap'
                                          >
                                            {field.value}
                                          </Badge.Root>
                                        ) : (
                                          'Select'
                                        )
                                      }
                                      renderOptionLabel={(option) => (
                                        <Badge.Root
                                          variant='light'
                                          color={getPriorityColor(option.value)}
                                          className='text-nowrap'
                                        >
                                          {option.label}
                                        </Badge.Root>
                                      )}
                                    />
                                    {isSubmitted && errors.priority && (
                                      <ErrorText>{errors.priority.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                            <div className='flex-1 flex min-w-0 flex-col gap-1'>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Next update
                              </Label.Root>
                              <Controller
                                name='next_update'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <Input.Root
                                      size='xsmall'
                                      hasError={isSubmitted && Boolean(errors.next_update)}
                                    >
                                      <Input.Wrapper>
                                        <Input.Input
                                          ref={field.ref}
                                          name={field.name}
                                          value={field.value ?? ''}
                                          onBlur={field.onBlur}
                                          type='text'
                                          inputMode='numeric'
                                          autoComplete='off'
                                          onChange={(e) =>
                                            field.onChange(
                                              sanitizeUnsignedIntegerInput(e.target.value),
                                            )
                                          }
                                          placeholder='Enter days'
                                        />
                                        <Input.Affix>days</Input.Affix>
                                      </Input.Wrapper>
                                    </Input.Root>
                                    {isSubmitted && errors.next_update && (
                                      <ErrorText>{errors.next_update.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                          </div>
                          <div className='flex gap-[18px]'>
                            <div className='flex-1 flex min-w-0 flex-col gap-1'>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Status <span className='text-icon-soft-400'>*</span>
                              </Label.Root>
                              <Controller
                                name='status'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <SearchableSelect
                                      hasError={isSubmitted && Boolean(errors.status)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      size='xsmall'
                                      options={statusOptions.map((option) => {
                                        const optionValue = option.value || option.label || option;
                                        return {
                                          value: optionValue,
                                          label: String(optionValue).toUpperCase(),
                                        };
                                      })}
                                      placeholder='Select'
                                      showArrow={true}
                                      renderTrigger={() =>
                                        field.value ? (
                                          <Badge.Root
                                            variant='light'
                                            color={getStatusColor(field.value)}
                                            className='text-nowrap'
                                          >
                                            {String(field.value).toUpperCase()}
                                          </Badge.Root>
                                        ) : (
                                          'Select'
                                        )
                                      }
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
                                    {isSubmitted && errors.status && (
                                      <ErrorText>{errors.status.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                            <div className='flex-1 min-w-0' aria-hidden />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className='flex gap-[18px]'>
                            <div className='flex-1 flex flex-col gap-1'>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Priority
                                {requirePriority ? (
                                  <span className='text-icon-soft-400'> *</span>
                                ) : null}
                              </Label.Root>
                              <Controller
                                name='priority'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <SearchableSelect
                                      hasError={isSubmitted && Boolean(errors.priority)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      size='xsmall'
                                      options={TASK_PRIORITY_OPTIONS}
                                      placeholder='Select'
                                      showArrow={true}
                                      renderTrigger={() =>
                                        field.value ? (
                                          <Badge.Root
                                            variant='light'
                                            color={getPriorityColor(field.value)}
                                            className='text-nowrap'
                                          >
                                            {field.value}
                                          </Badge.Root>
                                        ) : (
                                          'Select'
                                        )
                                      }
                                      renderOptionLabel={(option) => (
                                        <Badge.Root
                                          variant='light'
                                          color={getPriorityColor(option.value)}
                                          className='text-nowrap'
                                        >
                                          {option.label}
                                        </Badge.Root>
                                      )}
                                    />
                                    {isSubmitted && errors.priority && (
                                      <ErrorText>{errors.priority.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                            <div className='flex-1 flex flex-col gap-1'>
                              <Label.Root className='text-label-sm text-text-main-900'>
                                Status <span className='text-icon-soft-400'>*</span>
                              </Label.Root>
                              <Controller
                                name='status'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <SearchableSelect
                                      hasError={isSubmitted && Boolean(errors.status)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      size='xsmall'
                                      options={statusOptions.map((option) => {
                                        const optionValue = option.value || option.label || option;
                                        return {
                                          value: optionValue,
                                          label: String(optionValue).toUpperCase(),
                                        };
                                      })}
                                      placeholder='Select'
                                      showArrow={true}
                                      renderTrigger={() =>
                                        field.value ? (
                                          <Badge.Root
                                            variant='light'
                                            color={getStatusColor(field.value)}
                                            className='text-nowrap'
                                          >
                                            {String(field.value).toUpperCase()}
                                          </Badge.Root>
                                        ) : (
                                          'Select'
                                        )
                                      }
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
                                    {isSubmitted && errors.status && (
                                      <ErrorText>{errors.status.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label.Root className='text-label-sm text-text-main-900'>
                              Next Update Date
                            </Label.Root>
                            <Controller
                              name='custom_next_update_date'
                              control={control}
                              render={({ field }) => (
                                <>
                                  <Datepicker
                                    value={field.value ? parseToDate(field.value) : null}
                                    onChange={(date) => {
                                      field.onChange(date ? formatDateToYYYYMMDD(date) : '');
                                    }}
                                    min={minCustomNextUpdateDate}
                                    placeholder='Select date'
                                    size='small'
                                    hasError={
                                      isSubmitted && Boolean(errors.custom_next_update_date)
                                    }
                                    variant='borderless'
                                    className='min-h-8'
                                  />
                                  {isSubmitted && errors.custom_next_update_date && (
                                    <ErrorText>{errors.custom_next_update_date.message}</ErrorText>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Recurring fields for Engagement tasks */}
              {showRecurring && (
                <div className='flex gap-[18px]'>
                  {/* Recurrence dropdown - Left side */}
                  <div className='flex-1 flex flex-col gap-1'>
                    <Label.Root className='text-label-sm text-text-main-900'>Recurrence</Label.Root>
                    <Controller
                      name='recurrence_period'
                      control={control}
                      render={({ field }) => (
                        <>
                          <SearchableSelect
                            hasError={isSubmitted && Boolean(errors.recurrence_period)}
                            value={field.value}
                            onValueChange={field.onChange}
                            size='xsmall'
                            options={RECURRING_FREQUENCY_OPTIONS}
                            placeholder='Select recurrence'
                            showArrow={true}
                          />
                          {isSubmitted && errors.recurrence_period && (
                            <ErrorText>{errors.recurrence_period.message}</ErrorText>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {/* Recurrence date fields - Right side (shown when not "One Time") */}
                  {watchedRecurrencePeriod && watchedRecurrencePeriod !== 'One Time' ? (
                    <div className='flex-1 flex flex-col gap-1'>
                      {/* For Yearly: Single label spanning both fields */}
                      {watchedRecurrencePeriod === 'Yearly' ? (
                        <>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Set Recurrence Date & Month
                          </Label.Root>
                          <div className='flex gap-[8px]'>
                            <div className='flex-1 flex flex-col gap-1'>
                              <Controller
                                name='recurrence_date'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <SearchableSelect
                                      hasError={isSubmitted && Boolean(errors.recurrence_date)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      size='xsmall'
                                      options={Array.from({ length: 31 }, (_, i) => String(i + 1))}
                                      placeholder='Select day'
                                      showArrow={true}
                                    />
                                    {isSubmitted && errors.recurrence_date && (
                                      <ErrorText>{errors.recurrence_date.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                            <div className='flex-1 flex flex-col gap-1'>
                              <Controller
                                name='recurrence_month'
                                control={control}
                                render={({ field }) => (
                                  <>
                                    <SearchableSelect
                                      hasError={isSubmitted && Boolean(errors.recurrence_month)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      size='xsmall'
                                      options={MONTH_OPTIONS}
                                      placeholder='Select month'
                                      showArrow={true}
                                    />
                                    {isSubmitted && errors.recurrence_month && (
                                      <ErrorText>{errors.recurrence_month.message}</ErrorText>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                          </div>
                        </>
                      ) : watchedRecurrencePeriod === 'Quarterly' ? (
                        /* For Quarterly: Show quarterly date */
                        <>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Set Recurrence Quarterly Date
                          </Label.Root>
                          <Controller
                            name='recurrence_quarterly_date'
                            control={control}
                            render={({ field }) => (
                              <>
                                <SearchableSelect
                                  hasError={
                                    isSubmitted && Boolean(errors.recurrence_quarterly_date)
                                  }
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  size='xsmall'
                                  options={Array.from({ length: 31 }, (_, i) => String(i + 1))}
                                  placeholder='Select quarterly date'
                                  showArrow={true}
                                />
                                {isSubmitted && errors.recurrence_quarterly_date && (
                                  <ErrorText>{errors.recurrence_quarterly_date.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </>
                      ) : (
                        /* For Monthly: Show only date */
                        <>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Set Recurrence Date
                          </Label.Root>
                          <Controller
                            name='recurrence_date'
                            control={control}
                            render={({ field }) => (
                              <>
                                <SearchableSelect
                                  hasError={isSubmitted && Boolean(errors.recurrence_date)}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  size='xsmall'
                                  options={Array.from({ length: 31 }, (_, i) => String(i + 1))}
                                  placeholder='Select day'
                                  showArrow={true}
                                />
                                {isSubmitted && errors.recurrence_date && (
                                  <ErrorText>{errors.recurrence_date.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className='flex-1' />
                  )}
                </div>
              )}

              {/* Tags Section */}
              <div className='flex flex-col gap-4'>
                <div className='flex  items-center gap-2'>
                  <RiPriceTag3Line className='size-5 text-text-sub-500' />
                  <Label.Root className='text-label-md text-text-sub-500'>Tags</Label.Root>
                </div>

                {showTagsInput ? (
                  // Client Onboarding style - with add button
                  <>
                    {tagArray.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {tagArray?.map((item, index) => {
                          const tagKey =
                            typeof item === 'string'
                              ? item
                              : item.name || item.label || `tag-${index}`;
                          const tagDisplay =
                            typeof item === 'string' ? item : item.name || item.label || item;
                          return (
                            <Tag.Root
                              key={tagKey}
                              variant='stroke'
                              className='gap-2 label-xsmall rounded-xl'
                            >
                              {tagDisplay}
                              <Tag.DismissButton
                                onClick={() => removeTag(tagDisplay)}
                                aria-label={`Remove ${tagDisplay}`}
                              />
                            </Tag.Root>
                          );
                        })}
                      </div>
                    )}

                    <div className='w-full'>
                      {tagInputVisible ? (
                        <div className='w-full flex items-center gap-4'>
                          <Input.Root className='flex-1' size='xsmall'>
                            <Input.Wrapper>
                              <Input.Input
                                placeholder='Enter tag'
                                value={newTagValue}
                                onChange={(e) => setNewTagValue(e.target.value)}
                                onKeyDown={handleTagInput}
                                autoFocus
                              />
                            </Input.Wrapper>
                          </Input.Root>

                          <Button.Root
                            type='button'
                            onClick={() => {
                              setTagInputVisible(false);
                              setNewTagValue('');
                            }}
                            variant='neutral'
                            mode='stroke'
                            size='small'
                          >
                            <Button.Icon className='text-red-500' as={RiCloseLine} />
                          </Button.Root>

                          <Button.Root
                            type='button'
                            onClick={handleAddTag}
                            variant='neutral'
                            mode='stroke'
                            size='small'
                          >
                            <Button.Icon className='text-green-500' as={RiCheckLine} />
                          </Button.Root>
                        </div>
                      ) : (
                        <LinkButton.Root
                          onClick={() => setTagInputVisible(true)}
                          variant='primary'
                          size='small'
                          className='w-full label-xsmall items-start justify-start'
                        >
                          <LinkButton.Icon as={RiAddLine} />
                          Add New Tag
                        </LinkButton.Root>
                      )}
                    </div>
                  </>
                ) : (
                  // Client Exit/Engagement style - simple input
                  <>
                    <div className='flex flex-col gap-2'>
                      <Input.Root size='xsmall'>
                        <Input.Wrapper>
                          <Input.Input
                            placeholder='Type here'
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            onKeyDown={handleSimpleTagInput}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {tagArray.length > 0 && (
                        <div className='flex flex-wrap gap-2'>
                          {tagArray?.map((item) => (
                            <Badge.Root key={item} variant='stroke'>
                              {item}
                              <RiCloseLine
                                size={16}
                                onClick={() => removeSimpleTag(item)}
                                className='hover:cursor-pointer text-(--color-text-sub-500)'
                              />
                            </Badge.Root>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Attachments */}
              <div className='flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <RiAttachment2 className='size-5 text-text-sub-500' />
                    <span className='label-md text-text-sub-500'>Attachments</span>
                  </div>
                  {attachments.length > 0 && (
                    <Button.Root
                      type='button'
                      onClick={() => document.querySelector(`#${fileInputId}`)?.click()}
                      disabled={isLoading}
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      className='gap-1'
                    >
                      <Button.Icon as={RiUploadLine} className='p-0.5' />
                      <span>Upload Files</span>
                    </Button.Root>
                  )}
                </div>
                {fileError && (
                  <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                    <span className='text-paragraph-xs text-error-base'>{fileError}</span>
                  </div>
                )}
                <AttachmentList
                  attachments={attachments}
                  onRemove={removeAttachment}
                  disabled={isLoading}
                  emptyStateMessage='Choose a file or drag & drop.'
                  emptyStateDescription='All file types, up to 10 MB per file.'
                  emptyStateAction={
                    attachments.length === 0
                      ? {
                          onClick: () => document.querySelector(`#${fileInputId}`)?.click(),
                          label: 'Browse File',
                          disabled: isLoading,
                        }
                      : undefined
                  }
                />
                <input
                  type='file'
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className='hidden'
                  id={fileInputId}
                  disabled={isLoading}
                />
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 z-10 bg-white'>
            <div className='flex flex-col gap-3 p-6 sm:flex-row sm:justify-end'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                className='w-full sm:w-auto'
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' className='w-full sm:w-auto' disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateTaskDrawerCommon;
