import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { z } from 'zod';
import { isValid, parseISO } from 'date-fns';
import { RiAddLine, RiCalendarLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as LinkButton from '@/components/ui/link-button';
import * as Tag from '@/components/ui/tag';
import ErrorText from '@/components/ui/error-text';
import { MultiSelect } from '@/components/ui/multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import { createReleaseNote, deleteReleaseNote, updateReleaseNote } from '@/redux/releaseNoteSlice';
import { deleteReleaseNoteEditorImage, uploadReleaseNoteEditorImage } from '@/api/releaseNote';
import {
  RELEASE_NOTE_SUBMIT_MODE_MESSAGES,
  RELEASE_TYPE_OPTIONS,
  RELEASE_TYPE_VALUES,
} from '@/components/release-note/constants';
import {
  canonicalReleaseTypeLabel,
  normalizeReleaseNoteModules,
  normalizeReleaseNoteTypes,
} from '@/components/release-note/utils';

const isNonEmptyTiptapHtml = (html) => {
  if (typeof html !== 'string' || html.length === 0) return false;
  const text = html
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/&nbsp;/gi, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return text.length > 0;
};

/**
 * @param {unknown} raw
 * @returns {Date | undefined}
 */
function safeParseReleaseDate(raw) {
  if (raw == null || raw === '') return undefined;
  try {
    const d = parseISO(String(raw));
    return isValid(d) ? d : undefined;
  } catch {
    return undefined;
  }
}

const ModuleTagsField = ({ value = [], onChange, hasError }) => {
  const [inputVisible, setInputVisible] = useState(false);
  const [newModuleValue, setNewModuleValue] = useState('');

  const modules = Array.isArray(value) ? value : [];

  const handleAddModule = useCallback(() => {
    const trimmed = newModuleValue.trim();
    if (!trimmed) return;

    const exists = modules.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      onChange([...modules, trimmed]);
    }

    setNewModuleValue('');
    setInputVisible(false);
  }, [modules, newModuleValue, onChange]);

  const handleRemoveModule = useCallback(
    (index) => {
      onChange(modules.filter((_, itemIndex) => itemIndex !== index));
    },
    [modules, onChange],
  );

  return (
    <div className='flex flex-col gap-2'>
      {modules.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {modules.map((moduleName, index) => (
            <Badge.Root
              key={`${moduleName}-${index}`}
              size='small'
              variant='stroke'
              className='rounded-md bg-bg-weak-100 font-normal text-text-main-900'
            >
              {moduleName}
              <Tag.DismissButton onClick={() => handleRemoveModule(index)} />
            </Badge.Root>
          ))}
        </div>
      ) : null}

      <div className='w-full'>
        {inputVisible ? (
          <div className='flex items-center gap-2'>
            <Input.Root className='flex-1' size='xsmall' hasError={hasError}>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Enter module'
                  value={newModuleValue}
                  onChange={(event) => setNewModuleValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddModule();
                    }
                  }}
                  autoFocus
                />
              </Input.Wrapper>
            </Input.Root>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='xsmall'
              className='bg-error-lighter text-error-dark'
              onClick={() => {
                setInputVisible(false);
                setNewModuleValue('');
              }}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='xsmall'
              className='bg-primary-lighter text-primary-dark'
              onClick={handleAddModule}
            >
              <Button.Icon as={RiCheckLine} />
            </Button.Root>
          </div>
        ) : (
          <LinkButton.Root
            type='button'
            variant='primary'
            size='small'
            onClick={() => setInputVisible(true)}
          >
            <LinkButton.Icon as={RiAddLine} />
            Add Module
          </LinkButton.Root>
        )}
      </div>
    </div>
  );
};

const getDefaultFormValues = () => ({
  releaseDate: new Date(),
  releaseType: [],
  title: '',
  description: '',
  modules: [],
});

const baseFieldsSchema = z.object({
  releaseDate: z.date({
    required_error: 'Release date is required',
    invalid_type_error: 'Release date is required',
  }),
  title: z.string().min(1, 'Title is required'),
  description: z.string().refine(isNonEmptyTiptapHtml, { message: 'Description is required' }),
  modules: z.array(z.string()).min(1, 'Add at least one module'),
});

const releaseNoteFormSchema = baseFieldsSchema.extend({
  releaseType: z.array(z.enum(RELEASE_TYPE_VALUES)).min(1, {
    message: 'Select at least one type',
  }),
});

/**
 * @param {{ id?: string } | null | undefined} note
 */
