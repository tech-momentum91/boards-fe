import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiAttachment2,
  RiCheckboxCircleLine,
  RiInformationFill,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import ProjectDrawerDescriptionEditor from '@/components/projects/shared/project-drawer-description-editor';
import ProjectCreateLayoutPanel from '@/components/projects/shared/project-create-layout-panel';
import { PROJECT_CREATE_LAYOUT_MARKER_COLORS } from '@/components/projects/shared/project-create-layout-marker-utils';
import {
  buildLayoutPreviewLayoutFromFloor,
  findLayoutAreasFloorRecord,
} from '@/components/projects/shared/project-layout-areas-helpers';
import {
  buildPublicSnagFloorOptions,
  mapSnagRaisedByUserOptions,
  normalizePublicSnagFloorLayouts,
  PUBLIC_SNAG_SOURCE_OPTIONS,
} from '@/components/projects/snags/project-snag-helpers';
import ProductCategoryLeafSelect from '@/components/products/product-category-leaf-select';
import * as Button from '@/components/ui/button';
import ErrorText from '@/components/ui/error-text';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Select from '@/components/ui/select';
import AttachmentList from '@/components/ui/attachment-list';
import { cn } from '@/utils/cn';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_INPUT_ID = 'project-external-snag-file-upload';

const externalSnagFormSchema = z
  .object({
    raised_by: z.string().trim(),
    title: z.string().trim().min(1, 'Snag title is required'),
    description: z.string().optional(),
    category: z.string().min(1, 'Product category is required'),
    sub_category: z.string().optional(),
    floor: z.string().optional(),
    area: z.string().optional(),
    snag_source: z.string().min(1, 'Source is required'),
  })
  .superRefine((values, ctx) => {
    if (values.raised_by?.trim()) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['raised_by'],
      message: values.snag_source === 'Internal' ? 'Select a team member' : 'Your name is required',
    });
  });

const defaultValues = {
  raised_by: '',
  title: '',
  description: '',
  category: '',
  sub_category: '',
  floor: '',
  area: '',
  snag_source: 'Client',
};

