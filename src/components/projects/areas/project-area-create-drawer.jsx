import React, { useCallback, useEffect, useState } from 'react';
import { RiShape2Line, RiStackLine } from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { createProjectLayoutAreas, getProjectLayoutAreaTypeOptions } from '@/api/projectLayout';
import ProjectAreaTypeSelect from '@/components/projects/areas/project-area-type-select';
import ProjectDrawerDescriptionEditor from '@/components/projects/shared/project-drawer-description-editor';
import { getProjectFloorSelectOptions } from '@/components/projects/shared';
import { PROJECT_LAYOUT_AREA_COLORS } from '@/components/projects/layouts/project-layout-annotation-helpers';
import { buildManualAreaCreatePayload } from '@/components/projects/areas/project-areas-list-helpers';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { defaultProjectAreaCreateValues, projectAreaCreateSchema } from '@/schemas/project';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

export default function ProjectAreaCreateDrawer({
  open,
  onOpenChange,
  projectId,
  projectFloors = [],
  onCreated,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areaTypeOptions, setAreaTypeOptions] = useState([]);
  const [isLoadingAreaTypes, setIsLoadingAreaTypes] = useState(false);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectAreaCreateSchema),
    defaultValues: defaultProjectAreaCreateValues,
    mode: 'onChange',
  });

  const watchedColor = watch('color');
  const floorOptions = getProjectFloorSelectOptions(projectFloors);

  useEffect(() => {
    if (!open) {
      reset(defaultProjectAreaCreateValues);
      setDescriptionEditorKey((previous) => previous + 1);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingAreaTypes(true);

    getProjectLayoutAreaTypeOptions()
      .then((options) => {
        if (!cancelled) setAreaTypeOptions(options);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error, 'Failed to load area types'));
          setAreaTypeOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAreaTypes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  const onSubmit = useCallback(
    async (values) => {
      if (!projectId) {
        showErrorToast('Project is required');
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = buildManualAreaCreatePayload(projectId, values);
        const result = await createProjectLayoutAreas(payload);
        showSuccessToast(result?.message ?? 'Area created successfully');
        reset(defaultProjectAreaCreateValues);
        setDescriptionEditorKey((previous) => previous + 1);
        onOpenChange(false);
        onCreated?.(result);
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to create area'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [onCreated, onOpenChange, projectId, reset],
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='flex h-full max-w-[600px] flex-col shadow-regular-md'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex min-h-0 flex-1 flex-col'>
          <Drawer.Header className='min-h-[48px] gap-4 px-8 py-5'>
            <span className='flex size-12 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500'>
              <RiShape2Line className='size-6' />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title>Add New Area</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>
                Enter below details to create a manual area.
              </p>
            </div>
          </Drawer.Header>

          <Drawer.Body className='flex-1 gap-5 overflow-y-auto px-8 py-6'>
            <div className='flex flex-col gap-1'>
              <Input.Root size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...register('area_label')}
                    placeholder='Enter area name'
                    className='text-title-h6'
                    disabled={isSubmitting}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.area_label ? <ErrorText>{errors.area_label.message}</ErrorText> : null}
            </div>

            <div className='overflow-hidden rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
              <FieldRow icon={RiStackLine} label='Floor'>
                <Controller
                  control={control}
                  name='floor'
                  render={({ field }) => (
                    <Select.Root
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='xsmall'
                      variant='borderless'
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
              </FieldRow>

              <FieldRow icon={RiShape2Line} label='Area Type'>
                <div className='flex w-full min-w-0 flex-col gap-1'>
                  <Controller
                    control={control}
                    name='area_type'
                    render={({ field }) => (
                      <ProjectAreaTypeSelect
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        options={areaTypeOptions}
                        onOptionsChange={setAreaTypeOptions}
                        placeholder={isLoadingAreaTypes ? 'Loading…' : 'Select'}
                        disabled={isSubmitting || isLoadingAreaTypes}
                        hasError={Boolean(errors.area_type)}
                        size='xsmall'
                        variant='borderless'
                        triggerClassName='h-8 w-full'
                      />
                    )}
                  />
                  {errors.area_type ? <ErrorText>{errors.area_type.message}</ErrorText> : null}
                </div>
              </FieldRow>

              <FieldRow icon={RiShape2Line} label='Carpet Area'>
                <Input.Root size='xsmall' variant='borderless' className='w-full min-w-0'>
                  <Input.Wrapper>
                    <Input.Input
                      {...register('carpet_area')}
                      placeholder='Enter carpet area'
                      disabled={isSubmitting}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </FieldRow>
            </div>

            {errors.floor ? <ErrorText>{errors.floor.message}</ErrorText> : null}

            {/* <div className='flex flex-col gap-2'>
              <span className='text-label-sm text-text-sub-500'>Color</span>
              <div className='flex flex-wrap gap-2'>
                {PROJECT_LAYOUT_AREA_COLORS.map((color) => (
                  <button
                    key={color}
                    type='button'
                    disabled={isSubmitting}
                    onClick={() => setValue('color', color, { shouldValidate: true })}
                    className={cn(
                      'size-7 rounded-full border-2 transition',
                      watchedColor === color
                        ? 'border-text-main-900 ring-2 ring-stroke-soft-200'
                        : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div> */}

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
          </Drawer.Body>

          <Drawer.Footer className='border-t border-stroke-soft-200 px-8 py-4'>
            <Drawer.Close asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
            </Drawer.Close>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='small'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create Area'}
            </Button.Root>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
