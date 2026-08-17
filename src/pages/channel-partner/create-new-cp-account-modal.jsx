import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { selectCenterAccess } from '@/redux/centerSlice';
import { z } from 'zod';
import {
  RiCloseLine,
  RiInformationLine,
  RiMapPin2Line,
  RiLink,
  RiSearchLine,
} from 'react-icons/ri';
import { Country, State, City } from 'country-state-city';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Checkbox from '@/components/ui/checkbox';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';
import { createCpAccountThunk, selectCpAccountTypeOptions } from '@/redux/cpAccountSlices';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { getSalesTeamUserList, getIndustryTypeList } from '@/api/crmAccounts';
import { getCpAccountsList } from '@/services/cp-accounts-service';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';
import {
  buildOperationalLocationPayload,
  deriveOperationalStatesDisplay,
} from '@/pages/channel-partner/cp-operational-location-utils';

const createCpAccountSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  companyLegalName: z.string().min(1, 'Company legal name is required'),
  salesOwner: z.string().optional(),
  parentCompany: z.string().optional(),
  website: z.string().optional(),
  employeesHeadCount: z.string().optional(),
  brandName: z.string().min(1, 'Brand name is required'),
  yearOfEst: z.string().optional(),
  associateCompany: z.string().optional(),
  industry: z.string().optional(),
  reraNumber: z.string().optional(),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  pinCode: z.string().trim().optional(),
  billingSameAsPrimary: z.boolean().optional(),
  billingAddressLine1: z.string().optional(),
  billingAddressLine2: z.string().optional(),
  billingCountry: z.string().optional(),
  billingState: z.string().optional(),
  billingCity: z.string().optional(),
  billingPinCode: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  operationalCities: z.array(z.string()).optional(),
});

const defaultValues = {
  type: '',
  companyLegalName: '',
  salesOwner: '',
  parentCompany: '',
  website: '',
  employeesHeadCount: '',
  brandName: '',
  yearOfEst: '',
  associateCompany: '',
  industry: '',
  reraNumber: '',
  addressLine1: '',
  addressLine2: '',
  country: '',
  state: '',
  city: '',
  pinCode: '',
  billingSameAsPrimary: true,
  billingAddressLine1: '',
  billingAddressLine2: '',
  billingCountry: '',
  billingState: '',
  billingCity: '',
  billingPinCode: '',
  linkedin: '',
  facebook: '',
  instagram: '',
  operationalCities: [],
};

const EMPTY_OPTIONS = [];

/** Drawer overlay is z-50; portal select content above it. */
const SELECT_IN_DRAWER_CONTENT_CLASS = 'z-[200]';

const getCountryIsoCode = (countryName) => {
  if (!countryName) return '';
  return Country.getAllCountries().find((country) => country.name === countryName)?.isoCode || '';
};

const getStateIsoCode = (stateName, countryName) => {
  const countryIso = getCountryIsoCode(countryName);
  if (!stateName || !countryIso) return '';
  return (
    State.getStatesOfCountry(countryIso).find((state) => state.name === stateName)?.isoCode || ''
  );
};

