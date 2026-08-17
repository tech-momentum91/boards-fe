import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiAttachment2,
  RiBuildingLine,
  RiChatQuoteLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFileTextLine,
  RiFocus3Line,
  RiGroupLine,
  RiHome8Line,
  RiLightbulbLine,
  RiPriceTag3Line,
  RiSettings3Line,
  RiShieldCheckLine,
  RiStickyNoteLine,
  RiSubtractLine,
  RiUploadCloud2Line,
  RiUserLine,
} from 'react-icons/ri';

import { getIndustryTypeList } from '@/api/crmAccounts';
import { uploadKnowledgeCenterCaseStudyFiles } from '@/api/knowledgeCenterCaseStudy';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Drawer from '@/components/ui/drawer';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as LinkButton from '@/components/ui/link-button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import { getSpaceTypeBadge } from '@/components/space-management/constants';
import {
  NARRATIVE_SECTIONS,
  SPACE_TYPE_FORM_OPTIONS,
} from '@/pages/profile/knowledge-center-case-studies-constants';
import {
  createKnowledgeCenterCaseStudy,
  selectKnowledgeCenterCaseStudyMutation,
} from '@/redux/knowledgeCenterCaseStudySlice';
import {
  defaultKnowledgeCenterCaseStudyValues,
  knowledgeCenterCaseStudyCreateSchema,
} from '@/schemas/knowledge-center-case-study-schema';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_INPUT_ID = 'kc-case-study-file-upload';

const NARRATIVE_ICONS = {
  shield: RiShieldCheckLine,
  lightbulb: RiLightbulbLine,
  focus: RiFocus3Line,
  quote: RiChatQuoteLine,
};

const defaultExpandedSections = () =>
  Object.fromEntries(NARRATIVE_SECTIONS.map((s) => [s.key, false]));

