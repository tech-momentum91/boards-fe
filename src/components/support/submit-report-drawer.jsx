import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { z } from 'zod';
import { RiCloseLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { MultiSelect } from '@/components/ui/multi-select';
import SupportReportPhotoUpload from '@/components/support/support-report-photo-upload';
import {
  SUPPORT_FEEDBACK_DEFAULT_STATUS,
  SUPPORT_MODULE_OPTIONS,
  SUPPORT_REPORT_TYPE_OPTIONS,
} from '@/components/support/support-feedback-constants';
import { createSupportIssueWithFiles } from '@/api/support';
import {
  loadSupportFeedbackItems,
  saveSupportFeedbackItems,
} from '@/components/support/support-feedback-storage';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { getFileExtension } from '@/utils/file-utils';

const submitReportSchema = z.object({
  type: z.enum(['Feature', 'Bug']),
  module: z.array(z.string()).min(1, 'Select at least one module'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

const defaultFormValues = {
  type: 'Bug',
  module: [],
  title: '',
  description: '',
};

const fileToStoredPhoto = (file) =>
  new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error(`${file.name} is larger than 4 MB and was skipped.`));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        size: file.size,
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
        extension: getFileExtension(file.name),
      });
    });
    reader.addEventListener('error', () => reject(new Error(`Could not read ${file.name}`)));
    reader.readAsDataURL(file);
  });