function FormField({ label, required, children, error }) {
  return (
    <div className='flex min-w-0 flex-1 flex-col gap-1'>
      <label className='text-label-sm text-text-strong-950'>
        {label}
        {required ? <span className='text-error-base'> *</span> : null}
      </label>
      {children}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function ReportSnagHeader({ projectName, isPreview }) {
  return (
    <div className='relative overflow-hidden rounded-xl bg-bg-white-0 shadow-regular-medium'>
      <div className='absolute inset-x-0 top-0 h-1 bg-primary-base' />
      <div className='px-8 py-6'>
        <h1 className='text-title-h5 text-text-strong-950'>
          {projectName || 'Project'} - Report Snag
        </h1>
        <p className='mt-1.5 text-paragraph-md text-text-soft-400'>
          {isPreview
            ? 'Preview how external users will see this form.'
            : 'Report project issues and snags for review and resolution.'}
        </p>
      </div>
    </div>
  );
}

export default function ProjectExternalSnagForm({
  context,
  isPreview = false,
  isSubmitting = false,
  onSubmit,
  className,
}) {
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [markerCoordinates, setMarkerCoordinates] = useState(null);

  const categories = context?.categories ?? [];
  const floorLayouts = useMemo(() => normalizePublicSnagFloorLayouts(context), [context]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(externalSnagFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedFloor = watch('floor');
  const watchedArea = watch('area');
  const watchedSnagSource = watch('snag_source');
  const isInternalSource = watchedSnagSource === 'Internal';

  const raisedByUserOptions = useMemo(() => mapSnagRaisedByUserOptions(context), [context]);

  const floorOptions = useMemo(() => buildPublicSnagFloorOptions(context), [context]);

  const selectedFloorRecord = useMemo(
    () => findLayoutAreasFloorRecord(floorLayouts, watchedFloor),
    [floorLayouts, watchedFloor],
  );

  const previewLayout = useMemo(
    () => buildLayoutPreviewLayoutFromFloor(selectedFloorRecord),
    [selectedFloorRecord],
  );

  const defaultFloor = floorOptions[0]?.value ?? '';

  useEffect(() => {
    setValue('area', '');
    setMarkerCoordinates(null);
  }, [setValue, watchedFloor]);

  useEffect(() => {
    setValue('raised_by', '', { shouldValidate: true });
  }, [setValue, watchedSnagSource]);

  useEffect(() => {
    reset({
      ...defaultValues,
      floor: defaultFloor,
    });
    setAttachments([]);
    setFileError(null);
    setDescriptionEditorKey((key) => key + 1);
    setIsSubmitted(false);
    setMarkerCoordinates(null);
  }, [context?.project, defaultFloor, reset]);

  const handleMarkerChange = useCallback(
    (payload) => {
      setMarkerCoordinates(payload?.coordinates ?? null);
      if (payload?.areaId) {
        setValue('area', payload.areaId, { shouldValidate: true });
      } else {
        setValue('area', '', { shouldValidate: true });
      }
    },
    [setValue],
  );

  const handleFileUpload = useCallback((files) => {
    setFileError(null);
    const validFiles = [];
    const invalidFiles = [];

    [...(files ?? [])].forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(file.name);
        return;
      }
      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        fileName: file.name,
        size: file.size,
        type: file.type,
      });
    });

    if (invalidFiles.length > 0) {
      setFileError(`The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`);
    }
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
      setDragActive(false);
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

  const submitForm = async (values) => {
    if (isPreview) return;
    await onSubmit?.(values, attachments, markerCoordinates);
    setIsSubmitted(true);
    reset({
      ...defaultValues,
      floor: defaultFloor,
    });
    setAttachments([]);
    setMarkerCoordinates(null);
    setDescriptionEditorKey((key) => key + 1);
  };

  if (isSubmitted && !isPreview) {
    return (
      <div className={cn('flex flex-col items-center gap-4 px-6 py-16 text-center', className)}>
        <div className='flex size-16 items-center justify-center rounded-full bg-success-lighter text-success-base'>
          <RiCheckboxCircleLine className='size-8' />
        </div>
        <div className='space-y-2'>
          <h2 className='text-title-h5 text-text-strong-950'>Snag submitted successfully</h2>
          <p className='text-paragraph-sm text-text-sub-500'>
            Thank you for reporting the snag. Our team will review it shortly.
          </p>
        </div>
        <Button.Root
          type='button'
          variant='primary'
          mode='filled'
          size='small'
          onClick={() => setIsSubmitted(false)}
        >
          Submit another snag
        </Button.Root>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-5', className)}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {dragActive ? (
        <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-information-lighter/80 backdrop-blur-sm'>
          <div className='flex flex-col items-center gap-4'>
            <RiUploadCloud2Line className='size-16 text-information-base' />
            <p className='text-label-md font-semibold text-information-base'>Drop files here</p>
          </div>
        </div>
      ) : null}

      <ReportSnagHeader
        projectName={context?.project_name || context?.project}
        isPreview={isPreview}
      />

      {isPreview ? (
        <div className='rounded-lg border border-information-light bg-information-lighter px-4 py-2.5 text-paragraph-sm text-information-base'>
          Preview mode — submissions are disabled.
        </div>
      ) : null}

      <form onSubmit={handleSubmit(submitForm)} className='flex flex-col gap-5'>
        <div className='rounded-xl bg-bg-white-0 px-8 pb-8 pt-4 shadow-regular-medium'>
          <div className='mb-4'>
            <Input.Root size='medium' variant='borderless'>
              <Input.Wrapper>
                <Input.Input
                  {...register('title')}
                  placeholder='Enter snag title'
                  className='text-title-h4 placeholder:text-text-soft-400'
                  disabled={isPreview || isSubmitting}
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
                disabled={isPreview || isSubmitting}
                error={errors.description?.message}
                editorKey={descriptionEditorKey}
              />
            )}
          />

          <div className='mt-4 flex flex-col gap-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField label='Product Category' required error={errors.category?.message}>
                <Controller
                  control={control}
                  name='category'
                  render={({ field }) => (
                    <ProductCategoryLeafSelect
                      value={field.value || ''}
                      onValueChange={(path) => {
                        field.onChange(path);
                        setValue('sub_category', '', { shouldValidate: false });
                      }}
                      hasError={Boolean(errors.category)}
                      disabled={isPreview || isSubmitting}
                      size='small'
                      variant='default'
                    />
                  )}
                />
              </FormField>

              <FormField label='Floor' error={errors.floor?.message}>
                <Controller
                  control={control}
                  name='floor'
                  render={({ field }) => (
                    <Select.Root
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='small'
                      disabled={isPreview || isSubmitting}
                    >
                      <Select.Trigger className='w-full'>
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
              </FormField>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField label='Source' required error={errors.snag_source?.message}>
                <Controller
                  control={control}
                  name='snag_source'
                  render={({ field }) => (
                    <Select.Root
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='small'
                      disabled={isPreview || isSubmitting}
                    >
                      <Select.Trigger className='w-full'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {PUBLIC_SNAG_SOURCE_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
              </FormField>

              <FormField label='Raised By' required error={errors.raised_by?.message}>
                {isInternalSource ? (
                  <Controller
                    control={control}
                    name='raised_by'
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        options={raisedByUserOptions}
                        placeholder={
                          raisedByUserOptions.length === 0
                            ? 'No team members available'
                            : 'Select team member'
                        }
                        searchPlaceholder='Search team member…'
                        size='small'
                        showArrow
                        matchTriggerWidth
                        disabled={isPreview || isSubmitting || raisedByUserOptions.length === 0}
                        emptyMessage='No team members available'
                        noResultsMessage='No team members found'
                      />
                    )}
                  />
                ) : (
                  <Input.Root size='small'>
                    <Input.Wrapper>
                      <Input.Input
                        {...register('raised_by')}
                        placeholder='Enter full name'
                        disabled={isPreview || isSubmitting}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              </FormField>
            </div>
          </div>
        </div>

        <div className='rounded-xl bg-bg-white-0 shadow-regular-medium'>
          <div className='px-8 pb-2 pt-6'>
            <h2 className='text-title-h6 text-text-strong-950'>Layout</h2>
          </div>
          <div className='px-4 pb-4 sm:px-6'>
            {previewLayout ? (
              <div className='overflow-hidden rounded-xl border border-stroke-soft-200'>
                <div className='h-[420px] min-h-[320px]'>
                  <ProjectCreateLayoutPanel
                    layout={previewLayout}
                    selectedAreaId={watchedArea}
                    floorLabel={watchedFloor}
                    markerColor={PROJECT_CREATE_LAYOUT_MARKER_COLORS.snag}
                    markerCoordinates={markerCoordinates}
                    onMarkerChange={isPreview || isSubmitting ? undefined : handleMarkerChange}
                  />
                </div>
              </div>
            ) : (
              <div className='flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-soft-400'>
                {watchedFloor
                  ? 'No layout image available for this floor.'
                  : 'Select a floor to view its layout and place a snag pin.'}
              </div>
            )}
            <div className='mt-4 flex items-start gap-1.5 px-2 text-paragraph-xs text-text-soft-400'>
              <RiInformationFill className='mt-0.5 size-4 shrink-0' />
              <span>Click inside a highlighted area on the layout to place a snag pin.</span>
            </div>
          </div>
        </div>

        <div className='rounded-xl bg-bg-white-0 px-8 py-6 shadow-regular-medium'>
          <div className='mb-3 flex items-center gap-2 text-label-md text-text-sub-500'>
            <RiAttachment2 className='size-5 text-text-soft-400' />
            Attachments
          </div>
          {fileError ? (
            <div className='mb-3 text-paragraph-xs text-red-500'>{fileError}</div>
          ) : null}
          {attachments.length > 0 ? (
            <AttachmentList
              attachments={attachments}
              onRemove={removeAttachment}
              disabled={isPreview || isSubmitting}
            />
          ) : (
            <label
              htmlFor={FILE_INPUT_ID}
              className={cn(
                'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stroke-sub-300 bg-[#fcfcfc] px-3.5 py-2.5 shadow-regular-xs transition hover:bg-bg-weak-50',
                (isPreview || isSubmitting) && 'pointer-events-none opacity-60',
              )}
            >
              <RiAddLine className='size-5 shrink-0 text-text-sub-500' />
              <span className='text-paragraph-sm text-text-sub-500'>
                Drop your files here to <span className='font-semibold underline'>upload</span>
              </span>
            </label>
          )}
          <input
            id={FILE_INPUT_ID}
            type='file'
            className='hidden'
            multiple
            disabled={isPreview || isSubmitting}
            onChange={(event) => {
              handleFileUpload(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        {!isPreview ? (
          <div className='flex justify-end'>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='small'
              disabled={isSubmitting}
            >
              Submit snag
            </Button.Root>
          </div>
        ) : null}
      </form>
    </div>
  );
}
