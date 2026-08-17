import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  RiUserAddLine,
  RiCalendarLine,
  RiInformationLine,
  RiInformationFill,
} from 'react-icons/ri';
import { CiLink } from 'react-icons/ci';
import { MdOutlineSubscriptions } from 'react-icons/md';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import { Datepicker } from '@/components/ui/datepicker';
import { PhoneInputController } from '@/components/ui/phone-input';

import {
  DESIGNATION_OPTIONS,
  DEPARTMENT_OPTIONS,
  SELECT_NONE_VALUE,
  SUBSCRIPTION_STATUS_OPTIONS,
  SUBSCRIPTION_TYPE_OPTIONS,
  UNSUBSCRIBED_REASON_OPTIONS,
} from './constants';
import { MultiSelect } from '@/components/ui/multi-select';
import { CityCombobox } from '@/components/crm-leads/city-combobox';
import { createCrmContact } from '@/api/crmContacts';
import {
  getCpAccountOptions,
  getCpContactLinkOptions,
  getCpContactsForCpAccount,
} from '@/api/crmLeads';
import { format } from 'date-fns';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

// Schema when account is fixed (e.g. inside account detail)
const contactSchemaWithAccount = z.object({
  first_name: z.string().min(1, 'First Name is required'),
  last_name: z.string().optional(),
  email: z.union([z.literal(''), z.string().email('Invalid email address')]),
  mobile_number: z.string().optional(),
  alt_mobile_number: z.string().optional(),
  dob: z.date().optional().nullable(),
  associate_account: z.string().optional(),
  cp_account: z.string().optional(),
  cp_contact: z.string().optional(),
  sales_owner: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  city: z.string().optional(),
  subscription_status: z.string().optional(),
  amb_subscription_status: z.string().optional(),
  subscription_type: z.array(z.string()).optional().default([]),
  unsubscribed_reason: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
});

const contactSchema = contactSchemaWithAccount;

const defaultValues = {
  first_name: '',
  last_name: '',
  email: '',
  mobile_number: '',
  alt_mobile_number: '',
  dob: null,
  associate_account: '',
  cp_account: '',
  cp_contact: '',
  sales_owner: '',
  designation: '',
  department: '',
  city: '',
  subscription_status: '',
  amb_subscription_status: '',
  subscription_type: [],
  unsubscribed_reason: '',
  linkedin: '',
  facebook: '',
  instagram: '',
};

// ── UI Helpers ─────────────────────────────────────────────────────────────
const SectionTitle = ({ icon, children }) => (
  <div className='flex items-center gap-2 mb-4 mt-6 first:mt-0'>
    <span className='text-text-sub-400'>{icon}</span>
    {children}
  </div>
);

