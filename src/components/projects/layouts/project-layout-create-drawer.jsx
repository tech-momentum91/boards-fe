import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiCalendarLine,
  RiCollageLine,
  RiFlagLine,
  RiStackLine,
  RiTaskLine,
  RiUploadCloud2Line,
  RiUserLine,
} from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import ProjectDrawerDescriptionEditor from '@/components/projects/shared/project-drawer-description-editor';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import { buildProjectLayoutCreatePayload } from '@/components/projects/layouts/project-layout-helpers';
import {
  colorForProjectTaskPriority,
  getProjectFloorSelectOptions,
} from '@/components/projects/shared';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import { Datepicker } from '@/components/ui/datepicker';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import {
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  PROJECT_LAYOUT_STATUS_CONFIG,
} from '@/components/projects/constants';
import {
  buildStatusMetaMap,
  useStatusOptions,
  useSyncDefaultStatusOption,
} from '@/hooks/use-status-options';
import {
  defaultProjectDetailLayoutCreateValues,
  projectDetailLayoutCreateSchema,
} from '@/schemas/project';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import { mapFilesToAttachmentRows } from '@/components/projects/shared/project-attachment-upload-utils';
import { createProjectLayoutThunk, selectProjectLayoutCreateLoading } from '@/redux/projectSlice';
import { formatToDDMMYYYY } from '@/utils/date-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const LAYOUT_TYPE_OPTIONS = ['Floor Layout', 'Designer Layout', 'MEPF Layout'];

export default function ProjectLayoutCreateDrawer({
  open,
  onOpenChange,
  projectId,
  onCreated,
  projectFloors = [],
}) {
  const dispatch = useDispatch();
  const isSubmitting = useSelector(selectProjectLayoutCreateLoading);
  const { options: layoutStatusOptions } = useStatusOptions(PROJECT_LAYOUT_STATUS_CONFIG);
  const layoutStatusMetaMap = useMemo(
    () => buildStatusMetaMap(layoutStatusOptions),
    [layoutStatusOptions],
  );
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
    resolver: zodResolver(projectDetailLayoutCreateSchema),
    defaultValues: defaultProjectDetailLayoutCreateValues,
    mode: 'onChange',
  });

  const watchedTags = watch('tags') ?? [];

  const floorOptions = useMemo(() => getProjectFloorSelectOptions(projectFloors), [projectFloors]);

  useSyncDefaultStatusOption({
    open,
    options: layoutStatusOptions,
    currentStatus: watch('status'),
    setValue,
  });

  useEffect(() => {
    if (!open) {
      reset(defaultProjectDetailLayoutCreateValues);
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
      if (!projectId) {
        showErrorToast('Project is required');
        return;
      }

      try {
        const payload = buildProjectLayoutCreatePayload(projectId, values);
        const result = await dispatch(createProjectLayoutThunk({ payload, attachments })).unwrap();
        showSuccessToast(result?.message ?? 'Layout created successfully');
        reset(defaultProjectDetailLayoutCreateValues);
        setAttachments([]);
        setFileError(null);
        setTagsResetKey((prev) => prev + 1);
        setDescriptionEditorKey((prev) => prev + 1);
        onOpenChange(false);
        onCreated?.(result);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [attachments, dispatch, onCreated, onOpenChange, projectId, reset],
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
              <RiTaskLine className='size-6' />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title>Add New Layout</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>
                Enter below details to create a layout.
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
                  statusOptions={layoutStatusOptions}
                  statusMetaMap={layoutStatusMetaMap}
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
                    placeholder='Enter layout title'
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

            <div className='rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
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
                          placeholder='Select'
                          size='xsmall'
                          variant='borderless'
                          maxVisibleAvatars={2}
                          hasError={Boolean(errors.assignees)}
                          disabled={isSubmitting}
                        />
                        <ErrorText>{errors.assignees?.message}</ErrorText>
                      </>
                    );
                  }}
                />
              </FieldRow>

              <FieldRow icon={RiStackLine} label='Floor' required>
                <Controller
                  control={control}
                  name='floor'
                  render={({ field }) => (
                    <Select.Root
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='xsmall'
                      variant='borderless'
                      hasError={Boolean(errors.floor)}
                      disabled={isSubmitting}
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {floorOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
                <ErrorText>{errors.floor?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiCollageLine} label='Type' required>
                <Controller
                  control={control}
                  name='layout_type'
                  render={({ field }) => (
                    <Select.Root
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='xsmall'
                      variant='borderless'
                      hasError={Boolean(errors.layout_type)}
                      disabled={isSubmitting}
                    >
                      <Select.Trigger className='h-8 min-w-[160px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {LAYOUT_TYPE_OPTIONS.map((option) => (
                          <Select.Item key={option} value={option}>
                            {option}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
                <ErrorText>{errors.layout_type?.message}</ErrorText>
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
                    <Select.Root
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='xsmall'
                      variant='borderless'
                      hasError={Boolean(errors.priority)}
                      disabled={isSubmitting}
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        {field.value ? (
                          <Badge.Root
                            size='small'
                            variant='light'
                            color={colorForProjectTaskPriority(field.value)}
                          >
                            {field.value.toUpperCase()}
                          </Badge.Root>
                        ) : (
                          <Select.Value placeholder='Select' />
                        )}
                      </Select.Trigger>
                      <Select.Content>
                        {PROJECT_DETAIL_PRIORITY_OPTIONS.map((option) => (
                          <Select.Item key={option} value={option}>
                            <Badge.Root
                              size='small'
                              variant='light'
                              color={colorForProjectTaskPriority(option)}
                            >
                              {option.toUpperCase()}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
                <ErrorText>{errors.priority?.message}</ErrorText>
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
