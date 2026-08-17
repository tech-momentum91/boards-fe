// Note: this file/component is named "create-external" / "CreateExternalEvent" for historical reasons.
// It now drives the Hosted Events create flow. A future refactor can rename the file/component;
// this is a cosmetic issue only and does not affect runtime behaviour.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { addMinutes } from 'date-fns';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Checkbox from '@/components/ui/checkbox';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiUploadCloud2Line,
  RiUploadLine as RiUploadSmallLine,
} from 'react-icons/ri';
import {
  HOSTED_EVENT_CATEGORY_OPTIONS,
  HOSTED_EVENT_REVENUE_MODE_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_API_VALUE,
  parseMaxRegistrationsInput,
  normalizeEventRevenueModeValue,
} from '@/components/event-management/constant';
import { getStatusOptions } from '@/api/dynamic-status';
import { toEventStatusSelectOptions } from '@/components/event-management/event-dynamic-status-helpers';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Datepicker } from '@/components/ui/datepicker';
import { EventScheduleDateTimeFields } from '@/components/event-management/event-schedule-datetime-fields';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/utils/cn';
import { formatEventDatetimeForApi } from '@/utils/date-utils';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import ErrorText from '@/components/ui/error-text';
import { useDispatch, useSelector } from 'react-redux';
import {
  createEventThunk,
  getEventTypeListThunk,
  getEventStatusCountsThunk,
  uploadEventAttachmentThunk,
} from '@/redux/eventsSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { PhoneInputController } from '@/components/ui/phone-input';

import { createExternalEventSchema, defaultExternalEventValues } from '@/schemas/event-schema';
import { isAdminRole } from '@/utils/user-role-utils';

