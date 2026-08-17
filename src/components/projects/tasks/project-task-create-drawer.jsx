import React, { useCallback, useEffect, useState } from 'react';
import {
  RiCalendarLine,
  RiFlagLine,
  RiTaskLine,
  RiUploadCloud2Line,
  RiUserLine,
} from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import ProjectDrawerDescriptionEditor from '@/components/projects/shared/project-drawer-description-editor';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectCreateDrawerFloorAreaFields from '@/components/projects/shared/project-create-drawer-floor-area-fields';
import ProjectCreateLayoutPanel from '@/components/projects/shared/project-create-layout-panel';
import { buildProjectTaskCreateFormData } from '@/components/projects/tasks/project-task-helpers';
import { colorForProjectStage, colorForProjectTaskPriority } from '@/components/projects/shared';
import { useProjectCreateDrawerLayoutAreas } from '@/hooks/use-project-create-drawer-layout-areas';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import { mapFilesToAttachmentRows } from '@/components/projects/shared/project-attachment-upload-utils';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import { Datepicker } from '@/components/ui/datepicker';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import { PROJECT_DETAIL_PRIORITY_OPTIONS } from '@/components/projects/constants';
import { createProjectTask, selectProjectTaskCreateLoading } from '@/redux/projectSlice';
import { fetchProjectStageOptions } from '@/components/projects/project-stage-status-helpers';
import {
  defaultProjectLevelTaskCreateValues,
  projectLevelTaskCreateSchema,
} from '@/schemas/project';
import { formatToDDMMYYYY } from '@/utils/date-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';
import { useSyncDefaultStatusOption } from '@/hooks/use-status-options';