export default function KnowledgeCenterCaseStudyCreateDrawer({ open, onOpenChange, onSaved }) {
  const dispatch = useDispatch();
  const tagInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const { status: mutationStatus } = useSelector(selectKnowledgeCenterCaseStudyMutation);
  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);

  const [tags, setTags] = useState([]);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(defaultExpandedSections);
  const [industryOptions, setIndustryOptions] = useState([]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(knowledgeCenterCaseStudyCreateSchema),
    defaultValues: defaultKnowledgeCenterCaseStudyValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedClient = watch('client');
  const watchedDescription = watch('description');
  const watchedSpaceType = watch('spaceType');

  const isSubmitting = mutationStatus === 'loading';

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

  const spaceTypeBadge = useMemo(() => getSpaceTypeBadge(watchedSpaceType), [watchedSpaceType]);

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

  useEffect(() => {
    if (open) {
      dispatch(fetchCentersForClient(watchedClient || null));
    }
  }, [dispatch, open, watchedClient]);

  const resetDrawerState = useCallback(() => {
    reset(defaultKnowledgeCenterCaseStudyValues);
    setTags([]);
    setTagInputVisible(false);
    setNewTagValue('');
    setAttachments([]);
    setFileError(null);
    setDragActive(false);
    setIsDescriptionOpen(false);
    setExpandedSections(defaultExpandedSections());
  }, [reset]);

  const handleFileUpload = useCallback((fileList) => {
    setFileError(null);
    const incoming = [...(fileList || [])];
    const valid = [];
    const oversize = [];

    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        oversize.push(file.name);
        continue;
      }
      valid.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    if (oversize.length > 0) {
      setFileError(`The following file(s) exceed the 10 MB limit: ${oversize.join(', ')}`);
    }

    if (valid.length > 0) {
      setAttachments((prev) => [...prev, ...valid]);
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
      if (e.dataTransfer.files?.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  const removeAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = newTagValue.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) setTags((prev) => [...prev, trimmed]);
    setNewTagValue('');
    setTagInputVisible(false);
  }, [newTagValue, tags]);

  const handleRemoveTag = useCallback((tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const toggleSection = useCallback((key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const buildPayload = useCallback(
    (data) => ({
      case_study_name: data.caseStudyName.trim(),
      description: (data.description ?? '').trim(),
      challenge: (data.challenge ?? '').trim(),
      solution: (data.solution ?? '').trim(),
      outcome: (data.outcome ?? '').trim(),
      testimonial: (data.testimonial ?? '').trim(),
      client: data.client || '',
      center: data.center || '',
      space_type: data.spaceType || '',
      industry: data.industry || '',
      no_of_seats: data.noOfSeats === '' ? 0 : data.noOfSeats,
      tags,
      is_active: 1,
    }),
    [tags],
  );

  const onSubmit = useCallback(
    async (data) => {
      try {
        const record = await dispatch(createKnowledgeCenterCaseStudy(buildPayload(data))).unwrap();

        if (attachments.length > 0 && record?.name) {
          await uploadKnowledgeCenterCaseStudyFiles(
            record.name,
            attachments.map((a) => a.file),
          );
        }

        showSuccessToast('Case study created successfully.');
        resetDrawerState();
        onSaved?.(record);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not create case study.' });
      }
    },
    [attachments, buildPayload, dispatch, onSaved, resetDrawerState],
  );

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
                <p className='label-large font-semibold text-information-base'>Drop files here</p>
                <p className='text-paragraph-sm text-text-sub-600'>
                  All file types, up to 10 MB per file
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <Drawer.Header className='sticky top-0 z-10 border-b border-stroke-soft-200 bg-white'>
          <div className='flex items-start justify-between gap-4 px-6 py-5'>
            <div className='flex min-w-0 flex-1 gap-4'>
              <div className='rounded-full border border-stroke-soft-200 p-2.5'>
                <RiFileTextLine className='size-6 text-text-sub-500' aria-hidden />
              </div>
              <div className='min-w-0 flex-1'>
                <Drawer.Title className='label-medium text-text-main-900'>
                  Create Case Study
                </Drawer.Title>
                <p className='paragraph-small text-text-sub-500'>
                  Enter below details to create a case study.
                </p>
              </div>
            </div>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              type='button'
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              aria-label='Close'
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-1 flex-col overflow-hidden'>
          <Drawer.Body className='flex-1 overflow-y-auto px-6 pb-6 pt-4'>
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col gap-4'>
                <div>
                  <Controller
                    name='caseStudyName'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        {...field}
                        id='case_study_name'
                        hasError={isSubmitted && Boolean(errors.caseStudyName)}
                        placeholder='Case study title'
                        disabled={isSubmitting}
                        className='field-sizing-content text-lg'
                        simple
                      />
                    )}
                  />
                  {isSubmitted && errors.caseStudyName ? (
                    <ErrorText>{errors.caseStudyName.message}</ErrorText>
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
                          id='case_study_description'
                          rows={4}
                          placeholder='Add description'
                          disabled={isSubmitting}
                          className='min-h-[116px]'
                        />
                      )}
                    />
                  ) : (
                    <button
                      type='button'
                      onClick={() => setIsDescriptionOpen(true)}
                      disabled={isSubmitting}
                      className='flex w-full cursor-pointer items-center gap-1 rounded-10 border border-transparent px-2 py-1.5 hover:border-stroke-sub-300'
                    >
                      <RiStickyNoteLine className='size-5 text-text-soft-400' aria-hidden />
                      <span className='text-paragraph-md text-text-soft-400'>Add description</span>
                    </button>
                  )}
                </div>
              </div>

              {NARRATIVE_SECTIONS.map((section) => {
                const Icon = NARRATIVE_ICONS[section.icon] ?? RiFileTextLine;
                const expanded = expandedSections[section.key];
                return (
                  <div
                    key={section.key}
                    className='overflow-hidden rounded-lg border border-stroke-soft-200 bg-[rgba(246,248,250,0.6)]'
                  >
                    <div className='flex items-center justify-between p-2'>
                      <div className='flex items-center gap-1.5'>
                        <Icon className='size-5 text-text-sub-500' aria-hidden />
                        <span className='label-medium text-text-sub-500'>{section.label}</span>
                      </div>
                      <button
                        type='button'
                        className='p-1 text-text-soft-400'
                        onClick={() => toggleSection(section.key)}
                        aria-label={expanded ? 'Collapse section' : 'Expand section'}
                      >
                        {expanded ? (
                          <RiSubtractLine className='size-5' />
                        ) : (
                          <RiAddLine className='size-5' />
                        )}
                      </button>
                    </div>
                    {expanded ? (
                      <div className='px-2 pb-2'>
                        <Controller
                          name={section.key}
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              {...field}
                              rows={4}
                              disabled={isSubmitting}
                              className='min-h-[116px] bg-white'
                              simple
                            />
                          )}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white overflow-hidden'>
                <FieldRow icon={RiUserLine} label='Client'>
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
                        disabled={isSubmitting}
                        placeholder='Select'
                        searchPlaceholder='Search clients...'
                        emptyMessage='No clients available'
                        noResultsMessage='No clients found'
                        triggerClassName='w-full min-w-0'
                      />
                    )}
                  />
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
                        contentClassName='z-[600]'
                        value={field.value || ''}
                        valueSentinel='__none__'
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        options={centerOptions}
                        disabled={isSubmitting || centersState.status === 'loading'}
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
                <FieldRow icon={RiHome8Line} label='Space type'>
                  <Controller
                    name='spaceType'
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
                        options={SPACE_TYPE_FORM_OPTIONS}
                        disabled={isSubmitting}
                        placeholder='Select'
                        searchPlaceholder='Search space types...'
                        emptyMessage='No space types available'
                        noResultsMessage='No space types found'
                        triggerClassName='w-full min-w-0'
                        renderTrigger={() =>
                          field.value ? (
                            <Badge.Root size='medium' variant='light' color={spaceTypeBadge.color}>
                              {spaceTypeBadge.label}
                            </Badge.Root>
                          ) : (
                            <span className='text-paragraph-sm text-text-soft-400'>Select</span>
                          )
                        }
                      />
                    )}
                  />
                </FieldRow>
                <FieldRow icon={RiSettings3Line} label='Industry'>
                  <Controller
                    name='industry'
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
                        options={industryOptions}
                        disabled={isSubmitting}
                        placeholder='Select'
                        searchPlaceholder='Search industry...'
                        emptyMessage='No industries available'
                        noResultsMessage='No industries found'
                        triggerClassName='w-full min-w-0'
                      />
                    )}
                  />
                </FieldRow>
                <FieldRow icon={RiGroupLine} label='No. of Seats'>
                  <Controller
                    name='noOfSeats'
                    control={control}
                    render={({ field }) => (
                      <Input.Root variant='borderless' size='xsmall' className='w-full'>
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            type='number'
                            min={0}
                            placeholder='0'
                            disabled={isSubmitting}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                            }
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
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
                          disabled={isSubmitting}
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

              <div className='mt-2 flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <Label.Root className='flex items-center gap-2'>
                    <RiAttachment2 className='size-5 text-text-sub-500' aria-hidden />
                    <span className='text-label-sm text-text-sub-500'>Attachments</span>
                  </Label.Root>
                  {attachments.length > 0 ? (
                    <Button.Root
                      type='button'
                      onClick={openFilePicker}
                      disabled={isSubmitting}
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                    >
                      Upload Files
                    </Button.Root>
                  ) : null}
                </div>

                {attachments.length > 0 ? (
                  <div className='mb-4 space-y-4'>
                    {attachments.map((file) => (
                      <div
                        key={file.id}
                        className='rounded-[12px] border border-stroke-soft-200 bg-bg-white-0'
                      >
                        <div className='flex flex-col gap-4 px-[14px] py-3 pr-4'>
                          <div className='flex w-full items-center gap-3'>
                            <FileFormatIcon.Root
                              format={getFileExtension(file.name) || 'FILE'}
                              size='small'
                              color='red'
                            />
                            <div className='flex min-w-0 grow flex-col items-start justify-center gap-[6px]'>
                              <p className='label-small w-full truncate text-text-main-900'>
                                {file.name}
                              </p>
                              <p className='text-paragraph-xs text-text-sub-500'>
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <CompactButton.Root
                              variant='ghost'
                              size='large'
                              onClick={() => removeAttachment(file.id)}
                              disabled={isSubmitting}
                              aria-label={`Remove ${file.name}`}
                              className='shrink-0 cursor-pointer'
                            >
                              <CompactButton.Icon as={RiDeleteBinLine} />
                            </CompactButton.Root>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {attachments.length === 0 ? (
                  <div className='flex items-start gap-3 rounded-xl border border-dashed border-stroke-sub-300 px-4 py-3'>
                    <RiUploadCloud2Line className='size-6 text-text-sub-500' aria-hidden />
                    <div className='flex flex-1 flex-col gap-1'>
                      <p className='label-small text-text-main-900'>
                        Choose a file or drag & drop.
                      </p>
                      <p className='text-paragraph-xs text-text-soft-400'>
                        All file types, up to 10 MB per file.
                      </p>
                    </div>
                    <Button.Root
                      type='button'
                      onClick={openFilePicker}
                      disabled={isSubmitting}
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                    >
                      Browse File
                    </Button.Root>
                  </div>
                ) : null}

                <input
                  ref={fileInputRef}
                  type='file'
                  multiple
                  id={FILE_INPUT_ID}
                  className='hidden'
                  disabled={isSubmitting}
                  onChange={(e) => {
                    handleFileUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                {fileError ? (
                  <div className='mt-2'>
                    <ErrorText className='w-full'>{fileError}</ErrorText>
                  </div>
                ) : null}
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 z-10 border-t border-stroke-soft-200 bg-white px-6 py-4'>
            <div className='flex w-full justify-end gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                disabled={isSubmitting}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' variant='primary' size='medium' disabled={isSubmitting}>
                Create
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
