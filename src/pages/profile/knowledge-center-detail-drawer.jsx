import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAttachment2,
  RiBuildingLine,
  RiChat3Line,
  RiCloseLine,
  RiDeleteBinLine,
  RiFileLine,
  RiFocus3Line,
  RiLightbulbFlashLine,
  RiMapPinLine,
  RiMicLine,
  RiStickyNoteLine,
  RiTimeLine,
  RiUploadCloud2Line,
  RiUploadLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import AttachmentList from '@/components/ui/attachment-list';
import EmptyIllustration from '@/components/ui/empty-illustration';
import FieldRow from '@/components/ui/field-row';
import DotBadge from '@/components/ui/dot-badge';
import * as Tooltip from '@/components/ui/tooltip';
import { KnowledgeCenterCityPopover } from '@/components/ui/knowledge-center-city-popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { QA_CATEGORY_ITEMS } from '@/pages/profile/knowledge-center-qa-constants';
import { knowledgeCenterQaDetailPath } from '@/pages/profile/knowledge-center-paths';
import {
  clearKnowledgeCenterQaDetail,
  createKnowledgeCenterQa,
  deleteKnowledgeCenterQa,
  fetchKnowledgeCenterQaDetail,
  fetchKnowledgeCenterQaList,
  selectKnowledgeCenterQaDetail,
  updateKnowledgeCenterQa,
} from '@/redux/knowledgeCenterQaSlice';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import KnowledgeCenterVoiceAnswerModal from '@/pages/profile/knowledge-center-voice-answer-modal';
import { showErrorToast } from '@/utils/error-utils';

const QUESTION_TYPE_OPTIONS = QA_CATEGORY_ITEMS.filter((item) => item.value !== 'all').map(
  (item) => ({
    value: item.value,
    label: item.label,
  }),
);
const QUESTION_TYPE_DEFAULT_VALUE = QUESTION_TYPE_OPTIONS[0]?.value ?? '';
const QUESTION_TYPE_LABEL_BY_VALUE = QUESTION_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, /** @type {Record<string, string>} */ ({}));
const QUESTION_TYPE_VALUE_BY_LABEL = QUESTION_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.label] = item.value;
  return acc;
}, /** @type {Record<string, string>} */ ({}));

const normalizeQuestionTypeValue = (raw) => {
  const normalized = String(raw ?? '').trim();
  if (!normalized) return QUESTION_TYPE_DEFAULT_VALUE;
  if (QUESTION_TYPE_LABEL_BY_VALUE[normalized]) return normalized;
  if (QUESTION_TYPE_VALUE_BY_LABEL[normalized]) return QUESTION_TYPE_VALUE_BY_LABEL[normalized];
  return QUESTION_TYPE_DEFAULT_VALUE;
};

