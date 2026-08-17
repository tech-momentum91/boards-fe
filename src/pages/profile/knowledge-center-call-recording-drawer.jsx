import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiBuildingLine,
  RiCheckLine,
  RiCloseLine,
  RiGroupLine,
  RiHome8Line,
  RiMapPinLine,
  RiPhoneLine,
  RiPriceTag3Line,
  RiTimeLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';

import {
  deleteKnowledgeCenterCallRecordingAttachment,
  uploadKnowledgeCenterCallRecordingFiles,
} from '@/api/knowledgeCenterCallRecording';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import * as Drawer from '@/components/ui/drawer';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as LinkButton from '@/components/ui/link-button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import KnowledgeCenterCallRecordingFileCard from '@/pages/profile/knowledge-center-call-recording-file-card';
import {
  CALL_TYPE_FORM_OPTIONS,
  COMPANY_FORM_OPTIONS,
  isMp3File,
  MP3_UPLOAD_RULES,
} from '@/pages/profile/knowledge-center-call-recordings-constants';
import {
  createKnowledgeCenterCallRecording,
  selectKnowledgeCenterCallRecordingMutation,
} from '@/redux/knowledgeCenterCallRecordingSlice';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import {
  defaultKnowledgeCenterCallRecordingValues,
  knowledgeCenterCallRecordingSchema,
} from '@/schemas/knowledge-center-call-recording-schema';
import { formatEventDatetimeForApi, parseToDate } from '@/utils/date-utils';
import { formatFileSize } from '@/utils/file-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';

const FILE_INPUT_ID = 'kc-call-recording-file-upload';

