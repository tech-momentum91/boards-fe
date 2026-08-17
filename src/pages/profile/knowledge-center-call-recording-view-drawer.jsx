import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiBuildingLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
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
  mapKnowledgeCenterCallRecordingAttachments,
  uploadKnowledgeCenterCallRecordingFiles,
} from '@/api/knowledgeCenterCallRecording';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as LinkButton from '@/components/ui/link-button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import KnowledgeCenterCallRecordingFileCard from '@/pages/profile/knowledge-center-call-recording-file-card';
import CallRecordingTranscript from '@/pages/profile/knowledge-center-call-recording-transcript';
import KnowledgeCenterCallRecordingViewDrawerSkeleton from '@/pages/profile/knowledge-center-call-recording-view-drawer-skeleton';
import { extractCallRecordingTranscriptMessages } from '@/pages/profile/knowledge-center-call-recording-transcript-utils';
import {
  CALL_TYPE_FORM_OPTIONS,
  COMPANY_FORM_OPTIONS,
  isMp3File,
  MP3_UPLOAD_RULES,
} from '@/pages/profile/knowledge-center-call-recordings-constants';
import {
  clearKnowledgeCenterCallRecordingDetail,
  deleteKnowledgeCenterCallRecording,
  fetchKnowledgeCenterCallRecordingDetailedView,
  selectKnowledgeCenterCallRecordingDetail,
  updateKnowledgeCenterCallRecording,
} from '@/redux/knowledgeCenterCallRecordingSlice';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import { formatEventDatetimeForApi, parseToDate } from '@/utils/date-utils';
import { formatFileSize } from '@/utils/file-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';

const FILE_INPUT_ID = 'kc-call-recording-view-file-upload';

const getFieldValue = (detail, localChanges, fieldName) => {
  if (localChanges[fieldName] !== undefined) return localChanges[fieldName];
  return detail?.[fieldName] ?? '';
};