export default function ProjectTaskCreateDrawer({
  open,
  onOpenChange,
  projectId,
  projectFloors = [],
  onCreated,
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const dispatch = useDispatch();
  const isSubmitting = useSelector(selectProjectTaskCreateLoading);
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [tagsResetKey, setTagsResetKey] = useState(0);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [markerCoordinates, setMarkerCoordinates] = useState(null);
  const [stageOptions, setStageOptions] = useState([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectLevelTaskCreateSchema),
    defaultValues: defaultProjectLevelTaskCreateValues,
    mode: 'onChange',
  });

  useSyncDefaultStatusOption({
    open,
    options: statusOptions,
    currentStatus: watch('status'),
    setValue,
  });

  const watchedTags = watch('tags') ?? [];
  const watchedFloor = watch('floor');
  const watchedArea = watch('area');
  const watchedStage = watch('custom_stage');
  const {
    layoutAreasLoading,
    layoutAreasError,
    floorOptions,
    areaOptions,
    previewLayout,
    canOpenLayoutPanel,
    isLayoutPanelOpen,
    openLayoutPanel,
    closeLayoutPanel,
  } = useProjectCreateDrawerLayoutAreas({
    open,
    projectId,
    watchedFloor,
    projectFloors,
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    fetchProjectStageOptions()
      .then((options) => {
        if (!cancelled) setStageOptions(options);
      })
      .catch(() => {
        if (!cancelled) setStageOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset(defaultProjectLevelTaskCreateValues);
      setAttachments([]);
      setFileError(null);
      setDragActive(false);
      setTagsResetKey((key) => key + 1);
      setDescriptionEditorKey((key) => key + 1);
      setMarkerCoordinates(null);
    }
  }, [open, reset]);

  useEffect(() => {
    setValue('area', '');
    setMarkerCoordinates(null);
    closeLayoutPanel();
  }, [setValue, watchedFloor, closeLayoutPanel]);

  const handleMarkerChange = useCallback(
    (payload) => {
      setMarkerCoordinates(payload?.coordinates ?? null);
      if (payload?.areaId) {
        setValue('area', payload.areaId, { shouldValidate: true });
      }
    },
    [setValue],
  );

  const handleFileUpload = useCallback((files) => {
    const { validFiles, errorMessage } = mapFilesToAttachmentRows(files);
    setFileError(errorMessage || null);
    if (validFiles.length > 0) {
      setAttachments((previous) => [...previous, ...validFiles]);
    }
  }, []);

  const removeAttachment = useCallback((attachmentId) => {
    setAttachments((previous) => previous.filter((file) => file.id !== attachmentId));
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

  const onSubmit = useCallback(
    async (values) => {
      if (!projectId) {
        showErrorToast('Project is required');
        return;
      }

      try {
        const formData = buildProjectTaskCreateFormData(
          projectId,
          values,
          attachments,
          markerCoordinates,
        );
        const result = await dispatch(createProjectTask(formData)).unwrap();
        showSuccessToast(result?.message ?? 'Task created successfully');
        reset(defaultProjectLevelTaskCreateValues);
        setAttachments([]);
        setTagsResetKey((key) => key + 1);
        setDescriptionEditorKey((key) => key + 1);
        setMarkerCoordinates(null);
        onOpenChange(false);
        onCreated?.(result);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [attachments, dispatch, markerCoordinates, onCreated, onOpenChange, projectId, reset],
  );

  const stageSelectOptions = (() => {
    const options = [...(stageOptions ?? [])];
    const current = String(watchedStage ?? '').trim();
    if (current && !options.some((option) => option.value === current)) {
      return [{ value: current, label: current }, ...options];
    }
    return options;
  })();

  const formFields = (
    <div className='flex flex-col gap-5'>
      <Controller
        control={control}
        name='status'
        render={({ field }) => (
          <ProjectStatusDropdown
            value={field.value}
            onValueChange={field.onChange}
            statusOptions={statusOptions}
            statusMetaMap={statusMetaMap}
            size='xsmall'
            className='max-w-[220px]'
            disabled={isSubmitting}
          />
        )}
      />

      <div className='flex flex-col gap-1'>
        <Input.Root size='medium'>
          <Input.Wrapper>
            <Input.Input
              {...register('subject')}
              placeholder='Enter task title'
              className='text-title-h6'
              disabled={isSubmitting}
            />
          </Input.Wrapper>
        </Input.Root>
        <ErrorText>{errors.subject?.message}</ErrorText>
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

      <div className='overflow-hidden rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
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

        <ProjectCreateDrawerFloorAreaFields
          control={control}
          errors={errors}
          floorOptions={floorOptions}
          areaOptions={areaOptions}
          watchedFloor={watchedFloor}
          isSubmitting={isSubmitting}
          layoutAreasLoading={layoutAreasLoading}
          canOpenLayoutPanel={canOpenLayoutPanel}
          onOpenLayoutPanel={openLayoutPanel}
        />

        <FieldRow icon={RiCalendarLine} label='Due Date' required>
          <Controller
            control={control}
            name='due_date'
            render={({ field }) => (
              <>
                <Datepicker
                  value={field.value}
                  onChange={field.onChange}
                  size='xsmall'
                  variant='borderless'
                  placeholder='Select'
                  formatDate={(date) => formatToDDMMYYYY(date)}
                  className='h-8 min-w-[120px]'
                  disabled={isSubmitting}
                  hasError={Boolean(errors.due_date)}
                />
                <ErrorText>{errors.due_date?.message}</ErrorText>
              </>
            )}
          />
        </FieldRow>

        <FieldRow icon={RiFlagLine} label='Stage' required>
          <Controller
            control={control}
            name='custom_stage'
            render={({ field }) => (
              <>
                <ProjectBadgeSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={stageSelectOptions}
                  colorFn={colorForProjectStage}
                  disabled={isSubmitting}
                  showArrow={false}
                  hasError={Boolean(errors.custom_stage)}
                />
                <ErrorText>{errors.custom_stage?.message}</ErrorText>
              </>
            )}
          />
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
                  options={PROJECT_DETAIL_PRIORITY_OPTIONS}
                  colorFn={colorForProjectTaskPriority}
                  formatLabel={formatProjectPriorityLabel}
                  disabled={isSubmitting}
                  showArrow={false}
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
    </div>
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content
        className={cn(
          'h-full shadow-regular-md',
          isLayoutPanelOpen ? 'max-w-[1200px]' : 'max-w-[600px]',
        )}
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
              <Drawer.Title>Add New Task</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>Enter below task details</p>
            </div>
          </Drawer.Header>

          <div
            className={cn('flex min-h-0 flex-1 overflow-hidden', isLayoutPanelOpen && 'flex-row')}
          >
            <Drawer.Body
              className={cn(
                'gap-5 overflow-y-auto px-8 py-6',
                isLayoutPanelOpen
                  ? 'w-[400px] shrink-0 grow-0 basis-[400px] border-r border-stroke-soft-200'
                  : 'flex-1',
              )}
            >
              {formFields}
            </Drawer.Body>

            {isLayoutPanelOpen ? (
              <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                <ProjectCreateLayoutPanel
                  layout={previewLayout}
                  selectedAreaId={watchedArea}
                  floorLabel={watchedFloor}
                  markerColor='#2563eb'
                  markerCoordinates={markerCoordinates}
                  onMarkerChange={handleMarkerChange}
                  isLoading={layoutAreasLoading}
                  error={layoutAreasError}
                  onClose={closeLayoutPanel}
                />
              </div>
            ) : null}
          </div>

          <Drawer.Footer className='flex items-center justify-between gap-3 border-t px-8 py-6'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button.Root>
            <div className='flex items-center gap-3'>
              <Button.Root
                type='submit'
                size='small'
                className='min-w-[76px]'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding…' : 'Add'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
