import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { RiBuildingLine, RiInformationFill, RiSearchLine } from 'react-icons/ri';
import { CiLink } from 'react-icons/ci';
import { Country, State, City } from 'country-state-city';
import { Datepicker } from '@/components/ui/datepicker';
import { parseToDate } from '@/utils/date-utils';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Checkbox from '@/components/ui/checkbox';
import * as Hint from '@/components/ui/hint';
import * as Tooltip from '@/components/ui/tooltip';

import {
  createCrmAccount,
  getCustomerGroupList,
  getIndustryTypeList,
  getSalesTeamUserList,
  getCrmAccountList,
} from '@/api/crmAccounts';
import {
  getCpAccountOptions,
  getCpContactLinkOptions,
  getCpContactsForCpAccount,
  getCrmContactList,
} from '@/api/crmLeads';
import { getCrmContact, updateCrmContact } from '@/api/crmContacts';
import { showErrorToast } from '@/utils/error-utils';
import { useCrmLeadSizeOptions } from '@/hooks/use-crm-lead-size-options';
import { buildLinkSelectOptions, findCityLocationInIndia } from '@/components/crm-leads/constants';

const PIN_REGEX = /^\d{6}$/;
const WEBSITE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.%&/=?]*)?$/;

// ── Validation schema ────────────────────────────────────────────────────────
const accountSchema = z.object({
  account_name: z.string().min(1, 'Account Name is required'),
  custom_legal_name: z.string().optional(),
  sales_owner: z.string().optional(),
  year_of_establishment: z.string().optional(),
  type_of_organization: z.string().optional(),
  industry: z.string().optional(),
  parent_company: z.string().optional(),
  associate_company: z.string().optional(),
  cp_account: z.string().optional(),
  cp_contact: z.string().optional(),
  crm_contact: z.any().optional(),
  website: z
    .string()
    .optional()
    .refine((v) => !v || WEBSITE_REGEX.test(v), { message: 'Enter a valid website URL' }),
  no_of_employees: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  pin_code: z
    .string()
    .optional()
    .refine((v) => !v || PIN_REGEX.test(v), { message: 'Pin code must be 6 digits' }),
  billing_same_as_primary: z.boolean().default(true),
  billing_address_line1: z.string().optional(),
  billing_address_line2: z.string().optional(),
  billing_country: z.string().optional(),
  billing_state: z.string().optional(),
  billing_city: z.string().optional(),
  billing_pin_code: z
    .string()
    .optional()
    .refine((v) => !v || PIN_REGEX.test(v), { message: 'Pin code must be 6 digits' }),
  linkedin: z
    .string()
    .optional()
    .refine((v) => !v || v.includes('linkedin.com'), {
      message: 'Enter a valid LinkedIn URL',
    }),
  facebook: z
    .string()
    .optional()
    .refine((v) => !v || v.includes('facebook.com'), {
      message: 'Enter a valid Facebook URL',
    }),
  instagram: z
    .string()
    .optional()
    .refine((v) => !v || v.includes('instagram.com'), {
      message: 'Enter a valid Instagram URL',
    }),
});

const defaultValues = {
  account_name: '',
  custom_legal_name: '',
  sales_owner: '',
  year_of_establishment: '',
  type_of_organization: '',
  industry: '',
  parent_company: '',
  associate_company: '',
  cp_account: '',
  cp_contact: '',
  crm_contact: [],
  website: '',
  no_of_employees: '',
  address_line1: '',
  address_line2: '',
  country: '',
  state: '',
  city: '',
  pin_code: '',
  billing_same_as_primary: true,
  billing_address_line1: '',
  billing_address_line2: '',
  billing_country: '',
  billing_state: '',
  billing_city: '',
  billing_pin_code: '',
  linkedin: '',
  facebook: '',
  instagram: '',
};

// ── Small form field helpers ─────────────────────────────────────────────────
const FieldLabel = ({ children, required }) => (
  <Label.Root className='text-paragraph-sm font-medium text-text-sub-600 mb-1'>
    {children}
    {required && <span className='text-error-base ml-0.5'>*</span>}
  </Label.Root>
);

const FieldError = ({ message }) =>
  message ? <p className='text-paragraph-xs text-error-base mt-0.5'>{message}</p> : null;

