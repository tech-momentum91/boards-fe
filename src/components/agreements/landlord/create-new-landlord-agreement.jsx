import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  RiCalendarLine,
  RiCloseLine,
  RiFileLine,
  RiInformationLine,
  RiUploadCloud2Line,
  RiUploadLine,
  RiImage2Line,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import ErrorText from '@/components/ui/error-text';
import { Datepicker } from '@/components/ui/datepicker';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import apiClient from '@/api/axios';

import * as FileFormatIcon from '@/components/ui/file-format-icon';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';

import {
  landlordAgreementsSchema,
  defaultLandlordAgreementValues,
} from '@/schemas/landlord-agreements-schema';
import { parseDDMMYYYY } from '@/schemas/agreements-schema';
import { convertDDMMYYYYToYYYYMMDD, formatDDMMYY } from '@/utils/date-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { AGREEMENTS_CHANGE_TYPE_OPTIONS } from '../constants';

import {
  createAgreementThunk,
  addAgreementAttachmentThunk,
  getAgreementsListViewThunk,
  getLandlordCenterListThunk,
} from '@/redux/agreementsSlice';
import { getLandlordListThunk } from '@/redux/landlordSlice';

/** Convert a Date or DD/MM/YYYY string into API format YYYY-MM-DD, or undefined if invalid. */
const toApiDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return format(val, 'yyyy-MM-dd');
  }
  if (typeof val === 'string') {
    const converted = convertDDMMYYYYToYYYYMMDD(val);
    return converted || undefined;
  }
  const d = parseDDMMYYYY(val);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return undefined;
  return format(d, 'yyyy-MM-dd');
};

/** Convert form value (Date or DD/MM/YYYY string) to Date for Datepicker, or undefined. */
const toPickerDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  const d = parseDDMMYYYY(val);
  return d instanceof Date ? d : undefined;
};

/** One dropdown row per distinct `center` id (shops share the same center). */
function uniqueCenterOptionsFromRows(centers) {
  const map = new Map();
  for (const c of centers || []) {
    const id = c?.center ?? c?.id;
    if (id == null || id === '' || map.has(String(id))) continue;
    map.set(String(id), {
      value: String(id),
      label: c.center_name || c.name || String(id),
    });
  }
  return [...map.values()];
}

