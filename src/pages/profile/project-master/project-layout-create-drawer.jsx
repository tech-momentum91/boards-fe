import React, { useCallback, useEffect, useState } from 'react';
import { RiCloseLine, RiLayout6Line, RiUserLine } from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import ErrorText from '@/components/ui/error-text';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { createProjectLayoutMaster } from '@/redux/projectMasterSlice';
import ProjectDrawerDescriptionEditor from '@/components/projects/shared/project-drawer-description-editor';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import { defaultProjectLayoutCreateValues, projectLayoutCreateSchema } from '@/schemas/project';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  ASSIGNEE_OPTIONS,
  LAYOUT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '@/pages/profile/project-master/project-master.constants';

function FormField({ label, required = false, error, children }) {
  return (
    <div className='flex w-full flex-col gap-1'>
      <span className='text-label-sm text-text-strong-950'>
        {label}
        {required ? <span className='text-text-soft-400'> *</span> : null}
      </span>
      {children}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className='flex items-center gap-2 text-label-md text-text-sub-500'>
      <Icon className='size-5 text-text-soft-400' />
      {children}
    </div>
  );
}

export default function ProjectLayoutCreateDrawer({ open, onOpenChange, onCreated }) {
  const dispatch = useDispatch();
  const { create } = useSelector((state) => state.projectMaster.layouts);
  const isSubmitting = create.isLoading;
  const [tagsResetKey, setTagsResetKey] = useState(0);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectLayoutCreateSchema),
    defaultValues: defaultProjectLayoutCreateValues,
    mode: 'onChange',
  });

  const watchedTags = watch('tags') ?? [];

  useEffect(() => {
    if (!open) {
      reset(defaultProjectLayoutCreateValues);
      setTagsResetKey((key) => key + 1);
      setDescriptionEditorKey((key) => key + 1);
    }
  }, [open, reset]);

  const onSubmit = useCallback(
    async (values) => {
      const { assignee, ...rest } = values;
      const payload = {
        ...rest,
        assignees: [{ assignee_type: 'Role', assignee }],
      };

      try {
        const result = await dispatch(createProjectLayoutMaster(payload)).unwrap();
        const successMessage =
          result?.message?.message ?? result?.message ?? 'Layout created successfully';
        showSuccessToast(successMessage);
        reset(defaultProjectLayoutCreateValues);
        setTagsResetKey((key) => key + 1);
        onOpenChange(false);
        onCreated?.(result);
      } catch (error) {
        showErrorToast(error);
      }
    },
    [dispatch, onCreated, onOpenChange, reset],
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[600px] shadow-regular-md'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex size-full flex-col'>
          <Drawer.Header className='min-h-[48px] gap-4 px-8 py-5'>
            <span className='flex size-12 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500'>
              <RiLayout6Line className='size-6' />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title className='text-label-lg'>Create New Layout</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>
                Add below details to create a new layout.
              </p>
            </div>
          </Drawer.Header>

          <Drawer.Body className='gap-6 overflow-y-auto px-8 py-6'>
            <div className='flex flex-col gap-1'>
              <Input.Root size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...register('subject')}
                    placeholder='Enter layout title'
                    className='text-title-h6'
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

            <div className='flex flex-col gap-4'>
              <SectionTitle icon={RiUserLine}>Assignment Details</SectionTitle>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField label='Assignee' required error={errors.assignee?.message}>
                  <Controller
                    control={control}
                    name='assignee'
                    render={({ field }) => (
                      <Select.Root value={field.value} onValueChange={field.onChange} size='xsmall'>
                        <Select.Trigger>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {ASSIGNEE_OPTIONS.map((option) => (
                            <Select.Item key={option} value={option}>
                              {option}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                </FormField>

                <FormField label='Duration' required error={errors.duration?.message}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        {...register('duration')}
                        inputMode='numeric'
                        placeholder='Enter duration'
                      />
                      <Input.InlineAffix>Days</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </FormField>

                <FormField label='Layout Type' required error={errors.layout_type?.message}>
                  <Controller
                    control={control}
                    name='layout_type'
                    render={({ field }) => (
                      <Select.Root value={field.value} onValueChange={field.onChange} size='xsmall'>
                        <Select.Trigger>
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
                </FormField>

                <FormField label='Priority' error={errors.priority?.message}>
                  <Controller
                    control={control}
                    name='priority'
                    render={({ field }) => (
                      <Select.Root value={field.value} onValueChange={field.onChange} size='xsmall'>
                        <Select.Trigger>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {PRIORITY_OPTIONS.map((option) => (
                            <Select.Item key={option} value={option}>
                              {option}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                </FormField>

                <FormField label='Status' error={errors.status?.message}>
                  <Controller
                    control={control}
                    name='status'
                    render={({ field }) => (
                      <Select.Root value={field.value} onValueChange={field.onChange} size='xsmall'>
                        <Select.Trigger>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {STATUS_OPTIONS.map((option) => (
                            <Select.Item key={option} value={option}>
                              {option}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                </FormField>
              </div>
            </div>

            <ProjectDrawerTagsSection
              tags={watchedTags}
              onTagsChange={(nextTags) => setValue('tags', nextTags, { shouldValidate: true })}
              resetKey={tagsResetKey}
            />
            <ErrorText>{errors.tags?.message}</ErrorText>
          </Drawer.Body>

          <Drawer.Footer className='flex items-center justify-end gap-3 border-t px-8 py-6'>
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
            <Button.Root
              type='submit'
              size='small'
              className='min-w-[76px]'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create'}
            </Button.Root>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
