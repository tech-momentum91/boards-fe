import React, { useState, useCallback, useEffect } from 'react';
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
import * as Tag from '@/components/ui/tag';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import ErrorText from '@/components/ui/error-text';
import * as Textarea from '@/components/ui/textarea';
import AttachmentList from '@/components/ui/attachment-list';
import {
  crmContactTaskCreateSchema,
  defaultCrmContactTaskCreateValues,
} from '@/schemas/task-schema';
import { getPriorityColor, getStatusColor } from '@/components/client-onboarding/constants';

const TASK_TYPE_OPTIONS = ['Task', 'Meeting', 'Phone', 'Email', 'Reminder', 'SMS', 'Chat'];
const DEPARTMENT_OPTIONS = ['Administration', 'Operations', 'Sales', 'Marketing', 'CRM'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'];
const STATUS_OPTIONS = ['PENDING', 'ONGOING', 'COMPLETED'];

const CrmContactCreateTaskDrawer = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const [tagArray, setTagArray] = useState([]);
  const [tags, setTags] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(crmContactTaskCreateSchema),
    defaultValues: defaultCrmContactTaskCreateValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      reset(defaultCrmContactTaskCreateValues);
      setAttachments([]);
      setFileError(null);
      setTagArray([]);
      setTags('');
      setIsDescriptionOpen(false);
      setValue('tagArr', []);
    }
  }, [isOpen, reset, setValue]);

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
      const formData = {
        taskTitle: _.upperFirst(data.taskTitle),
        description: data.description || '',
        type: data.type,
        department: data.department,
        dueDate: data.dueDate,
        priority: data.priority,
        status: data.status,
        attachment: attachments,
        tagArr: data.tagArr || [],
      };

      const success = await onSubmit(formData);
      if (success) {
        reset(defaultCrmContactTaskCreateValues);
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
      reset(defaultCrmContactTaskCreateValues);
      setAttachments([]);
      setTagArray([]);
      setTags('');
      onClose();
    }
  }, [isLoading, reset, onClose]);

  const fileInputId = 'file-upload-crm-contact-create-task';

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
                {/* First Row: Type and Department */}
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
                          <Select.Root
                            hasError={isSubmitted && Boolean(errors.type)}
                            value={field.value}
                            onValueChange={field.onChange}
                            size='xsmall'
                          >
                            <Select.Trigger id='type'>
                              <Select.Value placeholder='Select' />
                            </Select.Trigger>
                            <Select.Content>
                              {TASK_TYPE_OPTIONS.map((option) => (
                                <Select.Item key={option} value={option}>
                                  {option}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
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
                          <Select.Root
                            hasError={isSubmitted && Boolean(errors.department)}
                            value={field.value}
                            onValueChange={field.onChange}
                            size='xsmall'
                          >
                            <Select.Trigger id='department'>
                              <Select.Value placeholder='Select' />
                            </Select.Trigger>
                            <Select.Content>
                              {DEPARTMENT_OPTIONS.map((option) => (
                                <Select.Item key={option} value={option}>
                                  {option}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                          {isSubmitted && errors.department && (
                            <ErrorText>{errors.department.message}</ErrorText>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>

                {/* Second Row: Due Date and Priority */}
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
                          <Input.Root
                            size='xsmall'
                            hasError={isSubmitted && Boolean(errors.dueDate)}
                          >
                            <Input.Wrapper>
                              <Input.Input {...field} type='date' placeholder='DD / MM / YYYY' />
                            </Input.Wrapper>
                          </Input.Root>
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

                {/* Third Row: Status */}
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
                                    {field.value.toUpperCase()}
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
                                    {option.toUpperCase()}
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

            {/* Tags Section */}
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
                emptyStateDescription='JPEG, PNG formats, up to 50 MB.'
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

export default CrmContactCreateTaskDrawer;
