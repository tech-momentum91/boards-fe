import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiAttachment2,
  RiBuildingLine,
  RiCheckLine,
  RiCloseLine,
  RiGroupLine,
  RiHome8Line,
  RiImageLine,
  RiLinkM,
  RiPriceTag3Line,
  RiSettings3Line,
  RiStackLine,
  RiStickyNoteLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';

import {
  buildKnowledgeCenterMediaFormData,
  deleteKnowledgeCenterMediaAttachment,
  fetchFloorsWithoutLayoutImage,
  mapKnowledgeCenterMediaAttachments,
  uploadKnowledgeCenterMediaFiles,
} from '@/api/knowledgeCenterMedia';
import * as Button from '@/components/ui/button';
import AttachmentList from '@/components/ui/attachment-list';
import * as Drawer from '@/components/ui/drawer';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as LinkButton from '@/components/ui/link-button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import {
  isFileAllowedForMediaType,
  isLinkBasedMediaType,
  isPresentationMediaType,
  isWalkthroughMediaType,
  MEDIA_TYPE_FORM_OPTIONS,
  MEDIA_TYPE_UPLOAD_RULES,
} from '@/pages/profile/knowledge-center-media-constants';
import {
  createKnowledgeCenterMedia,
  fetchKnowledgeCenterMediaDetail,
  selectKnowledgeCenterMediaMutation,
  updateKnowledgeCenterMedia,
} from '@/redux/knowledgeCenterMediaSlice';
import {
  defaultKnowledgeCenterMediaValues,
  knowledgeCenterMediaCreateSchema,
} from '@/schemas/knowledge-center-media-schema';
import {
  fetchCentersForClient,
  fetchSpaces,
  fetchTicketDropdownData,
} from '@/redux/ticketManagementSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { prepareAttachmentFileForUpload } from '@/utils/attachment-compression';
import { formatFileSize } from '@/utils/file-utils';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

function recordToFormValues(record) {
  return {
    mediaName: record?.media_name || '',
    description: record?.description || '',
    center: record?.center || '',
    floor: record?.floor || '',
    space: record?.space || '',
    client: record?.client || '',
    mediaType: record?.media_type || '',
    matterportUrl: record?.matterport_url || '',
    url: record?.presentation_url || '',
  };
}

