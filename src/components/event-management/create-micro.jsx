// Note: this file/component is named "create-micro" / "CreateMicroEvent" for historical reasons.
// It now drives the Spotlight Events create flow. A future refactor can rename the file/component;
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
  RiUploadLine,
} from 'react-icons/ri';
import {
  EVENT_ENGAGEMENT_MODE_OPTIONS,
  EVENT_TYPE_API_VALUE,
  SPOTLIGHT_EVENT_CATEGORY_OPTIONS,
  SPOTLIGHT_EVENT_FACILITY_OPTIONS,
  SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS,
  normalizeEventRevenueModeValue,
} from '@/components/event-management/constant';
import { getStatusOptions } from '@/api/dynamic-status';
import { toEventStatusSelectOptions } from '@/components/event-management/event-dynamic-status-helpers';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { MultiSelect } from '@/components/ui/multi-select';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { EventScheduleDateTimeFields } from '@/components/event-management/event-schedule-datetime-fields';
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

import { createMicroEventSchema, defaultMicroEventValues } from '@/schemas/event-schema';
import { isAdminRole } from '@/utils/user-role-utils';

const CreateMicroEvent = ({
  open,
  onOpenChange,
  centerOptions = [],
  clientOptions = [],
  partnerOptions = [],
}) => {
  const dispatch = useDispatch();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canSelectAllCentersAndClients = isAdminRole(userSideBarPerm);
  const photosInputRef = useRef(null);
  const [photoDragActive, setPhotoDragActive] = useState(false);
  const [microStatusOptions, setMicroStatusOptions] = useState([]);
  const [eventDetailsEditorKey, setEventDetailsEditorKey] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(createMicroEventSchema),
    defaultValues: defaultMicroEventValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const photos = watch('attachments') || [];
  const selectedPartner = watch('partner');
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
        ...defaultMicroEventValues,
        all_centers: canSelectAllCentersAndClients ? defaultMicroEventValues.all_centers : false,
      });
      setValue('attachments', []);
      setPhotoDragActive(false);
      if (photosInputRef.current) photosInputRef.current.value = '';
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
        if (!cancelled) setMicroStatusOptions(toEventStatusSelectOptions(rows));
      })
      .catch(() => {
        if (!cancelled) setMicroStatusOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || microStatusOptions.length === 0) return;
    const current = getValues('status');
    if (current) {
      const ok = microStatusOptions.some(
        (o) => o.value === current || o.label?.toLowerCase() === String(current).toLowerCase(),
      );
      if (!ok) setValue('status', microStatusOptions[0].value, { shouldValidate: true });
      return;
    }
    setValue('status', microStatusOptions[0].value, { shouldValidate: true });
  }, [open, microStatusOptions, getValues, setValue]);

  const onCreate = useCallback(
    async (data) => {
      try {
        const selectedClientLabel =
          clientOptions.find((opt) => opt.value === data.client)?.label || data.client || '';

        const allCentersFlag = data.all_centers ? 1 : 0;
        const centreNameList = data.all_centers
          ? []
          : (Array.isArray(data.center) ? data.center : [])
              .map((center) => String(center).trim())
              .filter(Boolean)
              .map((center) => ({ center }));

        const eventData = {
          event_name: data.eventName || '',
          brandcompany_name: selectedClientLabel,
          all_centers: allCentersFlag,
          centre_name: centreNameList,
          start_datetime: formatEventDatetimeForApi(data.start_datetime),
          end_datetime: formatEventDatetimeForApi(data.end_datetime),
          assignee: (Array.isArray(data.assignee) ? data.assignee : [])
            .map((v) => (typeof v === 'string' ? v : v?.user || v?.value || v?.email || v))
            .map((v) => String(v).trim())
            .filter(Boolean)
            .map((user) => ({ user })),
          event_type: EVENT_TYPE_API_VALUE.spotlight,
          event_category: data.eventCategory || '',
          // sub_category: data.subCategory || '',
          engagement_mode: data.engagementMode || '',
          revenue_mode: normalizeEventRevenueModeValue(data.revenueMode || ''),
          status: data.status || '',
          spoc_name: data.spocName || '',
          spoc_phone: data.spocPhone || '',
          description: data.eventDetails || '',
          spoc_email: data.spocEmail || '',
          event_details: data.eventDetails || '',
          partner_name: data.partner || '',
          partner_owner: data.partner_owner || '',
          facilities_needed: Array.isArray(data.facilitiesNeeded)
            ? data.facilitiesNeeded.map((name) => ({ facilities: name }))
            : [],
          participants: [],
        };

        const resultAction = await dispatch(createEventThunk(eventData));

        if (createEventThunk.fulfilled.match(resultAction)) {
          const created = resultAction.payload || {};
          const createdEventId =
            created?.name || created?.data?.name || created?.message?.name || '';

          const filesToUpload = Array.isArray(photos) ? photos.filter(Boolean) : [];
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
          dispatch(getEventTypeListThunk({ event_type: EVENT_TYPE_API_VALUE.spotlight }));
          dispatch(getEventStatusCountsThunk({ event_type: EVENT_TYPE_API_VALUE.spotlight }));
        } else {
          const errMsg = extractErrorMessage(resultAction.payload, 'Failed to create event');
          throw new Error(errMsg);
        }
      } catch (error) {
        const msg = extractErrorMessage(error, 'Failed to create event');
        showErrorToast(msg, { defaultMessage: 'Failed to create event' });
      }
    },
    [dispatch, onOpenChange, photos, clientOptions],
  );

  const removeAttachment = useCallback(
    (indexToRemove) => {
      const current = Array.isArray(photos) ? photos : [];
      const next = current.filter((_, index) => index !== indexToRemove);
      setValue('attachments', next, { shouldDirty: true });
    },
    [photos, setValue],
  );

  const handlePhotosPicked = useCallback(
    (files) => {
      if (!files?.length) return;
      const list = [...files];
      const current = Array.isArray(photos) ? photos : [];
      const next = [...current, ...list];
      setValue('attachments', next, { shouldDirty: true });
    },
    [photos, setValue],
  );

  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[520px]  flex flex-col h-full'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <div className='label-medium text-text-strong-950'>Add Spotlight Event</div>
              <div className='paragraph-small text-text-sub-600'>
                Fill in the details to create a new spotlight event
              </div>
            </div>
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onOpenChange}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>
        <Drawer.Body className='py-5 flex flex-col overflow-y-auto '>
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
                <div className='flex flex-col gap-2'>
                  <Label.Root>
                    Event Name <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='eventName'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.eventName)}>
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
                  {errors.eventName && <ErrorText>{errors.eventName.message}</ErrorText>}
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Partner Name <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='partner'
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
                          hasError={Boolean(errors.partner)}
                          options={Array.isArray(partnerOptions) ? partnerOptions : []}
                          placeholder='Select partner name'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.partner && <ErrorText>{errors.partner.message}</ErrorText>}
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
                  <div className='col-span-2 flex flex-col gap-2'>
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

              {/* Centers Applicable */}
              <section className='flex flex-col gap-3'>
                <div className='label-medium text-[var(--color-text-sub-500)]'>
                  Centers Applicable
                </div>
                {canSelectAllCentersAndClients ? (
                  <div className='flex w-full gap-2 items-center'>
                    <Checkbox.Root
                      id='microAllCenters'
                      checked={Boolean(allCenters)}
                      onCheckedChange={(checked) => {
                        const on = checked === true;
                        setValue('all_centers', on, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        if (on) {
                          setValue('center', [], { shouldDirty: true, shouldValidate: true });
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <Label.Root
                      htmlFor='microAllCenters'
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
                      name='center'
                      control={control}
                      render={({ field }) => (
                        <MultiSelect
                          options={centerOptions.length > 0 ? centerOptions : []}
                          value={Array.isArray(field.value) ? field.value : []}
                          onValueChange={(vals) =>
                            field.onChange(Array.isArray(vals) ? vals : vals ? [vals] : [])
                          }
                          disabled={isSubmitting}
                          placeholder='Select centers'
                          className='w-full'
                          hasError={Boolean(errors.center)}
                        />
                      )}
                    />
                    {errors.center ? <ErrorText>{errors.center.message}</ErrorText> : null}
                  </div>
                ) : null}
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* Event Classification */}
              <section className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiInformationLine
                    className='size-4 text-text-sub-600 shrink-0'
                    color='#868C98'
                    aria-hidden
                  />
                  <span className='label-medium text-[var(--color-text-sub-500)]'>
                    Event Classification
                  </span>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Event Category <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='eventCategory'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.eventCategory)}
                          options={SPOTLIGHT_EVENT_CATEGORY_OPTIONS}
                          placeholder='Select category'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.eventCategory && <ErrorText>{errors.eventCategory.message}</ErrorText>}
                  </div>
                  {/* <div className='flex flex-col gap-2'>
                    <Label.Root>Sub-Category</Label.Root>
                    <Controller
                      name='subCategory'
                      control={control}
                      render={({ field }) => (
                        <Select.Root
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.subCategory)}
                        >
                          <Select.Trigger className='w-full'>
                            <Select.Value placeholder='Select sub-category' />
                          </Select.Trigger>
                          <Select.Content>
                            {[
                              { value: '1', label: 'Sub-Category 1' },
                              { value: '2', label: 'Sub-Category 2' },
                            ].map((opt) => (
                              <Select.Item key={opt.value} value={opt.value}>
                                {opt.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                  </div> */}
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Engagement Mode <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='engagementMode'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.engagementMode)}
                          options={EVENT_ENGAGEMENT_MODE_OPTIONS}
                          placeholder='Select engagement mode'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.engagementMode && (
                      <ErrorText>{errors.engagementMode.message}</ErrorText>
                    )}
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Revenue Mode <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='revenueMode'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.revenueMode)}
                          options={SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS}
                          placeholder='Select revenue mode'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.revenueMode && <ErrorText>{errors.revenueMode.message}</ErrorText>}
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Status <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='status'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.status)}
                          options={microStatusOptions}
                          placeholder='Select status'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.status && <ErrorText>{errors.status.message}</ErrorText>}
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
                    name='eventDetails'
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
                          hasError={Boolean(errors.eventDetails)}
                        />
                      </div>
                    )}
                  />
                  {errors.eventDetails && <ErrorText>{errors.eventDetails.message}</ErrorText>}
                </div>

                {/* Facility Needed (multi-select dropdown) */}
                <div className='flex flex-col gap-2'>
                  <Label.Root>Facility Needed</Label.Root>
                  <Controller
                    name='facilitiesNeeded'
                    control={control}
                    render={({ field }) => (
                      <MultiSelect
                        options={SPOTLIGHT_EVENT_FACILITY_OPTIONS}
                        value={Array.isArray(field.value) ? field.value : []}
                        onValueChange={(vals) => field.onChange(Array.isArray(vals) ? vals : [])}
                        placeholder='Select facilities'
                        hasError={Boolean(errors.facilitiesNeeded)}
                      />
                    )}
                  />
                  {errors.facilitiesNeeded && (
                    <ErrorText>{errors.facilitiesNeeded.message}</ErrorText>
                  )}
                </div>

                {/* Attachments */}
                <div className='flex flex-col gap-2  '>
                  <div className='flex items-center justify-between'>
                    <div className='text-label-sm text-text-strong-950'>Attachments</div>
                    {photos.length > 0 ? (
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        className='pl-2.5 pr-3 py-1.5 gap-0.5'
                        type='button'
                        onClick={() => photosInputRef.current?.click()}
                      >
                        <Button.Icon as={RiUploadLine} />
                        <div className='text-label-sm px-1 text-text-sub-600'>Upload Files</div>
                      </Button.Root>
                    ) : null}
                    <input
                      ref={photosInputRef}
                      type='file'
                      multiple
                      className='hidden'
                      onChange={(e) => handlePhotosPicked(e.target.files)}
                    />
                  </div>

                  {photos.length === 0 ? (
                    <div
                      className={cn(
                        'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
                        photoDragActive ? 'bg-bg-weak-50' : '',
                      )}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPhotoDragActive(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPhotoDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPhotoDragActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPhotoDragActive(false);
                        handlePhotosPicked(e.dataTransfer.files);
                      }}
                    >
                      <div className='flex items-center justify-between '>
                        <div className='flex items-center gap-3'>
                          <RiUploadCloud2Line className='size-6 text-text-sub-500' />
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm text-text-strong-950'>
                              Choose a file or drag & drop it here.
                            </div>
                            <div className='text-paragraph-xs text-text-sub-600'>
                              JPEG, PNG formats, up to 50 MB
                            </div>
                          </div>
                        </div>
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                          type='button'
                          onClick={() => photosInputRef.current?.click()}
                        >
                          Browse File
                        </Button.Root>
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col w-full gap-3'>
                      {Array.from({ length: photos.length }).map((_, index) => {
                        const file = photos.at(index);
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
                      name='spocName'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder='Enter spoc name'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.spocName && <ErrorText>{errors.spocName.message}</ErrorText>}
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      SPOC Contact Number <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='spocPhone'
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
                          {errors.spocPhone && <ErrorText>{errors.spocPhone.message}</ErrorText>}
                        </div>
                      )}
                    />
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      SPOC Email ID <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='spocEmail'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='w-full'>
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
                    {errors.spocEmail && <ErrorText>{errors.spocEmail.message}</ErrorText>}
                  </div>
                  {/* <div className='flex flex-col gap-2'>
                  <Label.Root>Facilities Needed</Label.Root>
                  <Controller
                    name='facilitiesNeeded'
                    control={control}
                    render={({ field }) => (

                  </div> */}
                </div>
              </section>
              {/* <div className='border-b border-stroke-soft-200  px-8' /> */}
            </div>
          </form>
        </Drawer.Body>
        {/* Footer Actions */}
        <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
          <div className=' px-8 py-4 bg-bg-white-0'>
            <div className='flex items-center justify-between gap-3'>
              <Button.Root variant='neutral' mode='stroke' type='button' onClick={onClose}>
                Cancel
              </Button.Root>

              <div className='flex items-center gap-2'>
                <Button.Root
                  type='button'
                  disabled={!isValid || isSubmitting}
                  onClick={handleSubmit(onCreate)}
                >
                  {isSubmitting ? 'Creating...' : 'Save Spotlight Event'}
                </Button.Root>
              </div>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateMicroEvent;