const CreateNewCpAccountModal = ({ open, setOpen, onSuccess }) => {
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);
  const typeOptions = useSelector(selectCpAccountTypeOptions);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [cpAccountOptions, setCpAccountOptions] = useState([]);
  const [cpAccountOptionsLoading, setCpAccountOptionsLoading] = useState(false);

  const salesOwnerSelectOptions = useMemo(
    () => [{ value: '__none__', label: '—' }, ...salesOwnerOptions],
    [salesOwnerOptions],
  );
  const cpAccountWithNoneOptions = useMemo(
    () => [{ value: '__none__', label: '—' }, ...cpAccountOptions],
    [cpAccountOptions],
  );

  const [industryGroups, setIndustryGroups] = useState([]);

  const industryOptions = useMemo(() => {
    if (!industryGroups || industryGroups.length === 0) return [];
    const optionsList = [{ value: '__none__', label: '—' }];
    industryGroups.forEach((group) => {
      const names = Array.isArray(group.industry_name) ? group.industry_name : [];
      names.forEach((ind) => {
        optionsList.push({
          value: ind.value,
          label: ind.label,
          groupLabel: group.label,
        });
      });
    });
    return optionsList;
  }, [industryGroups]);

  const renderIndustryOptionLabel = useCallback((opt) => {
    if (opt.value === '__none__') return '—';
    return (
      <div className='flex flex-col'>
        <span className='text-paragraph-sm font-medium'>{opt.label}</span>
        {opt.groupLabel && (
          <span className='text-paragraph-xs text-text-soft-400 font-normal'>{opt.groupLabel}</span>
        )}
      </div>
    );
  }, []);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCpAccountSchema),
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedState = useWatch({ control, name: 'state' });
  const operationalCities = useWatch({ control, name: 'operationalCities' });
  const operationalStateDisplay = useMemo(
    () => deriveOperationalStatesDisplay(operationalCities),
    [operationalCities],
  );
  const billingSameAsPrimary = useWatch({ control, name: 'billingSameAsPrimary' });
  const selectedBillingCountry = useWatch({ control, name: 'billingCountry' });
  const selectedBillingState = useWatch({ control, name: 'billingState' });

  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map((country) => ({
      value: country.name,
      label: country.name,
    }));
  }, []);

  const stateOptions = useMemo(() => {
    const countryIso = getCountryIsoCode(selectedCountry);
    if (!countryIso) return [];
    return State.getStatesOfCountry(countryIso).map((s) => ({
      value: s.name,
      label: s.name,
    }));
  }, [selectedCountry]);

  const cityOptions = useMemo(() => {
    const countryIso = getCountryIsoCode(selectedCountry);
    const stateIso = getStateIsoCode(selectedState, selectedCountry);
    if (!countryIso || !stateIso) return [];
    return City.getCitiesOfState(countryIso, stateIso).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [selectedCountry, selectedState]);

  const billingStateOptions = useMemo(() => {
    const countryIso = getCountryIsoCode(selectedBillingCountry);
    if (!countryIso) return [];
    return State.getStatesOfCountry(countryIso).map((s) => ({
      value: s.name,
      label: s.name,
    }));
  }, [selectedBillingCountry]);

  const billingCityOptions = useMemo(() => {
    const countryIso = getCountryIsoCode(selectedBillingCountry);
    const stateIso = getStateIsoCode(selectedBillingState, selectedBillingCountry);
    if (!countryIso || !stateIso) return [];
    return City.getCitiesOfState(countryIso, stateIso).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [selectedBillingCountry, selectedBillingState]);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    getSalesTeamUserList()
      .then((list) => {
        if (!isMounted) return;
        const raw = Array.isArray(list) ? list : (list?.results ?? list?.message ?? []);
        const arr = Array.isArray(raw) ? raw : [];
        const options = arr
          .map((item) => ({
            value: item.value ?? item.id ?? item.email ?? item.name ?? '',
            label: item.label ?? item.full_name ?? item.name ?? item.value ?? '–',
          }))
          .filter((o) => o.value);
        setSalesOwnerOptions(options);
      })
      .catch(() => {
        if (isMounted) setSalesOwnerOptions([]);
      });
    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    getIndustryTypeList({ grouped: true, scope: 'cp' })
      .then((options) => {
        if (!isMounted) return;
        const groups = Array.isArray(options?.industry_type)
          ? options.industry_type.filter(
              (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
            )
          : [];
        setIndustryGroups(groups);
      })
      .catch(() => {
        if (isMounted) setIndustryGroups([]);
      });
    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const centers =
      Array.isArray(centerAccess?.selectedCenters) && centerAccess.selectedCenters.length > 0
        ? centerAccess.selectedCenters
        : [];

    let isMounted = true;
    setCpAccountOptionsLoading(true);

    getCpAccountsList({ centers, type: 'all' })
      .then((result) => {
        if (!isMounted) return;
        if (result?.error) {
          setCpAccountOptions(EMPTY_OPTIONS);
          return;
        }
        const list = Array.isArray(result?.data) ? result.data : [];
        const options = list
          .map((a) => ({
            value: a.id,
            label: a.legalName || a.brandName || a.id || '–',
          }))
          .filter((o) => o.value);
        setCpAccountOptions(options);
      })
      .catch(() => {
        if (isMounted) setCpAccountOptions(EMPTY_OPTIONS);
      })
      .finally(() => {
        if (isMounted) setCpAccountOptionsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, centerAccess?.selectedCenters]);

  const onClose = () => {
    if (!isSubmitting) setOpen(false);
  };

  const onCreate = async (data) => {
    try {
      const selectedCenter =
        Array.isArray(centerAccess?.selectedCenters) && centerAccess.selectedCenters.length > 0
          ? centerAccess.selectedCenters[0]
          : undefined;
      if (!selectedCenter) {
        showErrorToast('Please select at least one center from the toolbar.');
        return;
      }
      // Address is optional. Ignore the defaulted country when deciding whether the
      // user actually entered a primary address.
      const hasPrimaryAddress = [
        data.addressLine1,
        data.addressLine2,
        data.state,
        data.city,
        data.pinCode,
      ].some((v) => (v ?? '').trim() !== '');

      const primaryAddress = hasPrimaryAddress
        ? {
            addressLine1: (data.addressLine1 ?? '').trim(),
            addressLine2: (data.addressLine2 ?? '').trim(),
            country: data.country,
            state: data.state,
            city: data.city,
            pinCode: (data.pinCode ?? '').trim(),
          }
        : undefined;

      const hasBillingAddress = [
        data.billingAddressLine1,
        data.billingAddressLine2,
        data.billingState,
        data.billingCity,
        data.billingPinCode,
      ].some((v) => (v ?? '').trim() !== '');

      const billingAddress = !hasPrimaryAddress
        ? undefined
        : data.billingSameAsPrimary
          ? {
              addressLine1: primaryAddress.addressLine1,
              addressLine2: primaryAddress.addressLine2,
              country: primaryAddress.country,
              state: primaryAddress.state,
              city: primaryAddress.city,
              pinCode: primaryAddress.pinCode,
            }
          : hasBillingAddress
            ? {
                addressLine1: (data.billingAddressLine1 ?? '').trim(),
                addressLine2: (data.billingAddressLine2 ?? '').trim(),
                country: data.billingCountry,
                state: data.billingState,
                city: data.billingCity,
                pinCode: (data.billingPinCode ?? '').trim(),
              }
            : undefined;

      const payload = {
        center: selectedCenter,
        type: data.type,
        legalName: data.companyLegalName?.trim() || '',
        brandName: data.brandName?.trim() || '',
        salesOwner: data.salesOwner || undefined,
        parentCompany: data.parentCompany || undefined,
        website: data.website?.trim()
          ? `https://${data.website.replace(/^https?:\/\//i, '')}`
          : undefined,
        employeesHeadCount: data.employeesHeadCount?.trim() || undefined,
        yearOfEst: data.yearOfEst?.trim() || undefined,
        associateCompany: data.associateCompany || undefined,
        industry: data.industry || undefined,
        reraRegistered: data.reraNumber?.trim() ? 'Yes' : 'No',
        reraNumber: data.reraNumber?.trim() || undefined,
        billingSameAsPrimary: data.billingSameAsPrimary,
        primaryAddress,
        billingAddress,
        linkedin: data.linkedin?.trim() || undefined,
        facebook: data.facebook?.trim() || undefined,
        instagram: data.instagram?.trim() || undefined,
        operationalLocation: buildOperationalLocationPayload(data.operationalCities),
      };
      await dispatch(createCpAccountThunk(payload)).unwrap();
      showSuccessToast('CP Account created successfully.');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create CP account. Please try again.' });
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
              <div className='label-medium text-text-strong-950'>Add New CP Account</div>
              <div className='paragraph-small text-text-sub-600'>
                Enter below details to add new CP Account.
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
                    Type <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='type'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={typeOptions}
                        placeholder='Select'
                        searchPlaceholder='Search...'
                        noResultsMessage='No types found'
                        emptyMessage='No types available'
                        hasError={Boolean(errors.type)}
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.type?.message ? <ErrorText>{errors.type.message}</ErrorText> : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Name <Label.Asterisk />
                  </Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.companyLegalName)}>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='Enter display name'
                        {...register('companyLegalName')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.companyLegalName?.message ? (
                    <ErrorText>{errors.companyLegalName.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Brand Name <Label.Asterisk />
                  </Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.brandName)}>
                    <Input.Wrapper>
                      <Input.Input placeholder='Enter brand name' {...register('brandName')} />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.brandName?.message ? (
                    <ErrorText>{errors.brandName.message}</ErrorText>
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
                        options={salesOwnerSelectOptions}
                        valueSentinel='__none__'
                        placeholder='Select'
                        searchPlaceholder='Search...'
                        noResultsMessage='No sales owners found'
                        emptyMessage={
                          salesOwnerOptions.length === 0
                            ? 'No options'
                            : 'No sales owners available'
                        }
                        hasError={Boolean(errors.salesOwner)}
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.salesOwner?.message ? (
                    <ErrorText>{errors.salesOwner.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Year of Est.</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input placeholder='YYYY' {...register('yearOfEst')} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Parent Company</Label.Root>
                  <Controller
                    name='parentCompany'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={cpAccountOptionsLoading ? [] : cpAccountWithNoneOptions}
                        valueSentinel='__none__'
                        placeholder={cpAccountOptionsLoading ? 'Loading…' : 'Select'}
                        searchPlaceholder='Search...'
                        noResultsMessage='No parent companies found'
                        emptyMessage={
                          cpAccountOptionsLoading
                            ? 'Loading…'
                            : cpAccountOptions.length === 0
                              ? 'No options'
                              : 'No parent companies available'
                        }
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Associate Company</Label.Root>
                  <Controller
                    name='associateCompany'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={cpAccountOptionsLoading ? [] : cpAccountWithNoneOptions}
                        valueSentinel='__none__'
                        placeholder={cpAccountOptionsLoading ? 'Loading…' : 'Select'}
                        searchPlaceholder='Search...'
                        noResultsMessage='No associate companies found'
                        emptyMessage={
                          cpAccountOptionsLoading
                            ? 'Loading…'
                            : cpAccountOptions.length === 0
                              ? 'No options'
                              : 'No associate companies available'
                        }
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Website</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Affix>https://</Input.Affix>
                    <Input.Wrapper>
                      <Input.Input placeholder='www.example.com' {...register('website')} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Industry</Label.Root>
                  <Controller
                    name='industry'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={industryOptions}
                        valueSentinel='__none__'
                        renderOptionLabel={renderIndustryOptionLabel}
                        placeholder='Select'
                        searchPlaceholder='Search industry...'
                        noResultsMessage='No industries found'
                        emptyMessage='No industries available'
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Employees Head Count</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='Enter employee head count'
                        {...register('employeesHeadCount')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>RERA Number</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input placeholder='Enter RERA Number' {...register('reraNumber')} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Operational City</Label.Root>
                  <Controller
                    name='operationalCities'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        multiple
                        value={field.value ?? []}
                        onValueChange={field.onChange}
                        options={INDIA_CITY_OPTIONS}
                        placeholder='Select cities'
                        searchPlaceholder='Search cities...'
                        minSearchLength={3}
                        minSearchMessage='Type at least 3 letters to search cities.'
                        noResultsMessage='No cities found'
                        emptyMessage='No cities available'
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                        renderTrigger={({ selectedOptions, placeholder: ph }) => (
                          <span
                            className={cn(
                              'block min-w-0 max-w-full truncate',
                              selectedOptions?.length ? '' : 'text-text-soft-400 opacity-70',
                            )}
                          >
                            {selectedOptions?.length
                              ? selectedOptions.map((opt) => opt.label).join(', ')
                              : ph}
                          </span>
                        )}
                      />
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Operational State</Label.Root>
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        readOnly
                        value={operationalStateDisplay}
                        placeholder='Select operational cities'
                        className='text-text-sub-600'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              </div>
            </div>

            <div className='border-b border-stroke-soft-200 px-8' />

            {/* Primary Address */}
            <div className='flex flex-col px-8 gap-4 py-5'>
              <div className='flex items-center gap-2 text-label-sm text-text-strong-950'>
                <RiMapPin2Line className='size-4 text-text-sub-600' />
                Primary Address
              </div>
              <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Address Line 1</Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.addressLine1)}>
                    <Input.Wrapper>
                      <Input.Input placeholder='Type here...' {...register('addressLine1')} />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.addressLine1?.message ? (
                    <ErrorText>{errors.addressLine1.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Address Line 2</Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.addressLine2)}>
                    <Input.Wrapper>
                      <Input.Input placeholder='Type here...' {...register('addressLine2')} />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.addressLine2?.message ? (
                    <ErrorText>{errors.addressLine2.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Country</Label.Root>
                  <Controller
                    name='country'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          setValue('state', '', { shouldValidate: true });
                          setValue('city', '', { shouldValidate: true });
                        }}
                        options={countryOptions}
                        placeholder='Select'
                        searchPlaceholder='Search country...'
                        noResultsMessage='No countries found'
                        emptyMessage='No countries available'
                        hasError={Boolean(errors.country)}
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.country?.message ? <ErrorText>{errors.country.message}</ErrorText> : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>State</Label.Root>
                  <Controller
                    name='state'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          setValue('city', '', { shouldValidate: true });
                        }}
                        options={stateOptions}
                        placeholder={selectedCountry ? 'Select' : 'Select country first'}
                        searchPlaceholder='Search state...'
                        noResultsMessage='No states found'
                        emptyMessage={
                          selectedCountry ? 'No states available' : 'Select country first'
                        }
                        hasError={Boolean(errors.state)}
                        disabled={!selectedCountry}
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.state?.message ? <ErrorText>{errors.state.message}</ErrorText> : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Primary City <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='city'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={cityOptions}
                        placeholder={selectedState ? 'Select' : 'Select state first'}
                        searchPlaceholder='Search city...'
                        noResultsMessage='No cities found'
                        emptyMessage={selectedState ? 'No cities available' : 'Select state first'}
                        hasError={Boolean(errors.city)}
                        disabled={!selectedState || !selectedCountry}
                        triggerClassName='w-full'
                        contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.city?.message ? <ErrorText>{errors.city.message}</ErrorText> : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>Pin Code</Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.pinCode)}>
                    <Input.Wrapper>
                      <Input.Input placeholder='Enter pin code' {...register('pinCode')} />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.pinCode?.message ? <ErrorText>{errors.pinCode.message}</ErrorText> : null}
                </div>
              </div>
              <Controller
                name='billingSameAsPrimary'
                control={control}
                render={({ field }) => (
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <Checkbox.Root
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(Boolean(checked));
                        if (checked) {
                          setValue('billingAddressLine1', '', { shouldValidate: true });
                          setValue('billingAddressLine2', '', { shouldValidate: true });
                          setValue('billingCountry', defaultValues.billingCountry, {
                            shouldValidate: true,
                          });
                          setValue('billingState', '', { shouldValidate: true });
                          setValue('billingCity', '', { shouldValidate: true });
                          setValue('billingPinCode', '', { shouldValidate: true });
                        }
                      }}
                    />
                    <span className='text-paragraph-sm text-text-strong-950'>
                      Billing address same as primary address
                    </span>
                  </label>
                )}
              />
              {billingSameAsPrimary === false && (
                <>
                  <div className='flex items-center gap-2 text-label-sm text-text-strong-950 pt-2'>
                    <RiMapPin2Line className='size-4 text-text-sub-600' />
                    Billing Address
                  </div>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>Address Line 1</Label.Root>
                      <Input.Root className='w-full' hasError={Boolean(errors.billingAddressLine1)}>
                        <Input.Wrapper>
                          <Input.Input
                            placeholder='Type here...'
                            {...register('billingAddressLine1')}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.billingAddressLine1?.message ? (
                        <ErrorText>{errors.billingAddressLine1.message}</ErrorText>
                      ) : null}
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>Address Line 2</Label.Root>
                      <Input.Root className='w-full' hasError={Boolean(errors.billingAddressLine2)}>
                        <Input.Wrapper>
                          <Input.Input
                            placeholder='Type here...'
                            {...register('billingAddressLine2')}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.billingAddressLine2?.message ? (
                        <ErrorText>{errors.billingAddressLine2.message}</ErrorText>
                      ) : null}
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>Country</Label.Root>
                      <Controller
                        name='billingCountry'
                        control={control}
                        render={({ field: f }) => (
                          <SearchableSelect
                            value={f.value}
                            onValueChange={(v) => {
                              f.onChange(v);
                              setValue('billingState', '', { shouldValidate: true });
                              setValue('billingCity', '', { shouldValidate: true });
                            }}
                            options={countryOptions}
                            placeholder='Select'
                            searchPlaceholder='Search country...'
                            noResultsMessage='No countries found'
                            emptyMessage='No countries available'
                            hasError={Boolean(errors.billingCountry)}
                            triggerClassName='w-full'
                            contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                            isolateSearchKeyboard
                          />
                        )}
                      />
                      {errors.billingCountry?.message ? (
                        <ErrorText>{errors.billingCountry.message}</ErrorText>
                      ) : null}
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>State</Label.Root>
                      <Controller
                        name='billingState'
                        control={control}
                        render={({ field: f }) => (
                          <SearchableSelect
                            value={f.value}
                            onValueChange={(v) => {
                              f.onChange(v);
                              setValue('billingCity', '', { shouldValidate: true });
                            }}
                            options={billingStateOptions}
                            placeholder={selectedBillingCountry ? 'Select' : 'Select country first'}
                            searchPlaceholder='Search state...'
                            noResultsMessage='No states found'
                            emptyMessage={
                              selectedBillingCountry
                                ? 'No states available'
                                : 'Select country first'
                            }
                            hasError={Boolean(errors.billingState)}
                            disabled={!selectedBillingCountry}
                            triggerClassName='w-full'
                            contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                            isolateSearchKeyboard
                          />
                        )}
                      />
                      {errors.billingState?.message ? (
                        <ErrorText>{errors.billingState.message}</ErrorText>
                      ) : null}
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>City</Label.Root>
                      <Controller
                        name='billingCity'
                        control={control}
                        render={({ field: f }) => (
                          <SearchableSelect
                            value={f.value}
                            onValueChange={f.onChange}
                            options={billingCityOptions}
                            placeholder={selectedBillingState ? 'Select' : 'Select state first'}
                            searchPlaceholder='Search city...'
                            noResultsMessage='No cities found'
                            emptyMessage={
                              selectedBillingState ? 'No cities available' : 'Select state first'
                            }
                            hasError={Boolean(errors.billingCity)}
                            disabled={!selectedBillingState || !selectedBillingCountry}
                            triggerClassName='w-full'
                            contentClassName={SELECT_IN_DRAWER_CONTENT_CLASS}
                            isolateSearchKeyboard
                          />
                        )}
                      />
                      {errors.billingCity?.message ? (
                        <ErrorText>{errors.billingCity.message}</ErrorText>
                      ) : null}
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>Pin Code</Label.Root>
                      <Input.Root className='w-full' hasError={Boolean(errors.billingPinCode)}>
                        <Input.Wrapper>
                          <Input.Input
                            placeholder='Enter pin code'
                            {...register('billingPinCode')}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.billingPinCode?.message ? (
                        <ErrorText>{errors.billingPinCode.message}</ErrorText>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
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

export default CreateNewCpAccountModal;
