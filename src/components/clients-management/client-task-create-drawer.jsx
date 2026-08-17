import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  RiFileList2Line,
  RiUserLine,
  RiCalendarLine,
  RiFlagLine,
  RiPriceTag3Line,
  RiAttachment2,
  RiStickyNoteLine,
  RiUploadLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as Textarea from '@/components/ui/textarea';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Badge from '@/components/ui/badge';
import AttachmentList from '@/components/ui/attachment-list';
import * as Tag from '@/components/ui/tag';
import { MONTH_OPTIONS } from '@/constants/constants';
import {
  getPriorityColor,
  getStatusColor,
  RECURRING_FREQUENCY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '@/components/clients-management/constants';
import { format, isBefore, startOfDay } from 'date-fns';
import { getMinCustomNextUpdateDate, parseToDate } from '@/utils/date-utils';
import { createClientTask, selectClientDetail } from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { taskCreateSchema, defaultTaskValues } from '@/schemas/task-schema';

const ClientTaskCreateDrawer = ({
  open,
  onOpenChange,
  onSuccess,
  taskType = 'onboarding', // 'onboarding' | 'engagement' | 'exit'
  disabled = false,
}) => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientId = client?.name || id;

  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

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
    resolver: zodResolver(taskCreateSchema),
    defaultValues: defaultTaskValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedRecurrencePeriod = watch('recurrence_period');
  const watchedStatus = watch('status');
  const watchedPriority = watch('priority');
  const watchedTags = watch('tags');
  const watchedExpEndDate = watch('exp_end_date');
  const watchedCustomNextUpdate = watch('custom_next_update_date');
  const minCustomNextUpdateDate = useMemo(
    () => getMinCustomNextUpdateDate(watchedExpEndDate),
    [watchedExpEndDate],
  );

  useEffect(() => {
    if (!open) return;
    const next = String(watchedCustomNextUpdate ?? '').trim();
    if (!next || !minCustomNextUpdateDate) return;
    const selected = parseToDate(next);
    if (!selected) return;
    if (isBefore(startOfDay(selected), minCustomNextUpdateDate)) {
      setValue('custom_next_update_date', '');
    }
  }, [open, minCustomNextUpdateDate, watchedCustomNextUpdate, setValue]);

  useEffect(() => {
    if (!open) return;
    const due = String(watchedExpEndDate ?? '').trim();
    const next = String(watchedCustomNextUpdate ?? '').trim();
    if (!due && !next) {
      clearErrors('custom_next_update_date');
      return;
    }
    void trigger(['exp_end_date', 'custom_next_update_date']);
  }, [open, watchedExpEndDate, watchedCustomNextUpdate, trigger, clearErrors]);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      reset(defaultTaskValues);
      setAttachments([]);
      setFileError(null);
      setTags([]);
      setTagInput('');
      setIsDescriptionOpen(false);
      setValue('recurrence_date', '');
      setValue('recurrence_month', '');
      setValue('recurrence_quarterly_date', '');
    }
  }, [open, reset]);

  // Default status to "Pending" when available
  useEffect(() => {
    if (!watchedStatus && TASK_STATUS_OPTIONS.length > 0) {
      const pendingStatus = TASK_STATUS_OPTIONS.find(
        (status) => (status?.value || status?.label || status) === 'Pending',
      );
      if (pendingStatus) {
        const pendingValue = pendingStatus?.value || pendingStatus?.label || 'Pending';
        setValue('status', pendingValue);
      } else if (TASK_STATUS_OPTIONS.length > 0) {
        // Fallback to first option if Pending not found
        const firstStatus = TASK_STATUS_OPTIONS[0];
        const firstValue = firstStatus?.value || firstStatus?.label || firstStatus;
        if (firstValue) {
          setValue('status', firstValue);
        }
      }
    }
  }, [watchedStatus, setValue]);

  // Reset recurrence fields when recurrence_period is "One Time" or empty
  useEffect(() => {
    if (!watchedRecurrencePeriod || watchedRecurrencePeriod === 'One Time') {
      setValue('recurrence_date', '');
      setValue('recurrence_month', '');
      setValue('recurrence_quarterly_date', '');
    } else if (watchedRecurrencePeriod === 'Quarterly') {
      // Clear Monthly/Yearly fields when Quarterly is selected
      setValue('recurrence_date', '');
      setValue('recurrence_month', '');
    } else if (watchedRecurrencePeriod === 'Monthly') {
      // Clear Yearly/Quarterly fields when Monthly is selected
      setValue('recurrence_month', '');
      setValue('recurrence_quarterly_date', '');
    } else if (watchedRecurrencePeriod === 'Yearly') {
      // Clear Quarterly field when Yearly is selected
      setValue('recurrence_quarterly_date', '');
    }
  }, [watchedRecurrencePeriod, setValue]);

  // Handle tags input
  const handleTagInput = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        setValue('tags', updatedTags.join(','));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
    setValue('tags', updatedTags.join(','));
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleFileUpload = (files) => {
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
  };

  const handleDrag = (e) => {
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
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id) => {
    setAttachments((previous) => previous.filter((file) => file.id !== id));
  };

  const getTaskTypeLabel = () => {
    switch (taskType) {
      case 'engagement':
        return 'engagement';
      case 'exit':
        return 'exit';
      default:
        return 'onboarding';
    }
  };

  const getTaskTypeValue = () => {
    switch (taskType) {
      case 'engagement':
        return 'Client Engagement';
      case 'exit':
        return 'Client Exiting';
      default:
        return 'Client Onboarding';
    }
  };

  const currentPriorityOptions = [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];

  const onSubmit = async (data) => {
    if (!clientId) {
      showErrorToast('Client ID is required');
      return;
    }

    try {
      setIsSubmitting(true);

      // Build recurrence payload based on type
      const recurrencePayload = {};
      if (taskType === 'engagement' && data.recurrence_period) {
        // Always send custom_recurrence_period for engagement recurrence
        if (data.recurrence_period === 'Monthly') {
          recurrencePayload.custom_recurrence_period = 'Monthly';
          if (data.recurrence_date) {
            recurrencePayload.custom_recurrence_date = data.recurrence_date;
          }
        } else if (data.recurrence_period === 'Quarterly' && data.recurrence_quarterly_date) {
          recurrencePayload.custom_recurrence_period = 'Quarterly';
          recurrencePayload.custom_recurrence_quarterly_date = data.recurrence_quarterly_date;
        } else if (data.recurrence_period === 'Yearly') {
          recurrencePayload.custom_recurrence_period = 'Yearly';
          if (data.recurrence_date) {
            recurrencePayload.custom_recurrence_date = data.recurrence_date;
          }
          if (data.recurrence_month) {
            recurrencePayload.custom_recurrence_month = data.recurrence_month;
          }
        }
      }

      const nextUpdateTrimmed = data.custom_next_update_date?.trim?.() ?? '';
      const taskPayload = {
        subject: data.subject,
        description: data.description || '',
        assignees: data.assignees,
        exp_end_date: data.exp_end_date,
        priority: data.priority,
        status: data.status,
        custom_ref_doctype: 'Customer',
        custom_ref_docname: clientId,
        type: getTaskTypeValue(),
        ...recurrencePayload,
        tags: data.tags ? data.tags.split(',').filter((tag) => tag.trim()) : [],
        ...(nextUpdateTrimmed ? { custom_next_update_date: nextUpdateTrimmed } : {}),
      };

      // return;

      const result = await dispatch(createClientTask({ taskData: taskPayload, attachments }));

      if (createClientTask.fulfilled.match(result)) {
        showSuccessToast('Task created successfully.');
        onSuccess?.(result.payload);
        onOpenChange?.(false);
      } else if (createClientTask.rejected.match(result)) {
        showErrorToast(result.payload || 'Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      showErrorToast(error?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDrawer = () => {
    if (!isSubmitting) {
      onOpenChange?.(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
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
                Create New Task
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Add below details to create a new {getTaskTypeLabel()} task.
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-1 flex-col overflow-hidden'>
          <Drawer.Body className='flex-1 overflow-y-auto px-6 pb-6 pt-4'>
            <div className='flex flex-col gap-5'>
              {/* Task Title */}
              <div className='flex flex-col gap-4'>
                <div>
                  <Controller
                    name='subject'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        {...field}
                        id='subject'
                        hasError={isSubmitted && Boolean(errors.subject)}
                        placeholder='Enter task title'
                        disabled={disabled || isSubmitting}
                        className='field-sizing-content text-lg'
                        simple
                      />
                    )}
                  />
                  {isSubmitted && errors.subject && <ErrorText>{errors.subject.message}</ErrorText>}
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
                          id='description'
                          rows={4}
                          hasError={isSubmitted && Boolean(errors.description)}
                          placeholder='Add description'
                          disabled={disabled || isSubmitting}
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
                  {/* First Row: Assignee and Due Date */}
                  <div className='flex gap-[18px]'>
                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Assignee <span className='text-icon-soft-400'>*</span>
                      </Label.Root>
                      <Controller
                        name='assignees'
                        control={control}
                        render={({ field }) => {
                          const fieldValue = Array.isArray(field.value) ? field.value : [];
                          return (
                            <>
                              <AssigneeMultiSelect
                                value={fieldValue}
                                onChange={(values) => field.onChange(values)}
                                disabled={disabled || isSubmitting}
                                placeholder='Select'
                                size='xsmall'
                                hasError={isSubmitted && Boolean(errors.assignees)}
                                variant='primary'
                              />
                              {isSubmitted && errors.assignees && (
                                <ErrorText>{errors.assignees.message}</ErrorText>
                              )}
                            </>
                          );
                        }}
                      />
                    </div>
                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Due Date <span className='text-icon-soft-400'>*</span>
                      </Label.Root>
                      <Controller
                        name='exp_end_date'
                        control={control}
                        render={({ field }) => {
                          const dateValue = field.value ? parseToDate(field.value) : undefined;
                          return (
                            <>
                              <Datepicker
                                value={dateValue}
                                onChange={(date) => {
                                  field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                                }}
                                disabled={disabled || isSubmitting}
                                placeholder='Select a date'
                                hasError={isSubmitted && Boolean(errors.exp_end_date)}
                                size='xsmall'
                                variant='primary'
                              />
                              {isSubmitted && errors.exp_end_date && (
                                <ErrorText>{errors.exp_end_date.message}</ErrorText>
                              )}
                            </>
                          );
                        }}
                      />
                    </div>
                  </div>

                  {/* Second Row: Priority and Status */}
                  <div className='flex gap-[18px]'>
                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Priority <span className='text-icon-soft-400'>*</span>
                      </Label.Root>
                      <Controller
                        name='priority'
                        control={control}
                        render={({ field }) => (
                          <>
                            <Select.Root
                              hasError={isSubmitted && Boolean(errors.priority)}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={disabled || isSubmitting}
                              size='xsmall'
                            >
                              <Select.Trigger id='priority'>
                                <Select.Value placeholder='Select' asChild>
                                  {field.value ? (
                                    <Badge.Root
                                      variant='light'
                                      color={getPriorityColor(field.value)}
                                      className='text-nowrap'
                                    >
                                      {field.value}
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
                            <Select.Root
                              hasError={isSubmitted && Boolean(errors.status)}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={disabled || isSubmitting}
                              size='xsmall'
                            >
                              <Select.Trigger id='status'>
                                <Select.Value placeholder='Select' asChild>
                                  {field.value ? (
                                    <Badge.Root
                                      variant='light'
                                      color={getStatusColor(field.value)}
                                      className='text-nowrap'
                                    >
                                      {String(field.value).toUpperCase()}
                                    </Badge.Root>
                                  ) : (
                                    'Select'
                                  )}
                                </Select.Value>
                              </Select.Trigger>
                              <Select.Content>
                                {TASK_STATUS_OPTIONS.map((option) => {
                                  const optionValue = option.value || option.label || option;
                                  return (
                                    <Select.Item key={optionValue} value={optionValue}>
                                      <Badge.Root
                                        variant='light'
                                        color={getStatusColor(optionValue)}
                                        className='text-nowrap'
                                      >
                                        {String(optionValue).toUpperCase()}
                                      </Badge.Root>
                                    </Select.Item>
                                  );
                                })}
                              </Select.Content>
                            </Select.Root>
                            {isSubmitted && errors.status && (
                              <ErrorText>{errors.status.message}</ErrorText>
                            )}
                          </>
                        )}
                      />
                    </div>
                  </div>

                  <div className='flex flex-col gap-1 max-w-full'>
                    <Label.Root className='text-label-sm text-text-main-900'>
                      Next Update Date
                    </Label.Root>
                    <Controller
                      name='custom_next_update_date'
                      control={control}
                      render={({ field }) => {
                        const dateValue = field.value ? parseToDate(field.value) : undefined;
                        return (
                          <>
                            <Datepicker
                              value={dateValue}
                              onChange={(date) => {
                                field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                              }}
                              disabled={disabled || isSubmitting}
                              min={minCustomNextUpdateDate}
                              placeholder='Select a date'
                              hasError={isSubmitted && Boolean(errors.custom_next_update_date)}
                              size='xsmall'
                              variant='primary'
                            />
                            {isSubmitted && errors.custom_next_update_date && (
                              <ErrorText>{errors.custom_next_update_date.message}</ErrorText>
                            )}
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Recurring fields for Engagement tasks */}
              {taskType === 'engagement' && (
                <div className='flex gap-[18px]'>
                  {/* Recurrence dropdown - Left side */}
                  <div className='flex-1 flex flex-col gap-1'>
                    <Label.Root className='text-label-sm text-text-main-900'>Recurrence</Label.Root>
                    <Controller
                      name='recurrence_period'
                      control={control}
                      render={({ field }) => (
                        <>
                          <Select.Root
                            hasError={isSubmitted && Boolean(errors.recurrence_period)}
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={disabled || isSubmitting}
                            size='xsmall'
                          >
                            <Select.Trigger id='recurrence_period'>
                              <Select.Value placeholder='Select recurrence' />
                            </Select.Trigger>
                            <Select.Content>
                              {RECURRING_FREQUENCY_OPTIONS.map((option) => (
                                <Select.Item key={option.value} value={option.value}>
                                  {option.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
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
                      {/* For Yearly: Show day and month */}
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
                                    <Select.Root
                                      hasError={isSubmitted && Boolean(errors.recurrence_date)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      disabled={disabled || isSubmitting}
                                      size='xsmall'
                                    >
                                      <Select.Trigger id='recurrence_date'>
                                        <Select.Value placeholder='Select day' />
                                      </Select.Trigger>
                                      <Select.Content>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                          <Select.Item key={day} value={String(day)}>
                                            {day}
                                          </Select.Item>
                                        ))}
                                      </Select.Content>
                                    </Select.Root>
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
                                    <Select.Root
                                      hasError={isSubmitted && Boolean(errors.recurrence_month)}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      disabled={disabled || isSubmitting}
                                      size='xsmall'
                                    >
                                      <Select.Trigger
                                        id='recurrence_month'
                                        className='whitespace-nowrap'
                                      >
                                        <Select.Value
                                          placeholder='Select month'
                                          className='truncate'
                                        />
                                      </Select.Trigger>
                                      <Select.Content>
                                        {MONTH_OPTIONS.map((month) => (
                                          <Select.Item key={month} value={month}>
                                            {month}
                                          </Select.Item>
                                        ))}
                                      </Select.Content>
                                    </Select.Root>
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
                        /* For Quarterly: Show quarter selector */
                        <>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Set Recurrence Date
                          </Label.Root>
                          <Controller
                            name='recurrence_quarterly_date'
                            control={control}
                            render={({ field }) => (
                              <>
                                <Select.Root
                                  hasError={
                                    isSubmitted && Boolean(errors.recurrence_quarterly_date)
                                  }
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  disabled={disabled || isSubmitting}
                                  size='xsmall'
                                >
                                  <Select.Trigger id='recurrence_quarterly_date'>
                                    <Select.Value placeholder='Select date' />
                                  </Select.Trigger>
                                  <Select.Content>
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                                      <Select.Item key={day} value={String(day)}>
                                        {day}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
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
                                <Select.Root
                                  hasError={isSubmitted && Boolean(errors.recurrence_date)}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  disabled={disabled || isSubmitting}
                                  size='xsmall'
                                >
                                  <Select.Trigger id='recurrence_date'>
                                    <Select.Value placeholder='Select day' />
                                  </Select.Trigger>
                                  <Select.Content>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                      <Select.Item key={day} value={String(day)}>
                                        {day}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
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

              {/* Tags */}
              <div className='flex flex-col gap-4'>
                <div className='flex  items-center gap-2'>
                  <RiPriceTag3Line className='size-5 text-text-sub-500' />
                  <Label.Root className='text-label-md text-text-sub-500'>Tags</Label.Root>
                </div>
                <div className='flex flex-col gap-2'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='Type here'
                        onKeyDown={handleTagInput}
                        disabled={disabled || isSubmitting}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {tags.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {tags.map((tag) => (
                        <Tag.Root key={tag} variant='stroke'>
                          <span className='text-label-xs text-text-sub-600'>{tag}</span>
                          <Tag.DismissButton
                            onClick={() => removeTag(tag)}
                            aria-label={`Remove ${tag}`}
                          />
                        </Tag.Root>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments */}
              <div className='flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <RiAttachment2 className='size-5 text-text-sub-500' />
                    <span className='text-label-md text-text-sub-500'>Attachments</span>
                  </div>
                  {attachments.length > 0 && (
                    <Button.Root
                      type='button'
                      onClick={() => document.querySelector('#file-upload').click()}
                      disabled={disabled || isSubmitting}
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
                  disabled={disabled || isSubmitting}
                  emptyStateMessage='Choose a file or drag & drop.'
                  emptyStateDescription='All file types, up to 10 MB per file.'
                  emptyStateAction={
                    attachments.length === 0
                      ? {
                          onClick: () => document.querySelector('#file-upload').click(),
                          label: 'Browse File',
                          disabled: disabled || isSubmitting,
                        }
                      : undefined
                  }
                />
                <input
                  type='file'
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className='hidden'
                  id='file-upload'
                  disabled={disabled || isSubmitting}
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
                onClick={closeDrawer}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' className='w-full sm:w-auto' disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ClientTaskCreateDrawer;
