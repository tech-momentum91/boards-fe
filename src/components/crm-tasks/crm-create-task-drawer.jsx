import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import _ from 'lodash';
import {
  RiFileList2Line,
  RiStickyNoteLine,
  RiUserLine,
  RiPriceTag3Line,
  RiCloseLine,
  RiAttachment2,
  RiUploadLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ErrorText from '@/components/ui/error-text';
import * as Textarea from '@/components/ui/textarea';
import AttachmentList from '@/components/ui/attachment-list';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import {
  crmContactTaskCreateSchema,
  defaultCrmContactTaskCreateValues,
} from '@/schemas/task-schema';
import { getPriorityColor, getStatusColor } from '@/components/client-onboarding/constants';
import { getCrmStages } from '@/api/crmLeads';
import apiClient from '@/api/axios';
import { showErrorToast } from '@/utils/error-utils';

const LEAD_CRM_TASK_TYPE_API =
  '/method/devx.devx_crm.doctype.lead_crm_task_type.lead_crm_task_type.get_lead_crm_task_types';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_OPTIONS = ['Pending', 'Ongoing', 'Completed', 'On Hold'];

const parseDueDateToDate = (str) => {
  if (!str) return undefined;
  if (typeof str === 'string' && str.includes('-')) {
    const parts = str.split('-').map(Number);
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  return undefined;
};

const formatDateToYYYYMMDD = (date) => {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeEntityType = (type) => {
  const normalized = String(type || 'contact')
    .trim()
    .toLowerCase();

  // Channel Partner (must not treat plain account/contact as CP)
  if (normalized === 'cp_account') return 'CP Account';
  if (normalized === 'cp_contact') return 'CP Contact';

  if (normalized === 'account') return 'Account';
  if (normalized === 'contact') return 'Contact';
  if (normalized === 'lead' || normalized === 'cp_lead') return 'Lead';

  return 'Contact';
};

const CrmCreateTaskDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  showLifecycleFields = false,
  entityType = 'contact',
  entityId = null,
  assigneeOptions = [],
  assigneeOptionsLoading = false,
  defaultLifecycleStage = null,
  defaultLifecycleStageStatus = null,
  pipeline = null,
}) => {
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [tagArray, setTagArray] = useState([]);
  const [tags, setTags] = useState('');
  const [taskTypeOptions, setTaskTypeOptions] = useState([]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(crmContactTaskCreateSchema),
    defaultValues: defaultCrmContactTaskCreateValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedLifecycleStage = watch('lifecycle_stage');

  const [stages, setStages] = useState([]);
  const [stageStatusMap, setStageStatusMap] = useState({});
  const [loadingStages, setLoadingStages] = useState(false);

  useEffect(() => {
    if (!isOpen || !showLifecycleFields) return;
    let cancelled = false;
    setLoadingStages(true);
    getCrmStages(pipeline)
      .then((data) => {
        if (cancelled) return;
        setStages(data?.stages || []);
        setStageStatusMap(data?.stageStatusMap || {});
      })
      .catch((error) => {
        showErrorToast(error, 'Failed to load stages.');
        if (!cancelled) {
          setStages([]);
          setStageStatusMap({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, showLifecycleFields, pipeline]);

  useEffect(() => {
    if (isOpen && stages.length > 0) {
      const currentStageValue = watch('lifecycle_stage');
      if (defaultLifecycleStage && !currentStageValue) {
        let matchedStage = stages.find((s) => s.value === defaultLifecycleStage);
        if (!matchedStage) {
          matchedStage = stages.find(
            (s) => s.label.toLowerCase() === defaultLifecycleStage.toLowerCase(),
          );
        }
        if (matchedStage) {
          setValue('lifecycle_stage', matchedStage.value);
          const statusOptions = stageStatusMap[matchedStage.value] || [];
          if (defaultLifecycleStageStatus) {
            let matchedStatus = statusOptions.find((s) => s.value === defaultLifecycleStageStatus);
            if (!matchedStatus) {
              matchedStatus = statusOptions.find(
                (s) => s.label.toLowerCase() === defaultLifecycleStageStatus.toLowerCase(),
              );
            }
            if (matchedStatus) {
              setValue('lifecycle_stage_status', matchedStatus.value);
            }
          }
        }
      }
    }
  }, [
    stages,
    stageStatusMap,
    defaultLifecycleStage,
    defaultLifecycleStageStatus,
    setValue,
    watch,
    isOpen,
  ]);

  useEffect(() => {
    if (isOpen) {
      reset({
        ...defaultCrmContactTaskCreateValues,
        lifecycle_stage: null,
        lifecycle_stage_status: null,
      });
      setAttachments([]);
      setFileError(null);
      setTagArray([]);
      setTags('');
      setIsDescriptionOpen(false);
      setValue('tagArr', []);
    }
  }, [isOpen, reset, setValue, defaultLifecycleStage, defaultLifecycleStageStatus]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    apiClient
      .get(LEAD_CRM_TASK_TYPE_API)
      .then((res) => {
        const data = res?.data?.message ?? res?.data ?? [];
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        if (mounted) setTaskTypeOptions(list);
      })
      .catch(() => mounted && setTaskTypeOptions([]));
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) setDragActive(false);
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
      const entityTypeCap = normalizeEntityType(entityType);
      // console.log('entityTypeCap', entityTypeCap);
      const assigneeSource = data.assign_to;
      let assignTo = undefined;
      if (assigneeSource) {
        const arr = Array.isArray(assigneeSource) ? assigneeSource : [assigneeSource];
        assignTo = arr
          .map((x) => (typeof x === 'string' ? x : (x?.value ?? x?.email ?? x?.name)))
          .filter(Boolean);
      }

      const doc = {
        subject: _.upperFirst(data.taskTitle),
        description: data.description || '',
        acl_type: data.type,
        dueDate: data.dueDate,
        exp_start_date: new Date().toISOString().split('T')[0],
        exp_end_date: data.dueDate,
        priority: data.priority || 'LOW',
        status: data.status || 'Pending',
        entityType: entityTypeCap,
        entityId: entityId || undefined,
        tagArr: Array.isArray(data.tagArr) ? data.tagArr : data.tagArr ? [data.tagArr] : [],
        assign_to: assignTo?.length ? assignTo : undefined,
        lifecycle_stage: data.lifecycle_stage || undefined,
        lifecycle_stage_status: data.lifecycle_stage_status || undefined,
        pipeline: pipeline || undefined,
      };

      const payload = { doc, attachments };
      const success = await onSubmit(payload);
      if (success) {
        reset(defaultCrmContactTaskCreateValues);
        setAttachments([]);
        setTagArray([]);
        setTags('');
        onClose();
      }
    },
    [onSubmit, attachments, reset, onClose, showLifecycleFields, entityType, entityId, pipeline],
  );

  const handleClose = useCallback(() => {
    if (!isLoading) {
      reset(defaultCrmContactTaskCreateValues);
      setAttachments([]);
      setTagArray([]);
      setTags('');
      onClose();
    }
  }, [isLoading, reset, onClose]);

  const fileInputId = 'file-upload-crm-create-task';
  const lifecycleStatusOptions =
    (watchedLifecycleStage && stageStatusMap[watchedLifecycleStage]) || [];

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
                Add below details to create a new task.
              </p>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 max-w-[536px] overflow-y-auto px-8 pb-8 pt-6'>
          <form
            id='create-crm-task-form'
            onSubmit={handleSubmit(onSubmitForm)}
            className='flex flex-col gap-6'
          >
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

            <div className='flex flex-col gap-4'>
              <div className='flex items-center gap-2'>
                <RiUserLine className='size-5 text-text-sub-500' />
                <Label.Root className='text-label-md text-text-sub-500'>
                  Assignment Details
                </Label.Root>
              </div>
              <div className='flex flex-col gap-4'>
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
                            id='type'
                            value={field.value}
                            onValueChange={field.onChange}
                            options={taskTypeOptions}
                            hasError={isSubmitted && Boolean(errors.type)}
                            size='xsmall'
                            placeholder='Select'
                            searchPlaceholder='Search...'
                            emptyMessage='No task types available'
                            noResultsMessage='No task types found'
                            getOptionValue={(opt) => opt?.name ?? opt?.type ?? opt?.value ?? opt}
                            getOptionLabel={(opt) =>
                              typeof opt === 'object'
                                ? (opt?.type ?? opt?.name ?? String(opt?.value ?? ''))
                                : String(opt)
                            }
                            isolateSearchKeyboard
                            itemKeyPrefix='task-type-'
                          />
                          {isSubmitted && errors.type && (
                            <ErrorText>{errors.type.message}</ErrorText>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className='flex-1 flex flex-col gap-1'>
                    <Label.Root className='text-label-sm text-text-main-900'>Assignee</Label.Root>
                    <Controller
                      name='assign_to'
                      control={control}
                      render={({ field }) => {
                        const fieldValue = Array.isArray(field.value)
                          ? field.value
                          : field.value
                            ? [field.value]
                            : [];
                        return (
                          <AssigneeMultiSelect
                            value={fieldValue}
                            onChange={(values) => field.onChange(values?.length ? values : '')}
                            disabled={isLoading}
                            placeholder='Select'
                            size='xsmall'
                            hasError={isSubmitted && Boolean(errors.assign_to)}
                            options={assigneeOptions}
                            optionsLoading={assigneeOptionsLoading}
                          />
                        );
                      }}
                    />
                  </div>
                </div>

                {showLifecycleFields && (
                  <div className='flex gap-[18px]'>
                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Lifecycle Stage
                      </Label.Root>
                      <Controller
                        name='lifecycle_stage'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value || ''}
                            onValueChange={(v) => {
                              field.onChange(v || null);
                              const options = (v && stageStatusMap[v]) || [];
                              setValue('lifecycle_stage_status', options[0]?.value || null);
                            }}
                            size='xsmall'
                            disabled={loadingStages}
                          >
                            <Select.Trigger id='lifecycle_stage'>
                              <Select.Value placeholder={loadingStages ? 'Loading...' : 'Select'} />
                            </Select.Trigger>
                            <Select.Content>
                              {stages.map((opt) => (
                                <Select.Item key={opt.value} value={opt.value}>
                                  {opt.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </div>
                    <div className='flex-1 flex flex-col gap-1'>
                      <Label.Root className='text-label-sm text-text-main-900'>
                        Lifecycle Stage Status
                      </Label.Root>
                      <Controller
                        name='lifecycle_stage_status'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value || ''}
                            onValueChange={(v) => field.onChange(v || null)}
                            size='xsmall'
                            disabled={loadingStages || !watchedLifecycleStage}
                          >
                            <Select.Trigger id='lifecycle_stage_status'>
                              <Select.Value placeholder={loadingStages ? 'Loading...' : 'Select'} />
                            </Select.Trigger>
                            <Select.Content>
                              {lifecycleStatusOptions.map((opt) => (
                                <Select.Item key={opt.value} value={opt.value}>
                                  {opt.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className='flex gap-[18px]'>
                  <div className='flex-1 flex flex-col gap-1'>
                    <Label.Root className='text-label-sm text-text-main-900'>
                      Due Date <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='dueDate'
                      control={control}
                      render={({ field }) => (
                        <>
                          <Datepicker
                            value={parseDueDateToDate(field.value)}
                            onChange={(date) => field.onChange(formatDateToYYYYMMDD(date))}
                            placeholder='dd/mm/yyyy'
                            variant='borderless'
                            size='xsmall'
                            hasError={isSubmitted && Boolean(errors.dueDate)}
                          />
                          {isSubmitted && errors.dueDate && (
                            <ErrorText>{errors.dueDate.message}</ErrorText>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className='flex-1 flex flex-col gap-1'>
                    <Label.Root className='text-label-sm text-text-main-900'>Priority</Label.Root>
                    <Controller
                      name='priority'
                      control={control}
                      render={({ field }) => (
                        <>
                          <Select.Root
                            hasError={isSubmitted && Boolean(errors.priority)}
                            value={field.value}
                            onValueChange={field.onChange}
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
                                    {field.value.toUpperCase()}
                                  </Badge.Root>
                                ) : (
                                  'Select'
                                )}
                              </Select.Value>
                            </Select.Trigger>
                            <Select.Content>
                              {PRIORITY_OPTIONS.map((option) => (
                                <Select.Item key={option} value={option}>
                                  <Badge.Root
                                    variant='light'
                                    color={getPriorityColor(option)}
                                    className='text-nowrap'
                                  >
                                    {option.toUpperCase()}
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
                </div>

                <div className='flex gap-[18px]'>
                  <div className='flex-1 flex flex-col gap-1'>
                    <Label.Root className='text-label-sm text-text-main-900'>Status</Label.Root>
                    <Controller
                      name='status'
                      control={control}
                      render={({ field }) => (
                        <>
                          <Select.Root
                            hasError={isSubmitted && Boolean(errors.status)}
                            value={field.value}
                            onValueChange={field.onChange}
                            size='xsmall'
                          >
                            <Select.Trigger id='status'>
                              <Select.Value placeholder='Select' asChild>
                                {field.value ? (
                                  <Badge.Root
                                    variant='light'
                                    color={getStatusColor(field.value) || 'orange'}
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
                              {STATUS_OPTIONS.map((option) => (
                                <Select.Item key={option} value={option}>
                                  <Badge.Root
                                    variant='light'
                                    color={getStatusColor(option) || 'orange'}
                                    className='text-nowrap'
                                  >
                                    {option}
                                  </Badge.Root>
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
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
            </div>

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
                emptyStateDescription='All file types, up to 10 MB per file'
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
          </form>
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
            <Button.Root
              type='submit'
              form='create-crm-task-form'
              disabled={isLoading}
              className='w-full sm:w-auto'
              color='green'
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CrmCreateTaskDrawer;
