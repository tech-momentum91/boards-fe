import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addMinutes } from 'date-fns';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as Checkbox from '@/components/ui/checkbox';
import * as Switch from '@/components/ui/switch';
import ErrorText from '@/components/ui/error-text';
import { MultiSelect } from '@/components/ui/multi-select';
import { useDispatch, useSelector } from 'react-redux';
import {
  createEventThunk,
  getEventTypeListThunk,
  getEventStatusCountsThunk,
} from '@/redux/eventsSlice';
import {
  EVENT_TYPE_API_VALUE,
  parseMaxRegistrationsInput,
} from '@/components/event-management/constant';
import { getStatusOptions } from '@/api/dynamic-status';
import { toEventStatusSelectOptions } from '@/components/event-management/event-dynamic-status-helpers';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiUploadCloud2Line,
  RiUploadLine,
} from 'react-icons/ri';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Datepicker } from '@/components/ui/datepicker';
import { EventScheduleDateTimeFields } from '@/components/event-management/event-schedule-datetime-fields';
import { cn } from '@/utils/cn';
import { formatEventDatetimeForApi } from '@/utils/date-utils';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';

import { createCommunityEventSchema, defaultCommunityEventValues } from '@/schemas/event-schema';
import { isAdminRole } from '@/utils/user-role-utils';

function FilePreviewRow({ file, onRemove, removeAriaLabel = 'Remove file' }) {
  const extension = getFileExtension(file.name);
  const isPdf = extension === 'PDF';
  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(extension);
  const url = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className='group relative flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 transition-colors hover:border-stroke-soft-300'>
      <div className='relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-weak-50'>
        {isImage ? (
          <img src={url} alt={file.name} className='h-full w-full rounded-lg object-cover' />
        ) : (
          <FileFormatIcon.Root
            format={extension || 'FILE'}
            color={isPdf ? 'red' : 'purple'}
            size='medium'
          />
        )}
      </div>

      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <div className='truncate text-paragraph-sm font-semibold text-text-strong-950'>
          {file.name}
        </div>
        <div className='text-paragraph-xs text-text-sub-600'>{formatFileSize(file.size)}</div>
      </div>

      <CompactButton.Root
        variant='ghost'
        size='large'
        className='shrink-0 cursor-pointer'
        onClick={onRemove}
        aria-label={removeAriaLabel}
      >
        <CompactButton.Icon as={RiDeleteBinLine} />
      </CompactButton.Root>
    </div>
  );
}