const SectionTitle = ({ icon, children }) => (
  <div className='flex items-center gap-2 mb-4'>
    <span className='text-text-sub-400'>{icon}</span>
    <span className='text-paragraph-sm font-semibold text-text-sub-600'>{children}</span>
  </div>
);

// ── Component ────────────────────────────────────────────────────────────────
const CrmAccountCreateDrawer = ({ open, onOpenChange, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const leadSizeOptions = useCrmLeadSizeOptions();
  const [typeOfOrgOptions, setTypeOfOrgOptions] = useState([]);
  const [industryGroups, setIndustryGroups] = useState([]);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [crmAccountOptions, setCrmAccountOptions] = useState([]);
  const [cpAccountOptions, setCpAccountOptions] = useState([]);
  const [cpContactOptions, setCpContactOptions] = useState([]);
  const [crmContactOptions, setCrmContactOptions] = useState([]);
  const [industrySearchQuery, setIndustrySearchQuery] = useState('');
  const industrySearchInputRef = useRef(null);

  const salesOwnerSelectOptions = useMemo(
    () => [{ value: '__none__', label: '—' }, ...salesOwnerOptions],
    [salesOwnerOptions],
  );
  const companyWithNoneOptions = useMemo(
    () => [{ value: '__none__', label: '—' }, ...crmAccountOptions],
    [crmAccountOptions],
  );

  const filteredIndustryGroups = useMemo(() => {
    const q = industrySearchQuery.trim().toLowerCase();
    if (!q) return industryGroups;
    return industryGroups
      .map((group) => {
        const names = Array.isArray(group.industry_name) ? group.industry_name : [];
        const groupMatch = String(group.label ?? '')
          .toLowerCase()
          .includes(q);
        const filteredNames = groupMatch
          ? names
          : names.filter(
              (opt) =>
                String(opt.label ?? '')
                  .toLowerCase()
                  .includes(q) ||
                String(opt.value ?? '')
                  .toLowerCase()
                  .includes(q),
            );
        if (filteredNames.length === 0) return null;
        return { ...group, industry_name: filteredNames };
      })
      .filter(Boolean);
  }, [industryGroups, industrySearchQuery]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      getCustomerGroupList(),
      getIndustryTypeList({ grouped: true, scope: 'crm' }),
      getSalesTeamUserList(),
      getCrmAccountList(),
      getCpAccountOptions(),
      getCpContactLinkOptions(),
      getCrmContactList(),
    ]).then(
      ([orgList, indOptions, salesList, accountList, cpAccounts, cpContacts, crmContacts]) => {
        setTypeOfOrgOptions(orgList);
        const groups = Array.isArray(indOptions?.industry_type)
          ? indOptions.industry_type.filter(
              (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
            )
          : [];
        setIndustryGroups(groups);
        setSalesOwnerOptions(salesList);
        setCrmAccountOptions(accountList);
        setCpAccountOptions(Array.isArray(cpAccounts) ? cpAccounts : []);
        setCpContactOptions(Array.isArray(cpContacts) ? cpContacts : []);
        setCrmContactOptions(Array.isArray(crmContacts) ? crmContacts : []);
      },
    );
  }, [open]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const billingSameAsPrimary = useWatch({ control, name: 'billing_same_as_primary' });
  const watchedCpAccount = useWatch({ control, name: 'cp_account' });
  const watchedCpContact = useWatch({ control, name: 'cp_contact' });
  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedState = useWatch({ control, name: 'state' });
  const selectedBillingCountry = useWatch({ control, name: 'billing_country' });
  const selectedBillingState = useWatch({ control, name: 'billing_state' });

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

  const countryOptions = useMemo(
    () => Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })),
    [],
  );

  const stateOptions = useMemo(
    () =>
      selectedCountry
        ? State.getStatesOfCountry(selectedCountry).map((s) => ({
            value: s.isoCode,
            label: s.name,
          }))
        : [],
    [selectedCountry],
  );

  const cityOptions = useMemo(
    () =>
      selectedCountry && selectedState
        ? City.getCitiesOfState(selectedCountry, selectedState).map((c) => ({
            value: c.name,
            label: c.name,
          }))
        : [],
    [selectedCountry, selectedState],
  );

  const billingStateOptions = useMemo(
    () =>
      selectedBillingCountry
        ? State.getStatesOfCountry(selectedBillingCountry).map((s) => ({
            value: s.isoCode,
            label: s.name,
          }))
        : [],
    [selectedBillingCountry],
  );

  const billingCityOptions = useMemo(
    () =>
      selectedBillingCountry && selectedBillingState
        ? City.getCitiesOfState(selectedBillingCountry, selectedBillingState).map((c) => ({
            value: c.name,
            label: c.name,
          }))
        : [],
    [selectedBillingCountry, selectedBillingState],
  );

  const handleCrmContactChange = async (contactIds) => {
    setValue('crm_contact', contactIds || []);
    const firstContactId = contactIds?.[0];
    if (!firstContactId) return;

    try {
      const contactDetail = await getCrmContact(firstContactId);
      if (contactDetail) {
        if (contactDetail.sales_owner) {
          setValue('sales_owner', contactDetail.sales_owner);
        }
        if (contactDetail.cp_account) {
          setValue('cp_account', contactDetail.cp_account);
        }
        if (contactDetail.cp_contact) {
          setValue('cp_contact', contactDetail.cp_contact);
        }
        if (contactDetail.city) {
          const location = findCityLocationInIndia(contactDetail.city);
          if (location) {
            setValue('country', location.country);
            setValue('state', location.state);
            setValue('city', location.city);
          }
        }
        if (contactDetail.linkedin) {
          setValue('linkedin', contactDetail.linkedin);
        }
        if (contactDetail.facebook) {
          setValue('facebook', contactDetail.facebook);
        }
        if (contactDetail.instagram) {
          setValue('instagram', contactDetail.instagram);
        }
      }
    } catch (error) {
      console.error('Failed to fetch CRM contact details', error);
    }
  };

  const renderAddressFields = (prefix) => {
    const isbilling = prefix === 'billing';
    const f = (name) => (isbilling ? `billing_${name}` : name);
    const selCountry = isbilling ? selectedBillingCountry : selectedCountry;
    const selState = isbilling ? selectedBillingState : selectedState;
    const stateOpts = isbilling ? billingStateOptions : stateOptions;
    const cityOpts = isbilling ? billingCityOptions : cityOptions;

    return (
      <div className='grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 [&>*]:min-w-0'>
        {!isbilling && (
          <div className='col-span-2 flex flex-col'>
            <FieldLabel>Company Legal Name</FieldLabel>
            <Controller
              name='custom_legal_name'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.custom_legal_name)}>
                  <Input.Wrapper>
                    <Input.Input {...field} placeholder='Enter company legal name' />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            <FieldError message={errors.custom_legal_name?.message} />
          </div>
        )}

        {/* Address Line 1 */}
        <div className='flex flex-col'>
          <FieldLabel>Address Line 1</FieldLabel>
          <Controller
            name={f('address_line1')}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors[f('address_line1')])}>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Type here...' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors[f('address_line1')] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[f('address_line1')].message}
            </Hint.Root>
          )}
        </div>

        {/* Address Line 2 */}
        <div className='flex flex-col'>
          <FieldLabel>Address Line 2</FieldLabel>
          <Controller
            name={f('address_line2')}
            control={control}
            render={({ field }) => (
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Type here...' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
        </div>

        {/* Country */}
        <div className='flex flex-col'>
          <FieldLabel>Country</FieldLabel>
          <Controller
            name={f('country')}
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue(f('state'), '');
                  setValue(f('city'), '');
                }}
                options={countryOptions}
                placeholder='Select country'
                searchPlaceholder='Search country...'
                noResultsMessage='No countries found'
                emptyMessage='No countries available'
                hasError={Boolean(errors[f('country')])}
                isolateSearchKeyboard
              />
            )}
          />
          {errors[f('country')] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[f('country')].message}
            </Hint.Root>
          )}
        </div>

        {/* State */}
        <div className='flex flex-col'>
          <FieldLabel>State</FieldLabel>
          <Controller
            name={f('state')}
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue(f('city'), '');
                }}
                options={stateOpts}
                placeholder={selCountry ? 'Select state' : 'Select country first'}
                searchPlaceholder='Search state...'
                noResultsMessage='No states found'
                emptyMessage={selCountry ? 'No states available' : 'Select country first'}
                hasError={Boolean(errors[f('state')])}
                disabled={!selCountry}
                isolateSearchKeyboard
              />
            )}
          />
          {errors[f('state')] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[f('state')].message}
            </Hint.Root>
          )}
        </div>

        {/* City */}
        <div className='flex flex-col'>
          <FieldLabel>City</FieldLabel>
          <Controller
            name={f('city')}
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                options={cityOpts}
                placeholder={selState ? 'Select city' : 'Select state first'}
                searchPlaceholder='Search city...'
                noResultsMessage='No cities found'
                emptyMessage={selState ? 'No cities available' : 'Select state first'}
                hasError={Boolean(errors[f('city')])}
                disabled={!selState}
                isolateSearchKeyboard
              />
            )}
          />
          {errors[f('city')] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[f('city')].message}
            </Hint.Root>
          )}
        </div>

        {/* Pin Code */}
        <div className='flex flex-col'>
          <FieldLabel>Pin Code</FieldLabel>
          <Controller
            name={f('pin_code')}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors[f('pin_code')])}>
                <Input.Wrapper>
                  <Input.Input
                    {...field}
                    placeholder='Enter pin code'
                    maxLength={6}
                    inputMode='numeric'
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors[f('pin_code')] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[f('pin_code')].message}
            </Hint.Root>
          )}
        </div>
      </div>
    );
  };

  const handleClose = () => {
    reset(defaultValues);
    onOpenChange?.(false);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // country-state-city stores ISO codes; Frappe Link field expects full names
      const resolveCountryName = (isoCode) => Country.getCountryByCode(isoCode)?.name || isoCode;
      const resolveStateName = (stateCode, countryCode) =>
        State.getStateByCodeAndCountry(stateCode, countryCode)?.name || stateCode;

      const hasPrimaryAddress = [
        data.address_line1,
        data.address_line2,
        data.city,
        data.state,
        data.pin_code,
        data.country,
      ].some((v) => v && v.trim() !== '');

      const primaryAddress = {
        address_line_1: data.address_line1 || '',
        address_line_2: data.address_line2 || '',
        city: data.city || '',
        state: resolveStateName(data.state, data.country),
        pincode: data.pin_code || '',
        country: resolveCountryName(data.country),
        is_primary: 1,
        is_billing: data.billing_same_as_primary ? 1 : 0,
      };

      const hasBillingAddress = [
        data.billing_address_line1,
        data.billing_address_line2,
        data.billing_city,
        data.billing_state,
        data.billing_pin_code,
        data.billing_country,
      ].some((v) => v && v.trim() !== '');

      const addresses = hasPrimaryAddress ? [primaryAddress] : [];
      if (!data.billing_same_as_primary && hasBillingAddress) {
        addresses.push({
          address_line_1: data.billing_address_line1 || '',
          address_line_2: data.billing_address_line2 || '',
          city: data.billing_city || '',
          state: resolveStateName(data.billing_state, data.billing_country),
          pincode: data.billing_pin_code || '',
          country: resolveCountryName(data.billing_country),
          is_primary: 0,
          is_billing: 1,
        });
      }

      const socialLinks = [
        data.linkedin ? { platform: 'LinkedIn', link: data.linkedin } : null,
        data.facebook ? { platform: 'Facebook', link: data.facebook } : null,
        data.instagram ? { platform: 'Instagram', link: data.instagram } : null,
      ].filter(Boolean);

      const result = await createCrmAccount({
        customer_name: data.account_name,
        custom_legal_name: data.custom_legal_name,
        customer_group: data.type_of_organization || '',
        industry: data.industry || '',
        website: data.website || '',
        sales_owner: data.sales_owner || '',
        custom_year_of_establishment: data.year_of_establishment || null,
        number_of_employees: data.no_of_employees?.trim() ? data.no_of_employees.trim() : null,
        parent_company: data.parent_company || '',
        associate_company: data.associate_company || '',
        cp_account: String(data.cp_account || '').trim(),
        cp_contact: String(data.cp_contact || '').trim(),
        custom_status: 'Active',
        customer_type: 'Company',
        custom_addresses: addresses,
        social_links: socialLinks,
      });

      const newAccountName = typeof result === 'object' ? result?.name : result;
      const contactIds = Array.isArray(data.crm_contact)
        ? data.crm_contact
        : data.crm_contact
          ? [data.crm_contact]
          : [];
      let contactsLinkError = false;
      if (contactIds.length > 0 && newAccountName) {
        try {
          for (const contactId of contactIds) {
            await updateCrmContact(contactId, {
              associate_account: newAccountName,
            });
          }
        } catch (error) {
          console.error('Failed to link CRM Contacts to new Account', error);
          contactsLinkError = true;
        }
      }

      const createdAccount =
        typeof result === 'object' && result !== null
          ? { ...result, name: newAccountName || result.name }
          : newAccountName
            ? { name: String(newAccountName) }
            : null;
      await onSuccess?.(contactsLinkError, createdAccount);
      handleClose();
    } catch (error) {
      const message =
        error?.response?.data?.exception ||
        error?.response?.data?.message ||
        'Failed to create account';
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='flex flex-col w-[640px]'>
        {/* Header */}
        <Drawer.Header className='px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-500'>
              <RiBuildingLine size={20} />
            </div>
            <div>
              <Drawer.Title>Add New Account</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-600 mt-0.5'>
                Enter below details to add new account.
              </p>
            </div>
          </div>
        </Drawer.Header>

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-6 pb-6'>
          <form id='account-create-form' onSubmit={handleSubmit(onSubmit)}>
            {/* ── Basic Information ──────────────────────────────────────── */}
            <SectionTitle icon={<RiBuildingLine size={16} />}>Basic Information</SectionTitle>

            <div className='grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 [&>*]:min-w-0'>
              {/* Account Name */}
              <div className='flex flex-col'>
                <FieldLabel required>Account Name</FieldLabel>
                <Controller
                  name='account_name'
                  control={control}
                  render={({ field }) => (
                    <Input.Root hasError={Boolean(errors.account_name)}>
                      <Input.Wrapper>
                        <Input.Input {...field} placeholder='Enter account name' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
                <FieldError message={errors.account_name?.message} />
              </div>

              {/* Sales Owner — show name, store email. When "—" selected we pass undefined so placeholder shows. */}
              <div className='flex flex-col'>
                <FieldLabel>Sales Owner</FieldLabel>
                <Controller
                  name='sales_owner'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={salesOwnerSelectOptions}
                      valueSentinel='__none__'
                      placeholder='Select'
                      searchPlaceholder='Search sales owner...'
                      noResultsMessage='No sales owners found'
                      emptyMessage='No sales owners available'
                      isolateSearchKeyboard
                    />
                  )}
                />
              </div>

              {/* CRM Contact */}
              <div className='flex flex-col'>
                <FieldLabel>CRM Contact</FieldLabel>
                <Controller
                  name='crm_contact'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      multiple={true}
                      value={field.value || []}
                      onValueChange={handleCrmContactChange}
                      options={crmContactOptions}
                      placeholder='Select'
                      searchPlaceholder='Search CRM contact...'
                      noResultsMessage='No CRM contacts found'
                      emptyMessage='No CRM contacts available'
                      isolateSearchKeyboard
                    />
                  )}
                />
              </div>

              {/* CP Account */}
              <div className='flex flex-col'>
                <FieldLabel>CP Account</FieldLabel>
                <Controller
                  name='cp_account'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
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
              <div className='flex flex-col'>
                <FieldLabel>CP Contact</FieldLabel>
                <Controller
                  name='cp_contact'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
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

              {/* Year of Est. */}
              <div className='flex flex-col'>
                <FieldLabel>Year of Est.</FieldLabel>
                <Controller
                  name='year_of_establishment'
                  control={control}
                  render={({ field }) => {
                    const dateValue = field.value ? parseToDate(field.value) : undefined;
                    return (
                      <Datepicker
                        variant='neutral'
                        mode='stroke'
                        value={dateValue}
                        onChange={(date) => {
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                        }}
                        disabled={isSubmitting}
                        placeholder='DD-MM-YY'
                        hasError={Boolean(errors.year_of_establishment)}
                        size='medium'
                        max={new Date()}
                      />
                    );
                  }}
                />
                <FieldError message={errors.year_of_establishment?.message} />
              </div>

              {/* Type of Org */}
              <div className='flex flex-col'>
                <FieldLabel>Type of Org</FieldLabel>
                <Controller
                  name='type_of_organization'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={typeOfOrgOptions}
                      placeholder='Select'
                      searchPlaceholder='Search type of org...'
                      noResultsMessage='No type of org found'
                      emptyMessage='No type of org available'
                      isolateSearchKeyboard
                      renderOptionLabel={(opt) => (
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger asChild>
                            <span className='min-w-0 flex-1 truncate text-left'>{opt.label}</span>
                          </Tooltip.Trigger>
                          <Tooltip.Content>{opt.label}</Tooltip.Content>
                        </Tooltip.Root>
                      )}
                    />
                  )}
                />
              </div>

              {/* Industry */}
              <div className='flex flex-col'>
                <FieldLabel>Industry</FieldLabel>
                <Controller
                  name='industry'
                  control={control}
                  render={({ field }) => (
                    <Select.Root
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => {
                        if (!open) setIndustrySearchQuery('');
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content
                        layout='searchable'
                        className='max-h-[300px] min-w-[var(--radix-select-trigger-width)] p-0'
                        onOpenAutoFocus={(e) => {
                          e.preventDefault();
                          requestAnimationFrame(() => industrySearchInputRef.current?.focus());
                        }}
                      >
                        <div className='flex min-h-0 flex-1 flex-col'>
                          <div className='shrink-0 border-b border-stroke-soft-200 p-2'>
                            <Input.Root size='small'>
                              <Input.Wrapper>
                                <Input.Icon as={RiSearchLine} />
                                <Input.Input
                                  ref={industrySearchInputRef}
                                  placeholder='Search industry...'
                                  value={industrySearchQuery}
                                  onChange={(e) => setIndustrySearchQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.nativeEvent?.stopImmediatePropagation) {
                                      e.nativeEvent.stopImmediatePropagation();
                                    }
                                  }}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          </div>
                          <div
                            className='flex min-h-0 max-h-[236px] flex-col overflow-y-auto p-2'
                            onWheel={(e) => e.stopPropagation()}
                          >
                            {industryGroups.length > 0 ? (
                              filteredIndustryGroups.length > 0 ? (
                                filteredIndustryGroups.map((group) => (
                                  <Select.Group key={group.value} className='py-1'>
                                    <Select.GroupLabel className='block px-2 pb-1 pt-2 text-paragraph-xs font-medium text-text-soft-400'>
                                      {group.label}
                                    </Select.GroupLabel>
                                    {(Array.isArray(group.industry_name)
                                      ? group.industry_name
                                      : []
                                    ).map((opt) => (
                                      <Select.Item
                                        key={`${group.value}-${opt.value}`}
                                        value={opt.value}
                                        className='paragraph-small'
                                      >
                                        {opt.label}
                                      </Select.Item>
                                    ))}
                                  </Select.Group>
                                ))
                              ) : (
                                <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                                  {industrySearchQuery.trim()
                                    ? 'No industries found'
                                    : 'No industries available'}
                                </div>
                              )
                            ) : (
                              <div className='p-2 text-paragraph-sm text-text-sub-600'>
                                No options
                              </div>
                            )}
                          </div>
                        </div>
                      </Select.Content>
                    </Select.Root>
                  )}
                />
              </div>

              {/* Parent Company — when "—" selected, value is '' so we pass undefined to show placeholder */}
              <div className='flex flex-col'>
                <FieldLabel>Parent Company</FieldLabel>
                <Controller
                  name='parent_company'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={companyWithNoneOptions}
                      valueSentinel='__none__'
                      placeholder='Select'
                      searchPlaceholder='Search parent company...'
                      noResultsMessage='No parent companies found'
                      emptyMessage='No parent companies available'
                      isolateSearchKeyboard
                    />
                  )}
                />
              </div>

              {/* Associate Company — when "—" selected, value is '' so we pass undefined to show placeholder */}
              <div className='flex flex-col'>
                <FieldLabel>Associate Company</FieldLabel>
                <Controller
                  name='associate_company'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={companyWithNoneOptions}
                      valueSentinel='__none__'
                      placeholder='Select'
                      searchPlaceholder='Search associate company...'
                      noResultsMessage='No associate companies found'
                      emptyMessage='No associate companies available'
                      isolateSearchKeyboard
                    />
                  )}
                />
              </div>

              {/* Website */}
              <div className='flex flex-col'>
                <FieldLabel>Website</FieldLabel>
                <Controller
                  name='website'
                  control={control}
                  render={({ field }) => (
                    <Input.Root hasError={Boolean(errors.website)}>
                      <Input.Wrapper>
                        <Input.Input {...field} placeholder='https://www.example.com' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
                <FieldError message={errors.website?.message} />
              </div>

              {/* Employees Head Count — band options (same as CRM Lead lead size) */}
              <div className='flex flex-col'>
                <FieldLabel>Employees Head Count</FieldLabel>
                <Controller
                  name='no_of_employees'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={buildLinkSelectOptions(leadSizeOptions, field.value, field.value)}
                      placeholder='Select'
                      searchPlaceholder='Search...'
                      noResultsMessage='No results found'
                      emptyMessage='No options available'
                      isolateSearchKeyboard
                    />
                  )}
                />
              </div>
            </div>

            {/* ── Primary Address ────────────────────────────────────────── */}
            <div className='mt-6 mb-4'>
              <SectionTitle
                icon={
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M12 20.9l4.95-4.95a7 7 0 1 0-9.9 0L12 20.9zm0 2.828l-6.364-6.364a9 9 0 1 1 12.728 0L12 23.728zM12 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4z' />
                  </svg>
                }
              >
                Primary Address
              </SectionTitle>
            </div>

            {renderAddressFields('primary')}

            {/* Billing same as primary */}
            <div className='mt-4 flex items-center gap-2'>
              <Controller
                name='billing_same_as_primary'
                control={control}
                render={({ field }) => (
                  <Checkbox.Root
                    id='billing-same'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label
                htmlFor='billing-same'
                className='text-paragraph-sm text-text-sub-600 cursor-pointer select-none'
              >
                Billing address same as primary address
              </label>
            </div>

            {/* ── Billing Address (only when checkbox unchecked) ─────────── */}
            {!billingSameAsPrimary && (
              <>
                <div className='mt-6 mb-4'>
                  <SectionTitle
                    icon={
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                        <path d='M12 20.9l4.95-4.95a7 7 0 1 0-9.9 0L12 20.9zm0 2.828l-6.364-6.364a9 9 0 1 1 12.728 0L12 23.728zM12 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4z' />
                      </svg>
                    }
                  >
                    Billing Address
                  </SectionTitle>
                </div>

                {renderAddressFields('billing')}
              </>
            )}

            {/* ── Social Links ───────────────────────────────────────────── */}
            <div className='mt-6 mb-4'>
              <SectionTitle icon={<CiLink size={16} />}>Social Links</SectionTitle>
            </div>

            <div className='flex flex-col gap-4'>
              <div className='flex flex-col'>
                <FieldLabel>Linkedin</FieldLabel>
                <Controller
                  name='linkedin'
                  control={control}
                  render={({ field }) => (
                    <Input.Root hasError={Boolean(errors.linkedin)}>
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
                <FieldError message={errors.linkedin?.message} />
              </div>

              <div className='flex flex-col'>
                <FieldLabel>Facebook</FieldLabel>
                <Controller
                  name='facebook'
                  control={control}
                  render={({ field }) => (
                    <Input.Root hasError={Boolean(errors.facebook)}>
                      <Input.Wrapper>
                        <Input.Icon>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                          </svg>
                        </Input.Icon>
                        <Input.Input {...field} placeholder='https://www.facebook.com/username' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
                <FieldError message={errors.facebook?.message} />
              </div>

              <div className='flex flex-col'>
                <FieldLabel>Instagram</FieldLabel>
                <Controller
                  name='instagram'
                  control={control}
                  render={({ field }) => (
                    <Input.Root hasError={Boolean(errors.instagram)}>
                      <Input.Wrapper>
                        <Input.Icon>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z' />
                          </svg>
                        </Input.Icon>
                        <Input.Input {...field} placeholder='https://www.instagram.com/username' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
                <FieldError message={errors.instagram?.message} />
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
          <Button.Root type='submit' form='account-create-form' disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add'}
          </Button.Root>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CrmAccountCreateDrawer;
