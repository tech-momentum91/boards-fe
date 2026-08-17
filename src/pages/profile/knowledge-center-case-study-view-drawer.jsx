import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAttachment2,
  RiBuildingLine,
  RiChatQuoteLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFocus3Line,
  RiGroupLine,
  RiHome8Line,
  RiLightbulbLine,
  RiPriceTag3Line,
  RiSettings3Line,
  RiShieldCheckLine,
  RiStickyNoteLine,
  RiUploadCloud2Line,
  RiUploadLine,
  RiUserLine,
} from 'react-icons/ri';

import { getIndustryTypeList } from '@/api/crmAccounts';
import {
  deleteKnowledgeCenterCaseStudy,
  uploadKnowledgeCenterCaseStudyFiles,
} from '@/api/knowledgeCenterCaseStudy';
import { getSpaceTypeBadge } from '@/components/space-management/constants';
import * as Badge from '@/components/ui/badge';
import AttachmentList from '@/components/ui/attachment-list';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import KnowledgeCenterCaseStudyViewDrawerSkeleton from '@/pages/profile/knowledge-center-case-study-view-drawer-skeleton';
import {
  NARRATIVE_SECTIONS,
  SPACE_TYPE_FORM_OPTIONS,
} from '@/pages/profile/knowledge-center-case-studies-constants';
import {
  clearKnowledgeCenterCaseStudyDetail,
  fetchKnowledgeCenterCaseStudyDetail,
  selectKnowledgeCenterCaseStudyDetail,
  updateKnowledgeCenterCaseStudy,
} from '@/redux/knowledgeCenterCaseStudySlice';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import apiClient from '@/api/axios';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const NARRATIVE_ICONS = {
  shield: RiShieldCheckLine,
  lightbulb: RiLightbulbLine,
  focus: RiFocus3Line,
  quote: RiChatQuoteLine,
};

const getFieldValue = (detail, localChanges, fieldName) => {
  if (localChanges[fieldName] !== undefined) return localChanges[fieldName];
  return detail?.[fieldName] ?? '';
};

const mapAttachments = (detail) => {
  const source = detail?.attachments ?? [];
  if (!Array.isArray(source)) return [];
  return source.map((att, index) => ({
    id: att.name || `att-${index}`,
    fileName: att.file_name,
    fileUrl: att.file_url,
    size: att.file_size,
    createdAt: att.creation,
    childRowId: att.name,
  }));
};