function UploadField({
  label,
  helperText,
  value,
  onPick,
  onRemove,
  onRemoveFile,
  inputRef,
  dragActive,
  setDragActive,
  disabled,
  multiple = false,
}) {
  const commitFromFileList = (list) => {
    if (!list?.length) return;
    const files = [...list];
    if (multiple) onPick?.(files);
    else onPick?.(files[0] ?? null);
  };

  const emptyDropZone = (
    <div
      className={cn(
        'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
        dragActive ? 'bg-bg-weak-50' : '',
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive?.(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive?.(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive?.(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive?.(false);
        commitFromFileList(e.dataTransfer.files);
      }}
    >
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <RiUploadCloud2Line className='size-6 text-text-sub-500' />
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm text-text-strong-950'>Click to upload</div>
            {helperText ? (
              <div className='text-paragraph-xs text-text-sub-600'>{helperText}</div>
            ) : null}
          </div>
        </div>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          type='button'
          onClick={() => inputRef?.current?.click()}
          disabled={disabled}
        >
          Browse File{multiple ? 's' : ''}
        </Button.Root>
      </div>
    </div>
  );

  if (multiple) {
    const files = Array.isArray(value) ? value : [];
    if (files.length === 0) {
      return (
        <div className='flex flex-col gap-2'>
          <div className='text-label-sm text-text-strong-950'>{label}</div>
          <input
            ref={inputRef}
            type='file'
            className='hidden'
            multiple
            onChange={(e) => {
              commitFromFileList(e.target.files);
              e.target.value = '';
            }}
            disabled={disabled}
          />
          {emptyDropZone}
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <div className='text-label-sm text-text-strong-950'>{label}</div>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='gap-0.5 py-1.5 pl-2.5 pr-3'
            type='button'
            onClick={() => inputRef?.current?.click()}
            disabled={disabled}
          >
            <Button.Icon as={RiUploadLine} />
            <div className='px-1 text-label-sm text-text-sub-600'>Add files</div>
          </Button.Root>
        </div>
        <input
          ref={inputRef}
          type='file'
          className='hidden'
          multiple
          onChange={(e) => {
            commitFromFileList(e.target.files);
            e.target.value = '';
          }}
          disabled={disabled}
        />
        <div className='flex flex-col gap-2'>
          {files.map((file, index) => (
            <FilePreviewRow
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              onRemove={() => onRemoveFile?.(index)}
              removeAriaLabel={`Remove ${file.name}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const file = value || null;

  if (!file) {
    return (
      <div className='flex flex-col gap-2'>
        <div className='text-label-sm text-text-strong-950'>{label}</div>
        <input
          ref={inputRef}
          type='file'
          className='hidden'
          onChange={(e) => {
            commitFromFileList(e.target.files);
            e.target.value = '';
          }}
          disabled={disabled}
        />
        {emptyDropZone}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <div className='text-label-sm text-text-strong-950'>{label}</div>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          className='gap-0.5 py-1.5 pl-2.5 pr-3'
          type='button'
          onClick={() => inputRef?.current?.click()}
          disabled={disabled}
        >
          <Button.Icon as={RiUploadLine} />
          <div className='px-1 text-label-sm text-text-sub-600'>Upload</div>
        </Button.Root>
      </div>

      <input
        ref={inputRef}
        type='file'
        className='hidden'
        onChange={(e) => {
          commitFromFileList(e.target.files);
          e.target.value = '';
        }}
        disabled={disabled}
      />

      <FilePreviewRow file={file} onRemove={onRemove} />
    </div>
  );
}

const CreateCommunityEvent = ({ open, onOpenChange, centerOptions = [], clientOptions = [] }) => {
  const dispatch = useDispatch();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canSelectAllCentersAndClients = isAdminRole(userSideBarPerm);
  const posterInputRef = useRef(null);
  const [posterDragActive, setPosterDragActive] = useState(false);
  const [communityStatusOptions, setCommunityStatusOptions] = useState([]);
  const [eventDetailsEditorKey, setEventDetailsEditorKey] = useState(0);
  const resolvedCenterOptions = centerOptions.length > 0 ? centerOptions : [];

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
    resolver: zodResolver(createCommunityEventSchema),
    defaultValues: defaultCommunityEventValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const allCenters = watch('all_centers');
  const selectedCentreIds = watch('centre_name');
  const allClients = watch('all_clients');
  const participationType = watch('participation_type');

  const centersSelectionReady =
    Boolean(allCenters) || (Array.isArray(selectedCentreIds) && selectedCentreIds.length > 0);

  const resolvedClientOptions = useMemo(() => {
    const base = Array.isArray(clientOptions) && clientOptions.length > 0 ? clientOptions : [];
    if (allCenters) return base;
    if (!Array.isArray(selectedCentreIds) || selectedCentreIds.length === 0) return [];
    const idSet = new Set(selectedCentreIds.map((id) => String(id).trim()).filter(Boolean));
    const labelByValue = new Map(
      resolvedCenterOptions.map((o) => [String(o.value), String(o.label || '').trim()]),
    );
    const matchTokens = new Set(idSet);
    selectedCentreIds.forEach((id) => {
      const lab = labelByValue.get(String(id).trim());
      if (lab) matchTokens.add(lab);
    });
    return base.filter((opt) => {
      const refs = opt.meta?.centerRefs;
      if (!Array.isArray(refs) || refs.length === 0) return false;
      return refs.some((r) => {
        const s = String(r).trim();
        return idSet.has(s) || matchTokens.has(s);
      });
    });
  }, [clientOptions, allCenters, selectedCentreIds, resolvedCenterOptions]);

  const clientsSectionLocked = !centersSelectionReady;

  useEffect(() => {
    if (!open) {
      reset({
        ...defaultCommunityEventValues,
        all_centers: canSelectAllCentersAndClients
          ? defaultCommunityEventValues.all_centers
          : false,
        all_clients: canSelectAllCentersAndClients
          ? defaultCommunityEventValues.all_clients
          : false,
      });
      setPosterDragActive(false);
      if (posterInputRef.current) posterInputRef.current.value = '';
    }
  }, [open, reset, canSelectAllCentersAndClients]);

  useEffect(() => {
    if (!open || canSelectAllCentersAndClients) return;
    setValue('all_centers', false, { shouldDirty: false, shouldValidate: true });
  }, [open, canSelectAllCentersAndClients, setValue]);

  useEffect(() => {
    if (!open || canSelectAllCentersAndClients) return;
    setValue('all_clients', false, { shouldDirty: false, shouldValidate: true });
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
    getStatusOptions({ doctype: 'Events', field: 'community_status' })
      .then((rows) => {
        if (!cancelled) setCommunityStatusOptions(toEventStatusSelectOptions(rows));
      })
      .catch(() => {
        if (!cancelled) setCommunityStatusOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || communityStatusOptions.length === 0) return;
    const current = getValues('community_status');
    if (!current) {
      setValue('community_status', communityStatusOptions[0].value, { shouldValidate: true });
      return;
    }
    const ok = communityStatusOptions.some(
      (o) => o.value === current || o.label?.toLowerCase() === String(current).toLowerCase(),
    );
    if (!ok)
      setValue('community_status', communityStatusOptions[0].value, { shouldValidate: true });
  }, [open, communityStatusOptions, getValues, setValue]);

  useEffect(() => {
    if (!open) return;
    if (!centersSelectionReady) {
      setValue('all_clients', canSelectAllCentersAndClients, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('clients', [], { shouldDirty: true, shouldValidate: true });
    }
  }, [open, centersSelectionReady, canSelectAllCentersAndClients, setValue]);

  useEffect(() => {
    if (!open) return;
    if (getValues('all_clients')) return;
    const current = getValues('clients') || [];
    if (current.length === 0) return;
    const allowed = new Set(resolvedClientOptions.map((o) => String(o.value)));
    const next = current.filter((id) => allowed.has(String(id)));
    if (next.length !== current.length) {
      setValue('clients', next, { shouldValidate: true, shouldDirty: true });
    }
  }, [open, resolvedClientOptions, allClients, getValues, setValue]);

  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const onCreate = useCallback(
    async (data) => {
      try {
        const assigneeValue = (Array.isArray(data.assignee) ? data.assignee : [])
          .map((v) => (typeof v === 'string' ? v : v?.user || v?.value || v?.email || v))
          .map((v) => String(v).trim())
          .filter(Boolean)
          .map((user) => ({ user }));
        const maxRegistrationsNumber = parseMaxRegistrationsInput(data.max_registrations);

        const allCentersFlag = data.all_centers ? 1 : 0;
        const centreNameList = data.all_centers
          ? []
          : (Array.isArray(data.centre_name) ? data.centre_name : [])
              .map((center) => String(center).trim())
              .filter(Boolean)
              .map((center) => ({ center }));

        const allClientsFlag = data.all_clients ? 1 : 0;
        const clientsList = data.all_clients
          ? []
          : Array.isArray(data.clients)
            ? data.clients.map((customer) => ({ customer }))
            : [];

        const eventData = {
          // Core fields (shared)
          event_name: data.event_name || '',
          brandcompany_name: '', // not collected in this drawer
          all_centers: allCentersFlag,
          centre_name: centreNameList,
          start_datetime: formatEventDatetimeForApi(data.start_datetime),
          end_datetime: formatEventDatetimeForApi(data.end_datetime),
          assignee: assigneeValue,
          event_type: EVENT_TYPE_API_VALUE.community,
          event_category: '',
          // sub_category: '',
          engagement_mode: '',
          revenue_mode: '',
          community_status: data.community_status || 'Draft',

          spoc_name: null,
          spoc_phone: null,
          spoc_email: null,
          event_details: data.event_details || null,

          // Community-specific fields (as per backend response)
          all_clients: allClientsFlag,
          clients: clientsList,
          participation_type: data.participation_type || '',
          minimum_team_members:
            data.participation_type === 'Team Participation'
              ? Number(data.minimum_team_members || 0)
              : 0,
          maximum_team_members:
            data.participation_type === 'Team Participation'
              ? Number(data.maximum_team_members || 0)
              : 0,
          max_registrations: Number.isNaN(maxRegistrationsNumber) ? 0 : maxRegistrationsNumber,
          registration_deadline: data.registration_deadline || null,
          public_page: null,
          registration_status: '',

          // Other known backend fields (safe defaults)
          // center_name: null,
        };

        const resultAction = await dispatch(createEventThunk(eventData));
        if (createEventThunk.fulfilled.match(resultAction)) {
          showSuccessToast('Event created successfully.');
          onOpenChange(false);
          dispatch(getEventTypeListThunk({ event_type: EVENT_TYPE_API_VALUE.community }));
          dispatch(getEventStatusCountsThunk({ event_type: EVENT_TYPE_API_VALUE.community }));
        } else {
          const errMsg = extractErrorMessage(resultAction.payload, 'Failed to create event');
          throw new Error(errMsg);
        }
      } catch (error) {
        const msg = extractErrorMessage(error, 'Failed to create event');
        showErrorToast(msg, { defaultMessage: 'Failed to create event' });
      }
    },
    [dispatch, onOpenChange],
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[520px] flex flex-col h-full'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <div className='label-medium text-text-strong-950'>Add Community Event</div>
              <div className='paragraph-small text-text-sub-600'>
                Internal client engagement activity
              </div>
            </div>
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onOpenChange}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='py-5 flex flex-col overflow-y-auto h-full'>
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

                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2'>
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
                          variant='default'
                          disabled={isSubmitting}
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
                      id='communityAllCenters'
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
                      htmlFor='communityAllCenters'
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
                          options={resolvedCenterOptions}
                          value={Array.isArray(field.value) ? field.value : []}
                          onValueChange={(value) =>
                            field.onChange(Array.isArray(value) ? value : value ? [value] : [])
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

              {/* Clients Applicable */}
              <section
                className={`flex flex-col gap-3 ${clientsSectionLocked ? 'opacity-60' : ''}`}
              >
                <div className='label-medium text-[var(--color-text-sub-500)]'>
                  Clients Applicable
                </div>
                {clientsSectionLocked ? (
                  <p className='text-paragraph-xs text-text-sub-600'>
                    Select at least one center in the section above
                    {canSelectAllCentersAndClients ? ' (or keep All Centers on)' : ''} before
                    choosing which clients apply.
                  </p>
                ) : null}
                {canSelectAllCentersAndClients ? (
                  <div className='flex w-full gap-2 items-center'>
                    <Checkbox.Root
                      id='allClients'
                      checked={Boolean(allClients)}
                      onCheckedChange={(checked) =>
                        setValue('all_clients', checked === true, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      disabled={isSubmitting || clientsSectionLocked}
                    />
                    <Label.Root
                      htmlFor='allClients'
                      className='text-[var(--color-text-main-900)] paragraph-small cursor-pointer select-none'
                    >
                      All Clients
                    </Label.Root>
                  </div>
                ) : null}
                {!clientsSectionLocked && (canSelectAllCentersAndClients ? !allClients : true) ? (
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Select Clients <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='clients'
                      control={control}
                      render={({ field }) => (
                        <MultiSelect
                          options={resolvedClientOptions}
                          value={Array.isArray(field.value) ? field.value : []}
                          onValueChange={(value) =>
                            field.onChange(Array.isArray(value) ? value : value ? [value] : [])
                          }
                          disabled={isSubmitting || clientsSectionLocked}
                          placeholder='Select Clients'
                          className='w-full'
                          hasError={Boolean(errors.clients)}
                        />
                      )}
                    />
                    {errors.clients ? <ErrorText>{errors.clients.message}</ErrorText> : null}
                  </div>
                ) : null}
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* About */}
              <section className='flex flex-col gap-3'>
                <div className='label-medium text-[var(--color-text-sub-500)]'>About</div>
                <div className='flex flex-col gap-2'>
                  <Label.Root>About Event Details</Label.Root>
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
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* Participation Details */}
              <section className='flex flex-col gap-3'>
                <div className='label-medium text-[var(--color-text-sub-500)]'>
                  Participation Details
                </div>
                <div className='flex flex-col gap-2'>
                  <Label.Root>
                    Participation Type <Label.Asterisk />
                  </Label.Root>
                  <div className='grid grid-cols-2 gap-4'>
                    <button
                      type='button'
                      disabled={isSubmitting}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-left transition-colors',
                        participationType === 'Single Participation'
                          ? 'border-primary-base bg-bg-weak-50'
                          : 'border-stroke-soft-200 bg-bg-white-0 hover:border-stroke-soft-300',
                      )}
                      onClick={() =>
                        setValue('participation_type', 'Single Participation', {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <div className='text-label-sm text-text-strong-950'>Single Participation</div>
                    </button>
                    <button
                      type='button'
                      disabled={isSubmitting}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-left transition-colors',
                        participationType === 'Team Participation'
                          ? 'border-primary-base bg-bg-weak-50'
                          : 'border-stroke-soft-200 bg-bg-white-0 hover:border-stroke-soft-300',
                      )}
                      onClick={() =>
                        setValue('participation_type', 'Team Participation', {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <div className='text-label-sm text-text-strong-950'>Team Participation</div>
                    </button>
                  </div>
                  {errors.participation_type && (
                    <ErrorText>{errors.participation_type.message}</ErrorText>
                  )}
                </div>

                {participationType === 'Team Participation' ? (
                  <div className='grid grid-cols-2 gap-4 pt-1'>
                    <div className='flex flex-col gap-2'>
                      <Label.Root>
                        Minimum Team Members <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='minimum_team_members'
                        control={control}
                        render={({ field }) => (
                          <Input.Root
                            className='w-full'
                            hasError={Boolean(errors.minimum_team_members)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                type='number'
                                min='1'
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                placeholder='Enter minimum'
                                disabled={isSubmitting}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {errors.minimum_team_members && (
                        <ErrorText>{errors.minimum_team_members.message}</ErrorText>
                      )}
                    </div>
                    <div className='flex flex-col gap-2'>
                      <Label.Root>
                        Maximum Team Members <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='maximum_team_members'
                        control={control}
                        render={({ field }) => (
                          <Input.Root
                            className='w-full'
                            hasError={Boolean(errors.maximum_team_members)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                type='number'
                                min='1'
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                placeholder='Enter maximum'
                                disabled={isSubmitting}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {errors.maximum_team_members && (
                        <ErrorText>{errors.maximum_team_members.message}</ErrorText>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* Schedule & Registration */}
              <section className='flex flex-col gap-3'>
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
                  <div className='flex flex-col gap-2'>
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
                    <Label.Root>Max Registrations</Label.Root>
                    <Controller
                      name='max_registrations'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='w-full' hasError={Boolean(errors.max_registrations)}>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              value={field.value ?? ''}
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

                  <div className='flex flex-col gap-2'>
                    <Label.Root>Status</Label.Root>
                    <Controller
                      name='community_status'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.community_status)}
                          disabled={isSubmitting}
                          options={communityStatusOptions}
                          placeholder='Select status'
                          triggerClassName='w-full text-left'
                          showArrow
                        />
                      )}
                    />
                    {errors.community_status && (
                      <ErrorText>{errors.community_status.message}</ErrorText>
                    )}
                  </div>
                </div>

                {/* Approval Required removed */}
              </section>
              <div className='border-b border-stroke-soft-200  px-8' />

              {/* Attachments */}
              <section className='flex flex-col gap-4'>
                <div className='label-medium text-[var(--color-text-sub-500)]'>Attachments</div>

                <Controller
                  name='posterImage'
                  control={control}
                  render={({ field }) => (
                    <UploadField
                      multiple
                      // label='Poster Image'
                      helperText='Click to upload one or more poster images'
                      value={field.value}
                      onPick={(files) =>
                        field.onChange([
                          ...(Array.isArray(field.value) ? field.value : []),
                          ...(Array.isArray(files) ? files : files ? [files] : []),
                        ])
                      }
                      onRemove={() => field.onChange([])}
                      onRemoveFile={(index) => {
                        const v = Array.isArray(field.value) ? field.value : [];
                        field.onChange(v.filter((_, i) => i !== index));
                      }}
                      inputRef={posterInputRef}
                      dragActive={posterDragActive}
                      setDragActive={setPosterDragActive}
                      disabled={isSubmitting}
                    />
                  )}
                />
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
                {isSubmitting ? 'Saving...' : 'Save Community Event'}
              </Button.Root>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateCommunityEvent;
