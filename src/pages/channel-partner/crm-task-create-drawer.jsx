import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import _ from 'lodash';
import {
  RiFileList2Line,
  RiStickyNoteLine,
  RiUserLine,
  RiPriceTag3Line,
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
import * as Checkbox from '@/components/ui/checkbox';
import ErrorText from '@/components/ui/error-text';
import * as Textarea from '@/components/ui/textarea';
import AttachmentList from '@/components/ui/attachment-list';
import {
  getPriorityColor,
  getStatusColor,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@/components/client-onboarding/constants';
import { CRM_TASK_MASTER_DEPARTMENT_OPTIONS } from '@/components/crm-task/crm-task-master-constants';

const crmTaskDrawerSchema = z
  .object({
    taskTitle: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    type: z.string().min(1, 'Type is required'),
    department: z.string().min(1, 'Department is required'),
    duration: z.string().min(1, 'Duration is required'),
    priority: z.string().min(1, 'Priority is required'),
    status: z.string().min(1, 'Status is required'),
    set_trigger: z.boolean().optional(),
    pipeline: z.string().optional(),
    lifecycle_stage: z.string().optional(),
    lifecycle_stage_status: z.string().optional(),
    tagArr: z.array(z.string()).optional(),
  })
  .superRefine((values, context) => {
    if (values.set_trigger) {
      if (!values.pipeline?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pipeline is required when Set Trigger is enabled',
          path: ['pipeline'],
        });
      }
      if (!values.lifecycle_stage) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Lifecycle stage is required when Set Trigger is enabled',
          path: ['lifecycle_stage'],
        });
      }
      if (!values.lifecycle_stage_status) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Lifecycle stage status is required when Set Trigger is enabled',
          path: ['lifecycle_stage_status'],
        });
      }
    }
  });

const defaultValues = {
  taskTitle: '',
  description: '',
  type: '',
  department: '',
  duration: '',
  priority: '',
  status: '',
  set_trigger: false,
  pipeline: '',
  lifecycle_stage: '',
  lifecycle_stage_status: '',
  tagArr: [],
};

const CrmTaskCreateDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  taskType = 'account', // 'account' | 'contact' | 'lead' | 'cp_account' | 'cp_contact'
  // These will be populated via API integration later
  taskTypeOptions = [], // options for the "Type" field from Lead CRM Task Type
  pipelineOptions = [],
  lifecycleStages = [], // options for Lifecycle Stage from CRM Status Master
  showLifecycleFields: _showLifecycleFieldsProperty,
}) => {
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [tagArray, setTagArray] = useState([]);
  const [tagInput, setTagInput] = useState('');
  // Lifecycle stage statuses derived from selected stage
  const [stageStatusOptions, setStageStatusOptions] = useState([]);

  const showLifecycleFields =
    (taskType === 'contact' || taskType === 'lead') &&
    taskType !== 'cp_account' &&
    taskType !== 'cp_contact';

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(crmTaskDrawerSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedStatus = watch('status');
  const watchedSetTrigger = watch('set_trigger');
  const watchedPipeline = watch('pipeline');
  const watchedLifecycleStage = watch('lifecycle_stage');

  const stagesForPipeline = useMemo(() => {
    const stages = lifecycleStages || [];
    const pv = (watchedPipeline || '').trim();
    if (!pv) return [];
    return stages.filter((s) => (s.pipeline || '').trim() === pv);
  }, [lifecycleStages, watchedPipeline]);

  const prevPipelineRef = useRef(null);

  // Set default status to Active
  useEffect(() => {
    if (!watchedStatus && TASK_STATUS_OPTIONS.length > 0) {
      const activeStatus = TASK_STATUS_OPTIONS.find((s) => s.value === 'Active');
      if (activeStatus) setValue('status', activeStatus.value);
      else setValue('status', TASK_STATUS_OPTIONS[0]?.value || '');
    }
  }, [watchedStatus, setValue]);

  // When lifecycle stage changes, update stage status options
  useEffect(() => {
    if (watchedLifecycleStage && stagesForPipeline.length > 0) {
      const selected = stagesForPipeline.find((s) => s.name === watchedLifecycleStage);
      const statusOptions = selected?.crm_stage_status ?? [];
      if (statusOptions.length > 0) {
        setStageStatusOptions(statusOptions);
        const first = statusOptions[0];
        setValue('lifecycle_stage_status', first?.name || first?.status || '');
      } else {
        setStageStatusOptions([]);
        setValue('lifecycle_stage_status', '');
      }
    } else {
      setStageStatusOptions([]);
      setValue('lifecycle_stage_status', '');
    }
  }, [watchedLifecycleStage, stagesForPipeline, setValue]);

  // Default pipeline when Set Trigger is enabled (lifecycle depends on pipeline)
  useEffect(() => {
    if (!showLifecycleFields || !watchedSetTrigger) return;
    if ((watchedPipeline || '').trim()) return;
    const first = pipelineOptions[0]?.value;
    if (first) setValue('pipeline', first);
  }, [showLifecycleFields, watchedSetTrigger, watchedPipeline, pipelineOptions, setValue]);

  // When pipeline changes, reset lifecycle to first stage in that pipeline
  useEffect(() => {
    if (!showLifecycleFields || !watchedSetTrigger) {
      prevPipelineRef.current = null;
      return;
    }
    const pv = (watchedPipeline || '').trim();
    if (prevPipelineRef.current === pv) return;
    prevPipelineRef.current = pv;
    if (!pv) {
      setValue('lifecycle_stage', '');
      setValue('lifecycle_stage_status', '');
      setStageStatusOptions([]);
      return;
    }
    const stage = (lifecycleStages || []).find((s) => (s.pipeline || '').trim() === pv);
    const first = stage;
    setValue('lifecycle_stage', first?.name ?? '');
    const statusOpts = first?.crm_stage_status ?? [];
    setStageStatusOptions(statusOpts);
    const firstSt = statusOpts[0];
    setValue('lifecycle_stage_status', firstSt?.name || firstSt?.status || '');
  }, [watchedPipeline, watchedSetTrigger, lifecycleStages, setValue, showLifecycleFields]);

  // Reset set_trigger fields when set_trigger unchecked
  useEffect(() => {
    if (!watchedSetTrigger) {
      setValue('pipeline', '');
      setValue('lifecycle_stage', '');
      setValue('lifecycle_stage_status', '');
      setStageStatusOptions([]);
      prevPipelineRef.current = null;
    }
  }, [watchedSetTrigger, setValue]);

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
      setAttachments([]);
      setFileError(null);
      setTagArray([]);
      setTagInput('');
      setIsDescriptionOpen(false);
      setStageStatusOptions([]);
      prevPipelineRef.current = null;
    }
  }, [isOpen, reset]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleFileUpload = useCallback(
    (files) => {
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
    },
    [MAX_FILE_SIZE],
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      const rect = e.currentTarget.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
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
    setAttachments((previous) => previous.filter((file) => file.id !== id));
  }, []);

  const handleTagInput = useCallback(
    (e) => {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        const newTag = tagInput.trim();
        if (!tagArray.includes(newTag)) {
          const updated = [...tagArray, newTag];
          setTagArray(updated);
          setValue('tagArr', updated);
        }
        setTagInput('');
      }
    },
    [tagInput, tagArray, setValue],
  );

  const removeTag = useCallback(
    (tagToRemove) => {
      const updated = tagArray.filter((t) => t !== tagToRemove);
      setTagArray(updated);
      setValue('tagArr', updated);
    },
    [tagArray, setValue],
  );

  const onSubmitForm = useCallback(
    async (data) => {
      const formData = {
        taskTitle: _.upperFirst(data.taskTitle),
        description: data.description || '',
        type: data.type,
        department: data.department,
        duration: data.duration,
        priority: data.priority,
        status: data.status,
        set_trigger: data.set_trigger || false,
        pipeline: data.pipeline || '',
        lifecycle_stage: data.lifecycle_stage || '',
        lifecycle_stage_status: data.lifecycle_stage_status || '',
        tagArr: data.tagArr || [],
        attachment: attachments,
        taskType,
      };

      const success = await onSubmit(formData);
      if (success) {
        reset(defaultValues);
        setAttachments([]);
        setTagArray([]);
        onClose();
      }
    },
    [onSubmit, attachments, reset, onClose, taskType],
  );

  const handleClose = useCallback(() => {
    if (!isLoading) {
      reset(defaultValues);
      setAttachments([]);
      setTagArray([]);
      onClose();
    }
  }, [isLoading, reset, onClose]);

  const fileInputId = `crm-task-file-upload-${taskType}`;

  const taskTypeLabelMap = {
    account: 'Account',
    contact: 'Contact',
    lead: 'Lead',
    cp_account: 'CP Account',
    cp_contact: 'CP Contact',
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
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
                Create New Task
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Add below details to create a new {taskTypeLabelMap[taskType] || taskType} task.
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
                  {/* Row 1: Type and Department */}
                  <div className='flex gap-[18px]'>
                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Type <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='type'
                        control={control}
                        render={({ field }) => (
                          <>
                            <SearchableSelect
                              hasError={isSubmitted && Boolean(errors.type)}
                              value={field.value}
                              onValueChange={field.onChange}
                              size='xsmall'
                              options={taskTypeOptions.map((opt) => ({
                                value: opt.name || opt.value,
                                label: opt.type || opt.label || opt.name,
                              }))}
                              placeholder='Select'
                              showArrow={true}
                            />
                            {isSubmitted && errors.type && (
                              <ErrorText>{errors.type.message}</ErrorText>
                            )}
                          </>
                        )}
                      />
                    </div>

                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Department <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='department'
                        control={control}
                        render={({ field }) => (
                          <>
                            <SearchableSelect
                              hasError={isSubmitted && Boolean(errors.department)}
                              value={field.value}
                              onValueChange={field.onChange}
                              size='xsmall'
                              options={CRM_TASK_MASTER_DEPARTMENT_OPTIONS}
                              placeholder='Select'
                              showArrow={true}
                            />
                            {isSubmitted && errors.department && (
                              <ErrorText>{errors.department.message}</ErrorText>
                            )}
                          </>
                        )}
                      />
                    </div>
                  </div>

                  {/* Row 2: Duration and Priority */}
                  <div className='flex gap-[18px]'>
                    <div className='flex-1 flex flex-col gap-1'>
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
                                  {...field}
                                  type='number'
                                  placeholder='Enter duration'
                                  min='0'
                                />
                                <Input.Affix>Days</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                            {isSubmitted && errors.duration && (
                              <ErrorText>{errors.duration.message}</ErrorText>
                            )}
                          </>
                        )}
                      />
                    </div>

                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Priority <span className='text-icon-soft-400'>*</span>
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
                              renderTrigger={({ selectedOption }) =>
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
                  </div>

                  {/* Row 4: Status */}
                  <div className='flex gap-[18px]'>
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
                              options={TASK_STATUS_OPTIONS}
                              placeholder='Select'
                              showArrow={true}
                              renderTrigger={({ selectedOption }) =>
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
                                  {String(option.value).toUpperCase()}
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
                    <div className='flex-1' />
                  </div>
                </div>
              </div>

              {/* Set Trigger + Lifecycle fields — only for Contact/Lead */}
              {showLifecycleFields && (
                <div className='flex flex-col gap-4'>
                  {/* Set Trigger checkbox */}
                  <div className='flex items-center gap-2'>
                    <Controller
                      name='set_trigger'
                      control={control}
                      render={({ field }) => (
                        <Checkbox.Root
                          id='set_trigger'
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label.Root
                      htmlFor='set_trigger'
                      className='text-label-sm text-text-main-900 cursor-pointer'
                    >
                      Set Trigger
                    </Label.Root>
                  </div>

                  {/* Pipeline + Lifecycle — visible when set_trigger is true */}
                  {watchedSetTrigger && (
                    <div className='flex flex-col gap-4'>
                      {/* Row 1: Pipeline | Lifecycle Stage */}
                      <div className='flex gap-[18px]'>
                        <div className='flex-1 flex flex-col gap-1'>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Pipeline <Label.Asterisk />
                          </Label.Root>
                          <Controller
                            name='pipeline'
                            control={control}
                            render={({ field }) => (
                              <>
                                <SearchableSelect
                                  hasError={isSubmitted && Boolean(errors.pipeline)}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  size='xsmall'
                                  options={pipelineOptions.map((opt) => ({
                                    value: opt.value,
                                    label: opt.label,
                                  }))}
                                  placeholder='Select pipeline'
                                  showArrow={true}
                                />
                                {isSubmitted && errors.pipeline && (
                                  <ErrorText>{errors.pipeline.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Lifecycle Stage <Label.Asterisk />
                          </Label.Root>
                          <Controller
                            name='lifecycle_stage'
                            control={control}
                            render={({ field }) => (
                              <>
                                <SearchableSelect
                                  hasError={isSubmitted && Boolean(errors.lifecycle_stage)}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  size='xsmall'
                                  options={stagesForPipeline.map((stage) => ({
                                    value: stage.name,
                                    label: stage.stage,
                                    color: stage.color,
                                  }))}
                                  placeholder='Select'
                                  showArrow={true}
                                  renderOptionLabel={(option) => (
                                    <div className='flex items-center gap-2'>
                                      {option.color && (
                                        <span
                                          className='inline-block size-3 rounded-full shrink-0'
                                          style={{ backgroundColor: option.color }}
                                        />
                                      )}
                                      {option.label}
                                    </div>
                                  )}
                                />
                                {isSubmitted && errors.lifecycle_stage && (
                                  <ErrorText>{errors.lifecycle_stage.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </div>
                      </div>

                      {/* Row 2: Lifecycle Stage Status — left column only (half width) */}
                      <div className='flex gap-[18px]'>
                        <div className='flex-1 flex flex-col gap-1'>
                          <Label.Root className='text-label-sm text-text-main-900'>
                            Lifecycle Stage Status <Label.Asterisk />
                          </Label.Root>
                          <Controller
                            name='lifecycle_stage_status'
                            control={control}
                            render={({ field }) => (
                              <>
                                <SearchableSelect
                                  hasError={isSubmitted && Boolean(errors.lifecycle_stage_status)}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  size='xsmall'
                                  disabled={!watchedLifecycleStage}
                                  options={stageStatusOptions.map((s) => ({
                                    value: s.name || s.status,
                                    label: s.status,
                                  }))}
                                  placeholder='Select'
                                  showArrow={true}
                                />
                                {isSubmitted && errors.lifecycle_stage_status && (
                                  <ErrorText>{errors.lifecycle_stage_status.message}</ErrorText>
                                )}
                              </>
                            )}
                          />
                        </div>
                        <div className='flex-1 min-w-0' aria-hidden />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiPriceTag3Line className='size-5 text-text-sub-500' />
                  <Label.Root className='text-label-md text-text-sub-500'>Tags</Label.Root>
                </div>

                <div className='flex flex-col gap-2'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='Type here'
                        onKeyDown={handleTagInput}
                        disabled={isLoading}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {tagArray.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {tagArray.map((item) => (
                        <Tag.Root key={item} variant='stroke'>
                          <span className='text-label-xs text-text-sub-600'>{item}</span>
                          <Tag.DismissButton
                            onClick={() => removeTag(item)}
                            aria-label={`Remove ${item}`}
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

export default CrmTaskCreateDrawer;