export default function KnowledgeCenterCallRecordingViewDrawer({
  open,
  recordingId,
  orderedIds = [],
  onOpenChange,
  onNavigate,
  onDeleted,
  onUpdated,
}) {
  const dispatch = useDispatch();
  const {
    data: detail,
    status: detailStatus,
    error: detailError,
  } = useSelector(selectKnowledgeCenterCallRecordingDetail);

  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);

  const [localChanges, setLocalChanges] = useState({});
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [titleError, setTitleError] = useState('');

  const tagInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastFetchedIdRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());

  const currentIndex = useMemo(() => orderedIds.indexOf(recordingId), [orderedIds, recordingId]);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderedIds.length - 1;

  const isDataReady = detailStatus === 'succeeded' && detail?.name === recordingId;
  const isInitialLoading = open && recordingId && !hasLoadedInitialData && !isDataReady;
  const showSkeleton = isInitialLoading || !isDrawerFullyOpen;

  const recordingTitle = useMemo(
    () => String(getFieldValue(detail, localChanges, 'call_recording_name') ?? ''),
    [detail, localChanges],
  );

  const transcriptMessages = useMemo(
    () => extractCallRecordingTranscriptMessages(detail),
    [detail],
  );

  const tags = useMemo(() => {
    const raw = getFieldValue(detail, localChanges, 'tags');
    if (Array.isArray(raw)) {
      return raw
        .map((tag) => {
          if (typeof tag === 'string') return tag.trim();
          return String(tag?.tag ?? tag?.label ?? tag?.name ?? '').trim();
        })
        .filter(Boolean);
    }
    return [];
  }, [detail, localChanges]);

  const attachments = useMemo(() => mapKnowledgeCenterCallRecordingAttachments(detail), [detail]);

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

  const callTypeValue = getFieldValue(detail, localChanges, 'call_type');
  const callDateTimeValue = getFieldValue(detail, localChanges, 'call_date_time');

  useEffect(() => {
    if (isDataReady) setHasLoadedInitialData(true);
  }, [isDataReady]);

  useEffect(() => {
    if (!open) {
      setHasLoadedInitialData(false);
      return;
    }
    if (lastFetchedIdRef.current !== recordingId) {
      setHasLoadedInitialData(false);
    }
  }, [open, recordingId]);

  useEffect(() => {
    if (!open || !recordingId) {
      lastFetchedIdRef.current = null;
      return;
    }
    if (lastFetchedIdRef.current !== recordingId) {
      lastFetchedIdRef.current = recordingId;
      dispatch(fetchKnowledgeCenterCallRecordingDetailedView(recordingId));
    }
  }, [open, recordingId, dispatch]);

  useEffect(() => {
    if (open) {
      dispatch(fetchTicketDropdownData());
      const timer = window.setTimeout(() => setIsDrawerFullyOpen(true), 300);
      return () => window.clearTimeout(timer);
    }
    setIsDrawerFullyOpen(false);
    return undefined;
  }, [open, dispatch]);

  const clientId = getFieldValue(detail, localChanges, 'client');

  useEffect(() => {
    if (open) dispatch(fetchCentersForClient(clientId || null));
  }, [dispatch, open, clientId]);

  useEffect(() => {
    if (!open) {
      dispatch(clearKnowledgeCenterCallRecordingDetail());
      setLocalChanges({});
      setUploadError('');
      setTagInputVisible(false);
      setNewTagValue('');
      setTitleError('');
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (open && recordingId && lastFetchedIdRef.current !== recordingId) {
      setLocalChanges({});
      setUploadError('');
      setTagInputVisible(false);
      setNewTagValue('');
      setTitleError('');
    }
  }, [open, recordingId]);

  const persistUpdate = useCallback(
    (payload, { showToast = false } = {}) => {
      if (!recordingId) return Promise.resolve();
      saveQueueRef.current = saveQueueRef.current
        .catch(() => {})
        .then(() =>
          dispatch(updateKnowledgeCenterCallRecording({ name: recordingId, payload })).unwrap(),
        )
        .then((updated) => {
          if (showToast) {
            showSuccessToast('Updated successfully.');
          }
          onUpdated?.();
          return updated;
        })
        .catch((error) => {
          showErrorToast(error, { defaultMessage: 'Could not save changes.' });
        });
      return saveQueueRef.current;
    },
    [dispatch, onUpdated, recordingId],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      setLocalChanges((prev) => ({ ...prev, [fieldName]: value }));
      persistUpdate({ [fieldName]: value });
    },
    [persistUpdate],
  );

  const handleTextFieldBlur = useCallback(
    (fieldName, explicitValue) => {
      const raw =
        explicitValue !== undefined
          ? explicitValue
          : getFieldValue(detail, localChanges, fieldName);
      const value = typeof raw === 'string' ? raw.trim() : raw;
      setLocalChanges((prev) => ({ ...prev, [fieldName]: value }));
      persistUpdate({ [fieldName]: value }, { showToast: true });
    },
    [detail, localChanges, persistUpdate],
  );

  const handleTagsUpdate = useCallback(
    (nextTags) => {
      setLocalChanges((prev) => ({ ...prev, tags: nextTags }));
      persistUpdate({ tags: nextTags });
    },
    [persistUpdate],
  );

  const handleAddTag = useCallback(() => {
    const trimmed = newTagValue.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    handleTagsUpdate([...tags, trimmed]);
    setNewTagValue('');
    setTagInputVisible(false);
  }, [handleTagsUpdate, newTagValue, tags]);

  const handleRemoveTag = useCallback(
    (tag) => {
      handleTagsUpdate(tags.filter((t) => t !== tag));
    },
    [handleTagsUpdate, tags],
  );

  const handleFileUpload = useCallback(
    async (fileList) => {
      if (!recordingId) return;
      setUploadError(null);

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
        valid.push(file);
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
      if (errorParts.length > 0) {
        setUploadError(errorParts.join(' '));
        return;
      }

      if (valid.length === 0) return;

      setIsUploading(true);
      try {
        await uploadKnowledgeCenterCallRecordingFiles(recordingId, valid.slice(-1));
        await dispatch(fetchKnowledgeCenterCallRecordingDetailedView(recordingId)).unwrap();
        showSuccessToast('Updated successfully.');
        onUpdated?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not upload recording.' });
      } finally {
        setIsUploading(false);
      }
    },
    [dispatch, onUpdated, recordingId],
  );

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
        void handleFileUpload([...e.dataTransfer.files]);
      }
    },
    [handleFileUpload],
  );

  const handleRemoveAttachment = useCallback(
    async (attachment) => {
      const fileUrl = attachment?.fileUrl || attachment?.childRowId;
      if (!fileUrl) return;

      setIsUploading(true);
      try {
        await deleteKnowledgeCenterCallRecordingAttachment(fileUrl);
        await dispatch(fetchKnowledgeCenterCallRecordingDetailedView(recordingId)).unwrap();
        showSuccessToast('Updated successfully.');
        onUpdated?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not remove attachment.' });
      } finally {
        setIsUploading(false);
      }
    },
    [dispatch, onUpdated, recordingId],
  );

  const handleAttachmentDownload = useCallback((attachment) => {
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

  const handleDelete = useCallback(async () => {
    if (!recordingId) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteKnowledgeCenterCallRecording(recordingId)).unwrap();
      showSuccessToast('Call recording removed.');
      setDeleteModalOpen(false);
      onDeleted?.();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not remove call recording.' });
    } finally {
      setIsDeleting(false);
    }
  }, [dispatch, onDeleted, recordingId]);

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleNavigatePrevious = useCallback(() => {
    if (!hasPrevious) return;
    onNavigate?.(orderedIds[currentIndex - 1]);
  }, [currentIndex, hasPrevious, onNavigate, orderedIds]);

  const handleNavigateNext = useCallback(() => {
    if (!hasNext) return;
    onNavigate?.(orderedIds[currentIndex + 1]);
  }, [currentIndex, hasNext, onNavigate, orderedIds]);

  if (!open) return null;

  return (
    <>
      <Drawer.Root
        open={open}
        onOpenChange={(next) => {
          if (next === false) handleClose();
        }}
      >
        <Drawer.Content className='max-w-[1200px]'>
          <Drawer.Header
            className='border-b border-stroke-soft-200 px-6 py-3'
            showCloseButton={false}
          >
            <div className='flex w-full items-center justify-between'>
              {showSkeleton ? (
                <>
                  <div className='h-8 w-16 animate-pulse rounded bg-bg-weak-100' />
                  <div className='h-8 w-24 animate-pulse rounded bg-bg-weak-100' />
                </>
              ) : (
                <>
                  <ButtonGroup.Root size='xsmall'>
                    <ButtonGroup.Item
                      onClick={handleNavigatePrevious}
                      disabled={!hasPrevious}
                      aria-label='Previous recording'
                    >
                      <ButtonGroup.Icon as={RiArrowLeftSLine} />
                    </ButtonGroup.Item>
                    <ButtonGroup.Item
                      onClick={handleNavigateNext}
                      disabled={!hasNext}
                      aria-label='Next recording'
                    >
                      <ButtonGroup.Icon as={RiArrowRightSLine} />
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setDeleteModalOpen(true)}
                      className='inline-flex shrink-0 items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1.5 shadow-[0_1px_2px_0_rgba(82,88,102,0.06)] transition-colors duration-200 hover:bg-bg-weak-50'
                    >
                      <RiDeleteBinLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
                      <span className='px-1 label-small text-text-sub-500'>Remove</span>
                    </button>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={handleClose}
                      className='shrink-0'
                      aria-label='Close'
                    >
                      <Button.Icon as={RiCloseLine} />
                    </Button.Root>
                  </div>
                </>
              )}
            </div>
          </Drawer.Header>

          <Drawer.Body className='flex-1 overflow-hidden p-0'>
            {showSkeleton ? (
              <KnowledgeCenterCallRecordingViewDrawerSkeleton />
            ) : detailError ? (
              <div className='flex h-full min-h-[280px] flex-col items-center justify-center gap-3 p-6'>
                <p className='paragraph-small text-error-base'>{detailError}</p>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  onClick={() =>
                    recordingId &&
                    dispatch(fetchKnowledgeCenterCallRecordingDetailedView(recordingId))
                  }
                >
                  Retry
                </Button.Root>
              </div>
            ) : (
              <div className='flex h-full'>
                <div
                  className='relative w-[420px] shrink-0 overflow-y-auto border-r border-stroke-soft-200'
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  {dragActive ? (
                    <div className='pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-information-base bg-information-lighter/80 backdrop-blur-sm'>
                      <div className='flex flex-col items-center gap-4'>
                        <RiUploadCloud2Line className='size-16 text-information-base' aria-hidden />
                        <div className='flex flex-col items-center gap-2'>
                          <p className='label-large font-semibold text-information-base'>
                            Drop MP3 file here
                          </p>
                          <p className='text-paragraph-sm text-text-sub-600'>
                            {MP3_UPLOAD_RULES.hint}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className='flex flex-col gap-6 px-6 pb-6 pt-5'>
                    <div className='flex flex-col gap-1'>
                      <Textarea.Root
                        key={`${recordingId || 'title'}-${recordingTitle}`}
                        variant='borderless'
                        simple
                        defaultValue={recordingTitle}
                        onChange={() => {
                          if (titleError) setTitleError('');
                        }}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (!value) {
                            setTitleError('Name is required');
                            return;
                          }
                          setTitleError('');
                          handleTextFieldBlur('call_recording_name', value);
                        }}
                        rows={1}
                        hasError={Boolean(titleError)}
                        placeholder='Enter name'
                        aria-invalid={Boolean(titleError)}
                        className='field-sizing-content p-1 text-title-h5 text-text-main-900'
                      />
                      {titleError ? (
                        <span className='text-paragraph-xs text-error-base'>{titleError}</span>
                      ) : null}
                    </div>

                    <div className='divide-y divide-stroke-soft-200 overflow-hidden rounded-xl border border-stroke-soft-200 bg-white'>
                      <FieldRow icon={RiHome8Line} label='Center' editable>
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          contentClassName='z-[600]'
                          value={getFieldValue(detail, localChanges, 'center') || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) =>
                            handleFieldChange('center', v === '__none__' ? '' : v)
                          }
                          options={centerOptions}
                          disabled={centersState.status === 'loading' || isUploading}
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
                      </FieldRow>
                      <FieldRow icon={RiGroupLine} label='Client' editable>
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          contentClassName='z-[600]'
                          value={getFieldValue(detail, localChanges, 'client') || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) =>
                            handleFieldChange('client', v === '__none__' ? '' : v)
                          }
                          options={clientOptions}
                          disabled={ticketDropdown.status === 'loading' || isUploading}
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
                      </FieldRow>
                      <FieldRow icon={RiBuildingLine} label='Company' editable>
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          contentClassName='z-[600]'
                          value={getFieldValue(detail, localChanges, 'company') || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) =>
                            handleFieldChange('company', v === '__none__' ? '' : v)
                          }
                          options={COMPANY_FORM_OPTIONS}
                          disabled={isUploading}
                          placeholder='Select'
                          searchPlaceholder='Search...'
                          emptyMessage='No companies available'
                          noResultsMessage='No companies found'
                          triggerClassName='w-full min-w-0'
                        />
                      </FieldRow>
                      <FieldRow icon={RiMapPinLine} label='Call Type' editable>
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          contentClassName='z-[600]'
                          value={callTypeValue || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) =>
                            handleFieldChange('call_type', v === '__none__' ? '' : v)
                          }
                          options={CALL_TYPE_FORM_OPTIONS}
                          disabled={isUploading}
                          placeholder='Select'
                          searchPlaceholder='Search...'
                          emptyMessage='No call types available'
                          noResultsMessage='No call types found'
                          triggerClassName='w-full min-w-0'
                          renderTrigger={() =>
                            callTypeValue ? (
                              <Badge.Root size='medium' variant='light' color='gray'>
                                {callTypeValue}
                              </Badge.Root>
                            ) : (
                              <span className='text-paragraph-sm text-text-soft-400'>Select</span>
                            )
                          }
                        />
                      </FieldRow>
                      <FieldRow icon={RiTimeLine} label='Date & Time' editable>
                        <DateTimePicker
                          value={callDateTimeValue ? parseToDate(callDateTimeValue) : undefined}
                          onChange={(next) =>
                            handleFieldChange(
                              'call_date_time',
                              next ? formatEventDatetimeForApi(next) : '',
                            )
                          }
                          disabled={isUploading}
                          placeholder='Select date and time'
                          variant='borderless'
                          className='w-full'
                        />
                      </FieldRow>
                    </div>

                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center gap-2'>
                        <RiPriceTag3Line className='size-5 text-text-sub-500' aria-hidden />
                        <span className='label-small text-text-sub-500'>Tags</span>
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

                    <div className='flex flex-col gap-2'>
                      <Label.Root className='flex items-center gap-2'>
                        <RiPhoneLine className='size-5 text-text-sub-500' aria-hidden />
                        <span className='label-small text-text-sub-500'>Call Recording</span>
                      </Label.Root>
                      {attachments.length > 0 ? (
                        <div className='space-y-3'>
                          {attachments.map((attachment) => (
                            <KnowledgeCenterCallRecordingFileCard
                              key={attachment.id}
                              attachment={attachment}
                              disabled={isUploading}
                              onDownload={handleAttachmentDownload}
                              onRemove={handleRemoveAttachment}
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
                            disabled={isUploading}
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
                          void handleFileUpload(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      {uploadError ? (
                        <p className='text-paragraph-xs text-error-base'>{uploadError}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className='min-w-0 flex-1 overflow-y-auto bg-bg-weak-50'>
                  <CallRecordingTranscript messages={transcriptMessages} />
                </div>
              </div>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title='Remove call recording?'
        description='This call recording will be permanently deleted.'
        confirmLabel='Remove'
        loadingLabel='Removing...'
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