/** Figma right-panel narrative card — display text until click, then textarea; save on blur. */
function InlineEditableNarrativeSection({
  sectionKey,
  title,
  emptyLabel,
  icon: Icon,
  value,
  isEditing,
  draft,
  onDraftChange,
  onStartEdit,
  onCommit,
  textareaRef,
}) {
  const displayValue = String(value ?? '').trim();
  const isEmpty = !displayValue;

  return (
    <div className='w-full shrink-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] shadow-regular-xs'>
      <div className='flex w-full items-center gap-2 border-b border-stroke-soft-200 px-4 py-2'>
        <Icon className='size-5 shrink-0 text-text-sub-500' aria-hidden />
        <span className='label-medium text-text-main-900'>{title}</span>
      </div>
      <div className='w-full px-4 py-3'>
        {isEditing ? (
          <Textarea.Root
            ref={textareaRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={() => onCommit(sectionKey)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onCommit(sectionKey, true);
              }
            }}
            rows={4}
            simple
            className='p-0 rounded-md'
            // className='field-sizing-content min-h-[72px] w-full border-0 bg-transparent p-0 text-paragraph-md font-medium text-text-sub-500 shadow-none focus-visible:ring-0'
          />
        ) : (
          <button
            type='button'
            onClick={() => onStartEdit(sectionKey, value)}
            className='w-full cursor-text text-left text-paragraph-md font-medium tracking-[-0.176px] text-text-sub-500 hover:text-text-main-900'
          >
            {isEmpty ? (
              <span className='text-text-soft-400'>{emptyLabel}</span>
            ) : (
              <span className='whitespace-pre-wrap wrap-break-word'>{displayValue}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeCenterCaseStudyViewDrawer({
  open,
  caseStudyId,
  orderedIds = [],
  onOpenChange,
  onNavigate,
  onDeleted,
  onUpdated,
}) {
  const dispatch = useDispatch();
  const { data: detail, status: detailStatus } = useSelector(selectKnowledgeCenterCaseStudyDetail);

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
  const [industryOptions, setIndustryOptions] = useState([]);

  const tagInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const narrativeTextareaRef = useRef(null);
  const lastFetchedIdRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());

  const [editingNarrativeKey, setEditingNarrativeKey] = useState(null);
  const [narrativeDraft, setNarrativeDraft] = useState('');
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const descriptionTextareaRef = useRef(null);

  const currentIndex = useMemo(() => orderedIds.indexOf(caseStudyId), [orderedIds, caseStudyId]);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderedIds.length - 1;

  const isDataReady = detailStatus === 'succeeded' && detail?.name === caseStudyId;
  const isInitialLoading = useMemo(
    () => open && caseStudyId && !hasLoadedInitialData && !isDataReady,
    [open, caseStudyId, hasLoadedInitialData, isDataReady],
  );

  useEffect(() => {
    if (isDataReady) setHasLoadedInitialData(true);
  }, [isDataReady]);

  useEffect(() => {
    if (!open) {
      setHasLoadedInitialData(false);
      return;
    }
    if (lastFetchedIdRef.current !== caseStudyId) {
      setHasLoadedInitialData(false);
    }
  }, [open, caseStudyId]);

  useEffect(() => {
    if (!open || !caseStudyId) {
      lastFetchedIdRef.current = null;
      return;
    }
    if (lastFetchedIdRef.current !== caseStudyId) {
      lastFetchedIdRef.current = caseStudyId;
      dispatch(fetchKnowledgeCenterCaseStudyDetail(caseStudyId));
    }
  }, [open, caseStudyId, dispatch]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setIsDrawerFullyOpen(true), 300);
      return () => clearTimeout(t);
    }
    setIsDrawerFullyOpen(false);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) {
      dispatch(clearKnowledgeCenterCaseStudyDetail());
      setLocalChanges({});
      setUploadError('');
      setTagInputVisible(false);
      setNewTagValue('');
      setEditingNarrativeKey(null);
      setIsDescriptionEditing(false);
      return;
    }
    if (caseStudyId && lastFetchedIdRef.current !== caseStudyId) {
      setLocalChanges({});
      setUploadError('');
      setTagInputVisible(false);
      setNewTagValue('');
      setEditingNarrativeKey(null);
      setIsDescriptionEditing(false);
    }
  }, [open, caseStudyId, dispatch]);

  useEffect(() => {
    if (open) {
      dispatch(fetchTicketDropdownData());
    }
  }, [dispatch, open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    getIndustryTypeList({ grouped: true, scope: 'crm' })
      .then((indOptions) => {
        if (cancelled) return;
        setIndustryOptions(
          Array.isArray(indOptions?.industry_name) ? indOptions.industry_name : [],
        );
      })
      .catch(() => {
        if (!cancelled) setIndustryOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const clientId = getFieldValue(detail, localChanges, 'client');

  useEffect(() => {
    if (open) dispatch(fetchCentersForClient(clientId || null));
  }, [dispatch, open, clientId]);

  const clientOptions = useMemo(() => {
    const rows = ticketDropdown?.data?.clients ?? ticketDropdown?.data?.customers ?? [];
    return rows.map((c) => ({
      value: c.value ?? c.name,
      label: c.label ?? c.customer_name ?? c.name,
    }));
  }, [ticketDropdown?.data]);

  const centerOptions = useMemo(() => {
    const rows = centersState?.data ?? [];
    return rows.map((c) => ({
      value: c.value ?? c.name ?? c.center_name,
      label: c.label ?? c.center_name ?? c.name,
    }));
  }, [centersState?.data]);

  const tags = useMemo(() => {
    const fromDetail = detail?.tags;
    if (Array.isArray(fromDetail)) return fromDetail;
    return [];
  }, [detail?.tags]);

  const caseStudyTitle = useMemo(
    () => String(getFieldValue(detail, localChanges, 'case_study_name') ?? ''),
    [detail, localChanges],
  );

  const attachments = useMemo(() => mapAttachments(detail), [detail]);

  const persistUpdate = useCallback(
    (payload) => {
      if (!caseStudyId) return Promise.resolve();
      saveQueueRef.current = saveQueueRef.current
        .catch(() => {})
        .then(() =>
          dispatch(updateKnowledgeCenterCaseStudy({ name: caseStudyId, payload })).unwrap(),
        )
        .then((updated) => {
          onUpdated?.();
          return updated;
        })
        .catch((error) => {
          showErrorToast(error, { defaultMessage: 'Could not save changes.' });
        });
      return saveQueueRef.current;
    },
    [caseStudyId, dispatch, onUpdated],
  );

  const handleFieldChange = useCallback(
    (fieldName, value, apiFieldName = fieldName) => {
      setLocalChanges((prev) => ({ ...prev, [fieldName]: value }));
      persistUpdate({ [apiFieldName]: value });
    },
    [persistUpdate],
  );

  const handleTextFieldChange = useCallback((fieldName, value) => {
    setLocalChanges((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleTextFieldBlur = useCallback(
    (fieldName, apiFieldName = fieldName, explicitValue) => {
      const raw =
        explicitValue !== undefined
          ? explicitValue
          : getFieldValue(detail, localChanges, fieldName);
      const value = typeof raw === 'string' ? raw.trim() : raw;
      setLocalChanges((prev) => ({ ...prev, [fieldName]: value }));
      persistUpdate({ [apiFieldName]: value });
    },
    [detail, localChanges, persistUpdate],
  );

  const startEditingNarrative = useCallback((key, currentValue) => {
    setEditingNarrativeKey(key);
    setNarrativeDraft(String(currentValue ?? ''));
  }, []);

  const commitNarrativeEdit = useCallback(
    (key, cancelled = false) => {
      if (editingNarrativeKey !== key) return;
      const trimmed = cancelled
        ? String(getFieldValue(detail, localChanges, key) ?? '').trim()
        : narrativeDraft.trim();
      setEditingNarrativeKey(null);
      handleTextFieldBlur(key, key, trimmed);
    },
    [detail, localChanges, editingNarrativeKey, narrativeDraft, handleTextFieldBlur],
  );

  useEffect(() => {
    if (editingNarrativeKey) {
      window.requestAnimationFrame(() => narrativeTextareaRef.current?.focus());
    }
  }, [editingNarrativeKey]);

  const startEditingDescription = useCallback(() => {
    setIsDescriptionEditing(true);
    setDescriptionDraft(String(getFieldValue(detail, localChanges, 'description') ?? ''));
  }, [detail, localChanges]);

  const commitDescriptionEdit = useCallback(
    (cancelled = false) => {
      const trimmed = cancelled
        ? String(getFieldValue(detail, localChanges, 'description') ?? '').trim()
        : descriptionDraft.trim();
      setIsDescriptionEditing(false);
      handleTextFieldBlur('description', 'description', trimmed);
    },
    [descriptionDraft, detail, localChanges, handleTextFieldBlur],
  );

  useEffect(() => {
    if (isDescriptionEditing) {
      window.requestAnimationFrame(() => descriptionTextareaRef.current?.focus());
    }
  }, [isDescriptionEditing]);

  const handleTagsUpdate = useCallback(
    (nextTags) => {
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
      if (!caseStudyId || !fileList?.length) return;

      const fileArray = [...fileList];
      setIsUploading(true);
      setUploadError('');

      const validFiles = [];
      const invalidFiles = [];

      fileArray.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        const errorMessage = `The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`;
        setUploadError(errorMessage);
        showErrorToast(errorMessage);
        setIsUploading(false);
        return;
      }

      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }

      try {
        await uploadKnowledgeCenterCaseStudyFiles(caseStudyId, validFiles);
        await dispatch(fetchKnowledgeCenterCaseStudyDetail(caseStudyId)).unwrap();
        onUpdated?.();
        showSuccessToast('Attachment uploaded.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        setUploadError(error?.message || 'Upload failed.');
        showErrorToast(error, { defaultMessage: 'Could not upload file.' });
      } finally {
        setIsUploading(false);
      }
    },
    [caseStudyId, dispatch, onUpdated],
  );

  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      handleFileUpload(e.target.files);
      e.target.value = '';
    },
    [handleFileUpload],
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
      if (e.dataTransfer.files?.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  const handleAttachmentDownload = useCallback((attachment) => {
    if (!attachment?.fileUrl) return;
    const link = document.createElement('a');
    link.href = attachment.fileUrl;
    link.download = attachment.fileName || 'attachment';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDeleteAttachment = useCallback(
    async (attachmentId, childRowId) => {
      const fileId = childRowId || attachmentId;
      if (!fileId) return;
      try {
        await apiClient.post('/method/frappe.client.delete', {
          doctype: 'File',
          name: fileId,
        });
        await dispatch(fetchKnowledgeCenterCaseStudyDetail(caseStudyId)).unwrap();
        onUpdated?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not remove attachment.' });
      }
    },
    [caseStudyId, dispatch, onUpdated],
  );

  const handleDelete = useCallback(async () => {
    if (!caseStudyId) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteKnowledgeCenterCaseStudy(caseStudyId)).unwrap();
      showSuccessToast('Case study deleted.');
      setDeleteModalOpen(false);
      onDeleted?.();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not delete case study.' });
    } finally {
      setIsDeleting(false);
    }
  }, [caseStudyId, dispatch, onDeleted]);

  const handleNavigatePrevious = useCallback(() => {
    if (!hasPrevious) return;
    onNavigate?.(orderedIds[currentIndex - 1]);
  }, [currentIndex, hasPrevious, onNavigate, orderedIds]);

  const handleNavigateNext = useCallback(() => {
    if (!hasNext) return;
    onNavigate?.(orderedIds[currentIndex + 1]);
  }, [currentIndex, hasNext, onNavigate, orderedIds]);

  const handleRequestClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  if (!open) return null;

  const spaceTypeValue = getFieldValue(detail, localChanges, 'space_type');
  const spaceTypeBadge = getSpaceTypeBadge(spaceTypeValue);
  const showSkeleton = isInitialLoading || !isDrawerFullyOpen;

  return (
    <>
      <Drawer.Root
        open={open}
        onOpenChange={(next) => {
          if (next === false) handleRequestClose();
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
                      aria-label='Previous case study'
                    >
                      <ButtonGroup.Icon as={RiArrowLeftSLine} />
                    </ButtonGroup.Item>
                    <ButtonGroup.Item
                      onClick={handleNavigateNext}
                      disabled={!hasNext}
                      aria-label='Next case study'
                    >
                      <ButtonGroup.Icon as={RiArrowRightSLine} />
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>
                  <div className='flex items-center gap-2'>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={() => setDeleteModalOpen(true)}
                      className='gap-1'
                    >
                      <Button.Icon as={RiDeleteBinLine} />
                      Remove
                    </Button.Root>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={handleRequestClose}
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
              <KnowledgeCenterCaseStudyViewDrawerSkeleton />
            ) : (
              <div className='flex h-full'>
                <div
                  className='relative w-[420px] overflow-y-auto border-r border-stroke-soft-200'
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
                            Drop files here
                          </p>
                          <p className='text-paragraph-sm text-text-sub-600'>
                            All file types, up to 10 MB per file
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className='flex flex-col gap-6 px-6 pb-6 pt-5'>
                    <div className='flex flex-col gap-1'>
                      <Textarea.Root
                        key={`${caseStudyId || 'title'}-${caseStudyTitle}`}
                        variant='borderless'
                        simple
                        defaultValue={caseStudyTitle}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          handleTextFieldBlur('case_study_name', 'case_study_name', value);
                        }}
                        rows={1}
                        placeholder='Case study title'
                        className='field-sizing-content p-1 text-title-h5 text-text-main-900'
                      />
                    </div>

                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center gap-2'>
                        <RiStickyNoteLine className='size-5 text-text-sub-500' aria-hidden />
                        <span className='label-small text-text-sub-500'>Description</span>
                      </div>
                      {isDescriptionEditing ? (
                        <Textarea.Root
                          ref={descriptionTextareaRef}
                          value={descriptionDraft}
                          onChange={(e) => setDescriptionDraft(e.target.value)}
                          onBlur={() => commitDescriptionEdit()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              commitDescriptionEdit(true);
                            }
                          }}
                          rows={3}
                          variant='borderless'
                          simple
                          placeholder='Add description'
                          className='field-sizing-content min-h-[80px] w-full'
                        />
                      ) : (
                        <button
                          type='button'
                          onClick={startEditingDescription}
                          className='w-full cursor-text rounded-lg border border-transparent px-2 py-1.5 text-left text-paragraph-sm text-text-sub-500 hover:border-stroke-sub-300'
                        >
                          {String(
                            getFieldValue(detail, localChanges, 'description') ?? '',
                          ).trim() ? (
                            <span className='whitespace-pre-wrap wrap-break-word'>
                              {getFieldValue(detail, localChanges, 'description')}
                            </span>
                          ) : (
                            <span className='text-text-soft-400'>Add description</span>
                          )}
                        </button>
                      )}
                    </div>

                    <div className='divide-y divide-stroke-soft-200 overflow-hidden rounded-xl border border-stroke-soft-200 bg-white'>
                      <FieldRow icon={RiUserLine} label='Client' editable>
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
                            handleFieldChange('client', v === '__none__' ? '' : v, 'client')
                          }
                          options={clientOptions}
                          placeholder='Select'
                          searchPlaceholder='Search clients...'
                          emptyMessage='No clients available'
                          noResultsMessage='No clients found'
                          triggerClassName='w-full min-w-0'
                        />
                      </FieldRow>
                      <FieldRow icon={RiBuildingLine} label='Center' editable>
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
                            handleFieldChange('center', v === '__none__' ? '' : v, 'center')
                          }
                          options={centerOptions}
                          disabled={centersState.status === 'loading'}
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
                      <FieldRow icon={RiHome8Line} label='Space type' editable>
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          contentClassName='z-[600]'
                          value={spaceTypeValue || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) =>
                            handleFieldChange('space_type', v === '__none__' ? '' : v, 'space_type')
                          }
                          options={SPACE_TYPE_FORM_OPTIONS}
                          placeholder='Select'
                          searchPlaceholder='Search space types...'
                          emptyMessage='No space types available'
                          noResultsMessage='No space types found'
                          triggerClassName='w-full min-w-0'
                          renderTrigger={() =>
                            spaceTypeValue ? (
                              <Badge.Root
                                size='medium'
                                variant='light'
                                color={spaceTypeBadge.color}
                              >
                                {spaceTypeBadge.label}
                              </Badge.Root>
                            ) : (
                              <span className='text-paragraph-sm text-text-soft-400'>Select</span>
                            )
                          }
                        />
                      </FieldRow>
                      <FieldRow icon={RiSettings3Line} label='Industry' editable>
                        <SearchableSelect
                          variant='borderless'
                          size='xsmall'
                          matchTriggerWidth={false}
                          showArrow={false}
                          isolateSearchKeyboard
                          contentClassName='z-[600]'
                          value={getFieldValue(detail, localChanges, 'industry') || ''}
                          valueSentinel='__none__'
                          onValueChange={(v) =>
                            handleFieldChange('industry', v === '__none__' ? '' : v, 'industry')
                          }
                          options={industryOptions}
                          placeholder='Select'
                          searchPlaceholder='Search industry...'
                          emptyMessage='No industries available'
                          noResultsMessage='No industries found'
                          triggerClassName='w-full min-w-0'
                        />
                      </FieldRow>
                      <FieldRow icon={RiGroupLine} label='No. of Seats' editable>
                        <Input.Root variant='borderless' size='xsmall' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              min={0}
                              value={getFieldValue(detail, localChanges, 'no_of_seats')}
                              onChange={(e) =>
                                handleTextFieldChange(
                                  'no_of_seats',
                                  e.target.value === '' ? 0 : Number(e.target.value),
                                )
                              }
                              onBlur={() => {
                                const raw = getFieldValue(detail, localChanges, 'no_of_seats');
                                handleFieldChange(
                                  'no_of_seats',
                                  raw === '' ? 0 : Number(raw),
                                  'no_of_seats',
                                );
                              }}
                              placeholder='0'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                    </div>

                    <div className='flex flex-col gap-3'>
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

                    <div className='flex flex-col gap-2 pb-6'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <RiAttachment2 className='size-5 text-text-sub-500' aria-hidden />
                          <span className='label-small text-text-sub-500'>Attachments</span>
                        </div>
                        <>
                          <input
                            ref={fileInputRef}
                            type='file'
                            multiple
                            className='hidden'
                            onChange={handleFileInputChange}
                            accept='*/*'
                            disabled={isUploading}
                          />
                          <Button.Root
                            type='button'
                            variant='neutral'
                            mode='stroke'
                            size='xsmall'
                            className='gap-1'
                            onClick={handleUploadButtonClick}
                            disabled={isUploading}
                          >
                            <Button.Icon
                              as={isUploading ? RiUploadCloud2Line : RiUploadLine}
                              className={isUploading ? 'animate-pulse p-0.5' : 'p-0.5'}
                            />
                            <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
                          </Button.Root>
                        </>
                      </div>
                      {uploadError ? (
                        <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                          <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
                        </div>
                      ) : null}
                      {attachments.length > 0 ? (
                        <AttachmentList
                          attachments={attachments}
                          onDownload={handleAttachmentDownload}
                          onRemove={(attachmentId, childRowId) =>
                            handleDeleteAttachment(attachmentId, childRowId)
                          }
                          disabled={isUploading}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className='min-w-0 flex-1 overflow-y-auto p-6'>
                  <div className='flex w-full flex-col gap-5'>
                    {NARRATIVE_SECTIONS.map((section) => {
                      const Icon = NARRATIVE_ICONS[section.icon] ?? RiShieldCheckLine;
                      const value = getFieldValue(detail, localChanges, section.key);
                      return (
                        <InlineEditableNarrativeSection
                          key={section.key}
                          sectionKey={section.key}
                          title={section.filledLabel}
                          emptyLabel={section.label}
                          icon={Icon}
                          value={value}
                          isEditing={editingNarrativeKey === section.key}
                          draft={narrativeDraft}
                          onDraftChange={setNarrativeDraft}
                          onStartEdit={startEditingNarrative}
                          onCommit={commitNarrativeEdit}
                          textareaRef={
                            editingNarrativeKey === section.key ? narrativeTextareaRef : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title='Remove case study?'
        description='This case study will be permanently deleted.'
        confirmLabel='Remove'
        loadingLabel='Removing...'
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