const ReleaseNoteFormDrawer = ({ open, onOpenChange, onAfterSave, editNote = null }) => {
  const dispatch = useDispatch();

  const isEditMode = Boolean(editNote?.id);
  const isEditingPublishedNote = isEditMode && Boolean(editNote?.is_published);

  const [saving, setSaving] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(releaseNoteFormSchema),
    defaultValues: getDefaultFormValues(),
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!open) return;
    if (editNote?.id) {
      const apiTypes = normalizeReleaseNoteTypes(editNote.type ?? editNote.release_type);
      reset({
        releaseDate: safeParseReleaseDate(editNote.release_date),
        releaseType: apiTypes.map((t) => canonicalReleaseTypeLabel(t)).filter(Boolean),
        title: editNote.title ?? '',
        description: editNote.description ?? '',
        modules: normalizeReleaseNoteModules(editNote.modules),
      });
    } else {
      reset(getDefaultFormValues());
    }
    setDescriptionEditorKey((k) => k + 1);
  }, [open, editNote, reset]);

  useEffect(() => {
    if (!open) {
      setDeleteConfirmOpen(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onOpenChange(false);
  }, [saving, onOpenChange]);

  const handleEditorImageUpload = useCallback((file, onProgress, signal) => {
    return uploadReleaseNoteEditorImage(file, { onProgress, signal });
  }, []);

  const handleEditorImageDelete = useCallback(async (imageSrc) => {
    try {
      await deleteReleaseNoteEditorImage(imageSrc);
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Could not delete image.',
      });
      throw error;
    }
  }, []);

  const finishSubmit = useCallback(async () => {
    onOpenChange(false);
    reset(getDefaultFormValues());
    setDescriptionEditorKey((k) => k + 1);
    await onAfterSave?.();
  }, [onAfterSave, onOpenChange, reset]);

  const submitReleaseNote = useCallback(
    async (values, mode) => {
      const modeToPublished = {
        publish: true,
        draft: false,
        unpublish: false,
      };

      const isEditingPublished = isEditMode && Boolean(editNote?.is_published);
      const isSaveWithoutUnpublishing = isEditingPublished && mode === 'draft';

      const isPublished = isSaveWithoutUnpublishing ? true : modeToPublished[mode];
      const messages = isSaveWithoutUnpublishing
        ? RELEASE_NOTE_SUBMIT_MODE_MESSAGES.savePublished
        : RELEASE_NOTE_SUBMIT_MODE_MESSAGES[mode];

      setSaving(mode);
      try {
        if (isEditMode) {
          await dispatch(
            updateReleaseNote({
              name: editNote.id,
              releaseType: values.releaseType,
              title: values.title,
              description: values.description,
              modules: values.modules,
              releaseDate: values.releaseDate,
              isPublished,
            }),
          ).unwrap();
          showSuccessToast(messages.editSuccess);
        } else {
          await dispatch(
            createReleaseNote({
              releaseType: values.releaseType,
              title: values.title,
              description: values.description,
              modules: values.modules,
              releaseDate: values.releaseDate,
              isPublished,
            }),
          ).unwrap();
          showSuccessToast(messages.createSuccess);
        }
        await finishSubmit();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: isEditMode ? messages.editError : messages.createError,
        });
      } finally {
        setSaving(null);
      }
    },
    [dispatch, editNote, finishSubmit, isEditMode],
  );

  const onPublish = useCallback(
    async (values) => {
      await submitReleaseNote(values, 'publish');
    },
    [submitReleaseNote],
  );

  const onSaveDraft = useCallback(
    async (values) => {
      await submitReleaseNote(values, 'draft');
    },
    [submitReleaseNote],
  );

  const onUnpublish = useCallback(
    async (values) => {
      await submitReleaseNote(values, 'unpublish');
    },
    [submitReleaseNote],
  );

  const onDeleteDraft = useCallback(async () => {
    if (!editNote?.id || !isEditMode || isEditingPublishedNote) return;

    setSaving('delete');
    try {
      await dispatch(deleteReleaseNote({ name: editNote.id })).unwrap();
      showSuccessToast('Draft release note deleted successfully.');
      setDeleteConfirmOpen(false);
      await finishSubmit();
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Could not delete draft release note.',
      });
    } finally {
      setSaving(null);
    }
  }, [dispatch, editNote?.id, finishSubmit, isEditMode, isEditingPublishedNote]);

  const handlePrimarySubmit = isEditingPublishedNote ? onUnpublish : onPublish;
  const handleRequestDeleteDraft = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const isBusy = saving != null;

  return (
    <>
      <Drawer.Root
        open={open}
        onOpenChange={(next) => {
          if (!next && isBusy) return;
          onOpenChange(next);
        }}
      >
        <Drawer.Content className='flex h-full max-h-dvh w-[min(100vw,600px)] !max-w-[600px] flex-col'>
          <Drawer.Header
            className='sticky top-0 z-10 shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-4'
            showCloseButton={false}
          >
            <div className='flex w-full items-start justify-between gap-4 pr-2'>
              <div className='flex min-w-0 flex-col gap-1'>
                <div className='text-label-lg text-text-strong-950'>
                  {isEditMode ? 'Edit release note' : 'New release note'}
                </div>
                <div className='text-paragraph-sm text-text-sub-600'>
                  {isEditMode
                    ? 'Update details and save. Changes replace the current release note.'
                    : 'Add release details, modules, and publish when you are ready.'}
                </div>
              </div>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                type='button'
                onClick={handleClose}
                disabled={isBusy}
              >
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          </Drawer.Header>

          <Drawer.Body className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
            <form
              id='release-note-form'
              className='flex w-full flex-col gap-5'
              onSubmit={handleSubmit(handlePrimarySubmit)}
            >
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
                        <Input.Input {...field} placeholder='Enter title' autoComplete='off' />
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
                    <div className='w-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0'>
                      <SimpleEditor
                        key={descriptionEditorKey}
                        embed
                        value={field.value}
                        onChange={field.onChange}
                        hasError={Boolean(errors.description)}
                        imageUploadHandler={handleEditorImageUpload}
                        imageDeleteHandler={handleEditorImageDelete}
                      />
                    </div>
                  )}
                />
                {errors.description?.message ? (
                  <ErrorText>{errors.description.message}</ErrorText>
                ) : null}
              </div>

              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Modules
                  <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='modules'
                  control={control}
                  render={({ field }) => (
                    <ModuleTagsField
                      key={`${open ? 'open' : 'closed'}-${editNote?.id ?? 'new'}`}
                      value={field.value}
                      onChange={field.onChange}
                      hasError={Boolean(errors.modules)}
                    />
                  )}
                />
                {errors.modules?.message ? <ErrorText>{errors.modules.message}</ErrorText> : null}
              </div>

              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Type
                  <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='releaseType'
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      options={RELEASE_TYPE_OPTIONS}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder='Select types'
                      hasError={Boolean(errors.releaseType)}
                      size='medium'
                    />
                  )}
                />
                {errors.releaseType?.message ? (
                  <ErrorText>{errors.releaseType.message}</ErrorText>
                ) : null}
              </div>

              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Release date
                  <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='releaseDate'
                  control={control}
                  render={({ field }) => (
                    <Datepicker
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder='Select date'
                      variant='stroke'
                      hasError={Boolean(errors.releaseDate)}
                      prefixIcon={<RiCalendarLine className='text-text-sub-500' size={20} />}
                      size='medium'
                    />
                  )}
                />
                {errors.releaseDate?.message ? (
                  <ErrorText>{errors.releaseDate.message}</ErrorText>
                ) : null}
              </div>
            </form>
          </Drawer.Body>

          <Drawer.Footer className='shrink-0 border-t border-stroke-soft-200 p-4'>
            <div className='flex flex-wrap items-center justify-end gap-2'>
              {isEditMode && !isEditingPublishedNote ? (
                <Button.Root
                  variant='error'
                  type='button'
                  onClick={handleRequestDeleteDraft}
                  disabled={isBusy}
                >
                  Delete draft
                </Button.Root>
              ) : null}
              <Button.Root
                variant='neutral'
                mode='stroke'
                type='button'
                onClick={handleClose}
                disabled={isBusy}
              >
                Cancel
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='stroke'
                type='button'
                onClick={handleSubmit(onSaveDraft)}
                disabled={isBusy}
              >
                {saving === 'draft' ? 'Saving…' : isEditingPublishedNote ? 'Save' : 'Save as draft'}
              </Button.Root>
              <Button.Root
                variant='primary'
                type='submit'
                form='release-note-form'
                disabled={isBusy}
              >
                {isEditingPublishedNote
                  ? saving === 'unpublish'
                    ? 'Unpublishing…'
                    : 'Unpublish'
                  : saving === 'publish'
                    ? 'Publishing…'
                    : 'Publish'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Root>
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title='Delete Draft?'
        description='Are you sure you want to delete this draft release note? This action cannot be undone.'
        onConfirm={onDeleteDraft}
        isLoading={saving === 'delete'}
        confirmLabel='Delete'
        loadingLabel='Deleting...'
      />
    </>
  );
};

export default ReleaseNoteFormDrawer;