export default function KnowledgeCenterCallRecordingDrawer({
  open,
  onOpenChange,
  onSaved,
  defaultCompany = '',
}) {
  const dispatch = useDispatch();
  const tagInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const { status: mutationStatus } = useSelector(selectKnowledgeCenterCallRecordingMutation);
  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);

  const [tags, setTags] = useState([]);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isRemovingAttachment, setIsRemovingAttachment] = useState(false);
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
    resolver: zodResolver(knowledgeCenterCallRecordingSchema),
    defaultValues: defaultKnowledgeCenterCallRecordingValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedCallDatetime = watch('callDatetime');
  const isSubmitting = isSubmitInProgress || mutationStatus === 'loading' || isUploadingAttachments;
  const isBusy = isSubmitting || isRemovingAttachment;

  const clientOptions = useMemo(() => {
    const raw = ticketDropdown.data?.clients || ticketDropdown.data?.customers || [];
    return Array.isArray(raw) ? raw : [];
  }, [ticketDropdown.data]);

  const centerOptions = useMemo(() => {
    const fromDropdown = ticketDropdown.data?.centers;
    if (Array.isArray(fromDropdown) && fromDropdown.length > 0) {
      return fromDropdown;
    }
    return Array.isArray(centersState.data) ? centersState.data : [];
  }, [ticketDropdown.data?.centers, centersState.data]);

  const resetDrawerState = useCallback(
    (company = '') => {
      reset({
        ...defaultKnowledgeCenterCallRecordingValues,
        company: company || '',
      });
      setTags([]);
      setTagInputVisible(false);
      setNewTagValue('');
      setAttachments([]);
      setFileError(null);
      setDragActive(false);
    },
    [reset],
  );

  useEffect(() => {
    if (!open) return;
    dispatch(fetchTicketDropdownData());
    dispatch(fetchCentersForClient(null));
    resetDrawerState(defaultCompany);
  }, [defaultCompany, dispatch, open, resetDrawerState]);

  const handleFileUpload = useCallback((fileList) => {
    setFileError(null);
    const incoming = [...(fileList || [])];
    const valid = [];
    const invalid = [];
    const oversize = [];

    for (const file of incoming) {
      if (!isMp3File(file)) {
        invalid.push(file.name);
        continue;
      }
      if (file.size > MP3_UPLOAD_RULES.maxFileSizeBytes) {
        oversize.push(file.name);
        continue;
      }
      valid.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        fileName: file.name,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    const errorParts = [];
    if (invalid.length > 0) {
      errorParts.push(`Only MP3 files are allowed: ${invalid.join(', ')}`);
    }
    if (oversize.length > 0) {
      errorParts.push(
        `The following file(s) exceed the ${formatFileSize(MP3_UPLOAD_RULES.maxFileSizeBytes)} limit: ${oversize.join(', ')}`,
      );
    }
    setFileError(errorParts.length > 0 ? errorParts.join(' ') : null);

    if (valid.length > 0) {
      setAttachments(valid.slice(-1));
    }
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      const rect = e.currentTarget.getBoundingClientRect();
      const { clientX: x, clientY: y } = e;
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
          await deleteKnowledgeCenterCallRecordingAttachment(fileUrl);
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
    if (attachment.file instanceof File) {
      const url = URL.createObjectURL(attachment.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName || attachment.name || 'recording.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const fileUrl = attachment?.fileUrl ? toAbsoluteAttachmentUrl(attachment.fileUrl) : '';
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = attachment.fileName || 'recording.mp3';
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

  const buildPayload = useCallback(
    (data) => ({
      call_recording_name: data.callRecordingName.trim(),
      center: data.center || '',
      client: data.client || '',
      company: data.company || '',
      call_type: data.callType || '',
      call_date_time: formatEventDatetimeForApi(data.callDatetime),
      tags,
    }),
    [tags],
  );

  const onSubmit = useCallback(
    async (data) => {
      if (isSubmitInProgress) return;
      setIsSubmitInProgress(true);
      setFileError(null);

      try {
        if (attachments.length === 0) {
          setFileError('Add an MP3 recording attachment.');
          return;
        }

        const payload = buildPayload(data);
        const record = await dispatch(createKnowledgeCenterCallRecording(payload)).unwrap();
        const docname = record?.name;

        const newFiles = attachments
          .filter((att) => att.file instanceof File)
          .map((att) => att.file);

        if (newFiles.length > 0 && docname) {
          setIsUploadingAttachments(true);
          try {
            await uploadKnowledgeCenterCallRecordingFiles(docname, newFiles);
          } finally {
            setIsUploadingAttachments(false);
          }
        }

        showSuccessToast('Call recording added successfully.');
        onSaved?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not save call recording.' });
      } finally {
        setIsSubmitInProgress(false);
      }
    },
    [attachments, buildPayload, dispatch, isSubmitInProgress, onSaved],
  );

  const closeDrawer = useCallback(() => {
    if (!isBusy) onOpenChange(false);
  }, [isBusy, onOpenChange]);

  const handleOpenChange = useCallback(
    (next) => {
      if (!next && !isSubmitting) resetDrawerState();
      onOpenChange(next);
    },
    [isSubmitting, onOpenChange, resetDrawerState],
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
              <RiUploadCloud2Line className='size-16 text-information-base' aria-hidden />
              <div className='flex flex-col items-center gap-2'>
                <p className='label-large font-semibold text-information-base'>Drop MP3 here</p>
                <p className='text-paragraph-sm text-text-sub-600'>{MP3_UPLOAD_RULES.hint}</p>
              </div>
            </div>
          </div>
        ) : null}

        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiPhoneLine className='size-6 text-text-sub-500' aria-hidden />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1 pr-8'>
              <Drawer.Title className='label-medium text-text-main-900'>
                Add Call Recording
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Enter below details to add a new call recording.
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-1 flex-col overflow-hidden'>
          <Drawer.Body className='flex-1 overflow-y-auto px-6 pb-6 pt-4'>
            <div className='flex flex-col gap-4'>
              <div>
                <Controller
                  name='callRecordingName'
                  control={control}
                  render={({ field }) => (
                    <Textarea.Root
                      {...field}
                      id='call_recording_name'
                      hasError={isSubmitted && Boolean(errors.callRecordingName)}
                      placeholder='Enter name'
                      disabled={isBusy}
                      className='field-sizing-content text-lg'
                      simple
                    />
                  )}
                />
                {isSubmitted && errors.callRecordingName ? (
                  <ErrorText>{errors.callRecordingName.message}</ErrorText>
                ) : null}
              </div>

              <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                <FieldRow icon={RiHome8Line} label='Center'>
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
                        contentClassName='z-[600]'
                        value={field.value || ''}
                        valueSentinel='__none__'
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        options={centerOptions}
                        disabled={isBusy || centersState.status === 'loading'}
                        placeholder='Select'
                        searchPlaceholder='Search centers...'
                        emptyMessage={
                          centersState.status === 'loading' ? 'Loading...' : 'No centers available'
                        }
                        noResultsMessage='No centers found'
                        triggerClassName='w-full min-w-0'
                      />
                    )}
                  />
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
                        contentClassName='z-[600]'
                        value={field.value || ''}
                        valueSentinel='__none__'
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        options={clientOptions}
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
                </FieldRow>

                <FieldRow icon={RiBuildingLine} label='Company'>
                  <Controller
                    name='company'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        variant='borderless'
                        size='xsmall'
                        matchTriggerWidth={false}
                        showArrow={false}
                        isolateSearchKeyboard
                        hasError={isSubmitted && Boolean(errors.company)}
                        contentClassName='z-[600]'
                        value={field.value || ''}
                        valueSentinel='__none__'
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        options={COMPANY_FORM_OPTIONS}
                        disabled={isBusy}
                        placeholder='Select'
                        searchPlaceholder='Search...'
                        emptyMessage='No companies available'
                        noResultsMessage='No companies found'
                        triggerClassName='w-full min-w-0'
                      />
                    )}
                  />
                  {isSubmitted && errors.company ? (
                    <ErrorText className='w-full'>{errors.company.message}</ErrorText>
                  ) : null}
                </FieldRow>

                <FieldRow icon={RiMapPinLine} label='Call Type'>
                  <Controller
                    name='callType'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        variant='borderless'
                        size='xsmall'
                        matchTriggerWidth={false}
                        showArrow={false}
                        isolateSearchKeyboard
                        hasError={isSubmitted && Boolean(errors.callType)}
                        contentClassName='z-[600]'
                        value={field.value || ''}
                        valueSentinel='__none__'
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        options={CALL_TYPE_FORM_OPTIONS}
                        disabled={isBusy}
                        placeholder='Select'
                        searchPlaceholder='Search...'
                        emptyMessage='No call types available'
                        noResultsMessage='No call types found'
                        triggerClassName='w-full min-w-0'
                        renderTrigger={() =>
                          field.value ? (
                            <Badge.Root size='medium' variant='light' color='gray'>
                              {field.value}
                            </Badge.Root>
                          ) : (
                            <span className='text-paragraph-sm text-text-soft-400'>Select</span>
                          )
                        }
                      />
                    )}
                  />
                  {isSubmitted && errors.callType ? (
                    <ErrorText className='w-full'>{errors.callType.message}</ErrorText>
                  ) : null}
                </FieldRow>

                <FieldRow icon={RiTimeLine} label='Date & Time'>
                  <DateTimePicker
                    value={watchedCallDatetime ? parseToDate(watchedCallDatetime) : undefined}
                    onChange={(next) =>
                      setValue('callDatetime', next ? formatEventDatetimeForApi(next) : '', {
                        shouldValidate: isSubmitted,
                      })
                    }
                    disabled={isBusy}
                    placeholder='Select date and time'
                    hasError={isSubmitted && Boolean(errors.callDatetime)}
                    variant='borderless'
                    className='w-full'
                  />
                  {isSubmitted && errors.callDatetime ? (
                    <ErrorText className='w-full'>{errors.callDatetime.message}</ErrorText>
                  ) : null}
                </FieldRow>
              </div>

              <div className='mt-2 flex flex-col gap-3'>
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
                    disabled={isBusy}
                  >
                    <LinkButton.Icon as={RiAddLine} />
                    Add New Tag
                  </LinkButton.Root>
                )}
              </div>

              <div className='mt-2 flex flex-col gap-2'>
                <Label.Root className='flex items-center gap-2'>
                  <RiPhoneLine className='size-5 text-text-sub-500' aria-hidden />
                  <span className='text-label-md text-text-sub-500'>Call Recording</span>
                </Label.Root>

                {attachments.length > 0 ? (
                  <div className='space-y-3'>
                    {attachments.map((attachment) => (
                      <KnowledgeCenterCallRecordingFileCard
                        key={attachment.id}
                        attachment={attachment}
                        disabled={isBusy}
                        onDownload={handleAttachmentDownload}
                        onRemove={(file) => removeAttachment(file.id, file.childRowId)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className='flex items-start gap-3 rounded-xl border border-dashed border-stroke-sub-300 px-4 py-3'>
                    <RiUploadCloud2Line className='size-6 text-text-sub-500' aria-hidden />
                    <div className='flex flex-1 flex-col gap-1'>
                      <p className='label-small text-text-main-900'>
                        Choose a file or drag & drop.
                      </p>
                      <p className='text-paragraph-xs text-text-soft-400'>
                        {MP3_UPLOAD_RULES.hint}
                      </p>
                    </div>
                    <Button.Root
                      type='button'
                      onClick={openFilePicker}
                      disabled={isBusy}
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                    >
                      Browse File
                    </Button.Root>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  id={FILE_INPUT_ID}
                  type='file'
                  accept={MP3_UPLOAD_RULES.accept}
                  className='hidden'
                  onChange={(e) => {
                    handleFileUpload(e.target.files);
                    e.target.value = '';
                  }}
                />

                {isUploadingAttachments ? (
                  <p className='text-paragraph-xs text-text-sub-500'>Uploading recording…</p>
                ) : null}
                {fileError ? <ErrorText className='w-full'>{fileError}</ErrorText> : null}
              </div>
            </div>
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