export default function KnowledgeCenterAddMediaDrawer({
  open,
  onOpenChange,
  onSaved,
  defaultMediaType = '',
  editRecord = null,
}) {
  const dispatch = useDispatch();
  const tagInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isEditMode = Boolean(editRecord?.name);
  const editMediaId = editRecord?.name ?? '';

  const { status: mutationStatus, error: mutationError } = useSelector(
    selectKnowledgeCenterMediaMutation,
  );

  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);
  const spacesState = useSelector((state) => state.ticketManagement.spaces);

  const [floorOptions, setFloorOptions] = useState([]);
  const [floorsStatus, setFloorsStatus] = useState('idle');

  const [tags, setTags] = useState([]);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isRemovingAttachment, setIsRemovingAttachment] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isSubmitInProgress, setIsSubmitInProgress] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(knowledgeCenterMediaCreateSchema),
    defaultValues: defaultKnowledgeCenterMediaValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedCenter = watch('center');
  const watchedFloor = watch('floor');
  const watchedDescription = watch('description');
  const watchedMediaType = watch('mediaType');

  const mediaTypeDisplayLabel = useMemo(() => {
    if (!watchedMediaType) return '-';
    return (
      MEDIA_TYPE_FORM_OPTIONS.find((option) => option.value === watchedMediaType)?.label ||
      watchedMediaType
    );
  }, [watchedMediaType]);

  const uploadRules = MEDIA_TYPE_UPLOAD_RULES[watchedMediaType];
  const maxFileSize = uploadRules?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
  const allowsFileUpload = Boolean(uploadRules && uploadRules.usesFileUpload !== false);
  const uploadHint = uploadRules?.hint ?? 'Select a media type to see allowed file types.';

  const isMutationSubmitting = mutationStatus === 'loading';
  const isSubmitting = isSubmitInProgress || isMutationSubmitting || isUploadingAttachments;
  const isBusy = isSubmitting || isDetailLoading || isRemovingAttachment || isCompressing;

  const clientSelectOptions = useMemo(() => {
    const raw = ticketDropdown.data?.clients || ticketDropdown.data?.customers || [];
    return Array.isArray(raw) ? raw : [];
  }, [ticketDropdown.data]);

  /** All centers — not narrowed by client (center + client are independent on media). */
  const centerSelectOptions = useMemo(() => {
    const fromDropdown = ticketDropdown.data?.centers;
    if (Array.isArray(fromDropdown) && fromDropdown.length > 0) {
      return fromDropdown;
    }
    return Array.isArray(centersState.data) ? centersState.data : [];
  }, [ticketDropdown.data?.centers, centersState.data]);

  const floorSelectOptions = useMemo(() => {
    const currentFloor = String(watchedFloor ?? '').trim();
    if (!currentFloor) return floorOptions;
    if (floorOptions.some((option) => option.value === currentFloor)) return floorOptions;
    return [{ value: currentFloor, label: currentFloor }, ...floorOptions];
  }, [floorOptions, watchedFloor]);

  const spaceOptions = useMemo(() => {
    const opts = watchedCenter ? spacesState.data?.[watchedCenter] : [];
    return Array.isArray(opts) ? opts : [];
  }, [spacesState.data, watchedCenter]);

  const resetDrawerState = useCallback(
    (mediaType = '') => {
      reset({
        ...defaultKnowledgeCenterMediaValues,
        mediaType: mediaType || '',
      });
      setTags([]);
      setTagInputVisible(false);
      setNewTagValue('');
      setAttachments([]);
      setFileError(null);
      setIsDescriptionOpen(false);
      setFloorOptions([]);
      setFloorsStatus('idle');
    },
    [reset],
  );

  const applyRecordToForm = useCallback(
    (record) => {
      if (!record) return;
      reset(recordToFormValues(record));
      setTags(Array.isArray(record.tags) ? record.tags : []);
      setAttachments(mapKnowledgeCenterMediaAttachments(record));
      setFileError(null);
      setIsDescriptionOpen(Boolean(String(record.description ?? '').trim()));
    },
    [reset],
  );

  useEffect(() => {
    if (!open) return;
    dispatch(fetchTicketDropdownData());
    dispatch(fetchCentersForClient(null));

    if (!isEditMode) {
      resetDrawerState(defaultMediaType);
      return;
    }

    applyRecordToForm(editRecord);

    let cancelled = false;
    setIsDetailLoading(true);

    dispatch(fetchKnowledgeCenterMediaDetail(editMediaId))
      .unwrap()
      .then((detail) => {
        if (cancelled) return;
        if (detail?.name) applyRecordToForm(detail);
      })
      .catch(() => {
        // List row data is already applied; keep editing without blocking.
      })
      .finally(() => {
        if (!cancelled) setIsDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    applyRecordToForm,
    defaultMediaType,
    dispatch,
    editMediaId,
    editRecord,
    isEditMode,
    open,
    resetDrawerState,
  ]);

  useEffect(() => {
    if (!open || !watchedCenter) {
      setFloorOptions([]);
      setFloorsStatus('idle');
      return undefined;
    }

    let cancelled = false;
    setFloorsStatus('loading');

    fetchFloorsWithoutLayoutImage(watchedCenter)
      .then((options) => {
        if (cancelled) return;
        setFloorOptions(options);
        setFloorsStatus('succeeded');
      })
      .catch((error) => {
        if (cancelled) return;
        setFloorOptions([]);
        setFloorsStatus('failed');
        showErrorToast(error, { defaultMessage: 'Could not load floors for this center.' });
      });

    return () => {
      cancelled = true;
    };
  }, [open, watchedCenter]);

  useEffect(() => {
    if (!open || !watchedCenter) return;
    dispatch(fetchSpaces(watchedCenter));
  }, [dispatch, open, watchedCenter]);

  useEffect(() => {
    if (mutationError) showErrorToast(mutationError);
  }, [mutationError]);

  useEffect(() => {
    if (isSubmitted && errors.description) {
      setIsDescriptionOpen(true);
    }
  }, [isSubmitted, errors.description]);

  useEffect(() => {
    if (!open || isEditMode) return;
    setAttachments([]);
    setFileError(null);
  }, [isEditMode, open, watchedMediaType]);

  const handleFileUpload = useCallback(
    async (files) => {
      // Always work on a plain array — FileList is cleared when the <input> resets.
      const fileArray = Array.isArray(files) ? files : [...(files || [])];
      if (fileArray.length === 0) return;
      if (!watchedMediaType) {
        setFileError('Select a media type before uploading files.');
        return;
      }
      if (!allowsFileUpload) {
        setFileError(uploadRules?.hint ?? 'File upload is not available for this media type.');
        return;
      }

      setFileError(null);
      setIsCompressing(true);

      const validFiles = [];
      const oversizeFiles = [];
      const wrongTypeFiles = [];
      const failedFiles = [];

      try {
        for (let index = 0; index < fileArray.length; index += 1) {
          const file = fileArray[index];
          if (!isFileAllowedForMediaType(file, watchedMediaType)) {
            wrongTypeFiles.push(file.name);
            continue;
          }

          try {
            const { file: preparedFile } = await prepareAttachmentFileForUpload(file, maxFileSize);

            if (preparedFile.size > maxFileSize) {
              oversizeFiles.push(file.name);
              continue;
            }

            validFiles.push({
              id: `${Date.now()}-${index}-${Math.random()}`,
              file: preparedFile,
              name: preparedFile.name,
              size: preparedFile.size,
              type: preparedFile.type,
              lastModified: preparedFile.lastModified,
            });
          } catch {
            failedFiles.push(file.name);
          }
        }
      } finally {
        setIsCompressing(false);
      }

      const errorParts = [];
      if (oversizeFiles.length > 0) {
        errorParts.push(
          `The following file(s) exceed the ${formatFileSize(maxFileSize)} limit even after compression: ${oversizeFiles.join(', ')}`,
        );
      }
      if (wrongTypeFiles.length > 0) {
        errorParts.push(
          `File type not allowed for ${watchedMediaType}: ${wrongTypeFiles.join(', ')}. ${uploadHint}`,
        );
      }
      if (failedFiles.length > 0) {
        errorParts.push(`Could not process: ${failedFiles.join(', ')}`);
      }
      setFileError(errorParts.length > 0 ? errorParts.join(' ') : null);

      if (validFiles.length > 0) {
        setAttachments((previous) => {
          const merged = [...previous, ...validFiles];
          return uploadRules?.multiple === false ? merged.slice(-1) : merged;
        });
      }
    },
    [allowsFileUpload, maxFileSize, uploadHint, uploadRules, watchedMediaType],
  );

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
      if (e.dataTransfer.files?.length) {
        handleFileUpload([...e.dataTransfer.files]);
      }
    },
    [handleFileUpload],
  );

  const removeAttachment = useCallback(
    async (id, childRowId) => {
      const attachment = attachments.find((file) => file.id === id);
      if (!attachment) return;

      if (attachment.isExisting) {
        const fileUrl = attachment.fileUrl || childRowId;
        if (!fileUrl) return;

        setIsRemovingAttachment(true);
        try {
          await deleteKnowledgeCenterMediaAttachment(fileUrl);
          setAttachments((previous) => previous.filter((file) => file.id !== id));
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Could not remove attachment.' });
        } finally {
          setIsRemovingAttachment(false);
        }
        return;
      }

      setAttachments((previous) => previous.filter((file) => file.id !== id));
    },
    [attachments],
  );

  const handleAttachmentDownload = useCallback((attachment) => {
    const fileUrl = attachment?.fileUrl ? toAbsoluteAttachmentUrl(attachment.fileUrl) : '';
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = attachment.fileName || 'attachment';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = newTagValue.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setNewTagValue('');
    setTagInputVisible(false);
  }, [newTagValue, tags]);

  const handleRemoveTag = useCallback((tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const onSubmit = useCallback(
    async (data) => {
      if (isSubmitInProgress) return;
      setIsSubmitInProgress(true);
      setFileError(null);

      try {
        if (isPresentationMediaType(data.mediaType)) {
          const hasUrl = (data.url ?? '').trim();
          if (!hasUrl && attachments.length === 0) {
            setFileError('Add a presentation link or at least one attachment.');
            return;
          }
        } else if (!isLinkBasedMediaType(data.mediaType) && attachments.length === 0) {
          setFileError('Add at least one file for this media type.');
          return;
        }

        const newFiles = attachments
          .filter((att) => att.file instanceof File)
          .map((att) => att.file);

        const isLayoutMedia = data.mediaType === 'Layout';
        const layoutFile = isLayoutMedia ? (newFiles[0] ?? null) : null;

        const sharedFields = {
          media_name: data.mediaName.trim(),
          description: (data.description ?? '').trim(),
          center: data.center || '',
          floor: data.floor || '',
          space: data.space || '',
          client: data.client || '',
          matterport_url: isWalkthroughMediaType(data.mediaType)
            ? (data.matterportUrl ?? '').trim()
            : '',
          presentation_url: isPresentationMediaType(data.mediaType) ? (data.url ?? '').trim() : '',
          tags,
          is_active: 1,
        };

        let docname = editMediaId;

        if (isEditMode) {
          if (isLayoutMedia) {
            const formData = buildKnowledgeCenterMediaFormData({
              ...sharedFields,
              layoutFile,
            });
            await dispatch(
              updateKnowledgeCenterMedia({ name: editMediaId, payload: formData }),
            ).unwrap();
          } else {
            await dispatch(
              updateKnowledgeCenterMedia({ name: editMediaId, payload: sharedFields }),
            ).unwrap();
          }
        } else if (isLayoutMedia) {
          const formData = buildKnowledgeCenterMediaFormData({
            ...sharedFields,
            media_type: data.mediaType.trim(),
            layoutFile,
          });
          const record = await dispatch(createKnowledgeCenterMedia(formData)).unwrap();
          docname = record?.name;
        } else {
          const record = await dispatch(
            createKnowledgeCenterMedia({
              ...sharedFields,
              media_type: data.mediaType.trim(),
            }),
          ).unwrap();
          docname = record?.name;
        }

        if (!isLayoutMedia && newFiles.length > 0 && docname) {
          setIsUploadingAttachments(true);
          try {
            await uploadKnowledgeCenterMediaFiles(docname, newFiles);
          } finally {
            setIsUploadingAttachments(false);
          }
        }

        showSuccessToast(isEditMode ? 'Media updated successfully.' : 'Media added successfully.');
        onSaved?.();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: isEditMode ? 'Could not update media.' : 'Could not save media.',
        });
      } finally {
        setIsSubmitInProgress(false);
      }
    },
    [attachments, dispatch, editMediaId, isEditMode, isSubmitInProgress, onSaved, tags],
  );

  const showAttachmentSection = !isLinkBasedMediaType(watchedMediaType);
  const showWalkthroughLink = isWalkthroughMediaType(watchedMediaType);
  const showPresentationUrl = isPresentationMediaType(watchedMediaType);

  const closeDrawer = useCallback(() => {
    if (!isBusy) {
      onOpenChange(false);
    }
  }, [isBusy, onOpenChange]);

  const handleOpenChange = useCallback(
    (next) => {
      if (!next && !isBusy) resetDrawerState();
      onOpenChange(next);
    },
    [isBusy, onOpenChange, resetDrawerState],
  );

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content
        className='relative flex h-full max-w-[560px] flex-col overflow-hidden'
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
                <p className='label-large font-semibold text-information-base'>Drop files here</p>
                <p className='text-paragraph-sm text-text-sub-600'>{uploadHint}</p>
              </div>
            </div>
          </div>
        ) : null}

        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiImageLine className='size-6 text-text-sub-500' aria-hidden />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1 pr-8'>
              <Drawer.Title className='label-medium text-text-main-900'>
                {isEditMode ? 'Edit Media' : 'Add Media'}
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                {isEditMode
                  ? 'Update the details below to edit this media.'
                  : 'Enter below details to add new media.'}
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-1 flex-col overflow-hidden'>
          <Drawer.Body className='flex-1 overflow-y-auto px-6 pb-6 pt-4'>
            {isDetailLoading ? (
              <div className='flex min-h-[240px] flex-col items-center justify-center gap-3'>
                <div className='size-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                <p className='paragraph-small text-text-sub-500'>Loading media…</p>
              </div>
            ) : (
              <div className='flex flex-col gap-4'>
                <div className='flex flex-col gap-4'>
                  <div>
                    <Controller
                      name='mediaName'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          {...field}
                          id='media_name'
                          hasError={isSubmitted && Boolean(errors.mediaName)}
                          placeholder='Enter name'
                          disabled={isBusy}
                          className='field-sizing-content text-lg'
                          simple
                        />
                      )}
                    />
                    {isSubmitted && errors.mediaName ? (
                      <ErrorText>{errors.mediaName.message}</ErrorText>
                    ) : null}
                  </div>

                  <div>
                    {isDescriptionOpen || String(watchedDescription ?? '').trim() !== '' ? (
                      <Controller
                        name='description'
                        control={control}
                        render={({ field }) => (
                          <Textarea.Root
                            {...field}
                            id='media_description'
                            rows={4}
                            hasError={isSubmitted && Boolean(errors.description)}
                            placeholder='Add description'
                            disabled={isBusy}
                            className='min-h-[116px]'
                          />
                        )}
                      />
                    ) : (
                      <button
                        type='button'
                        onClick={() => setIsDescriptionOpen(true)}
                        disabled={isBusy}
                        className='flex w-full cursor-pointer items-center gap-1 rounded-10 border border-transparent px-2 py-1.5 hover:border-stroke-sub-300'
                      >
                        <RiStickyNoteLine className='size-5 text-text-soft-400' aria-hidden />
                        <span className='text-paragraph-md text-text-soft-400'>
                          Add description
                        </span>
                      </button>
                    )}
                    {isSubmitted && errors.description ? (
                      <ErrorText className='w-full'>{errors.description.message}</ErrorText>
                    ) : null}
                  </div>
                </div>

                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  <FieldRow icon={RiSettings3Line} label='Media Type' required>
                    {isEditMode ? (
                      <div className='flex h-8 items-center pl-2'>
                        <span className='text-paragraph-sm text-text-main-900'>
                          {mediaTypeDisplayLabel}
                        </span>
                      </div>
                    ) : (
                      <>
                        <Controller
                          name='mediaType'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              variant='borderless'
                              size='xsmall'
                              matchTriggerWidth={false}
                              showArrow={false}
                              isolateSearchKeyboard
                              hasError={isSubmitted && Boolean(errors.mediaType)}
                              contentClassName='z-[600]'
                              value={field.value || ''}
                              valueSentinel='__none__'
                              onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                              options={MEDIA_TYPE_FORM_OPTIONS}
                              disabled={isBusy}
                              placeholder='Select'
                              searchPlaceholder='Search media types...'
                              emptyMessage='No media types available'
                              noResultsMessage='No media types found'
                              triggerClassName='w-full min-w-0'
                            />
                          )}
                        />
                        {isSubmitted && errors.mediaType ? (
                          <ErrorText className='w-full'>{errors.mediaType.message}</ErrorText>
                        ) : null}
                      </>
                    )}
                  </FieldRow>
                  <FieldRow icon={RiBuildingLine} label='Center'>
                    <Controller
                      name='center'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          hasError={isSubmitted && Boolean(errors.center)}
                          contentClassName='z-[600]'
                          value={field.value || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) => {
                            const nextCenter = v === '__none__' ? '' : v;
                            field.onChange(nextCenter);
                            setValue('floor', '');
                          }}
                          options={centerSelectOptions}
                          disabled={isBusy || centersState.status === 'loading'}
                          placeholder='Select'
                          searchPlaceholder='Search centers...'
                          emptyMessage={
                            centersState.status === 'loading'
                              ? 'Loading...'
                              : 'No centers available'
                          }
                          noResultsMessage='No centers found'
                          triggerClassName='w-full min-w-0'
                        />
                      )}
                    />
                    {isSubmitted && errors.center ? (
                      <ErrorText className='w-full'>{errors.center.message}</ErrorText>
                    ) : null}
                  </FieldRow>

                  <FieldRow icon={RiStackLine} label='Floor'>
                    <Controller
                      name='floor'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          hasError={isSubmitted && Boolean(errors.floor)}
                          contentClassName='z-[600]'
                          value={field.value || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                          options={floorSelectOptions}
                          disabled={isBusy || !watchedCenter || floorsStatus === 'loading'}
                          placeholder='Select'
                          searchPlaceholder='Search floors...'
                          emptyMessage={
                            !watchedCenter
                              ? 'Select center first'
                              : floorsStatus === 'loading'
                                ? 'Loading...'
                                : 'No floors available'
                          }
                          noResultsMessage='No floors found'
                          triggerClassName='w-full min-w-0'
                        />
                      )}
                    />
                    {isSubmitted && errors.floor ? (
                      <ErrorText className='w-full'>{errors.floor.message}</ErrorText>
                    ) : null}
                  </FieldRow>

                  <FieldRow icon={RiHome8Line} label='Space'>
                    <Controller
                      name='space'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          hasError={isSubmitted && Boolean(errors.space)}
                          contentClassName='z-[600]'
                          value={field.value || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                          options={spaceOptions}
                          disabled={isBusy || !watchedCenter || spacesState.status === 'loading'}
                          placeholder='Select'
                          searchPlaceholder='Search spaces...'
                          emptyMessage={
                            !watchedCenter
                              ? 'Select center first'
                              : spacesState.status === 'loading'
                                ? 'Loading...'
                                : 'No spaces available'
                          }
                          noResultsMessage='No spaces found'
                          triggerClassName='w-full min-w-0'
                        />
                      )}
                    />
                    {isSubmitted && errors.space ? (
                      <ErrorText className='w-full'>{errors.space.message}</ErrorText>
                    ) : null}
                  </FieldRow>

                  <FieldRow icon={RiGroupLine} label='Client'>
                    <Controller
                      name='client'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          hasError={isSubmitted && Boolean(errors.client)}
                          contentClassName='z-[600]'
                          value={field.value || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                          options={clientSelectOptions}
                          disabled={isBusy || ticketDropdown.status === 'loading'}
                          placeholder='Select'
                          searchPlaceholder='Search clients...'
                          emptyMessage={
                            ticketDropdown.status === 'loading'
                              ? 'Loading...'
                              : 'No clients available'
                          }
                          noResultsMessage='No clients found'
                          triggerClassName='w-full min-w-0'
                        />
                      )}
                    />
                    {isSubmitted && errors.client ? (
                      <ErrorText className='w-full'>{errors.client.message}</ErrorText>
                    ) : null}
                  </FieldRow>
                </div>

                <div className='flex flex-col gap-3 mt-2'>
                  <div className='flex items-center gap-2'>
                    <RiPriceTag3Line className='size-5 text-text-sub-500' aria-hidden />
                    <span className='text-label-md text-text-sub-500'>Tags</span>
                  </div>
                  {tags.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className='inline-flex h-[22px] items-center gap-0.5 rounded-md border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1 text-[12px] font-medium text-text-sub-500'
                        >
                          {tag}
                          <button
                            type='button'
                            className='rounded-full p-0.5 hover:bg-bg-weak-50'
                            onClick={() => handleRemoveTag(tag)}
                            aria-label={`Remove tag ${tag}`}
                          >
                            <RiCloseLine className='size-3' />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {tagInputVisible ? (
                    <div className='flex items-center gap-2'>
                      <Input.Root size='xsmall' className='flex-1'>
                        <Input.Wrapper>
                          <Input.Input
                            ref={tagInputRef}
                            value={newTagValue}
                            onChange={(e) => setNewTagValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder='Tag name'
                            disabled={isBusy}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='ghost'
                        size='xsmall'
                        onClick={() => {
                          setTagInputVisible(false);
                          setNewTagValue('');
                        }}
                      >
                        <Button.Icon as={RiCloseLine} />
                      </Button.Root>
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='ghost'
                        size='xsmall'
                        onClick={handleAddTag}
                      >
                        <Button.Icon as={RiCheckLine} />
                      </Button.Root>
                    </div>
                  ) : (
                    <LinkButton.Root
                      variant='primary'
                      size='small'
                      underline
                      type='button'
                      onClick={() => {
                        setTagInputVisible(true);
                        window.setTimeout(() => tagInputRef.current?.focus(), 0);
                      }}
                      className='w-fit gap-1'
                    >
                      <LinkButton.Icon as={RiAddLine} />
                      Add New Tag
                    </LinkButton.Root>
                  )}
                </div>

                {showWalkthroughLink ? (
                  <div className='flex flex-col gap-2 mt-2'>
                    <Label.Root htmlFor='matterport_url' className='flex items-center gap-2'>
                      <RiLinkM className='size-5 text-text-sub-500' aria-hidden />
                      <span className='text-label-md text-text-sub-500'>Walkthrough link</span>
                    </Label.Root>
                    <div className='flex flex-col gap-1'>
                      <Controller
                        name='matterportUrl'
                        control={control}
                        render={({ field }) => (
                          <Input.Root
                            size='small'
                            hasError={isSubmitted && Boolean(errors.matterportUrl)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                {...field}
                                id='matterport_url'
                                placeholder='https://my.matterport.com/show/?m=…'
                                disabled={isBusy}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {isSubmitted && errors.matterportUrl ? (
                        <ErrorText>{errors.matterportUrl.message}</ErrorText>
                      ) : (
                        <p className='text-paragraph-xs text-text-soft-400'>
                          Paste one Matterport showcase URL for this walkthrough. Preview is
                          generated from the link.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                {showPresentationUrl ? (
                  <div className='flex flex-col gap-2 mt-2'>
                    <Label.Root htmlFor='presentation_url' className='flex items-center gap-2'>
                      <RiLinkM className='size-5 text-text-sub-500' aria-hidden />
                      <span className='text-label-md text-text-sub-500'>Presentation link</span>
                    </Label.Root>
                    <div className='flex flex-col gap-1'>
                      <Controller
                        name='url'
                        control={control}
                        render={({ field }) => (
                          <Input.Root size='small' hasError={isSubmitted && Boolean(errors.url)}>
                            <Input.Wrapper>
                              <Input.Input
                                {...field}
                                id='presentation_url'
                                placeholder='https://www.canva.com/design/…/view'
                                disabled={isBusy}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {isSubmitted && errors.url ? (
                        <ErrorText>{errors.url.message}</ErrorText>
                      ) : (
                        <p className='text-paragraph-xs text-text-soft-400'>
                          Optionally paste a presentation link, attach files below, or both.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                {showAttachmentSection ? (
                  <div className='flex flex-col gap-2 mt-2'>
                    <div className='flex items-center justify-between'>
                      <Label.Root className='flex items-center gap-2'>
                        <RiAttachment2 className='size-5 text-text-sub-500' />
                        <span className='text-label-md text-text-sub-500'>Attachments</span>
                      </Label.Root>
                      {attachments.length > 0 ? (
                        <Button.Root
                          type='button'
                          onClick={openFilePicker}
                          disabled={isBusy || !allowsFileUpload}
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                        >
                          Upload Files
                        </Button.Root>
                      ) : null}
                    </div>

                    <AttachmentList
                      attachments={attachments}
                      onDownload={handleAttachmentDownload}
                      onRemove={(id, childRowId) => removeAttachment(id, childRowId)}
                      disabled={isBusy}
                      emptyStateMessage='Choose a file or drag & drop.'
                      emptyStateDescription={uploadHint}
                      emptyStateAction={{
                        label: 'Browse File',
                        disabled: isBusy || !allowsFileUpload,
                        onClick: openFilePicker,
                      }}
                    />

                    <input
                      type='file'
                      multiple={uploadRules?.multiple !== false}
                      accept={uploadRules?.accept || undefined}
                      onChange={(e) => {
                        const selectedFiles = [...(e.target.files || [])];
                        e.target.value = '';
                        void handleFileUpload(selectedFiles);
                      }}
                      ref={fileInputRef}
                      className='hidden'
                      disabled={isBusy || !allowsFileUpload}
                    />
                    {isCompressing ? (
                      <p className='text-paragraph-xs text-text-sub-500'>
                        Processing attachments… Large images over {formatFileSize(maxFileSize)} will
                        be compressed automatically.
                      </p>
                    ) : null}
                    {isUploadingAttachments ? (
                      <p className='text-paragraph-xs text-text-sub-500'>Uploading attachments…</p>
                    ) : null}
                    {fileError ? (
                      <div className='mt-2'>
                        <ErrorText className='w-full'>{fileError}</ErrorText>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 z-10 bg-white'>
            <div className='flex flex-col gap-3 p-6 sm:flex-row sm:justify-end'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                className='w-full sm:w-auto'
                onClick={closeDrawer}
                disabled={isBusy}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' className='w-full sm:w-auto' disabled={isBusy}>
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
