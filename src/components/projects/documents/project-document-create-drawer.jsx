import React, { useCallback, useEffect, useState } from 'react';
import {
  RiAddLine,
  RiAttachment2,
  RiCalendarLine,
  RiFileTextLine,
  RiFlagLine,
  RiPriceTag3Line,
  RiUserLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectDrawerDescriptionEditor from '@/components/projects/shared/project-drawer-description-editor';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import { mapFilesToAttachmentRows } from '@/components/projects/shared/project-attachment-upload-utils';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import { Datepicker } from '@/components/ui/datepicker';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Tag from '@/components/ui/tag';
import { colorForLayoutPriority } from '@/components/projects/constants';
import { buildProjectDocumentCreateFormData } from '@/components/projects/documents/project-document-helpers';
import { createProjectTask, selectProjectTaskCreateLoading } from '@/redux/projectSlice';
import { defaultProjectDocumentCreateValues, projectDocumentCreateSchema } from '@/schemas/project';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { formatToDDMMYYYY } from '@/utils/date-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';
import { useSyncDefaultStatusOption } from '@/hooks/use-status-options';

const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_INPUT_ID = 'project-document-create-file-upload';

export default function ProjectDocumentCreateDrawer({
  open,
  onOpenChange,
  projectId,
  onCreated,
  categoryOptions = [],
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const dispatch = useDispatch();
  const isSubmitting = useSelector(selectProjectTaskCreateLoading);
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [tagsResetKey, setTagsResetKey] = useState(0);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectDocumentCreateSchema),
    defaultValues: defaultProjectDocumentCreateValues,
    mode: 'onChange',
  });

  useSyncDefaultStatusOption({
    open,
    options: statusOptions,
    currentStatus: watch('status'),
    setValue,
  });

  const watchedTags = watch('tags') ?? [];

  useEffect(() => {
    if (!open) {
      reset(defaultProjectDocumentCreateValues);
      setAttachments([]);
      setFileError(null);
      setTagsResetKey((prev) => prev + 1);
      setDescriptionEditorKey((prev) => prev + 1);
      setDragActive(false);
    }
  }, [open, reset]);

  const handleFileUpload = useCallback((files) => {
    const { validFiles, errorMessage } = mapFilesToAttachmentRows(files);
    setFileError(errorMessage || null);
    if (validFiles.length > 0) {
      setAttachments((previous) => [...previous, ...validFiles]);
    }
  }, []);

  const handleDrag = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (event.dataTransfer.files?.length) {
        handleFileUpload(event.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  const removeAttachment = useCallback((attachmentId) => {
    setAttachments((previous) => previous.filter((file) => file.id !== attachmentId));
  }, []);

  const onSubmit = useCallback(
    async (values) => {
      try {
        const formData = buildProjectDocumentCreateFormData(projectId, values, attachments);
        await dispatch(createProjectTask(formData)).unwrap();
        showSuccessToast('Document created successfully');
        reset(defaultProjectDocumentCreateValues);
        setAttachments([]);
        setFileError(null);
        // setDragActive(false);
        onCreated?.();
        onOpenChange(false);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, projectId, attachments, onCreated, onOpenChange, reset],
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content
        className='h-full max-w-[600px] shadow-regular-md'
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {dragActive ? (
          <div className='pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-information-base bg-information-lighter/80 backdrop-blur-sm'>
            <div className='flex flex-col items-center gap-4'>
              <RiUploadCloud2Line className='size-16 text-information-base' />
              <div className='flex flex-col items-center gap-2'>
                <p className='text-label-md font-semibold text-information-base'>Drop files here</p>
                <p className='text-paragraph-sm text-text-sub-600'>
                  JPEG, PNG formats, up to 10 MB per file
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className='flex h-full flex-col'>
          <Drawer.Header className='min-h-[48px] gap-4 px-8 py-5'>
            <span className='flex size-12 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500'>
              <RiFileTextLine className='size-6' />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title>Create New Document</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>
                Add below details to create new document.
              </p>
            </div>
          </Drawer.Header>

          <Drawer.Body className='flex-1 gap-5 overflow-y-auto px-8 py-6'>
            <Controller
              control={control}
              name='status'
              render={({ field }) => (
                <ProjectStatusDropdown
                  value={field.value}
                  onValueChange={field.onChange}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                  size='small'
                  className='max-w-[220px]'
                  disabled={isSubmitting}
                />
              )}
            />

            <div className='flex flex-col gap-1'>
              <Input.Root size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...register('title')}
                    placeholder='Enter document title'
                    className='text-title-h6'
                    disabled={isSubmitting}
                  />
                </Input.Wrapper>
              </Input.Root>
              <ErrorText>{errors.title?.message}</ErrorText>
            </div>

            <Controller
              control={control}
              name='description'
              render={({ field }) => (
                <ProjectDrawerDescriptionEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  error={errors.description?.message}
                  editorKey={descriptionEditorKey}
                />
              )}
            />

            <div className=' rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
              <FieldRow icon={RiUserLine} label='Assignee'>
                <Controller
                  control={control}
                  name='assignees'
                  render={({ field }) => {
                    const fieldValue = Array.isArray(field.value) ? field.value : [];
                    return (
                      <>
                        <AssigneeMultiSelect
                          projectId={projectId}
                          value={fieldValue}
                          onChange={(values) => field.onChange(Array.isArray(values) ? values : [])}
                          disabled={isSubmitting}
                          placeholder='Select'
                          size='xsmall'
                          variant='borderless'
                          maxVisibleAvatars={2}
                          hasError={Boolean(errors.assignees)}
                        />
                        <ErrorText>{errors.assignees?.message}</ErrorText>
                      </>
                    );
                  }}
                />
              </FieldRow>

              <FieldRow icon={RiPriceTag3Line} label='Category' required>
                <Controller
                  control={control}
                  name='category'
                  render={({ field }) => (
                    <Select.Root
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='xsmall'
                      variant='borderless'
                      disabled={isSubmitting}
                      hasError={Boolean(errors.category)}
                    >
                      <Select.Trigger className='h-8 min-w-[160px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {categoryOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
                <ErrorText>{errors.category?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiCalendarLine} label='Due Date' required>
                <Controller
                  control={control}
                  name='due_date'
                  render={({ field }) => (
                    <Datepicker
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      size='xsmall'
                      variant='borderless'
                      placeholder='DD / MM / YYYY'
                      formatDate={(date) => formatToDDMMYYYY(date)}
                      className='h-8 min-w-[140px]'
                      disabled={isSubmitting}
                      hasError={Boolean(errors.due_date)}
                    />
                  )}
                />
                <ErrorText>{errors.due_date?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiFlagLine} label='Priority'>
                <Controller
                  control={control}
                  name='priority'
                  render={({ field }) => (
                    <>
                      <ProjectBadgeSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={PRIORITY_OPTIONS}
                        colorFn={colorForLayoutPriority}
                        formatLabel={formatProjectPriorityLabel}
                        disabled={isSubmitting}
                        hasError={Boolean(errors.priority)}
                      />
                      <ErrorText>{errors.priority?.message}</ErrorText>
                    </>
                  )}
                />
              </FieldRow>
            </div>

            <ProjectDrawerTagsSection
              tags={watchedTags}
              onTagsChange={(nextTags) => setValue('tags', nextTags, { shouldValidate: true })}
              resetKey={tagsResetKey}
            />
            <ErrorText>{errors.tags?.message}</ErrorText>

            <ProjectDrawerAttachmentsSection
              attachments={attachments}
              onUpload={(_, files) => handleFileUpload(files)}
              onRemove={removeAttachment}
              disabled={isSubmitting}
              fileError={fileError ?? ''}
            />
          </Drawer.Body>

          <Drawer.Footer className='flex items-center justify-end gap-3 border-t border-stroke-soft-200 px-8 py-6'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='small'
              disabled={isSubmitting}
            >
              Add
            </Button.Root>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