/** Deduped `Shop-{n}` labels from landlord info `centers[].shop_number`. */
function shopLabelsFromCenterRows(centers) {
  const seen = new Set();
  const labels = [];
  for (const c of centers || []) {
    const sn = c?.shop_number;
    if (sn == null || String(sn).trim() === '') continue;
    const raw = String(sn)
      .trim()
      .replace(/^shop-/i, '');
    if (!raw) continue;
    const label = `Shop-${raw}`;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

/** Visible shop badges before "+n"; overflow shops go in tooltip (same idea as clients Center column). */
const MAX_OFFICE_SHOP_BADGES = 2;

const CreateNewLandlordAgreementDrawer = ({
  open,
  setOpen,
  onSuccess,
  title = 'Create Landlord Agreement',
  description = 'Enter below details to add new landlord agreement.',
  initialValues,
  permissions = {},
}) => {
  const dispatch = useDispatch();
  const photosInputRef = useRef(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(landlordAgreementsSchema),
    defaultValues: defaultLandlordAgreementValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
  });

  const photos = useWatch({ control, name: 'photos' }) || [];
  const watchLandlord = useWatch({ control, name: 'landlord' });
  const watchAgreementStartDate = watch('agreement_start_date');
  const watchRentStartDate = watch('rent_start_date');
  const watchAgreementEndDate = watch('agreement_end_date');
  const watchLockInEndDate = watch('lock_in_end_date');

  const [photoDragActive, setPhotoDragActive] = useState(false);
  const landlordListState = useSelector((state) => state.landlord?.landlordListData || {});
  const landlords = landlordListState.data || [];
  const landlordsLoading = landlordListState.isLoading;
  const landlordsError = landlordListState.error;

  const landlordInfoState = useSelector((state) => state.agreements?.landlordInfo || {});
  const {
    data: landlordInfo = null,
    isLoading: landlordInfoLoading,
    error: landlordInfoError,
  } = landlordInfoState;
  const landlordInfoCenters = Array.isArray(landlordInfo?.centers) ? landlordInfo.centers : [];
  const formValues = watch();
  const landlordOptions = useMemo(() => {
    return (landlords || []).map((l) => ({
      value: l.name,
      label: l.landlord_name || l.name,
    }));
  }, [landlords]);

  useEffect(() => {
    trigger(['rent_start_date', 'agreement_end_date', 'agreement_start_date', 'lock_in_end_date']);
  }, [
    watchAgreementStartDate,
    watchRentStartDate,
    watchAgreementEndDate,
    watchLockInEndDate,
    trigger,
  ]);

  useEffect(() => {
    if (!open) return;
    const nextDefaults = initialValues || defaultLandlordAgreementValues;
    reset(nextDefaults);
    if (Array.isArray(landlordListState.data) && landlordListState.data.length > 0) return;
    dispatch(
      getLandlordListThunk({
        status: 'Active',
        page: 1,
        pageSize: 999,
        append: false,
      }),
    );
  }, [open, initialValues, reset]);

  const centerOptions = useMemo(
    () => uniqueCenterOptionsFromRows(landlordInfoCenters),
    [landlordInfoCenters],
  );

  // Fetch landlords list when drawer opens (for landlord dropdown + autofill)
  // useEffect(() => {
  //   if (!open) return;
  //   // Avoid refetching if we already have landlords loaded

  // }, [open, dispatch, landlordListState.data]);

  // Fetch landlord info to auto-fill non-editable fields and centers list
  useEffect(() => {
    if (!open) return;

    // When editing/creating an amendment with predefined landlord + center info,
    // we should not auto-clear or refetch landlord details. The initialValues
    // already contain the correct read-only data.
    if (initialValues?.landlord) {
      return;
    }

    if (!watchLandlord) {
      setValue('spoc_name', '');
      setValue('spoc_contact', '');
      setValue('spoc_email', '');
      setValue('office', '');
      setValue('center', '');
      setValue('center_name', '');
      return;
    }
    dispatch(getLandlordCenterListThunk({ landlord: watchLandlord }))
      .unwrap()
      .then((res) => {
        const msg = res ?? {};
        setValue('spoc_name', msg?.spoc_name || '');
        setValue('spoc_contact', msg?.spoc_contact || '');
        setValue('spoc_email', msg?.spoc_email || '');
        const centers = Array.isArray(msg?.centers) ? msg.centers : [];
        const shopLabels = shopLabelsFromCenterRows(centers);
        if (shopLabels.length > 0) {
          setValue('office', shopLabels.join(', '), { shouldDirty: true });
        } else if (msg?.office) {
          setValue('office', msg.office, { shouldDirty: true });
        } else {
          setValue('office', '', { shouldDirty: true });
        }

        if (centers.length > 0 && centers[0]?.center != null && centers[0].center !== '') {
          setValue('center', String(centers[0].center));
          setValue('center_name', centers[0].center_name || centers[0].name || '');
        }
      })
      .catch(() => {
        // Errors are handled via redux landlordInfoError; just clear form fields
        setValue('spoc_name', '');
        setValue('spoc_contact', '');
        setValue('spoc_email', '');
        setValue('office', '');
        setValue('center_name', '');
        setValue('center', '');
      });
  }, [open, watchLandlord, setValue, dispatch]);
  const onClose = useCallback(() => {
    const nextDefaults = defaultLandlordAgreementValues;
    // dispatch(resetLandlordInfo());
    reset(nextDefaults);
    setOpen(false);
  }, [initialValues, reset, setOpen]);
  const isAmendment = Boolean(initialValues?.parent_agreement_id);

  const handlePhotosPicked = useCallback(
    (files) => {
      if (!files?.length) return;
      const newPhotos = [...photos, ...files];
      setValue('photos', newPhotos, { shouldDirty: true });
    },
    [photos, setValue],
  );

  const removePhotoAt = useCallback(
    (index) => {
      const next = photos.filter((_, i) => i !== index);
      setValue('photos', next, { shouldDirty: true });
    },
    [photos, setValue],
  );

  const onCreate = useCallback(
    async (data) => {
      if (!permissions?.canCreate) {
        showErrorToast('You do not have permission to create landlord agreements.');
        return;
      }
      try {
        const payload = {
          parent_agreement_id: initialValues?.parent_agreement_id ?? undefined,
          agreement_type: 'Landlord',
          center: data.center,
          landlord: data.landlord,
          office: data.office,
          spoc_name: data.spoc_name || undefined,
          spoc_contact: data.spoc_contact || undefined,
          spoc_email: data.spoc_email || undefined,
          agreement_start_date: toApiDate(data.agreement_start_date),
          landlord_rent_start_date: toApiDate(data.rent_start_date),
          landlord_agreement_end_date: toApiDate(data.agreement_end_date),
          landlord_lock_in_period: data.lock_in_period,
          landlord_lock_in_end_date: toApiDate(data.lock_in_end_date),
          increment_date: data.increment_date ? toApiDate(data.increment_date) : undefined,
          annual_escalation: data.annual_escalation ?? undefined,
          payment_due_day: data.payment_due_day ?? undefined,
          no_of_monthly_deposit: data.no_of_monthly_deposit ?? undefined,
          sec_deposit_amount: data.sec_deposit_amount ?? undefined,
          notice_period_of_client: data.notice_period ?? undefined,
          notice_period_of_devx: data.notice_period_of_devx ?? undefined,
          parking: data.parking || undefined,
          roc: data.roc ? data.change_type : undefined,
          notes: typeof data.notes === 'string' ? data.notes.trim() : '',
        };

        const created = await dispatch(createAgreementThunk(payload)).unwrap();
        const agreementId = created?.name ?? created?.data?.name ?? payload?.name;

        if (agreementId && data.photos?.length > 0) {
          const photoFiles = data.photos.filter((f) => f instanceof File);
          if (photoFiles.length > 0) {
            try {
              await dispatch(
                addAgreementAttachmentThunk({ agreement_id: agreementId, files: photoFiles }),
              ).unwrap();
            } catch (error) {
              showErrorToast(error, {
                defaultMessage: 'Agreement created but attachments could not be added.',
              });
            }
          }
        }

        if (!initialValues?.parent_agreement_id) {
          showSuccessToast('Landlord agreement created successfully.');
        }
        reset();
        onSuccess?.(created ?? payload);
        onClose();
        dispatch(
          getAgreementsListViewThunk({
            keyword: '',
            page: 1,
            page_size: 20,
            filters: [],
            order_by: 'creation desc',
            agreement_type: 'Landlord',
          }),
        );
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create landlord agreement.' });
      }
    },
    [dispatch, onClose, onSuccess, reset, permissions?.canCreate, initialValues],
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          const nextDefaults = initialValues || defaultLandlordAgreementValues;
          reset(nextDefaults);
        }
      }}
    >
      <Drawer.Content className='max-w-[520px] flex flex-col h-full'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <div className='label-medium text-text-strong-950'>{title}</div>
              <div className='paragraph-small text-text-sub-600'>{description}</div>
            </div>
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='py-5 flex flex-col overflow-y-auto'>
          <form className='flex size-full flex-col' onSubmit={handleSubmit(onCreate)}>
            {/* Basic Info */}
            <div className='flex flex-col px-8 gap-4 pb-5'>
              <div className='flex items-center gap-2'>
                <RiInformationLine className='size-4 text-text-sub-600 shrink-0' aria-hidden />
                <span className='label-medium text-[var(--color-text-sub-500)]'>Basic Info</span>
              </div>

              <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                {/* Landlord */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Landlord <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='landlord'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        disabled={isAmendment || landlordsLoading}
                        value={field.value || ''}
                        onValueChange={(value) => {
                          field.onChange(value);
                          reset({
                            ...defaultLandlordAgreementValues,
                            landlord: value,
                            roc: initialValues?.roc,
                          });
                        }}
                        options={landlordOptions}
                        placeholder={
                          landlordsLoading
                            ? 'Loading...'
                            : landlordsError
                              ? 'Failed to load'
                              : 'Select'
                        }
                        searchPlaceholder='Search landlord...'
                        hasError={Boolean(errors.landlord)}
                        showArrow
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.landlord?.message ? (
                    <ErrorText>{errors.landlord.message}</ErrorText>
                  ) : null}
                </div>

                {/* Center (backend: office) */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Center <Label.Asterisk />
                  </Label.Root>
                  {initialValues?.center_name ? (
                    <Controller
                      name='center_name'
                      control={control}
                      render={({ field }) => {
                        return (
                          <Input.Root className='w-full'>
                            <Input.Wrapper>
                              <Input.Input
                                {...field}
                                value={field.value}
                                placeholder='Center'
                                readOnly
                                disabled
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        );
                      }}
                    />
                  ) : (
                    <Controller
                      name='center'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          disabled={!watchLandlord || landlordInfoLoading}
                          value={field.value || ''}
                          onValueChange={(value) => {
                            // update center
                            field.onChange(value);
                            // also update center_name from the option label
                            const selected = centerOptions.find((opt) => opt.value === value);
                            setValue('center_name', selected?.label || '', { shouldDirty: true });
                          }}
                          options={centerOptions}
                          placeholder={landlordInfoLoading ? 'Select the Center first' : 'Select'}
                          searchPlaceholder='Search center...'
                          hasError={Boolean(errors.office)}
                          showArrow
                          isolateSearchKeyboard
                        />
                      )}
                    />
                  )}
                  {errors.office?.message ? <ErrorText>{errors.office.message}</ErrorText> : null}
                </div>

                {/* Office: 2 shop badges like clients-table Center, then plain +n + tooltip "Additional Shops" */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>Office</Label.Root>
                  <Controller
                    name='office'
                    control={control}
                    render={({ field }) => {
                      const spaces = field.value
                        ? String(field.value)
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : [];
                      const visibleShops = spaces.slice(0, MAX_OFFICE_SHOP_BADGES);
                      const additionalShops = spaces.slice(MAX_OFFICE_SHOP_BADGES);
                      const additionalCount = additionalShops.length;
                      return (
                        <div className='flex min-h-9 flex-wrap items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5'>
                          {spaces.length === 0 ? (
                            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                              --
                            </span>
                          ) : (
                            <div className='flex flex-wrap items-center gap-2'>
                              {visibleShops.map((s) => (
                                <Badge.Root key={s} variant='lighter' color='gray' size='medium'>
                                  <span className='paragraph-small font-medium text-text-strong-950 whitespace-nowrap'>
                                    {s}
                                  </span>
                                </Badge.Root>
                              ))}
                              {additionalCount > 0 ? (
                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <span className='paragraph-small cursor-default font-semibold whitespace-nowrap text-text-strong-950'>
                                      +{additionalCount}
                                    </span>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content
                                    size='small'
                                    variant='light'
                                    side='top'
                                    className='max-w-xs'
                                  >
                                    <div className='flex flex-col gap-1'>
                                      <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                                        Additional Shops ({additionalCount})
                                      </span>
                                      <div className='flex flex-col gap-1'>
                                        {additionalShops.map((s) => (
                                          <div
                                            key={s}
                                            className='text-paragraph-sm text-text-sub-600'
                                          >
                                            {s}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </Tooltip.Content>
                                </Tooltip.Root>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>

                {/* SPOC name (autofilled) */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>SPOC name</Label.Root>
                  <Controller
                    name='spoc_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full'>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Name' readOnly />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </div>

                {/* Contact number (autofilled) */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>Contact No.</Label.Root>
                  <Controller
                    name='spoc_contact'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full'>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Contact No' readOnly />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </div>

                {/* Email (autofilled) */}
                <div className='flex flex-col gap-1 '>
                  <Label.Root>E-mail Id</Label.Root>
                  <Controller
                    name='spoc_email'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.spoc_email)}>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Email ID' readOnly />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.spoc_email?.message ? (
                    <ErrorText>{errors.spoc_email.message}</ErrorText>
                  ) : null}
                </div>

                <div className='flex flex-col gap-1 '>
                  <Label.Root> Allocated Parking</Label.Root>
                  <Controller
                    name='parking'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full'>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Enter parking info' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </div>

                {/* ROC (amendment only) */}
                {/* {initialValues?.roc && (
                  <div className='flex items-center'>
                    <label className='flex items-center gap-2 cursor-pointer'>
                      <input
                        type='checkbox'
                        disabled
                        {...register('roc')}
                        className='rounded border-stroke-soft-200 text-primary-base focus:ring-primary-base'
                      />
                      <span className='text-label-sm text-text-strong-950'>ROC</span>
                    </label>
                  </div>
                )} */}
                {initialValues?.roc && (
                  <div className='flex flex-col gap-1'>
                    <Label.Root>
                      Change Type <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='change_type'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          options={AGREEMENTS_CHANGE_TYPE_OPTIONS}
                          placeholder='Select'
                          searchPlaceholder='Search change type...'
                          hasError={Boolean(errors.change_type)}
                          showArrow
                          isolateSearchKeyboard
                        />
                      )}
                    />
                    {errors.change_type?.message ? (
                      <ErrorText>{errors.change_type.message}</ErrorText>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className='border-b border-stroke-soft-200 px-8' />

            {/* Agreement Timeline */}
            <div className='flex flex-col px-8 gap-4 py-5'>
              <div className='flex items-center gap-2'>
                <RiCalendarLine className='size-5 text-text-sub-600' />
                <div className='text-label-sm text-text-strong-950'>Agreement Timeline</div>
              </div>

              <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Agreement Start Date <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='agreement_start_date'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        variant='neutral'
                        mode='stroke'
                        value={toPickerDate(field.value)}
                        onChange={(date) => field.onChange(date ?? undefined)}
                        disabled={isSubmitting}
                        placeholder='DD/MM/YY'
                        formatDate={formatDDMMYY}
                        hasError={!!errors.agreement_start_date}
                        size='medium'
                        className='w-full'
                      />
                    )}
                  />
                  {errors.agreement_start_date?.message ? (
                    <ErrorText>{errors.agreement_start_date.message}</ErrorText>
                  ) : null}
                </div>

                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Rent Start Date <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='rent_start_date'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        variant='neutral'
                        mode='stroke'
                        value={toPickerDate(field.value)}
                        onChange={(date) => field.onChange(date ?? undefined)}
                        disabled={isSubmitting}
                        placeholder='DD/MM/YY'
                        formatDate={formatDDMMYY}
                        hasError={!!errors.rent_start_date}
                        size='medium'
                        className='w-full'
                      />
                    )}
                  />
                  {errors.rent_start_date?.message ? (
                    <ErrorText>{errors.rent_start_date.message}</ErrorText>
                  ) : null}
                </div>

                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Agreement End Date <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='agreement_end_date'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        variant='neutral'
                        mode='stroke'
                        value={toPickerDate(field.value)}
                        onChange={(date) => field.onChange(date ?? undefined)}
                        disabled={isSubmitting}
                        placeholder='DD/MM/YY'
                        formatDate={formatDDMMYY}
                        hasError={!!errors.agreement_end_date}
                        size='medium'
                        className='w-full'
                      />
                    )}
                  />
                  {errors.agreement_end_date?.message ? (
                    <ErrorText>{errors.agreement_end_date.message}</ErrorText>
                  ) : null}
                </div>

                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Lock in End Date <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='lock_in_end_date'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        variant='neutral'
                        mode='stroke'
                        value={toPickerDate(field.value)}
                        onChange={(date) => field.onChange(date ?? undefined)}
                        disabled={isSubmitting}
                        placeholder='DD/MM/YY'
                        formatDate={formatDDMMYY}
                        hasError={!!errors.lock_in_end_date}
                        size='medium'
                        className='w-full'
                      />
                    )}
                  />
                  {errors.lock_in_end_date?.message ? (
                    <ErrorText>{errors.lock_in_end_date.message}</ErrorText>
                  ) : null}
                </div>

                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Lock in Period <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='lock_in_period'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.lock_in_period)}>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            inputMode='numeric'
                            placeholder='Enter months'
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value ?? '';
                              const cleaned = raw.replaceAll(/\D/g, '');
                              if (!cleaned) {
                                field.onChange('');
                                return;
                              }
                              field.onChange(Number(cleaned));
                            }}
                          />
                          <Input.Affix>MONTH</Input.Affix>
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.lock_in_period?.message ? (
                    <ErrorText>{errors.lock_in_period.message}</ErrorText>
                  ) : null}
                </div>

                <div className='flex flex-col gap-1'>
                  <Label.Root>Notice Period</Label.Root>
                  <Controller
                    name='notice_period'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.notice_period)}>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            inputMode='numeric'
                            placeholder='Enter months'
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value ?? '';
                              const cleaned = raw.replaceAll(/\D/g, '');
                              if (!cleaned) {
                                field.onChange(undefined);
                                return;
                              }
                              field.onChange(Number(cleaned));
                            }}
                          />
                          <Input.Affix>MONTH</Input.Affix>
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.notice_period?.message ? (
                    <ErrorText>{errors.notice_period.message}</ErrorText>
                  ) : null}
                </div>
              </div>
            </div>

            <div className='border-b border-stroke-soft-200 px-8' />

            {/* Documents Folder */}
            <div className='flex flex-col px-8 gap-2 py-5'>
              <div className='flex items-center justify-between'>
                <div className='text-label-sm text-text-strong-950'>Documents Folder</div>
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
                  <div className='flex items-center justify-between'>
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

                        <Button.Root
                          type='button'
                          variant='neutral'
                          mode='stroke'
                          size='xxsmall'
                          className='shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'
                          onClick={() => removePhotoAt(index)}
                          aria-label='Remove file'
                        >
                          <Button.Icon as={RiCloseLine} className='size-3 text-text-sub-600' />
                        </Button.Root>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes — same as client create agreement drawer; API wiring later */}
            <div className='flex flex-col px-8 gap-2 py-3'>
              <div className='flex items-center gap-2'>
                <RiFileLine className='size-4 text-text-sub-600 shrink-0' aria-hidden />
                <span className='label-medium text-[var(--color-text-sub-500)]'>Notes</span>
              </div>
              <Textarea.Root
                simple
                className='w-full min-h-[65px]'
                value={watch('notes') || ''}
                onChange={(e) => setValue('notes', e.target.value)}
                placeholder='Type here...'
              />
            </div>

            <div className='border-b border-stroke-soft-200 px-8' />

            {(landlordsError || landlordInfoError) && (
              <div className='px-8 pb-4'>
                <Badge.Root variant='light' color='red'>
                  {landlordsError || landlordInfoError}
                </Badge.Root>
              </div>
            )}
          </form>
        </Drawer.Body>

        <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
          <div className='px-8 py-4 bg-bg-white-0'>
            <div className='flex items-center justify-between gap-3'>
              <Button.Root variant='neutral' mode='stroke' type='button' onClick={onClose}>
                Cancel
              </Button.Root>
              <div className='flex items-center gap-2'>
                <Button.Root
                  type='submit'
                  disabled={!isValid || isSubmitting}
                  onClick={handleSubmit(onCreate)}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button.Root>
              </div>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateNewLandlordAgreementDrawer;
