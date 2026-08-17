import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCloseLine, RiFileTextLine, RiUserLine } from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import ErrorText from '@/components/ui/error-text';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import {
  defaultProjectDocumentMasterCreateValues,
  projectDocumentMasterCreateSchema,
} from '@/schemas/project';
import { createProjectDocumentMaster } from '@/redux/projectMasterSlice';
import ProjectDrawerDescriptionEditor from '@/components/projects/shared/project-drawer-description-editor';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  ASSIGNEE_OPTIONS,
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

export default function ProjectDocumentCreateDrawer({
  open,
  onOpenChange,
  onCreated,
  categoryOptions = [],
}) {
  const dispatch = useDispatch();
  const { create } = useSelector((state) => state.projectMaster.documents);
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
    resolver: zodResolver(projectDocumentMasterCreateSchema),
    defaultValues: defaultProjectDocumentMasterCreateValues,
    mode: 'onChange',
  });

  const watchedTags = watch('tags') ?? [];
  const watchedCategory = watch('document_category');

  const categorySelectOptions = useMemo(() => {
    const value = String(watchedCategory ?? '').trim();
    if (!value || categoryOptions.some((option) => option.value === value)) {
      return categoryOptions;
    }
    return [{ value, label: value }, ...categoryOptions];
  }, [categoryOptions, watchedCategory]);

  useEffect(() => {
    if (!open) {
      reset(defaultProjectDocumentMasterCreateValues);
      setTagsResetKey((key) => key + 1);
      setDescriptionEditorKey((key) => key + 1);
    }
  }, [open, reset]);

  const onSubmit = useCallback(
    async (values) => {
      const { assignee, ...rest } = values;
      const trimmedAssignee = String(assignee ?? '').trim();
      const payload = {
        ...rest,
        assignees: trimmedAssignee ? [{ assignee_type: 'Role', assignee: trimmedAssignee }] : [],
      };

      try {
        const result = await dispatch(createProjectDocumentMaster(payload)).unwrap();
        const successMessage =
          result?.message?.message ?? result?.message ?? 'Document created successfully';
        showSuccessToast(successMessage);
        reset(defaultProjectDocumentMasterCreateValues);
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
              <RiFileTextLine className='size-6' />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title className='text-label-lg'>Create New Document</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>
                Add below details to create a new document.
              </p>
            </div>
          </Drawer.Header>

          <Drawer.Body className='gap-6 overflow-y-auto px-8 py-6'>
            <div className='flex flex-col gap-1'>
              <Input.Root size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...register('subject')}
                    placeholder='Enter document title'
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
                <FormField label='Assignee' error={errors.assignee?.message}>
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

                <FormField label='Category' required error={errors.document_category?.message}>
                  <Controller
                    control={control}
                    name='document_category'
                    render={({ field }) => (
                      <Select.Root value={field.value} onValueChange={field.onChange} size='xsmall'>
                        <Select.Trigger>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {categorySelectOptions.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
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
