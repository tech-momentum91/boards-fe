import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import { selectCenterAccess } from '@/redux/centerSlice';
import { z } from 'zod';
import { RiCloseLine, RiInformationLine, RiLink } from 'react-icons/ri';
import { getSalesTeamUserList } from '@/api/crmAccounts';
import { getCpAccountsList } from '@/services/cp-accounts-service';
import { getCpContactsList } from '@/services/cp-contacts-service';
import { getCpContactOptions } from '@/api/crmContacts';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { Datepicker } from '@/components/ui/datepicker';
import { parseToDate } from '@/utils/date-utils';
import { cn } from '@/utils/cn';
import { PhoneInputController } from '@/components/ui/phone-input';
import { createCpContactThunk } from '@/redux/cpContactSlices';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { MultiSelect } from '@/components/ui/multi-select';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';

/** Map CRM contact-options API rows to { value, label } (same as CP contact about page). */
function normalizeCrmSelectOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (item == null) return null;
      if (typeof item === 'string') {
        const s = item.trim();
        return s ? { value: s, label: s } : null;
      }
      const value = String(item.value ?? item.name ?? '').trim();
      const label = String(item.label ?? item.designation ?? item.department ?? value).trim();
      if (!value && !label) return null;
      const v = value || label;
      return { value: v, label: label || v };
    })
    .filter(Boolean);
}

/** Keep a typed value visible if it is missing from the master list (same as about page). */
function withCurrentOptionIfMissing(baseOptions, currentValue) {
  const v = String(currentValue ?? '').trim();
  if (!v) return baseOptions;
  const has = baseOptions.some((o) => String(o?.value ?? '') === v);
  if (has) return baseOptions;
  return [...baseOptions, { value: v, label: v }];
}

/** Select menus portal with z-50; drawer overlay is z-50 — lift above so lists are visible. */
const SELECT_IN_DRAWER_CONTENT_CLASS = 'z-[200]';

/** Keep only digits and a single decimal point so amount inputs stay numeric. */
function sanitizeAmountInput(raw) {
  const cleaned = String(raw ?? '').replaceAll(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replaceAll('.', '');
}

/** Optional numeric (amount) field: empty is allowed, otherwise must be a valid number. */
const optionalAmountSchema = z
  .string()
  .optional()
  .refine((v) => v == null || v === '' || /^\d+(\.\d+)?$/.test(v), 'Enter a valid amount');

const createCpContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]),
  mobileNo: z.string().optional(),
  altMobileNo: z.string().optional(),
  dob: z.string().optional(),
  associateCpAccount: z.string().optional(),
  salesOwner: z.string().optional(),
  reportingManager: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  city: z.array(z.string()).optional(),
  openLeadsAmount: optionalAmountSchema,
  wonAmount: optionalAmountSchema,
  primaryContact: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
});

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
  mobileNo: '',
  altMobileNo: '',
  dob: '',
  associateCpAccount: '',
  salesOwner: '',
  reportingManager: '',
  designation: '',
  department: '',
  city: [],
  openLeadsAmount: '',
  wonAmount: '',
  primaryContact: 'Yes',
  linkedin: '',
  facebook: '',
  instagram: '',
};