const EMPTY_TEXT_BY_VARIANT = {
  empty: 'There are no AI extracted context here yet.',
  extracting: 'Extracting...',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function buildApiPayload(values) {
  return {
    question_type: values.questionType,
    question: values.question ?? '',
    answer: values.answer ?? '',
    client: values.client ?? '',
    center: values.center ?? '',
    city: values.city ?? '',
    is_active: 1,
  };
}

/** Compare editable fields so blur/save does not call the API when nothing changed vs server. */
function isKnowledgeCenterPayloadChanged(payload, record) {
  if (!record || typeof record !== 'object') return true;
  const p = {
    question_type: normalizeQuestionTypeValue(payload.question_type),
    question: String(payload.question ?? '').trim(),
    answer: String(payload.answer ?? '').trim(),
    client: String(payload.client ?? '').trim(),
    center: String(payload.center ?? '').trim(),
    city: String(payload.city ?? '').trim(),
    is_active: Number(payload.is_active) === 1 ? 1 : 0,
  };
  const s = {
    question_type: normalizeQuestionTypeValue(record.question_type),
    question: String(record.question ?? '').trim(),
    answer: String(record.answer ?? '').trim(),
    client: String(record.client ?? '').trim(),
    center: String(record.center ?? '').trim(),
    city: String(record.city ?? '').trim(),
    is_active: Number(record.is_active) === 1 ? 1 : 0,
  };
  return (
    p.question_type !== s.question_type ||
    p.question !== s.question ||
    p.answer !== s.answer ||
    p.client !== s.client ||
    p.center !== s.center ||
    p.city !== s.city ||
    p.is_active !== s.is_active
  );
}

/** `ai_insights_json` from the API may be a parsed object or a JSON string. */
function normalizeAiInsightsJson(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

const KnowledgeCenterDetailDrawer = ({ open, onOpenChange, qaId, panelVariant = 'generated' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const savingRef = useRef(false);
  /** Avoid re-running `reset()` when `detail.record` updates after save — that re-triggers Select `onValueChange` → persist loop. */
  const formHydratedForDocRef = useRef(null);

  const detailState = useSelector(selectKnowledgeCenterQaDetail);

  const isNewRoute = qaId === 'new';
  const fileInputRef = useRef(null);
  const answerTextareaRef = useRef(null);
  const [showAnswerTextarea, setShowAnswerTextarea] = useState(false);
  const [voiceAnswerModalOpen, setVoiceAnswerModalOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const defaultValues = useMemo(
    () => ({
      questionType: QUESTION_TYPE_DEFAULT_VALUE,
      question: '',
      client: '',
      center: '',
      city: '',
      answer: '',
    }),
    [],
  );

  const { control, reset, watch, setValue, getValues } = useForm({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const getValuesRef = useRef(getValues);
  getValuesRef.current = getValues;

  const watchedAnswer = watch('answer');
  const watchedClient = watch('client');

  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);

  const clientSelectOptions = useMemo(() => {
    const raw = ticketDropdown.data?.clients || ticketDropdown.data?.customers || [];
    return Array.isArray(raw) ? raw : [];
  }, [ticketDropdown.data]);

  const centerSelectOptions = useMemo(
    () => (Array.isArray(centersState.data) ? centersState.data : []),
    [centersState.data],
  );

  useEffect(() => {
    if (!open) return;
    dispatch(fetchTicketDropdownData());
  }, [dispatch, open]);

  useEffect(() => {
    if (!open) return;
    dispatch(fetchCentersForClient(watchedClient ? watchedClient : null));
  }, [dispatch, open, watchedClient]);

  useEffect(() => {
    formHydratedForDocRef.current = null;
  }, [qaId]);

  useEffect(() => {
    if (!open) {
      formHydratedForDocRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isNewRoute) {
      reset(defaultValues);
      setShowAnswerTextarea(false);
      setAttachments([]);
      setUploadError('');
      dispatch(clearKnowledgeCenterQaDetail());
      return;
    }
    if (qaId && !isNewRoute) {
      dispatch(fetchKnowledgeCenterQaDetail(qaId));
    }
  }, [defaultValues, dispatch, isNewRoute, open, qaId, reset]);

  useEffect(() => {
    if (!open || isNewRoute) return;
    if (detailState.status !== 'succeeded') return;
    const rec = detailState.record;
    if (!rec?.name || rec.name !== qaId) return;
    if (formHydratedForDocRef.current === qaId) return;

    formHydratedForDocRef.current = qaId;
    reset({
      questionType: normalizeQuestionTypeValue(rec.question_type),
      question: rec.question || '',
      answer: rec.answer || '',
      client: rec.client || '',
      center: rec.center || '',
      city: rec.city || '',
    });
    setShowAnswerTextarea(Boolean(String(rec.answer || '').trim()));
    setAttachments([]);
    setUploadError('');
  }, [detailState.record, detailState.status, isNewRoute, open, qaId, reset]);

  useEffect(() => {
    if (!detailState.error) return;
    showErrorToast(detailState.error);
  }, [detailState.error]);

  const handleFileInputChange = (event) => {
    const fileList = event.target.files;
    if (!fileList?.length) return;

    setIsUploading(true);
    setUploadError('');

    const invalidFiles = [];
    const validFiles = [];

    [...fileList].forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          size: file.size,
          createdAt: new Date().toISOString(),
          extension: file.name.split('.').pop()?.toUpperCase() || 'FILE',
          isImage: file.type?.startsWith('image/'),
          file,
        });
      }
    });

    if (invalidFiles.length > 0) {
      setUploadError(`The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }

    event.target.value = '';
    setIsUploading(false);
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentDownload = useCallback((attachment) => {
    if (!attachment?.fileUrl) return;
    const link = document.createElement('a');
    link.href = attachment.fileUrl;
    link.download = attachment.fileName || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleRemoveAttachment = (attachmentId) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const refreshList = useCallback(() => {
    dispatch(
      fetchKnowledgeCenterQaList({
        limit_start: 0,
        limit_page_length: 200,
        order_by: 'modified desc',
      }),
    );
  }, [dispatch]);

  const persistRecordFields = useCallback(async () => {
    if (!qaId || qaId === 'new' || savingRef.current) return;
    const record = detailState.record;
    if (!record || record.name !== qaId) return;

    const payload = buildApiPayload(getValues());
    if (!isKnowledgeCenterPayloadChanged(payload, record)) return;

    savingRef.current = true;
    try {
      await dispatch(updateKnowledgeCenterQa({ name: qaId, ...payload })).unwrap();
      refreshList();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not save changes.' });
    } finally {
      // eslint-disable-next-line require-atomic-updates -- synchronous ref unlock after await
      savingRef.current = false;
    }
  }, [detailState.record, dispatch, getValues, qaId, refreshList]);

  const canRecordAnswerVoice = useMemo(
    () =>
      typeof window !== 'undefined' &&
      'MediaRecorder' in window &&
      Boolean(navigator?.mediaDevices?.getUserMedia),
    [],
  );

  const handleVoiceAnswerDone = useCallback(
    ({ transcript }) => {
      const t = String(transcript ?? '').trim();
      if (!t) return;
      const prev = String(getValuesRef.current()?.answer ?? '').trimEnd();
      const merged = prev ? `${prev} ${t}`.trim() : t;
      setValue('answer', merged, { shouldDirty: true, shouldTouch: true });
      window.requestAnimationFrame(() => {
        const el = answerTextareaRef.current;
        if (el && typeof el.setSelectionRange === 'function') {
          const len = el.value.length;
          el.focus();
          el.setSelectionRange(len, len);
        }
      });
      if (qaId && qaId !== 'new') {
        window.setTimeout(() => void persistRecordFields(), 0);
      }
    },
    [persistRecordFields, qaId, setValue],
  );

  const handleOpenVoiceAnswerModal = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!canRecordAnswerVoice) {
        showErrorToast(
          new Error(
            'Voice recording is not supported in this browser or microphone is unavailable.',
          ),
        );
        return;
      }
      setShowAnswerTextarea(true);
      setVoiceAnswerModalOpen(true);
    },
    [canRecordAnswerVoice],
  );

  useEffect(() => {
    if (!open) {
      setVoiceAnswerModalOpen(false);
    }
  }, [open]);

  const handleQuestionBlur = useCallback(async () => {
    if (savingRef.current) return;
    const values = getValues();
    const q = (values.question || '').trim();

    if (isNewRoute) {
      if (!q) return;
      savingRef.current = true;
      try {
        const payload = buildApiPayload(values);
        const created = await dispatch(createKnowledgeCenterQa(payload)).unwrap();
        if (created?.name) {
          refreshList();
          navigate(knowledgeCenterQaDetailPath(created.name), {
            replace: true,
          });
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not create Q&A.' });
      } finally {
        // eslint-disable-next-line require-atomic-updates -- synchronous ref unlock after await
        savingRef.current = false;
      }
      return;
    }

    if (!qaId) return;

    const payload = buildApiPayload(values);
    const record = detailState.record;
    if (record?.name === qaId && !isKnowledgeCenterPayloadChanged(payload, record)) return;

    savingRef.current = true;
    try {
      await dispatch(updateKnowledgeCenterQa({ name: qaId, ...payload })).unwrap();
      refreshList();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not update Q&A.' });
    } finally {
      // eslint-disable-next-line require-atomic-updates -- synchronous ref unlock after await
      savingRef.current = false;
    }
  }, [detailState.record, dispatch, getValues, isNewRoute, navigate, qaId, refreshList]);

  const handleRemoveDoc = useCallback(async () => {
    if (!qaId || qaId === 'new') {
      onOpenChange(false);
      return;
    }
    try {
      await dispatch(deleteKnowledgeCenterQa(qaId)).unwrap();
      refreshList();
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not delete Q&A.' });
    }
  }, [dispatch, onOpenChange, qaId, refreshList]);

  /** Skeleton / disable chrome only when loading a doc we do not have yet (or wrong doc still showing). Not during polling or silent refetch. */
  const isInitialDetailLoading =
    detailState.status === 'loading' &&
    !isNewRoute &&
    Boolean(qaId) &&
    (!detailState.record || detailState.record.name !== qaId);

  const isBusy = isInitialDetailLoading;

  const expandedAnswerVoiceMic = useMemo(
    () => (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='absolute bottom-2 right-2'
            onClick={handleOpenVoiceAnswerModal}
            disabled={isBusy || !canRecordAnswerVoice}
          >
            <Button.Icon as={RiMicLine} className='text-text-strong-950' />
          </Button.Root>
        </Tooltip.Trigger>
        <Tooltip.Content size='xsmall'>
          {canRecordAnswerVoice ? 'Answer via voice note' : 'Voice recording not supported here'}
        </Tooltip.Content>
      </Tooltip.Root>
    ),
    [canRecordAnswerVoice, handleOpenVoiceAnswerModal, isBusy],
  );

  const collapsedAddAnswerVoiceMic = useMemo(
    () => (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='relative'
            disabled={isBusy || !canRecordAnswerVoice}
            onClick={handleOpenVoiceAnswerModal}
          >
            <Button.Icon as={RiMicLine} />
          </Button.Root>
        </Tooltip.Trigger>
        <Tooltip.Content size='xsmall'>
          {canRecordAnswerVoice ? 'Answer via voice note' : 'Voice recording not supported here'}
        </Tooltip.Content>
      </Tooltip.Root>
    ),
    [canRecordAnswerVoice, handleOpenVoiceAnswerModal, isBusy],
  );

  const generatedPanel = useMemo(() => {
    const record = detailState.record || {};
    const insights = normalizeAiInsightsJson(record.ai_insights_json);
    const talkingPoints = Array.isArray(insights?.talking_points)
      ? [...insights.talking_points].sort(
          (a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0),
        )
      : [];
    return {
      shortAnswer: String(insights?.short_answer ?? '').trim(),
      talkingPoints,
      keyTakeaway: String(insights?.key_takeaway ?? '').trim(),
      whenToUse: String(insights?.when_to_use ?? '').trim(),
      usefulFor: String(insights?.useful_for ?? '').trim(),
    };
  }, [detailState.record]);

  const hasGeneratedPanelContent =
    Boolean(generatedPanel.shortAnswer) ||
    generatedPanel.talkingPoints.length > 0 ||
    Boolean(generatedPanel.keyTakeaway) ||
    Boolean(generatedPanel.whenToUse) ||
    Boolean(generatedPanel.usefulFor);

  const aiInsightsStatus = detailState.record?.ai_insights_status;
  const isDetailLoadingInsights = isInitialDetailLoading;
  const isGeneratingInsights = aiInsightsStatus === 'Generating';
  const isFailedInsights = aiInsightsStatus === 'Failed';

  /** Poll only while status is exactly `Generating`. Depends on stable string, not whole record, so refetches do not reset the interval. Immediate tick when entering this state. */
  useEffect(() => {
    if (!open || isNewRoute || !qaId) return undefined;
    if (aiInsightsStatus !== 'Generating') return undefined;

    const tick = () => {
      dispatch(fetchKnowledgeCenterQaDetail(qaId));
    };
    tick();
    const id = window.setInterval(tick, 3500);
    return () => window.clearInterval(id);
  }, [dispatch, open, isNewRoute, qaId, aiInsightsStatus]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[1200px]'>
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='w-full flex items-center justify-between'>
            <div className='flex items-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-xs'>
              <Button.Root variant='neutral' mode='ghost' size='xsmall'>
                <Button.Icon as={RiArrowLeftSLine} />
              </Button.Root>
              <Button.Root variant='neutral' mode='ghost' size='xsmall'>
                <Button.Icon as={RiArrowRightSLine} />
              </Button.Root>
            </div>
            <div className='flex items-center gap-3'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='flex gap-1'
                type='button'
                disabled={isBusy || qaId === 'new'}
                onClick={handleRemoveDoc}
              >
                <Button.Icon as={RiDeleteBinLine} />
                Remove
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={() => onOpenChange(false)}
              >
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 overflow-y-auto'>
          <div className='h-full flex'>
            <div className='w-[422px] border-r border-stroke-soft-200 overflow-y-auto px-6 py-5 flex flex-col'>
              {isInitialDetailLoading ? (
                <p className='paragraph-small text-text-sub-500 mb-3'>Loading Q&A…</p>
              ) : null}
              <div className='flex flex-col gap-3'>
                <div className='flex flex-col gap-1'>
                  <Controller
                    name='questionType'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (qaId && qaId !== 'new') {
                            window.setTimeout(() => persistRecordFields(), 0);
                          }
                        }}
                        disabled={isBusy}
                        size='xsmall'
                        matchTriggerWidth={false}
                      >
                        <Select.Trigger className='w-fit min-w-[140px]'>
                          <Select.Value placeholder='Question type'>
                            <div className='flex items-center gap-2'>
                              <DotBadge size={16} color='#4A5578' />
                              <span className='label-small text-text-sub-500'>
                                {QUESTION_TYPE_LABEL_BY_VALUE[field.value] || ''}
                              </span>
                            </div>
                          </Select.Value>
                        </Select.Trigger>
                        <Select.Content>
                          {QUESTION_TYPE_OPTIONS.map((typeOption) => (
                            <Select.Item key={typeOption.value} value={typeOption.value}>
                              <div className='flex items-center gap-2'>
                                <span className='label-small text-text-sub-500'>
                                  {typeOption.label}
                                </span>
                              </div>
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Controller
                    name='question'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        {...field}
                        simple
                        variant='borderless'
                        className='field-sizing-content text-title-h5 text-text-main-900 p-1'
                        disabled={isBusy}
                        placeholder='Enter question'
                        onBlur={(event) => {
                          field.onBlur(event);
                          handleQuestionBlur();
                        }}
                      />
                    )}
                  />
                </div>
              </div>

              <div className='mt-4 divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                <FieldRow icon={RiUserLine} label='Client' editable={true}>
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
                        onValueChange={(v) => {
                          field.onChange(v);
                          setValue('center', '');
                          if (qaId && qaId !== 'new') {
                            window.setTimeout(() => persistRecordFields(), 0);
                          }
                        }}
                        options={clientSelectOptions}
                        disabled={isBusy || ticketDropdown.status === 'loading'}
                        placeholder='Select client'
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

                <FieldRow icon={RiBuildingLine} label='Center' editable={true}>
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
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (qaId && qaId !== 'new') {
                            window.setTimeout(() => persistRecordFields(), 0);
                          }
                        }}
                        options={centerSelectOptions}
                        disabled={isBusy || centersState.status === 'loading'}
                        placeholder='Select center'
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

                <FieldRow icon={RiMapPinLine} label='City' editable={true}>
                  <Controller
                    name='city'
                    control={control}
                    render={({ field }) => (
                      <KnowledgeCenterCityPopover
                        value={field.value || ''}
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (qaId && qaId !== 'new') {
                            window.setTimeout(() => persistRecordFields(), 0);
                          }
                        }}
                        disabled={isBusy}
                        placeholder='Select city'
                        contentClassName='z-[600]'
                        triggerClassName='w-full min-w-0'
                      />
                    )}
                  />
                </FieldRow>
              </div>

              {showAnswerTextarea || String(watchedAnswer || '').trim() !== '' ? (
                <div className='mt-6 flex flex-col gap-2'>
                  <div className='content-stretch flex gap-[8px] items-center relative'>
                    <RiStickyNoteLine className='size-5 text-text-sub-500' />
                    <p className='label-medium text-text-sub-500'>Answer</p>
                  </div>
                  <div className='relative'>
                    <Controller
                      name='answer'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          {...field}
                          ref={(node) => {
                            field.ref(node);
                            answerTextareaRef.current = node;
                          }}
                          rows={8}
                          variant='borderless'
                          simple
                          placeholder='Type here...'
                          className='min-h-[247px] pr-10'
                          disabled={isBusy}
                          onBlur={() => {
                            field.onBlur();
                            if (qaId && qaId !== 'new') {
                              window.setTimeout(() => persistRecordFields(), 0);
                            }
                          }}
                        />
                      )}
                    />
                    {expandedAnswerVoiceMic}
                  </div>
                </div>
              ) : (
                <button
                  type='button'
                  onClick={() => setShowAnswerTextarea(true)}
                  className='w-full mt-6 relative rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 flex items-center gap-2 hover:border-stroke-sub-300'
                >
                  <RiFileLine className='size-5 text-text-soft-400' />
                  <span className='text-paragraph-md text-text-soft-400'>Add answer</span>
                  <div className='absolute right-2 top-1/2 -translate-y-1/2'>
                    {collapsedAddAnswerVoiceMic}
                  </div>
                </button>
              )}

              <div className='mt-6 flex flex-col gap-2 pb-6'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <RiAttachment2 className='size-5 text-text-sub-500' />
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
                {uploadError && (
                  <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                    <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
                  </div>
                )}
                {attachments.length > 0 && (
                  <AttachmentList
                    attachments={attachments}
                    onDownload={handleAttachmentDownload}
                    onRemove={(attachmentId) => handleRemoveAttachment(attachmentId)}
                    disabled={isUploading}
                  />
                )}
              </div>
            </div>

            <div className='flex-1 overflow-y-auto p-4'>
              {panelVariant === 'generated' ? (
                isDetailLoadingInsights ? (
                  <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-4'>
                    <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                    <p className='paragraph-small text-text-sub-500'>Loading insights…</p>
                  </div>
                ) : isGeneratingInsights ? (
                  <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-4'>
                    <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                    <p className='paragraph-small text-text-sub-500'>Generating AI insights…</p>
                  </div>
                ) : (
                  <>
                    {isFailedInsights && detailState.record?.ai_insights_error ? (
                      <div className='mb-5 rounded-xl border border-error-base bg-error-50 px-4 py-3'>
                        <p className='label-small text-error-base'>
                          AI insights could not be generated
                        </p>
                        <p className='paragraph-small mt-1 text-error-base'>
                          {detailState.record.ai_insights_error}
                        </p>
                      </div>
                    ) : null}

                    {hasGeneratedPanelContent ? (
                      <div className='flex flex-col gap-5'>
                        {generatedPanel.shortAnswer ? (
                          <div className='flex flex-col gap-4'>
                            <div className='flex items-center gap-2'>
                              <RiLightbulbFlashLine className='size-5 text-text-sub-500' />
                              <p className='label-medium text-text-main-900'>Short Answer</p>
                            </div>
                            <div className='rounded-xl border border-primary-light bg-primary-lighter p-4'>
                              <p className='paragraph-small text-text-main-900'>
                                {generatedPanel.shortAnswer}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {generatedPanel.talkingPoints.length > 0 ? (
                          <div className='flex flex-col gap-4'>
                            <div className='flex items-center gap-2'>
                              <RiChat3Line className='size-5 text-text-sub-500' />
                              <p className='label-medium text-text-main-900'>
                                Quick Talking Points
                              </p>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                              {generatedPanel.talkingPoints.map((item, idx) => (
                                <div
                                  key={`tp-${item.order ?? idx}-${idx}`}
                                  className='rounded-xl border border-stroke-soft-200 bg-bg-weak-100 p-4'
                                >
                                  {item.title ? (
                                    <p className='mb-1 label-small text-text-main-900'>
                                      {item.order != null ? `${item.order}. ` : ''}
                                      {item.title}
                                    </p>
                                  ) : null}
                                  {item.description ? (
                                    <p className='paragraph-small text-text-sub-500'>
                                      {item.description}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {generatedPanel.keyTakeaway ? (
                          <div className='flex flex-col gap-4'>
                            <div className='flex items-center gap-2'>
                              <RiLightbulbFlashLine className='size-5 text-blue-700' />
                              <p className='label-medium text-blue-900'>Key Takeaway</p>
                            </div>
                            <div className='rounded-xl border border-blue-200 bg-blue-50 p-4'>
                              <p className='paragraph-small text-text-main-900'>
                                {generatedPanel.keyTakeaway}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {generatedPanel.whenToUse || generatedPanel.usefulFor ? (
                          <div className='grid grid-cols-2 gap-4'>
                            <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-100 p-4'>
                              <div className='mb-2 flex size-8 items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-white-0'>
                                <RiTimeLine className='size-4 text-text-soft-400' />
                              </div>
                              <p className='label-medium text-text-main-900'>When to Use</p>
                              {generatedPanel.whenToUse ? (
                                <p className='paragraph-small mt-2 text-text-sub-500'>
                                  {generatedPanel.whenToUse}
                                </p>
                              ) : null}
                            </div>
                            <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-100 p-4'>
                              <div className='mb-2 flex size-8 items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-white-0'>
                                <RiFocus3Line className='size-4 text-text-soft-400' />
                              </div>
                              <p className='label-medium text-text-main-900'>Useful For</p>
                              {generatedPanel.usefulFor ? (
                                <p className='paragraph-small mt-2 text-text-sub-500'>
                                  {generatedPanel.usefulFor}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-5 px-4'>
                        <EmptyIllustration className='size-[108px]' />
                        <p className='paragraph-small text-center text-text-soft-400'>
                          {EMPTY_TEXT_BY_VARIANT.empty}
                        </p>
                      </div>
                    )}
                  </>
                )
              ) : (
                <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-5 px-4'>
                  <EmptyIllustration className='size-[108px]' />
                  <p className='paragraph-small text-center text-text-soft-400'>
                    {EMPTY_TEXT_BY_VARIANT[panelVariant] || EMPTY_TEXT_BY_VARIANT.empty}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>

      <KnowledgeCenterVoiceAnswerModal
        open={voiceAnswerModalOpen}
        onOpenChange={setVoiceAnswerModalOpen}
        onDone={handleVoiceAnswerDone}
      />
    </Drawer.Root>
  );
};

export default KnowledgeCenterDetailDrawer;