const SubmitReportDrawer = ({
  open,
  onOpenChange,
  onSubmitted,
  defaultReportType = 'Bug',
  moduleOptions = SUPPORT_MODULE_OPTIONS,
}) => {
  const userInfo = useSelector((state) => state.auth?.userInfo);
  const sessionEmail = useMemo(() => {
    return userInfo?.email || userInfo?.user_email || userInfo?.mail || '';
  }, [userInfo]);

  const displayName = useMemo(() => {
    return userInfo?.full_name || userInfo?.name || userInfo?.user || sessionEmail || 'User';
  }, [userInfo, sessionEmail]);

  const [photoFiles, setPhotoFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supportedModuleOptions = useMemo(() => {
    return Array.isArray(moduleOptions) && moduleOptions.length > 0
      ? moduleOptions
      : SUPPORT_MODULE_OPTIONS;
  }, [moduleOptions]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(submitReportSchema),
    defaultValues: defaultFormValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (!open) return;
    const nextType = defaultReportType === 'Feature' ? 'Feature' : 'Bug';
    reset({
      ...defaultFormValues,
      type: nextType,
    });
    setPhotoFiles([]);
  }, [open, reset, defaultReportType]);

  const removePhotoAt = useCallback((index) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const onSubmit = useCallback(
    async (values) => {
      // if (!sessionEmail) {
      //   showErrorToast(new Error('Missing session email'), {
      //     defaultMessage: 'Your account email was not found. Please sign in again.',
      //   });
      //   return;
      // }

      setIsSubmitting(true);
      try {
        let photos = [];
        if (photoFiles.length > 0) {
          photos = await Promise.all(photoFiles.map((f) => fileToStoredPhoto(f)));
        }

        await createSupportIssueWithFiles({
          subject: values.title.trim(),
          description: values.description.trim(),
          type: values.type,
          module: values.module,
          files: photoFiles,
        });

        const items = loadSupportFeedbackItems();
        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `fb-${Date.now()}`;

        const next = [
          {
            id,
            type: values.type,
            status: SUPPORT_FEEDBACK_DEFAULT_STATUS,
            module: Array.isArray(values.module) ? values.module.join(', ') : values.module,
            email: sessionEmail,
            title: values.title.trim(),
            description: values.description.trim(),
            raisedByName: displayName,
            createdAt: new Date().toISOString(),
            upvoteCount: 0,
            upvotedBy: [],
            photos,
          },
          ...items,
        ];
        saveSupportFeedbackItems(next);
        showSuccessToast('Thanks — your report was submitted.');
        onSubmitted?.();
        onOpenChange(false);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not submit report.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [displayName, onOpenChange, onSubmitted, photoFiles, sessionEmail],
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='flex h-full max-h-dvh max-w-[500px] flex-col'>
        <Drawer.Header
          className='sticky top-0 z-10 shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-4'
          showCloseButton={false}
        >
          <div className='flex w-full items-start justify-between gap-4 pr-2'>
            <div className='flex min-w-0 flex-col gap-1'>
              <div className='text-label-lg text-text-strong-950'>Submit report</div>
              <div className='text-paragraph-sm text-text-sub-600'>
                Share a bug or feature idea with the product team.
              </div>
            </div>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              type='button'
              onClick={handleClose}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='min-h-0 flex-1 overflow-y-auto p-2'>
          <div className='flex min-h-[min(480px,65dvh)] w-full flex-col overflow-hidden rounded-xl  bg-bg-white-0 shadow-regular-xs lg:flex-row lg:items-stretch'>
            <div className='flex min-h-0 w-full flex-col  px-5 py-6 '>
              <form
                id='support-report-form'
                className='flex w-full max-w-[540px] flex-col gap-5'
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Type
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='type'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={field.onChange}
                        hasError={Boolean(errors.type)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder='Select type' />
                        </Select.Trigger>
                        <Select.Content>
                          {SUPPORT_REPORT_TYPE_OPTIONS.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.type?.message ? <ErrorText>{errors.type.message}</ErrorText> : null}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Module
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='module'
                    control={control}
                    render={({ field }) => (
                      <MultiSelect
                        options={supportedModuleOptions.map((opt) => ({
                          value: opt.value,
                          label: opt.label,
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder='Select modules'
                        hasError={Boolean(errors.module)}
                        size='medium'
                        maxDisplayItems={4}
                      />
                    )}
                  />
                  {errors.module?.message ? <ErrorText>{errors.module.message}</ErrorText> : null}
                </div>

                {/* <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Email
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root>
                    <Input.Wrapper>
                      <Input.Input
                        value={sessionEmail}
                        readOnly
                        disabled={sessionEmail.length === 0}
                        placeholder='Signed-in email'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {sessionEmail ? null : (
                    <ErrorText>Email is unavailable until you are signed in.</ErrorText>
                  )}
                </div> */}

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Title
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='title'
                    control={control}
                    render={({ field }) => (
                      <Input.Root hasError={Boolean(errors.title)}>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Short summary of the report' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.title?.message ? <ErrorText>{errors.title.message}</ErrorText> : null}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Description
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='description'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        simple
                        hasError={Boolean(errors.description)}
                        rows={5}
                        placeholder='What happened, steps to reproduce, or expected behavior'
                        {...field}
                      />
                    )}
                  />
                  {errors.description?.message ? (
                    <ErrorText>{errors.description.message}</ErrorText>
                  ) : null}
                </div>

                <SupportReportPhotoUpload
                  files={photoFiles}
                  onFilesChange={setPhotoFiles}
                  onRemoveAt={removePhotoAt}
                  label='Photo upload'
                />
              </form>
            </div>
            {/* 
            <div className='relative min-h-[200px] w-full self-stretch overflow-hidden bg-bg-weak-100 lg:min-h-0 lg:flex-[1_1_50%]'>
              <img
                src={supportReportHero}
                alt=''
                className='absolute inset-0 h-full w-full object-cover object-center'
                decoding='async'
              />
            </div> */}
          </div>
        </Drawer.Body>

        <Drawer.Footer className='border-t border-stroke-soft-200 p-2'>
          <div className='flex items-center justify-end gap-2'>
            <Button.Root variant='neutral' mode='stroke' type='button' onClick={handleClose}>
              Cancel
            </Button.Root>
            <Button.Root type='submit' form='support-report-form' disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default SubmitReportDrawer;