const CreateNewCpContactModal = ({
  open,
  setOpen,
  onSuccess,
  defaultCpAccountId,
  defaultCpAccountLabel,
  lockCpAccount = false,
}) => {
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);
  const [cpAccountOptions, setCpAccountOptions] = useState([]);
  const [cpAccountsLoading, setCpAccountsLoading] = useState(false);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [salesOwnerOptionsLoading, setSalesOwnerOptionsLoading] = useState(false);
  const [crmDesignationOptions, setCrmDesignationOptions] = useState([]);
  // console.log('crmDesignationOptions is ....',crmDesignationOptions);
  const [crmDepartmentOptions, setCrmDepartmentOptions] = useState([]);
  const [crmFieldOptionsLoading, setCrmFieldOptionsLoading] = useState(false);
  const [reportingManagerOptions, setReportingManagerOptions] = useState([]);
  const [reportingManagerLoading, setReportingManagerLoading] = useState(false);
  const prevAssociateCpAccountRef = useRef(undefined);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCpContactSchema),
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const centers = useMemo(
    () => (Array.isArray(centerAccess?.selectedCenters) ? centerAccess.selectedCenters : []),
    [centerAccess?.selectedCenters],
  );

  const associateCpAccountWatch = useWatch({
    control,
    name: 'associateCpAccount',
    defaultValue: '',
  });

  const salesOwnerSelectOptions = useMemo(
    () => [{ value: '__none__', label: '—' }, ...salesOwnerOptions],
    [salesOwnerOptions],
  );

  useEffect(() => {
    if (!open) {
      prevAssociateCpAccountRef.current = undefined;
      return;
    }
    const prev = prevAssociateCpAccountRef.current;
    if (prev !== undefined && String(prev) !== String(associateCpAccountWatch ?? '')) {
      setValue('reportingManager', '');
    }
    prevAssociateCpAccountRef.current = associateCpAccountWatch;
  }, [open, associateCpAccountWatch, setValue]);

  useEffect(() => {
    if (!open || !associateCpAccountWatch || centers.length === 0) {
      setReportingManagerOptions([]);
      setReportingManagerLoading(false);
      return;
    }
    let cancelled = false;
    setReportingManagerLoading(true);
    getCpContactsList({
      centers,
      cpAccount: [associateCpAccountWatch],
    })
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setReportingManagerOptions([]);
          return;
        }
        const list = result.data ?? [];
        setReportingManagerOptions(
          list
            .map((c) => ({
              value: String(c.id ?? ''),
              label: String(c.name ?? '').trim() || String(c.id ?? ''),
            }))
            .filter((o) => o.value),
        );
      })
      .catch(() => {
        if (!cancelled) setReportingManagerOptions([]);
      })
      .finally(() => {
        if (!cancelled) setReportingManagerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, associateCpAccountWatch, centers]);

  // Sales Owner options from API (same as create CP account modal and contact about)
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setSalesOwnerOptionsLoading(true);
    getSalesTeamUserList()
      .then((list) => {
        const raw = Array.isArray(list) ? list : (list?.results ?? list?.message ?? []);
        const arr = Array.isArray(raw) ? raw : [];
        const options = arr
          .map((item) => ({
            value: item.value ?? item.id ?? item.email ?? item.name ?? '',
            label: item.label ?? item.full_name ?? item.name ?? item.value ?? '–',
          }))
          .filter((o) => o.value);
        if (isMounted) setSalesOwnerOptions(options);
      })
      .catch(() => {
        if (isMounted) setSalesOwnerOptions([]);
      })
      .finally(() => {
        if (isMounted) setSalesOwnerOptionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setCrmFieldOptionsLoading(true);
    getCpContactOptions()
      .then((opts) => {
        if (!isMounted) return;
        setCrmDesignationOptions(normalizeCrmSelectOptions(opts?.designation));
        setCrmDepartmentOptions(normalizeCrmSelectOptions(opts?.department));
      })
      .catch(() => {
        if (isMounted) {
          setCrmDesignationOptions([]);
          setCrmDepartmentOptions([]);
        }
      })
      .finally(() => {
        if (isMounted) setCrmFieldOptionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (open && centers.length > 0) {
      setCpAccountsLoading(true);
      getCpAccountsList({ centers, type: 'all' })
        .then((result) => {
          if (result.error) {
            setCpAccountOptions([]);
            return;
          }
          const list = result.data ?? [];
          let options = list.map((a) => ({
            value: a.id,
            label: a.legalName || a.brandName || a.id || '–',
          }));
          if (defaultCpAccountId && !options.some((o) => o.value === defaultCpAccountId)) {
            options = [
              {
                value: defaultCpAccountId,
                label: defaultCpAccountLabel || defaultCpAccountId,
              },
              ...options,
            ];
          }
          setCpAccountOptions(options);
        })
        .catch(() => setCpAccountOptions([]))
        .finally(() => setCpAccountsLoading(false));
    } else if (open && centers.length === 0) {
      setCpAccountOptions([]);
    }
  }, [open, centers, defaultCpAccountId, defaultCpAccountLabel]);

  useEffect(() => {
    if (open) {
      reset({
        ...defaultValues,
        associateCpAccount: defaultCpAccountId || '',
      });
    }
  }, [open, defaultCpAccountId, reset]);

  const onClose = () => {
    if (!isSubmitting) setOpen(false);
  };

  const onCreate = async (data) => {
    try {
      if (centers.length === 0) {
        showErrorToast('Please select at least one center from the toolbar.');
        return;
      }
      const payload = {
        firstName: data.firstName?.trim() || '',
        lastName: data.lastName?.trim() || '',
        email: data.email?.trim() || '',
        mobileNo: data.mobileNo || undefined,
        altMobileNo: data.altMobileNo || undefined,
        dob: data.dob?.trim() || undefined,
        cpAccountId: data.associateCpAccount || defaultCpAccountId || '',
        salesOwner: data.salesOwner || undefined,
        reportingManager: data.reportingManager?.trim() || undefined,
        designation: data.designation || undefined,
        department: data.department || undefined,
        city: data.city?.length ? data.city : undefined,
        openLeadsAmount: data.openLeadsAmount?.trim() ? Number(data.openLeadsAmount) : undefined,
        wonAmount: data.wonAmount?.trim() ? Number(data.wonAmount) : undefined,
        primaryContact: data.primaryContact === 'Yes',
        linkedin: data.linkedin?.trim() || undefined,
        facebook: data.facebook?.trim() || undefined,
        instagram: data.instagram?.trim() || undefined,
      };
      await dispatch(createCpContactThunk(payload)).unwrap();
      showSuccessToast('CP Contact created successfully.');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create CP contact. Please try again.' });
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Content className='max-w-[520px]'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <div className='label-medium text-text-strong-950'>Add New CP Contact</div>
              <div className='paragraph-small text-text-sub-600'>
                Enter below details to add new CP Contact.
              </div>
            </div>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              type='button'
              onClick={onClose}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>
        <form onSubmit={handleSubmit(onCreate)} className='flex size-full flex-col'>
          <Drawer.Body className='flex-1 py-5 overflow-y-auto'>
            {/* Basic Information */}
            <div className='flex flex-col px-8 gap-4 pb-5'>
              <div className='flex items-center gap-2 text-label-sm text-text-strong-950'>
                <RiInformationLine className='size-4 text-text-sub-600' />
                Basic Information
              </div>
              <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    First Name <Label.Asterisk />
                  </Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.firstName)}>
                    <Input.Wrapper>
                      <Input.Input placeholder='Enter first name' {...register('firstName')} />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.firstName?.message ? (
                    <ErrorText>{errors.firstName.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Last Name <Label.Asterisk />
                  </Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.lastName)}>
                    <Input.Wrapper>
                      <Input.Input placeholder='Enter last name' {...register('lastName')} />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.lastName?.message ? (
                    <ErrorText>{errors.lastName.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Email</Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.email)}>
                    <Input.Wrapper>
                      <Input.Input
                        type='email'
                        placeholder='hello@alignui.com'
                        {...register('email')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.email?.message ? <ErrorText>{errors.email.message}</ErrorText> : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Mobile No.</Label.Root>
                  <Controller
                    name='mobileNo'
                    control={control}
                    render={({ field }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={(formattedValue) => field.onChange(formattedValue)}
                        placeholder='0000000000'
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Alt. Mobile No.</Label.Root>
                  <Controller
                    name='altMobileNo'
                    control={control}
                    render={({ field }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={(formattedValue) => field.onChange(formattedValue)}
                        placeholder='0000000000'
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>DOB</Label.Root>
                  <Controller
                    name='dob'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        value={field.value ? parseToDate(field.value) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        placeholder='Select date of birth'
                        variant='stroke'
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Associate CP Account</Label.Root>
                  <Controller
                    name='associateCpAccount'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={cpAccountsLoading ? [] : cpAccountOptions}
                        placeholder={cpAccountsLoading ? 'Loading...' : 'Select'}
                        searchPlaceholder='Search...'
                        noResultsMessage='No CP accounts found'
                        emptyMessage={
                          cpAccountsLoading
                            ? 'Loading...'
                            : cpAccountOptions.length === 0
                              ? 'Select a center first or no CP accounts found.'
                              : 'No CP accounts available'
                        }
                        hasError={Boolean(errors.associateCpAccount)}
                        disabled={cpAccountsLoading || lockCpAccount}
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.associateCpAccount?.message ? (
                    <ErrorText>{errors.associateCpAccount.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Sales Owner</Label.Root>
                  <Controller
                    name='salesOwner'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={salesOwnerOptionsLoading ? [] : salesOwnerSelectOptions}
                        valueSentinel='__none__'
                        placeholder={salesOwnerOptionsLoading ? 'Loading...' : 'Select'}
                        searchPlaceholder='Search...'
                        noResultsMessage='No sales owners found'
                        emptyMessage={
                          salesOwnerOptionsLoading
                            ? 'Loading...'
                            : salesOwnerOptions.length === 0
                              ? 'No options'
                              : 'No sales owners available'
                        }
                        disabled={salesOwnerOptionsLoading}
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Reporting Manager</Label.Root>
                  <Controller
                    name='reportingManager'
                    control={control}
                    render={({ field }) => {
                      const accountSelected =
                        String(associateCpAccountWatch ?? '').trim().length > 0;
                      const selectDisabled = !accountSelected || reportingManagerLoading;
                      const optionsForList =
                        reportingManagerLoading || !accountSelected
                          ? []
                          : [{ value: '__none__', label: '—' }, ...reportingManagerOptions];
                      let reportingPlaceholder = 'Select reporting manager';
                      if (accountSelected && reportingManagerLoading) {
                        reportingPlaceholder = 'Loading...';
                      } else if (!accountSelected) {
                        reportingPlaceholder = 'Select CP account first';
                      }
                      let reportingEmptyMessage = 'No reporting managers available';
                      if (!accountSelected) {
                        reportingEmptyMessage = 'Select a CP account to load contacts.';
                      } else if (reportingManagerLoading) {
                        reportingEmptyMessage = 'Loading...';
                      } else if (reportingManagerOptions.length === 0) {
                        reportingEmptyMessage = 'No other contacts on this account yet.';
                      }
                      return (
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={optionsForList}
                          valueSentinel='__none__'
                          disabled={selectDisabled}
                          placeholder={reportingPlaceholder}
                          searchPlaceholder='Search...'
                          noResultsMessage='No reporting managers found'
                          emptyMessage={reportingEmptyMessage}
                          triggerClassName='w-full'
                          contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                          isolateSearchKeyboard
                        />
                      );
                    }}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Designation</Label.Root>
                  <Controller
                    name='designation'
                    control={control}
                    render={({ field }) => {
                      const merged = withCurrentOptionIfMissing(
                        crmDesignationOptions,
                        String(field.value ?? '').trim(),
                      );
                      const selectOptions = [{ value: '__none__', label: '—' }, ...merged];
                      return (
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={selectOptions}
                          valueSentinel='__none__'
                          placeholder={
                            crmFieldOptionsLoading && crmDesignationOptions.length === 0
                              ? 'Loading...'
                              : 'Select designation'
                          }
                          searchPlaceholder='Search...'
                          noResultsMessage='No designations found'
                          emptyMessage='No designations available'
                          triggerClassName='w-full'
                          contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                          isolateSearchKeyboard
                        />
                      );
                    }}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Department</Label.Root>
                  <Controller
                    name='department'
                    control={control}
                    render={({ field }) => {
                      const merged = withCurrentOptionIfMissing(
                        crmDepartmentOptions,
                        String(field.value ?? '').trim(),
                      );
                      const selectOptions = [{ value: '__none__', label: '—' }, ...merged];
                      return (
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={selectOptions}
                          valueSentinel='__none__'
                          placeholder={
                            crmFieldOptionsLoading && crmDepartmentOptions.length === 0
                              ? 'Loading...'
                              : 'Select department'
                          }
                          searchPlaceholder='Search...'
                          noResultsMessage='No departments found'
                          emptyMessage='No departments available'
                          triggerClassName='w-full'
                          contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                          isolateSearchKeyboard
                        />
                      );
                    }}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>City</Label.Root>
                  <Controller
                    name='city'
                    control={control}
                    render={({ field }) => (
                      <MultiSelect
                        value={field.value || []}
                        onValueChange={field.onChange}
                        options={INDIA_CITY_OPTIONS}
                        placeholder='Select cities'
                        searchPlaceholder='Search cities...'
                        size='medium'
                        enableSearch
                        enableVirtualization
                        className='w-full'
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Open Leads Amount (₹)</Label.Root>
                  <Controller
                    name='openLeadsAmount'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.openLeadsAmount)}>
                        <Input.Wrapper>
                          <Input.Input
                            inputMode='decimal'
                            placeholder='Enter amount'
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(sanitizeAmountInput(e.target.value))}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.openLeadsAmount?.message ? (
                    <ErrorText>{errors.openLeadsAmount.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Won Amount (₹)</Label.Root>
                  <Controller
                    name='wonAmount'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.wonAmount)}>
                        <Input.Wrapper>
                          <Input.Input
                            inputMode='decimal'
                            placeholder='Enter amount'
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(sanitizeAmountInput(e.target.value))}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.wonAmount?.message ? (
                    <ErrorText>{errors.wonAmount.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Primary Contact</Label.Root>
                  <Controller
                    name='primaryContact'
                    control={control}
                    render={({ field }) => {
                      const value = field.value || 'Yes';
                      return (
                        <div
                          className={cn(
                            'flex w-full overflow-hidden rounded-lg border border-stroke-soft-200',
                            'bg-bg-white-0 shadow-regular-xs',
                          )}
                          role='group'
                          aria-label='Primary Contact'
                        >
                          <button
                            type='button'
                            onClick={() => field.onChange('Yes')}
                            className={cn(
                              'flex-1 py-2 px-3 text-paragraph-sm outline-none transition-colors min-h-[40px]',
                              value === 'Yes'
                                ? 'bg-primary-lighter text-primary-base font-medium'
                                : 'bg-bg-white-0 text-text-soft-400 hover:bg-bg-weak-50',
                            )}
                          >
                            Yes
                          </button>
                          <div className='w-px shrink-0 bg-stroke-soft-200' aria-hidden />
                          <button
                            type='button'
                            onClick={() => field.onChange('No')}
                            className={cn(
                              'flex-1 py-2 px-3 text-paragraph-sm outline-none transition-colors min-h-[40px]',
                              value === 'No'
                                ? 'bg-primary-lighter text-primary-base font-medium'
                                : 'bg-bg-white-0 text-text-soft-400 hover:bg-bg-weak-50',
                            )}
                          >
                            No
                          </button>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            </div>

            <div className='border-b border-stroke-soft-200 px-8' />

            {/* Social Links */}
            <div className='flex flex-col px-8 gap-4 py-5'>
              <div className='flex items-center gap-2 text-label-sm text-text-strong-950'>
                <RiLink className='size-4 text-text-sub-600' />
                Social Links
              </div>
              <div className='grid grid-cols-1 gap-4'>
                <div className='flex flex-col gap-1'>
                  <Label.Root>LinkedIn</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='https://www.linkedin.com/in/username'
                        {...register('linkedin')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Facebook</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='https://www.facebook.com/username'
                        {...register('facebook')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Instagram</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='https://www.instagram.com/username'
                        {...register('instagram')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
            <div className='px-8 py-4 bg-bg-white-0'>
              <div className='flex items-center justify-between gap-3'>
                <Button.Root variant='neutral' mode='stroke' type='button' onClick={onClose}>
                  Cancel
                </Button.Root>
                <Button.Root
                  type='submit'
                  disabled={!isValid || isSubmitting}
                  variant='primary'
                  mode='filled'
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </Button.Root>
              </div>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateNewCpContactModal;