const CreateExternalEvent = ({ open, onOpenChange, centerOptions = [], partnerOptions = [] }) => {
  const dispatch = useDispatch();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canSelectAllCentersAndClients = isAdminRole(userSideBarPerm);
  const attachmentsInputRef = useRef(null);
  const [attachmentDragActive, setAttachmentDragActive] = useState(false);
  const [externalStatusOptions, setExternalStatusOptions] = useState([]);
  const [eventDetailsEditorKey, setEventDetailsEditorKey] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(createExternalEventSchema),
    defaultValues: defaultExternalEventValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const attachments = watch('attachments') || [];
  const selectedPartner = watch('partner_name');
  const allCenters = watch('all_centers');

  useEffect(() => {
    const selected = (Array.isArray(partnerOptions) ? partnerOptions : []).find(
      (opt) => opt.value === selectedPartner,
    );
    const meta = selected?.meta || {};
    const partnerOwner = meta?.partner_owner || '';
    const ownerName = meta?.owner_name || '';
    setValue('partner_owner', partnerOwner || '');
    setValue('partner_owner_name', ownerName || '');
  }, [partnerOptions, selectedPartner, setValue]);

  useEffect(() => {
    if (!open) {
      reset({
        ...defaultExternalEventValues,
        all_centers: canSelectAllCentersAndClients ? defaultExternalEventValues.all_centers : false,
      });
      setValue('attachments', []);
      setAttachmentDragActive(false);
      if (attachmentsInputRef.current) attachmentsInputRef.current.value = '';
    }
  }, [open, reset, setValue, canSelectAllCentersAndClients]);

  useEffect(() => {
    if (!open || canSelectAllCentersAndClients) return;
    setValue('all_centers', false, { shouldDirty: false, shouldValidate: true });
  }, [open, canSelectAllCentersAndClients, setValue]);

  useEffect(() => {
    if (open) setEventDetailsEditorKey((k) => k + 1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const n = new Date();
    setValue('start_datetime', n.toISOString(), {
      shouldValidate: false,
      shouldDirty: false,
      shouldTouch: false,
    });
    setValue('end_datetime', addMinutes(n, 30).toISOString(), {
      shouldValidate: false,
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [open, setValue]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getStatusOptions({ doctype: 'Events', field: 'status' })
      .then((rows) => {
        if (!cancelled) setExternalStatusOptions(toEventStatusSelectOptions(rows));
      })
      .catch(() => {
        if (!cancelled) setExternalStatusOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onCreate = useCallback(
    async (data) => {
      try {
        const assigneeValue = (Array.isArray(data.assignee) ? data.assignee : [])
          .map((v) => (typeof v === 'string' ? v : v?.user || v?.value || v?.email || v))
          .map((v) => String(v).trim())
          .filter(Boolean)
          .map((user) => ({ user }));
        const allCentersFlag = data.all_centers ? 1 : 0;
        const centreNameList = data.all_centers
          ? []
          : (Array.isArray(data.centre_name) ? data.centre_name : [])
              .map((center) => String(center).trim())
              .filter(Boolean)
              .map((center) => ({ center }));

        const eventData = {
          event_name: data.event_name || '',
          brandcompany_name: data.brandcompany_name || '',
          partner_name: data.partner_name || '',
          partner_owner: data.partner_owner || '',
          all_centers: allCentersFlag,
          centre_name: centreNameList,
          start_datetime: formatEventDatetimeForApi(data.start_datetime),
          end_datetime: formatEventDatetimeForApi(data.end_datetime),
          assignee: assigneeValue,
          event_type: EVENT_TYPE_API_VALUE.hosted,
          event_category: data.event_category || '',
          // sub_category: '',
          engagement_mode: '',
          revenue_mode: normalizeEventRevenueModeValue(data.revenue_mode || ''),
          // Backend field: max_registrations (labeled as "Max Seats" in UI)
          max_registrations: parseMaxRegistrationsInput(data.max_registrations),
          registration_deadline: data.registration_deadline || null,
          status: data.status || '',
          spoc_name: data.spoc_name || null,
          spoc_phone: data.spoc_phone || null,
          spoc_email: data.spoc_email || null,
          event_details: data.event_details || null,
          facilities_needed: [],
          participants: [],
        };

        const resultAction = await dispatch(createEventThunk(eventData));

        if (createEventThunk.fulfilled.match(resultAction)) {
          const created = resultAction.payload || {};
          const createdEventId =
            created?.name || created?.data?.name || created?.message?.name || '';

          const filesToUpload = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
          if (createdEventId && filesToUpload.length > 0) {
            const uploadAction = await dispatch(
              uploadEventAttachmentThunk({
                event: createdEventId,
                files: filesToUpload,
              }),
            );
            if (!uploadEventAttachmentThunk.fulfilled.match(uploadAction)) {
              const uploadErrMsg = extractErrorMessage(
                uploadAction.payload,
                'Event created but attachment upload failed',
              );
              throw new Error(uploadErrMsg);
            }
          }

          showSuccessToast('Event created successfully.');
          onOpenChange(false);
          dispatch(getEventTypeListThunk({ event_type: EVENT_TYPE_API_VALUE.hosted }));
          dispatch(getEventStatusCountsThunk({ event_type: EVENT_TYPE_API_VALUE.hosted }));
        } else {
          const errMsg = extractErrorMessage(resultAction.payload, 'Failed to create event');
          throw new Error(errMsg);
        }
      } catch (error) {
        const msg = extractErrorMessage(error, 'Failed to create event');
        showErrorToast(msg, { defaultMessage: 'Failed to create event' });
      }
    },
    [dispatch, onOpenChange, attachments],
  );

  const removeAttachment = useCallback(
    (indexToRemove) => {
      const current = Array.isArray(attachments) ? attachments : [];
      const next = current.filter((_, index) => index !== indexToRemove);
      setValue('attachments', next, { shouldDirty: true });
    },
    [attachments, setValue],
  );

  const handleAttachmentsPicked = useCallback(
    (files) => {
      if (!files?.length) return;
      const list = [...files];
      const current = Array.isArray(attachments) ? attachments : [];
      const next = [...current, ...list];
      setValue('attachments', next, { shouldDirty: true });
    },
    [attachments, setValue],
  );

  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[520px] flex flex-col h-full'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <div className='label-medium text-text-strong-950'>Add Hosted Event</div>
              <div className='paragraph-small text-text-sub-600'>
                Fill in the details to create a new hosted event
              </div>
            </div>
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onOpenChange}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='py-5 flex flex-col overflow-y-auto'>
          <form className='flex size-full flex-col'>
            <div className='flex flex-col gap-6 px-6 pb-6'>
              {/* Basic Info */}
              <section className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiInformationLine
                    className='size-4 text-text-sub-600 shrink-0'
                    color='#868C98'
                    aria-hidden
                  />
                  <span className='label-medium text-[var(--color-text-sub-500)]'>Basic Info</span>
                </div>
                <div className='flex flex-col gap-2 '>
                  <Label.Root>
                    Event Name <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='event_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.event_name)}>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder='Enter event name'
                            disabled={isSubmitting}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.event_name && <ErrorText>{errors.event_name.message}</ErrorText>}
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Partner Name <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='partner_name'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={(v) => {
                            field.onChange(v);
                            const selected = (
                              Array.isArray(partnerOptions) ? partnerOptions : []
                            ).find((opt) => opt.value === v);
                            const meta = selected?.meta || {};
                            const partnerOwner = meta?.partner_owner || '';
                            const ownerName = meta?.owner_name || '';
                            setValue('partner_owner', partnerOwner || '');
                            setValue('partner_owner_name', ownerName || '');
                          }}
                          hasError={Boolean(errors.partner_name)}
                          disabled={isSubmitting}
                          options={partnerOptions}
                          placeholder='Select Partner Name'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.partner_name && <ErrorText>{errors.partner_name.message}</ErrorText>}
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label.Root>Partner Owner</Label.Root>
                    <Controller
                      name='partner_owner_name'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={field.value || ''}
                              placeholder='Auto-filled from partner'
                              readOnly
                              disabled={true}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Assignee <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='assignee'
                      control={control}
                      render={({ field }) => (
                        <AssigneeMultiSelect
                          value={Array.isArray(field.value) ? field.value : []}
                          onChange={(vals) =>
                            field.onChange(Array.isArray(vals) ? vals : vals ? [vals] : [])
                          }
                          disabled={isSubmitting}
                          variant='default'
                          internalOnly
                          placeholder='Select assignees'
                          hasError={Boolean(errors.assignee)}
                        />
                      )}
                    />
                    {errors.assignee && <ErrorText>{errors.assignee.message}</ErrorText>}
                  </div>
                </div>
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />
              <section className='flex flex-col gap-4'>
                <div className='label-medium text-[var(--color-text-sub-500)]'>
                  Schedule &amp; Registration
                </div>
                <div className='flex flex-col gap-2'>
                  {/* <Label.Root>
                      Event schedule <Label.Asterisk />
                    </Label.Root> */}
                  <EventScheduleDateTimeFields
                    control={control}
                    errors={errors}
                    isSubmitted={isSubmitted}
                    setValue={setValue}
                    trigger={trigger}
                    isSubmitting={isSubmitting}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2 '>
                    <Label.Root>Registration Deadline</Label.Root>
                    <Controller
                      name='registration_deadline'
                      control={control}
                      render={({ field }) => (
                        <Datepicker
                          variant='neutral'
                          mode='stroke'
                          value={field.value}
                          onChange={(date) => field.onChange(date ?? undefined)}
                          disabled={isSubmitting}
                          placeholder='dd/mm/yyyy'
                          hasError={Boolean(errors.registration_deadline)}
                          size='medium'
                          className='w-full'
                        />
                      )}
                    />
                    {errors.registration_deadline && (
                      <ErrorText>{errors.registration_deadline.message}</ErrorText>
                    )}
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>Status</Label.Root>
                    <Controller
                      name='status'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.status)}
                          disabled={isSubmitting}
                          options={externalStatusOptions}
                          placeholder='Select status'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.status && <ErrorText>{errors.status.message}</ErrorText>}
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label.Root>Max Seats</Label.Root>
                    <Controller
                      name='max_registrations'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='w-full' hasError={Boolean(errors.max_registrations)}>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder='No Limit'
                              disabled={isSubmitting}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.max_registrations && (
                      <ErrorText>{errors.max_registrations.message}</ErrorText>
                    )}
                  </div>
                </div>
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* Centers Applicable */}
              <section className='flex flex-col gap-3'>
                <div className='label-medium text-[var(--color-text-sub-500)]'>
                  Centers Applicable
                </div>
                {canSelectAllCentersAndClients ? (
                  <div className='flex w-full gap-2 items-center'>
                    <Checkbox.Root
                      id='externalAllCenters'
                      checked={Boolean(allCenters)}
                      onCheckedChange={(checked) => {
                        const on = checked === true;
                        setValue('all_centers', on, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        if (on) {
                          setValue('centre_name', [], { shouldDirty: true, shouldValidate: true });
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <Label.Root
                      htmlFor='externalAllCenters'
                      className='text-[var(--color-text-main-900)] paragraph-small cursor-pointer select-none'
                    >
                      All Centers
                    </Label.Root>
                  </div>
                ) : null}

                {(canSelectAllCentersAndClients ? !allCenters : true) ? (
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Select Centers <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='centre_name'
                      control={control}
                      render={({ field }) => (
                        <MultiSelect
                          options={centerOptions}
                          value={Array.isArray(field.value) ? field.value : []}
                          onValueChange={(vals) =>
                            field.onChange(Array.isArray(vals) ? vals : vals ? [vals] : [])
                          }
                          disabled={isSubmitting}
                          placeholder='Select centers'
                          className='w-full'
                          hasError={Boolean(errors.centre_name)}
                        />
                      )}
                    />
                    {errors.centre_name ? (
                      <ErrorText>{errors.centre_name.message}</ErrorText>
                    ) : null}
                  </div>
                ) : null}
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* Category & Revenue */}
              <section className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiInformationLine
                    className='size-4 text-text-sub-600 shrink-0'
                    color='#868C98'
                    aria-hidden
                  />
                  <span className='label-medium text-[var(--color-text-sub-500)]'>
                    Category &amp; Revenue
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Event Category <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='event_category'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.event_category)}
                          disabled={isSubmitting}
                          options={HOSTED_EVENT_CATEGORY_OPTIONS}
                          placeholder='Select Event Category'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.event_category && (
                      <ErrorText>{errors.event_category.message}</ErrorText>
                    )}
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Revenue Mode <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='revenue_mode'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.revenue_mode)}
                          disabled={isSubmitting}
                          options={HOSTED_EVENT_REVENUE_MODE_OPTIONS}
                          placeholder='Select Revenue Mode'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.revenue_mode && <ErrorText>{errors.revenue_mode.message}</ErrorText>}
                  </div>
                </div>
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* Event Details */}
              <section className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiInformationLine
                    className='size-4 text-text-sub-600 shrink-0'
                    color='#868C98'
                    aria-hidden
                  />
                  <span className='label-medium text-[var(--color-text-sub-500)]'>
                    Event Details
                  </span>
                </div>

                <div className='flex flex-col gap-2'>
                  <Label.Root>Basic Details of the Event</Label.Root>
                  <Controller
                    name='event_details'
                    control={control}
                    render={({ field }) => (
                      <div
                        className={
                          isSubmitting
                            ? 'pointer-events-none w-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 opacity-60'
                            : 'w-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0'
                        }
                      >
                        <SimpleEditor
                          key={eventDetailsEditorKey}
                          embed
                          value={field.value}
                          onChange={field.onChange}
                          hasError={Boolean(errors.event_details)}
                        />
                      </div>
                    )}
                  />
                  {errors.event_details && <ErrorText>{errors.event_details.message}</ErrorText>}
                </div>

                {/* Attachments */}
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between'>
                    <div className='text-label-sm text-text-strong-950'>Attachments</div>
                    {attachments.length > 0 ? (
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        className='pl-2.5 pr-3 py-1.5 gap-0.5'
                        type='button'
                        onClick={() => attachmentsInputRef.current?.click()}
                        disabled={isSubmitting}
                      >
                        <Button.Icon as={RiUploadSmallLine} />
                        <div className='text-label-sm px-1 text-text-sub-600'>Upload Files</div>
                      </Button.Root>
                    ) : null}
                    <input
                      ref={attachmentsInputRef}
                      type='file'
                      multiple
                      className='hidden'
                      onChange={(e) => handleAttachmentsPicked(e.target.files)}
                    />
                  </div>

                  {attachments.length === 0 ? (
                    <div
                      className={cn(
                        'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
                        attachmentDragActive ? 'bg-bg-weak-50' : '',
                      )}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAttachmentDragActive(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAttachmentDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAttachmentDragActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAttachmentDragActive(false);
                        handleAttachmentsPicked(e.dataTransfer.files);
                      }}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <RiUploadCloud2Line className='size-6 text-text-sub-500' />
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm text-text-strong-950'>
                              Click to upload or drag &amp; drop files
                            </div>
                            <div className='text-paragraph-xs text-text-sub-600'>
                              PDF, DOC, PNG, JPG up to 10MB
                            </div>
                          </div>
                        </div>
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                          type='button'
                          onClick={() => attachmentsInputRef.current?.click()}
                          disabled={isSubmitting}
                        >
                          Browse File
                        </Button.Root>
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col w-full gap-3'>
                      {Array.from({ length: attachments.length }).map((_, index) => {
                        const file = attachments.at(index);
                        if (!file) return null;

                        const extension = getFileExtension(file.name);
                        const isPdf = extension === 'PDF';
                        const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(
                          extension,
                        );
                        const url = isImage ? URL.createObjectURL(file) : null;

                        return (
                          <div
                            key={file.name ? `${file.name}-${index}` : index}
                            className='group relative flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 transition-colors hover:border-stroke-soft-300'
                          >
                            <div className='relative h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-bg-weak-50'>
                              {isImage ? (
                                <img
                                  src={url}
                                  alt={file.name}
                                  className='h-full w-full rounded-lg object-cover'
                                />
                              ) : (
                                <FileFormatIcon.Root
                                  format={extension || 'FILE'}
                                  color={isPdf ? 'red' : 'purple'}
                                  size='medium'
                                />
                              )}
                            </div>

                            <div className='flex flex-1 flex-col gap-0.5 min-w-0'>
                              <div className='text-paragraph-sm font-semibold text-text-strong-950 truncate'>
                                {file.name}
                              </div>
                              <div className='text-paragraph-xs text-text-sub-600'>
                                {formatFileSize(file.size)}
                              </div>
                            </div>

                            <CompactButton.Root
                              variant='ghost'
                              size='large'
                              className='shrink-0 cursor-pointer'
                              onClick={() => removeAttachment(index)}
                              aria-label='Remove file'
                            >
                              <CompactButton.Icon as={RiDeleteBinLine} />
                            </CompactButton.Root>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* SPOC Details */}
              <section className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiInformationLine
                    className='size-4 text-text-sub-600 shrink-0'
                    color='#868C98'
                    aria-hidden
                  />
                  <span className='label-medium text-[var(--color-text-sub-500)]'>
                    SPOC Details
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      SPOC Name <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='spoc_name'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='w-full' hasError={Boolean(errors.spoc_name)}>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder='Enter spoc name'
                              disabled={isSubmitting}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.spoc_name && <ErrorText>{errors.spoc_name.message}</ErrorText>}
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      SPOC Phone <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='spoc_phone'
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className='flex flex-col gap-1'>
                          <PhoneInputController
                            value={field.value}
                            onChange={(formattedValue) => {
                              field.onChange(formattedValue);
                            }}
                            error={fieldState.error}
                            size='medium'
                            variant='default'
                            placeholder='9876500011'
                            maxLength={10}
                            disabled={isSubmitting}
                          />
                          {errors.spoc_phone && <ErrorText>{errors.spoc_phone.message}</ErrorText>}
                        </div>
                      )}
                    />
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      SPOC Email <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='spoc_email'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='w-full' hasError={Boolean(errors.spoc_email)}>
                          <Input.Wrapper>
                            <Input.Input
                              type='email'
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder='Enter spoc email'
                              disabled={isSubmitting}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.spoc_email && <ErrorText>{errors.spoc_email.message}</ErrorText>}
                  </div>

                  <div />
                </div>
              </section>
              {/* <div className='border-b border-stroke-soft-200  px-8' /> */}
            </div>
          </form>
        </Drawer.Body>

        <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
          <div className='px-8 py-4 bg-bg-white-0'>
            <div className='flex items-center justify-between gap-3'>
              <Button.Root variant='neutral' mode='stroke' type='button' onClick={onClose}>
                Cancel
              </Button.Root>

              <Button.Root
                type='button'
                disabled={!isValid || isSubmitting}
                onClick={handleSubmit(onCreate)}
              >
                {isSubmitting ? 'Saving...' : 'Save Hosted Event'}
              </Button.Root>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateExternalEvent;