// ── Component ────────────────────────────────────────────────────────────────
const CrmContactCreateDrawer = ({
  open,
  onOpenChange,
  onSuccess,
  contactOptions = {},
  fixedAccount,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cpAccountOptions, setCpAccountOptions] = useState([]);
  const [cpContactOptions, setCpContactOptions] = useState([]);
  const useFixedAccount = Boolean(fixedAccount && String(fixedAccount).trim());

  const designationOptions =
    contactOptions?.designation?.length > 0 ? contactOptions.designation : DESIGNATION_OPTIONS;
  const departmentOptions =
    contactOptions?.department?.length > 0 ? contactOptions.department : DEPARTMENT_OPTIONS;
  const subscriptionTypeOptions =
    contactOptions?.subscription_type?.length > 0
      ? contactOptions.subscription_type
      : SUBSCRIPTION_TYPE_OPTIONS;
  const subscriptionStatusOptions =
    contactOptions?.subscription_status?.length > 0
      ? [{ value: SELECT_NONE_VALUE, label: '—' }, ...contactOptions.subscription_status]
      : SUBSCRIPTION_STATUS_OPTIONS;
  const unsubscribedReasonOptions =
    contactOptions?.unsubscribed_reason?.length > 0
      ? [{ value: SELECT_NONE_VALUE, label: 'Select' }, ...contactOptions.unsubscribed_reason]
      : UNSUBSCRIBED_REASON_OPTIONS;
  const accountOptions = contactOptions?.account?.length > 0 ? contactOptions.account : [];
  const salesOwnerOptions =
    contactOptions?.sales_owner?.length > 0 ? contactOptions.sales_owner : [];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(useFixedAccount ? contactSchemaWithAccount : contactSchema),
    defaultValues,
  });

  const watchedCpAccount = useWatch({ control, name: 'cp_account' });
  const watchedCpContact = useWatch({ control, name: 'cp_contact' });

  useEffect(() => {
    if (!open) return;
    Promise.all([getCpAccountOptions(), getCpContactLinkOptions()]).then(
      ([cpAccounts, cpContacts]) => {
        setCpAccountOptions(Array.isArray(cpAccounts) ? cpAccounts : []);
        setCpContactOptions(Array.isArray(cpContacts) ? cpContacts : []);
      },
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const cp = String(watchedCpAccount || '').trim();
    const load = cp ? getCpContactsForCpAccount(cp) : getCpContactLinkOptions();
    load
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list : [];
        setCpContactOptions(mapped);
        const cur = getValues('cp_contact');
        if (cur && !mapped.some((o) => o.value === cur)) {
          setValue('cp_contact', '');
        }
      })
      .catch(() => {
        if (!cancelled) setCpContactOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, watchedCpAccount, getValues, setValue]);

  const cpContactOptionsForSelect = useMemo(() => {
    const raw = cpContactOptions;
    const selected = String(watchedCpContact || '').trim();
    if (selected && !raw.some((o) => String(o.value) === selected)) {
      return [{ value: selected, label: selected }, ...raw];
    }
    return raw;
  }, [cpContactOptions, watchedCpContact]);

  useEffect(() => {
    if (open && useFixedAccount) {
      setValue('associate_account', fixedAccount.trim());
    }
  }, [open, useFixedAccount, fixedAccount, setValue]);

  const subscriptionStatus = watch('subscription_status');
  // Clear unsubscribed_reason when not Unsubscribed
  useEffect(() => {
    if (subscriptionStatus !== 'Unsubscribed') {
      setValue('unsubscribed_reason', '');
    }
  }, [subscriptionStatus, setValue]);

  const handleClose = () => {
    reset(defaultValues);
    onOpenChange?.(false);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const accountValue = useFixedAccount
        ? String(fixedAccount || '').trim()
        : (data.associate_account || '').trim();
      const payload = {
        first_name: (data.first_name || '').trim(),
        last_name: (data.last_name || '').trim(),
        email: (data.email || '').trim(),
        mobile_number: (data.mobile_number || '').trim() || undefined,
        alt_mobile_number: (data.alt_mobile_number || '').trim() || undefined,
        dob: data.dob ? format(data.dob, 'yyyy-MM-dd') : undefined,
        associate_account: accountValue,
        cp_account: String(data.cp_account || '').trim() || undefined,
        cp_contact: String(data.cp_contact || '').trim() || undefined,
        sales_owner: (data.sales_owner || '').trim() || undefined,
        designation: (data.designation || '').trim() || undefined,
        department: (data.department || '').trim() || undefined,
        city: (data.city || '').trim() || undefined,
        subscription_status: (data.subscription_status || '').trim() || undefined,
        amb_subscription_status: (data.amb_subscription_status || '').trim() || undefined,
        subscription_type: Array.isArray(data.subscription_type) ? data.subscription_type : [],
        unsubscribed_reason: (data.unsubscribed_reason || '').trim() || undefined,
        linkedin: (data.linkedin || '').trim() || undefined,
        facebook: (data.facebook || '').trim() || undefined,
        instagram: (data.instagram || '').trim() || undefined,
      };
      const result = await createCrmContact(payload);
      const name = typeof result === 'object' && result !== null ? result?.name : result;
      showSuccessToast('Contact created successfully');
      const createdContact =
        typeof result === 'object' && result !== null
          ? { ...result, ...payload, name }
          : name
            ? { ...payload, name: String(name) }
            : null;
      await onSuccess?.(createdContact);
      handleClose();
    } catch (error) {
      const message =
        error?.response?.data?.exception ||
        error?.response?.data?.message ||
        'Failed to create contact';
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='flex flex-col w-[640px] shadow-2xl'>
        {/* Header */}
        <Drawer.Header className='px-8 py-5'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-500'>
              <RiUserAddLine size={20} />
            </div>
            <div>
              <Drawer.Title>Add New Contact</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-600 mt-0.5'>
                Enter below details to add new contact.
              </p>
            </div>
          </div>
        </Drawer.Header>

        {/* Body */}
        <div className='flex-1 overflow-y-auto'>
          <form id='contact-create-form' onSubmit={handleSubmit(onSubmit)}>
            <div className='flex flex-col divide-y divide-stroke-soft-200'>
              {/* ── Basic Information ──────────────────────────────────────── */}
              <div className='pt-5 pb-6 px-8 flex flex-col'>
                <SectionTitle icon={<RiInformationLine size={16} />}>
                  <h3 className='text-label-md text-neutral-500'>Basic Information</h3>
                </SectionTitle>

                <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                  {/* First Name */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='first_name'>
                      First Name
                      <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='first_name'
                      control={control}
                      render={({ field }) => (
                        <Input.Root hasError={Boolean(errors.first_name)} size='medium'>
                          <Input.Wrapper>
                            <Input.Input
                              id='first_name'
                              {...field}
                              placeholder='Enter first name'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.first_name && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiInformationFill} />
                        {errors.first_name.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='last_name'>Last Name</Label.Root>
                    <Controller
                      name='last_name'
                      control={control}
                      render={({ field }) => (
                        <Input.Root hasError={Boolean(errors.last_name)} size='medium'>
                          <Input.Wrapper>
                            <Input.Input id='last_name' {...field} placeholder='Enter last name' />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.last_name && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiInformationFill} />
                        {errors.last_name.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* Department */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='department'>Department</Label.Root>
                    <Controller
                      name='department'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          id='department'
                          value={field.value}
                          onValueChange={field.onChange}
                          options={departmentOptions}
                          placeholder='Select'
                          searchPlaceholder='Search department...'
                          noResultsMessage='No departments found'
                          emptyMessage='No departments available'
                        />
                      )}
                    />
                  </div>

                  {/* Designation */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='designation'>Designation</Label.Root>
                    <Controller
                      name='designation'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          id='designation'
                          value={field.value}
                          onValueChange={field.onChange}
                          options={designationOptions}
                          placeholder='Select'
                          searchPlaceholder='Search designation...'
                          noResultsMessage='No designations found'
                          emptyMessage='No designations available'
                        />
                      )}
                    />
                  </div>

                  {/* Email */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='email'>Email</Label.Root>
                    <Controller
                      name='email'
                      control={control}
                      render={({ field }) => (
                        <Input.Root hasError={Boolean(errors.email)} size='medium'>
                          <Input.Wrapper>
                            <Input.Input id='email' {...field} placeholder='hello@alignui.com' />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.email && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiInformationFill} />
                        {errors.email.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='dob'>Date of Birth</Label.Root>
                    <Controller
                      name='dob'
                      control={control}
                      render={({ field }) => (
                        <Datepicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='DD / MM / YYYY'
                          variant='stroke'
                          suffixIcon={<RiCalendarLine className='text-text-sub-400' />}
                          size='medium'
                          id='dob'
                        />
                      )}
                    />
                  </div>

                  {/* Phone Number */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='mobile_number'>Contact</Label.Root>
                    <Controller
                      name='mobile_number'
                      control={control}
                      render={({ field }) => (
                        <PhoneInputController
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          placeholder='0000000000'
                          size='medium'
                        />
                      )}
                    />
                  </div>

                  {/* Alternate Phone Number */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='alt_mobile_number'>Alternate Contact</Label.Root>
                    <Controller
                      name='alt_mobile_number'
                      control={control}
                      render={({ field }) => (
                        <PhoneInputController
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          placeholder='0000000000'
                          size='medium'
                        />
                      )}
                    />
                  </div>

                  {/* City */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='city'>City</Label.Root>
                    <Controller
                      name='city'
                      control={control}
                      render={({ field }) => (
                        <CityCombobox
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder='Search city...'
                        />
                      )}
                    />
                  </div>

                  {/* Sales Owner */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='sales_owner'>Sales Owner</Label.Root>
                    <Controller
                      name='sales_owner'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          id='sales_owner'
                          value={field.value}
                          onValueChange={field.onChange}
                          options={salesOwnerOptions}
                          placeholder='Select'
                          searchPlaceholder='Search sales owner...'
                          noResultsMessage='No sales owners found'
                          emptyMessage='No sales owners available'
                        />
                      )}
                    />
                  </div>

                  {/* Associate Account — hidden when fixedAccount is set (e.g. inside account detail) */}
                  {!useFixedAccount && (
                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor='associate_account'>Associate Account</Label.Root>
                      <Controller
                        name='associate_account'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            id='associate_account'
                            value={field.value}
                            onValueChange={field.onChange}
                            options={accountOptions}
                            placeholder='Select'
                            searchPlaceholder='Search account...'
                            noResultsMessage='No accounts found'
                            emptyMessage='No accounts available'
                            hasError={Boolean(errors.associate_account)}
                            isolateSearchKeyboard
                          />
                        )}
                      />
                      {errors.associate_account && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiInformationFill} />
                          {errors.associate_account.message}
                        </Hint.Root>
                      )}
                    </div>
                  )}

                  {/* CP Account */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='cp_account'>CP Account</Label.Root>
                    <Controller
                      name='cp_account'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          id='cp_account'
                          value={field.value}
                          onValueChange={(next) => {
                            if (String(next || '') !== String(field.value || '')) {
                              setValue('cp_contact', '');
                            }
                            field.onChange(next);
                          }}
                          options={cpAccountOptions}
                          valueSentinel='__none__'
                          placeholder='Select'
                          searchPlaceholder='Search CP account...'
                          noResultsMessage='No CP accounts found'
                          emptyMessage='No CP accounts available'
                          isolateSearchKeyboard
                        />
                      )}
                    />
                  </div>

                  {/* CP Contact */}
                  <div className='flex flex-col gap-1'>
                    <Label.Root htmlFor='cp_contact'>CP Contact</Label.Root>
                    <Controller
                      name='cp_contact'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          id='cp_contact'
                          value={field.value}
                          onValueChange={field.onChange}
                          options={cpContactOptionsForSelect}
                          placeholder='Select'
                          searchPlaceholder='Search CP contact...'
                          noResultsMessage='No CP contacts found'
                          emptyMessage='No CP contacts available'
                          isolateSearchKeyboard
                        />
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* ── Subscription ───────────────────────────────────────────── */}
              <div className='px-6 py-6 flex flex-col'>
                <SectionTitle icon={<MdOutlineSubscriptions size={16} />}>
                  <h3 className='text-label-md text-neutral-500'>Subscription</h3>
                </SectionTitle>
                <div className='flex flex-col gap-4'>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor='subscription_status'>Subscription Status</Label.Root>
                      <Controller
                        name='subscription_status'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            id='subscription_status'
                            value={field.value}
                            onValueChange={field.onChange}
                            options={subscriptionStatusOptions}
                            placeholder='Select'
                            searchPlaceholder='Search status...'
                            noResultsMessage='No statuses found'
                            emptyMessage='No statuses available'
                          />
                        )}
                      />
                    </div>

                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor='subscription_type'>Subscription Type</Label.Root>
                      <Controller
                        name='subscription_type'
                        control={control}
                        render={({ field }) => (
                          <MultiSelect
                            options={subscriptionTypeOptions}
                            value={Array.isArray(field.value) ? field.value : []}
                            onValueChange={field.onChange}
                            placeholder='Select'
                            size='medium'
                            maxDisplayItems={3}
                          />
                        )}
                      />
                    </div>

                    <div className='flex flex-col gap-1 col-span-2'>
                      <Label.Root htmlFor='amb_subscription_status'>
                        AMB Subscription Status
                      </Label.Root>
                      <Controller
                        name='amb_subscription_status'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            id='amb_subscription_status'
                            value={field.value}
                            onValueChange={field.onChange}
                            options={subscriptionStatusOptions}
                            placeholder='Select'
                            searchPlaceholder='Search status...'
                            noResultsMessage='No statuses found'
                            emptyMessage='No statuses available'
                            itemKeyPrefix='amb-create-'
                          />
                        )}
                      />
                    </div>
                  </div>

                  {subscriptionStatus === 'Unsubscribed' && (
                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor='unsubscribed_reason'>Unsubscribed Reason</Label.Root>
                      <Controller
                        name='unsubscribed_reason'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            id='unsubscribed_reason'
                            value={field.value}
                            onValueChange={field.onChange}
                            options={unsubscribedReasonOptions}
                            valueSentinel={SELECT_NONE_VALUE}
                            placeholder='Select'
                            searchPlaceholder='Search reason...'
                            noResultsMessage='No reasons found'
                            emptyMessage='No reasons available'
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Social Links ───────────────────────────────────────────── */}
              <div className='px-6 py-6 flex flex-col'>
                <SectionTitle icon={<CiLink size={16} />}>
                  <h3 className='text-label-md text-neutral-500'>Social Links</h3>
                </SectionTitle>
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-col'>
                    <Controller
                      name='linkedin'
                      control={control}
                      render={({ field }) => (
                        <Input.Root size='medium'>
                          <Input.Wrapper>
                            <Input.Icon>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                                <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                              </svg>
                            </Input.Icon>
                            <Input.Input
                              {...field}
                              placeholder='https://www.linkedin.com/in/username'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                  </div>

                  <div className='flex flex-col'>
                    <Controller
                      name='facebook'
                      control={control}
                      render={({ field }) => (
                        <Input.Root size='medium'>
                          <Input.Wrapper>
                            <Input.Icon>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                                <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                              </svg>
                            </Input.Icon>
                            <Input.Input
                              {...field}
                              placeholder='https://www.facebook.com/username'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                  </div>

                  <div className='flex flex-col'>
                    <Controller
                      name='instagram'
                      control={control}
                      render={({ field }) => (
                        <Input.Root size='medium'>
                          <Input.Wrapper>
                            <Input.Icon>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                                <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z' />
                              </svg>
                            </Input.Icon>
                            <Input.Input
                              {...field}
                              placeholder='https://www.instagram.com/username'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <Drawer.Footer className='flex items-center justify-end gap-3 border-t border-stroke-soft-200 px-6 py-4'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button.Root>
          <Button.Root type='submit' form='contact-create-form' disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add'}
          </Button.Root>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CrmContactCreateDrawer;
