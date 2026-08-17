import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from '@/utils/cn';
import {
  RiUserLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiGlobalLine,
  RiMailLine,
  RiPhoneLine,
  RiShieldCheckLine,
  RiBankLine,
  RiPriceTag3Line,
  RiBuilding4Line,
  RiAddLine,
  RiDeleteBinLine,
  RiUserAddLine,
  RiInformationLine,
  RiInformationFill,
  RiSearchLine,
  RiBuildingLine,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Tag from '@/components/ui/tag';
import * as LinkButton from '@/components/ui/link-button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Checkbox from '@/components/ui/checkbox';
import * as Switch from '@/components/ui/switch';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as Tooltip from '@/components/ui/tooltip';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import { Datepicker } from '@/components/ui/datepicker';
import { PhoneInputController } from '@/components/ui/phone-input';
import { format } from 'date-fns';
import { parseToDate } from '@/utils/date-utils';
import { createClientThunk } from '@/redux/clientSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  GST_STATUS_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  COMPANY_SECTOR_OPTIONS,
  DEPARTMENT_OPTIONS,
  getClientTabCustomerCategory,
} from './constants';
import { Country, State, City } from 'country-state-city';
import {
  clientCreateSchema,
  defaultClientValues,
  clientFormSteps,
  clientStepFields,
} from '@/schemas/client-schema';
import { getStatusOptions } from '@/api/dynamic-status';
import { fetchCentersForClient } from '@/redux/ticketManagementSlice';

const ClientCreateDrawer = ({ open, onOpenChange, onSuccess, statusTab = 'active' }) => {
  const dispatch = useDispatch();
  const [currentTab, setCurrentTab] = useState('info');
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  const centers = useSelector((state) => state.ticketManagement?.centers?.data || []);
  const centersStatus = useSelector((state) => state.ticketManagement?.centers?.status || 'idle');
  const centerOptions = useMemo(() => {
    return (centers || []).map((c) => ({
      value: c.value || c.name || (typeof c === 'string' ? c : ''),
      label: c.label || c.center_name || c.name || (typeof c === 'string' ? c : ''),
    }));
  }, [centers]);

  // fetch center data
  useEffect(() => {
    if (!open) return;
    if (centersStatus === 'loading' || centersStatus === 'succeeded') return;
    dispatch(fetchCentersForClient());
  }, [dispatch, open, centersStatus]);
  // Get loading and error state from Redux
  const { isLoading: isCreatingClient, error: createClientError } = useSelector(
    (state) => state.client?.createClientModal || {},
  );

  const {
    control,
    handleSubmit,
    trigger,
    reset,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: defaultClientValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Customer', field: 'custom_status' });
        if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control,
    name: 'contacts',
  });

  const {
    fields: bankFields,
    append: appendBank,
    remove: removeBank,
  } = useFieldArray({
    control,
    name: 'banks',
  });

  // Watch GST status for conditional GSTIN behavior (must be a top-level hook)
  const gstStatus = useWatch({ control, name: 'custom_gst_status' });

  // Clear GSTIN value and errors when GST status changes from Registered to non-Registered
  useEffect(() => {
    if (gstStatus && gstStatus !== 'Registered' && gstStatus !== 'Composition') {
      setValue('gstin', '');
      clearErrors('gstin');
    }
  }, [gstStatus, setValue, clearErrors]);

  // Watch state for city filtering
  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedBillingCountry = useWatch({ control, name: 'billing_country' });
  const selectedState = useWatch({ control, name: 'state' });
  const selectedBillingState = useWatch({ control, name: 'billing_state' });

  // Watch billing same as primary checkbox
  const billingSameAsPrimary = useWatch({ control, name: 'billing_same_as_primary' });

  // Watch primary address values to sync with billing when checkbox is checked
  const primaryAddress = useWatch({
    control,
    name: ['address_line1', 'address_line2', 'country', 'state', 'city', 'pincode'],
  });

  // Watch all contacts to check SPOC status
  const allContacts = useWatch({ control, name: 'contacts' });

  // Watch all banks to check primary status
  const allBanks = useWatch({ control, name: 'banks' });

  // Function to check if a tab has errors
  const getTabErrors = useMemo(() => {
    const hasError = (error) => {
      if (!error) return false;
      if (error?.message) return true;
      if (Array.isArray(error)) {
        return error.some(
          (item) => item && (item.message || Object.values(item).some((v) => v?.message)),
        );
      }
      if (typeof error === 'object') {
        return Object.values(error).some((value) => value?.message || (value && hasError(value)));
      }
      return false;
    };

    return {
      info:
        ['display_name', 'legal_name', 'organization_type', 'company_sector'].some(
          (field) => errors[field]?.message,
        ) ||
        hasError(errors.contacts) ||
        [
          'address_line1',
          'address_line2',
          'country',
          'state',
          'city',
          'pincode',
          'billing_address_line1',
          'billing_address_line2',
          'billing_country',
          'billing_state',
          'billing_city',
          'billing_pincode',
        ].some((field) => errors[field]?.message),
      statutory: [
        'custom_organization_registration_number',
        'pan',
        'custom_tan_number',
        'custom_gst_status',
        'gstin',
        'custom__msme_registered_number',
        'custom_provident_fund_number',
        'custom_esi_number',
        'custom_professional_tax_number',
      ].some((field) => errors[field]?.message),
      bank: hasError(errors.banks),
    };
  }, [errors]);

  // Get all countries
  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map((country) => ({
      value: country.isoCode,
      label: country.name,
    }));
  }, []);

  // Get states for selected country
  const stateOptions = useMemo(() => {
    if (!selectedCountry) return [];
    return State.getStatesOfCountry(selectedCountry).map((state) => ({
      value: state.isoCode,
      label: state.name,
    }));
  }, [selectedCountry]);

  // Get states for selected billing country
  const billingStateOptions = useMemo(() => {
    if (!selectedBillingCountry) return [];
    return State.getStatesOfCountry(selectedBillingCountry).map((state) => ({
      value: state.isoCode,
      label: state.name,
    }));
  }, [selectedBillingCountry]);

  // Get cities for selected state
  const cityOptions = useMemo(() => {
    if (!selectedCountry || !selectedState) return [];
    return City.getCitiesOfState(selectedCountry, selectedState).map((city) => ({
      value: city.name,
      label: city.name,
    }));
  }, [selectedCountry, selectedState]);

  // Get cities for selected billing state
  const billingCityOptions = useMemo(() => {
    if (!selectedBillingCountry || !selectedBillingState) return [];
    return City.getCitiesOfState(selectedBillingCountry, selectedBillingState).map((city) => ({
      value: city.name,
      label: city.name,
    }));
  }, [selectedBillingCountry, selectedBillingState]);

  // Sync billing address when primary address changes and checkbox is checked
  React.useEffect(() => {
    if (billingSameAsPrimary) {
      setValue('billing_address_line1', primaryAddress[0] || '');
      setValue('billing_address_line2', primaryAddress[1] || '');
      setValue('billing_country', primaryAddress[2] || '');
      setValue('billing_state', primaryAddress[3] || '');
      setValue('billing_city', primaryAddress[4] || '');
      setValue('billing_pincode', primaryAddress[5] || '');
    }
  }, [primaryAddress, billingSameAsPrimary, setValue]);

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange?.(false);
      setCurrentTab('info');
      reset(defaultClientValues);
    }
  };

  const getFieldsForTab = (tab) => {
    switch (tab) {
      case 'info':
        return [...clientStepFields.info, ...clientStepFields.address];
      case 'statutory':
        return clientStepFields.statutory;
      case 'bank':
        return clientStepFields.bank;
      default:
        return [];
    }
  };

  const handleTabChange = async (value) => {
    // Validate current tab before switching
    const fieldsToValidate = getFieldsForTab(currentTab);
    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }
    setCurrentTab(value);
  };

  // Custom handler to remove contact while ensuring at least one SPOC remains
  const handleRemoveContact = (index) => {
    const contacts = allContacts || [];
    const contactToRemove = contacts[index];

    // If removing the only SPOC contact, set the first remaining contact as SPOC
    if (contactToRemove?.is_spoc) {
      const spocCount = contacts.filter((c) => c?.is_spoc).length;
      if (spocCount === 1 && contacts.length > 1) {
        // Find the first contact that's not being removed and set it as SPOC
        const nextContactIndex = contacts.findIndex((_, i) => i !== index);
        if (nextContactIndex !== -1) {
          setValue(`contacts.${nextContactIndex}.is_spoc`, true);
        }
      }
    }

    removeContact(index);
  };

  // Custom handler to remove bank while ensuring at least one primary remains
  const handleRemoveBank = (index) => {
    const banks = allBanks || [];
    const bankToRemove = banks[index];

    // If removing the only primary bank, set the first remaining bank as primary
    if (bankToRemove?.is_primary) {
      const primaryCount = banks.filter((b) => b?.is_primary).length;
      if (primaryCount === 1 && banks.length > 1) {
        // Find the first bank that's not being removed and set it as primary
        const nextBankIndex = banks.findIndex((_, i) => i !== index);
        if (nextBankIndex !== -1) {
          setValue(`banks.${nextBankIndex}.is_primary`, true);
        }
      }
    }

    removeBank(index);
  };

  const onSubmit = async (formValues) => {
    try {
      // Helper function to get country name from ISO code
      const getCountryName = (isoCode) => {
        if (!isoCode) return '';
        const country = countryOptions.find((opt) => opt.value === isoCode);
        return country?.label || isoCode;
      };

      // Helper function to get state name from ISO code and country code
      const getStateName = (isoCode, countryCode) => {
        if (!isoCode || !countryCode) return '';
        const states = State.getStatesOfCountry(countryCode);
        const state = states.find((s) => s.isoCode === isoCode);
        return state?.name || isoCode;
      };

      // Build addresses array
      const addresses = [];

      // Primary address
      if (formValues.address_line1 || formValues.city || formValues.state) {
        addresses.push({
          address_line_1: formValues.address_line1 || '',
          address_line_2: formValues.address_line2 || '',
          city: formValues.city || '',
          state: getStateName(formValues.state, formValues.country),
          pincode: formValues.pincode || '',
          country: getCountryName(formValues.country),
          is_primary: 1,
          is_billing: 0, // Primary address should not be billing
        });
      }

      // Billing address
      if (formValues.billing_same_as_primary) {
        // If billing same as primary, create a duplicate address entry for billing
        if (formValues.address_line1 || formValues.city || formValues.state) {
          addresses.push({
            address_line_1: formValues.address_line1 || '',
            address_line_2: formValues.address_line2 || '',
            city: formValues.city || '',
            state: getStateName(formValues.state, formValues.country),
            pincode: formValues.pincode || '',
            country: getCountryName(formValues.country),
            is_primary: 0,
            is_billing: 1, // Separate billing address entry
          });
        }
      } else {
        // Billing address is different from primary
        if (
          formValues.billing_address_line1 ||
          formValues.billing_city ||
          formValues.billing_state
        ) {
          addresses.push({
            address_line_1: formValues.billing_address_line1 || '',
            address_line_2: formValues.billing_address_line2 || '',
            city: formValues.billing_city || '',
            state: getStateName(formValues.billing_state, formValues.billing_country),
            pincode: formValues.billing_pincode || '',
            country: getCountryName(formValues.billing_country),
            is_primary: 0,
            is_billing: 1,
          });
        }
      }

      // Build contacts array
      const contacts = (formValues.contacts || []).map((contact) => {
        // Phone is already formatted as "+91-1234567890" from PhoneInputController
        const mobileNo = contact.phone || '';

        return {
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          contact_name: [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim(),
          mobile_no: mobileNo,
          email: contact.email || '',
          department: contact.department || '',
          other_department: contact.other_department || '',
          is_primary_contact: contact.is_spoc ? 1 : 0,
        };
      });

      // Build bank details array
      const bankDetails = (formValues.banks || [])
        .filter((bank) => bank.bank_name || bank.account_number)
        .map((bank) => ({
          bank_name: bank.bank_name || '',
          bank_account_number: bank.account_number || '',
          account_type: bank.account_type || '',
          ifsc_code: bank.ifsc_code || '',
          micr_code: bank.micr_code || '',
          swift_code: bank.swift_code || '',
          is_primary: bank.is_primary ? 1 : 0,
        }));

      // Year of establishment is already in YYYY-MM-DD format from Datepicker
      const yearOfEstablishment = formValues.year_of_establishment || '';

      // Build payload matching API structure
      const payload = {
        customer_name: formValues.display_name || '',
        custom_legal_name: formValues.legal_name || '',
        customer_type: 'Company',
        customer_group: formValues.organization_type || '',
        custom_status: dynamicStatusOptions[0]?.value || 'Active',
        industry: formValues.company_sector || '',
        website: formValues.website || '',
        custom_year_of_establishment: yearOfEstablishment,
        language: 'en',
        territory: 'India',
        pan: formValues.pan || '',
        gstin: formValues.gstin || '',
        custom_gst_status: formValues.custom_gst_status || '',
        custom_organization_registration_number:
          formValues.custom_organization_registration_number || '',
        custom_tan_number: formValues.custom_tan_number || '',
        custom__msme_registered_number: formValues.custom__msme_registered_number || '',
        custom_professional_tax_number: formValues.custom_professional_tax_number || '',
        custom_provident_fund_number: formValues.custom_provident_fund_number || '',
        custom_esi_number: formValues.custom_esi_number || '',
        custom_addresses: addresses,
        custom_contacts: contacts,
        custom_bank_details: bankDetails,
        custom_center_assignment: (formValues.center || []).map((cName) => ({
          center: cName,
        })),
        custom_customer_category: getClientTabCustomerCategory(statusTab),
      };
      const result = await dispatch(createClientThunk(payload));

      if (createClientThunk.fulfilled.match(result)) {
        showSuccessToast('Client created successfully.');
        onSuccess?.(result.payload);
        onOpenChange?.(false);
        setCurrentTab('info');
        reset(defaultClientValues);
      } else if (createClientThunk.rejected.match(result)) {
        const errorMessage = result.payload || result.error?.message || 'Failed to create client';
        showErrorToast(errorMessage, {
          defaultMessage: 'Failed to create client',
        });
      }
    } catch (error) {
      console.error('Failed to create client:', error);
      showErrorToast(error?.message || error, {
        defaultMessage: 'Failed to create client',
      });
    }
  };

  const renderBasicInfo = () => {
    return (
      <div className='flex flex-col gap-3 pb-5'>
        <h3 className='text-label-md text-neutral-500'>Basic Information</h3>
        <div className='grid grid-cols-2 gap-3'>
          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='display_name'>Client Name</Label.Root>
            <Controller
              key='field-info-display_name'
              name='display_name'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.display_name)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input id='display_name' {...field} placeholder='Enter display name' />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.display_name && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.display_name.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='legal_name'>
              Legal Entity Name
              <Label.Asterisk />
            </Label.Root>
            <Controller
              key='field-info-legal_name'
              name='legal_name'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.legal_name)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input id='legal_name' {...field} placeholder='Enter client legal name' />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.legal_name && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.legal_name.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='organization_type'>
              Org Type
              <Label.Asterisk />
            </Label.Root>
            <Controller
              key='field-info-organization_type'
              name='organization_type'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={Boolean(errors.organization_type)}
                  options={ORGANIZATION_TYPE_OPTIONS}
                  placeholder='Select'
                  searchPlaceholder='Search organization type...'
                  showArrow
                  isolateSearchKeyboard
                />
              )}
            />
            {errors.organization_type && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.organization_type.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='center'>
              Center <Label.Asterisk />
            </Label.Root>
            <Controller
              key='field-info-center'
              name='center'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  multiple={true}
                  value={field.value || []}
                  onValueChange={field.onChange}
                  options={centerOptions}
                  placeholder='Select Center'
                  searchPlaceholder='Search center...'
                  hasError={Boolean(errors.center)}
                  showArrow={true}
                  isolateSearchKeyboard
                  renderTrigger={({ selectedOptions }) => {
                    const selectedCount = selectedOptions?.length || 0;
                    if (selectedCount === 0) {
                      return <span className='text-text-soft-400'>Select Center</span>;
                    }

                    const firstLabel = selectedOptions[0]?.label || '';
                    const remainingCenterLabels = selectedOptions
                      .slice(1)
                      .map((opt) => opt?.label)
                      .filter(Boolean);

                    return (
                      <div className='flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden'>
                        <Tag.Root variant='gray' className='shrink-0 max-w-[150px]'>
                          <span className='truncate block'>{firstLabel}</span>
                        </Tag.Root>
                        {selectedCount > 1 && (
                          <Tooltip.Root size='xsmall'>
                            <Tooltip.Trigger asChild>
                              <span className='text-paragraph-xs text-text-soft-400 shrink-0 whitespace-nowrap cursor-pointer'>
                                +{selectedCount - 1}
                              </span>
                            </Tooltip.Trigger>
                            <Tooltip.Content
                              size='small'
                              variant='light'
                              side='top'
                              className='max-w-xs'
                            >
                              <div className='flex flex-col gap-1'>
                                <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                                  Additional Centers ({selectedCount - 1})
                                </span>
                                <div className='flex flex-col gap-1'>
                                  {remainingCenterLabels.map((centerLabel, index) => (
                                    <div
                                      key={`${centerLabel}-${index}`}
                                      className='text-paragraph-sm text-text-sub-600'
                                    >
                                      {centerLabel}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Tooltip.Content>
                          </Tooltip.Root>
                        )}
                      </div>
                    );
                  }}
                  renderOptionLabel={(opt) => (
                    <span className='paragraph-small flex items-center gap-2 text-text-main-900'>
                      <RiBuildingLine size={16} className='text-primary-base' />
                      {opt.label}
                    </span>
                  )}
                />
              )}
            />
            {errors.center && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.center.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='year_of_establishment'>Est. Date</Label.Root>
            <Controller
              key='field-info-year_of_establishment'
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
            {errors.year_of_establishment && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.year_of_establishment.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='company_sector'>Industry Sector</Label.Root>
            <Controller
              key='field-info-company_sector'
              name='company_sector'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={Boolean(errors.company_sector)}
                  options={COMPANY_SECTOR_OPTIONS}
                  placeholder='Select'
                  searchPlaceholder='Search industry sector...'
                  showArrow
                  isolateSearchKeyboard
                />
              )}
            />
            {errors.company_sector && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.company_sector.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='website'>Website</Label.Root>
            <Controller
              key='field-info-website'
              name='website'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.website)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input id='website' {...field} placeholder='https://example.com' />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.website && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.website.message}
              </Hint.Root>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContactDetails = () => {
    return (
      <div className='flex flex-col gap-3 pt-4 pb-5'>
        <div className='flex items-center justify-between'>
          <h3 className='text-label-md text-neutral-500'>Contact Details</h3>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            type='button'
            onClick={() =>
              appendContact({
                name: '',
                email: '',
                phone: '',
                department: '',
                other_department: '',
                is_spoc: false,
              })
            }
          >
            <Button.Icon as={RiAddLine} className='mr-0.5' />
            Add More Contact
          </Button.Root>
        </div>

        <div className='flex flex-col gap-4'>
          {contactFields.map((contact, index) => {
            const contactErrors = errors.contacts?.[index];
            const currentContact = allContacts?.[index];
            const showOtherDepartment = currentContact?.department === 'Other';

            return (
              <div key={contact.id} className='rounded-xl border border-stroke-soft-200 pt-0'>
                <div className='flex items-center justify-between px-2 py-[10px] rounded-t-xl bg-bg-weak-100'>
                  <span className='text-label-xs text-text-sub-500'>CONTACT {index + 1}</span>
                  <div className='flex items-center gap-2'>
                    <div className='flex items-center gap-2'>
                      <Controller
                        key={`field-info-contacts-${index}-is_spoc`}
                        name={`contacts.${index}.is_spoc`}
                        control={control}
                        render={({ field }) => (
                          <Switch.Root
                            id={`contacts.${index}.is_spoc`}
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              // Prevent turning off SPOC if it's the only one
                              if (!checked) {
                                const contacts = allContacts || [];
                                const spocCount = contacts.filter((c) => c?.is_spoc).length;
                                if (spocCount === 1) {
                                  // Don't allow turning off the only SPOC
                                  return;
                                }
                              }

                              // If setting this contact as SPOC, unset all others
                              if (checked) {
                                contactFields.forEach((_, i) => {
                                  if (i !== index) {
                                    setValue(`contacts.${i}.is_spoc`, false);
                                  }
                                });
                              }
                              field.onChange(checked);
                            }}
                          />
                        )}
                      />
                      <Label.Root
                        htmlFor={`contacts.${index}.is_spoc`}
                        className='text-label-sm text-text-main-900'
                      >
                        SPOC
                      </Label.Root>
                    </div>
                    {contactFields.length > 1 && (
                      <>
                        <div className='w-px h-4 bg-stroke-sub-300' />
                        <CompactButton.Root
                          type='button'
                          size='medium'
                          variant='ghost'
                          onClick={() => handleRemoveContact(index)}
                          className='text-text-sub-500'
                        >
                          <CompactButton.Icon as={RiDeleteBinLine} />
                        </CompactButton.Root>
                      </>
                    )}
                  </div>
                </div>

                <div className='border-t border-stroke-soft-200 rounded-b-xl bg-white p-4'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor={`contacts.${index}.first_name`}>
                        First Name
                        <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        key={`field-info-contacts-${index}-first_name`}
                        name={`contacts.${index}.first_name`}
                        control={control}
                        render={({ field }) => (
                          <Input.Root hasError={Boolean(contactErrors?.first_name)} size='medium'>
                            <Input.Wrapper>
                              <Input.Input
                                id={`contacts.${index}.first_name`}
                                {...field}
                                placeholder='Enter first name'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {contactErrors?.first_name && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiInformationFill} />
                          {contactErrors.first_name.message}
                        </Hint.Root>
                      )}
                    </div>

                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor={`contacts.${index}.last_name`}>
                        Last Name
                        <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        key={`field-info-contacts-${index}-last_name`}
                        name={`contacts.${index}.last_name`}
                        control={control}
                        render={({ field }) => (
                          <Input.Root hasError={Boolean(contactErrors?.last_name)} size='medium'>
                            <Input.Wrapper>
                              <Input.Input
                                id={`contacts.${index}.last_name`}
                                {...field}
                                placeholder='Enter last name'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {contactErrors?.last_name && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiInformationFill} />
                          {contactErrors.last_name.message}
                        </Hint.Root>
                      )}
                    </div>

                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor={`contacts.${index}.email`}>
                        Email
                        <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        key={`field-info-contacts-${index}-email`}
                        name={`contacts.${index}.email`}
                        control={control}
                        render={({ field }) => (
                          <Input.Root hasError={Boolean(contactErrors?.email)} size='medium'>
                            <Input.Wrapper>
                              <Input.Input
                                id={`contacts.${index}.email`}
                                {...field}
                                type='email'
                                placeholder='Enter email address'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {contactErrors?.email && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiInformationFill} />
                          {contactErrors.email.message}
                        </Hint.Root>
                      )}
                    </div>

                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor={`contacts.${index}.phone`}>
                        Mobile
                        <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        key={`field-info-contacts-${index}-phone`}
                        name={`contacts.${index}.phone`}
                        control={control}
                        render={({ field, fieldState }) => (
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
                        )}
                      />
                      {contactErrors?.phone && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiInformationFill} />
                          {contactErrors.phone.message}
                        </Hint.Root>
                      )}
                    </div>

                    <div className='flex flex-col gap-1'>
                      <Label.Root htmlFor={`contacts.${index}.department`}>Department</Label.Root>
                      <Controller
                        key={`field-info-contacts-${index}-department`}
                        name={`contacts.${index}.department`}
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Clear other_department if department is not "Other"
                              if (value !== 'Other') {
                                setValue(`contacts.${index}.other_department`, '');
                              }
                            }}
                            size='medium'
                            hasError={Boolean(contactErrors?.department)}
                            options={DEPARTMENT_OPTIONS}
                            placeholder='Select'
                            searchPlaceholder='Search department...'
                            showArrow
                            isolateSearchKeyboard
                          />
                        )}
                      />
                      {contactErrors?.department && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiInformationFill} />
                          {contactErrors.department.message}
                        </Hint.Root>
                      )}
                    </div>

                    {/* Show other_department field only when "Other" is selected */}
                    {showOtherDepartment && (
                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`contacts.${index}.other_department`}>
                          Specify Department
                          <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          key={`field-info-contacts-${index}-other_department`}
                          name={`contacts.${index}.other_department`}
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              hasError={Boolean(contactErrors?.other_department)}
                              size='medium'
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  id={`contacts.${index}.other_department`}
                                  {...field}
                                  placeholder='Enter department name'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {contactErrors?.other_department && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {contactErrors.other_department.message}
                          </Hint.Root>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper function to render address fields
  const renderAddressFields = (
    prefix,
    errors,
    selectedCountryForState,
    selectedStateForCity,
    stateOptionsForCountry,
    cityOptionsForState,
    disabled = false,
  ) => {
    const addressLine1Field = prefix ? `${prefix}_address_line1` : 'address_line1';
    const addressLine2Field = prefix ? `${prefix}_address_line2` : 'address_line2';
    const countryField = prefix ? `${prefix}_country` : 'country';
    const stateField = prefix ? `${prefix}_state` : 'state';
    const cityField = prefix ? `${prefix}_city` : 'city';
    const pincodeField = prefix ? `${prefix}_pincode` : 'pincode';

    return (
      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={addressLine1Field}>
            Address Line 1
            <Label.Asterisk />
          </Label.Root>
          <Controller
            key={`field-address-${prefix || 'primary'}-address_line1`}
            name={addressLine1Field}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors[addressLine1Field])} size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    id={addressLine1Field}
                    {...field}
                    placeholder='Type here...'
                    disabled={disabled}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors[addressLine1Field] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[addressLine1Field].message}
            </Hint.Root>
          )}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={addressLine2Field}>
            Address Line 2
            <Label.Asterisk />
          </Label.Root>
          <Controller
            key={`field-address-${prefix || 'primary'}-address_line2`}
            name={addressLine2Field}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors[addressLine2Field])} size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    id={addressLine2Field}
                    {...field}
                    placeholder='Type here...'
                    disabled={disabled}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors[addressLine2Field] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[addressLine2Field].message}
            </Hint.Root>
          )}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={countryField}>
            Country
            <Label.Asterisk />
          </Label.Root>
          <Controller
            key={`field-address-${prefix || 'primary'}-country`}
            name={countryField}
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue(stateField, '');
                  setValue(cityField, '');
                }}
                size='medium'
                hasError={Boolean(errors[countryField])}
                disabled={disabled}
                options={countryOptions}
                placeholder='Select country'
                searchPlaceholder='Search country...'
                showArrow
                isolateSearchKeyboard
              />
            )}
          />
          {errors[countryField] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[countryField].message}
            </Hint.Root>
          )}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={stateField}>
            State
            <Label.Asterisk />
          </Label.Root>
          <Controller
            key={`field-address-${prefix || 'primary'}-state`}
            name={stateField}
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue(cityField, '');
                }}
                size='medium'
                hasError={Boolean(errors[stateField])}
                disabled={disabled || !selectedCountryForState}
                options={stateOptionsForCountry}
                placeholder={selectedCountryForState ? 'Select state' : 'Select country first'}
                searchPlaceholder='Search state...'
                showArrow
                isolateSearchKeyboard
              />
            )}
          />
          {errors[stateField] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[stateField].message}
            </Hint.Root>
          )}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={cityField}>
            City
            <Label.Asterisk />
          </Label.Root>
          <Controller
            key={`field-address-${prefix || 'primary'}-city`}
            name={cityField}
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                size='medium'
                hasError={Boolean(errors[cityField])}
                disabled={disabled || !selectedStateForCity}
                options={cityOptionsForState}
                placeholder={selectedStateForCity ? 'Select city' : 'Select state first'}
                searchPlaceholder='Search city...'
                showArrow
                isolateSearchKeyboard
              />
            )}
          />
          {errors[cityField] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[cityField].message}
            </Hint.Root>
          )}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={pincodeField}>
            Pin Code
            <Label.Asterisk />
          </Label.Root>
          <Controller
            key={`field-address-${prefix || 'primary'}-pincode`}
            name={pincodeField}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors[pincodeField])} size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    id={pincodeField}
                    {...field}
                    placeholder='Enter pin code'
                    disabled={disabled}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors[pincodeField] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors[pincodeField].message}
            </Hint.Root>
          )}
        </div>
      </div>
    );
  };

  const renderAddressStep = () => {
    // Handle billing same as primary checkbox change
    const handleBillingSameAsPrimaryChange = (checked) => {
      setValue('billing_same_as_primary', checked);
      if (checked) {
        // Copy primary address to billing address
        setValue('billing_address_line1', primaryAddress[0] || '');
        setValue('billing_address_line2', primaryAddress[1] || '');
        setValue('billing_state', primaryAddress[2] || '');
        setValue('billing_city', primaryAddress[3] || '');
        setValue('billing_pincode', primaryAddress[4] || '');
      }
    };

    return (
      <div className='flex flex-col gap-5 pt-4'>
        {/* Primary Address */}
        <div className='flex flex-col gap-3'>
          <h3 className='text-label-md text-neutral-500'>Primary Address</h3>
          {renderAddressFields(
            '',
            errors,
            selectedCountry,
            selectedState,
            stateOptions,
            cityOptions,
          )}
          {/* Billing Same as Primary Checkbox */}
          <div className='flex gap-2 items-center mt-1'>
            <Controller
              key='field-address-billing_same_as_primary'
              name='billing_same_as_primary'
              control={control}
              render={({ field }) => (
                <Checkbox.Root
                  id='billing_same_as_primary'
                  checked={field.value}
                  onCheckedChange={handleBillingSameAsPrimaryChange}
                />
              )}
            />
            <label
              htmlFor='billing_same_as_primary'
              className='text-paragraph-small text-text-sub-500 cursor-pointer'
            >
              Billing address same as primary address
            </label>
          </div>
        </div>

        {/* Billing Address - Only show when checkbox is unchecked */}
        {!billingSameAsPrimary && (
          <div className='flex flex-col gap-3'>
            <h3 className='text-label-md text-neutral-500'>Billing Address</h3>
            {renderAddressFields(
              'billing',
              errors,
              selectedBillingCountry,
              selectedBillingState,
              billingStateOptions,
              billingCityOptions,
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStatutoryStep = () => {
    return (
      <div className='flex flex-col'>
        <h3 className='text-label-md text-neutral-500 mb-3'>Statutory & Compliance</h3>

        {/* First Grid Section */}
        <div className='grid grid-cols-2 gap-3 pb-5'>
          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='custom_organization_registration_number'>
              Registration Number
            </Label.Root>
            <Controller
              key='field-statutory-custom_organization_registration_number'
              name='custom_organization_registration_number'
              control={control}
              render={({ field }) => (
                <Input.Root
                  hasError={Boolean(errors.custom_organization_registration_number)}
                  size='medium'
                >
                  <Input.Wrapper>
                    <Input.Input
                      id='custom_organization_registration_number'
                      {...field}
                      placeholder='Enter registration number'
                    />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.custom_organization_registration_number && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.custom_organization_registration_number.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='pan'>PAN Number</Label.Root>
            <Controller
              key='field-statutory-pan'
              name='pan'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.pan)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      id='pan'
                      {...field}
                      placeholder='Enter pan number'
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase());
                      }}
                    />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.pan && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.pan.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='custom_tan_number'>TAN Number</Label.Root>
            <Controller
              key='field-statutory-custom_tan_number'
              name='custom_tan_number'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.custom_tan_number)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      id='custom_tan_number'
                      {...field}
                      placeholder='Enter tan number'
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase());
                      }}
                    />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.custom_tan_number && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.custom_tan_number.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='custom_gst_status'>GST Status</Label.Root>
            <Controller
              key='field-statutory-custom_gst_status'
              name='custom_gst_status'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={Boolean(errors.custom_gst_status)}
                  options={GST_STATUS_OPTIONS}
                  placeholder='Select'
                  searchPlaceholder='Search GST status...'
                  showArrow
                  isolateSearchKeyboard
                />
              )}
            />
            {errors.custom_gst_status && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.custom_gst_status.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='gstin'>
              GSTIN
              {(gstStatus === 'Registered' || gstStatus === 'Composition') && <Label.Asterisk />}
            </Label.Root>
            <Controller
              key='field-statutory-gstin'
              name='gstin'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.gstin)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      id='gstin'
                      {...field}
                      placeholder='Enter GSTIN'
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase());
                      }}
                      disabled={gstStatus !== 'Registered' && gstStatus !== 'Composition'}
                    />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.gstin && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.gstin.message}
              </Hint.Root>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className='border-t border-stroke-soft-200' />

        {/* Second Grid Section */}
        <div className='grid grid-cols-2 gap-3 pt-5'>
          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='custom__msme_registered_number'>MSME Registered</Label.Root>
            <Controller
              key='field-statutory-custom__msme_registered_number'
              name='custom__msme_registered_number'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.custom__msme_registered_number)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      id='custom__msme_registered_number'
                      {...field}
                      placeholder='Enter MSME registration number'
                    />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.custom__msme_registered_number && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.custom__msme_registered_number.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='custom_provident_fund_number'>PF Available</Label.Root>
            <Controller
              key='field-statutory-custom_provident_fund_number'
              name='custom_provident_fund_number'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.custom_provident_fund_number)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      id='custom_provident_fund_number'
                      {...field}
                      placeholder='Enter PF number'
                    />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.custom_provident_fund_number && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.custom_provident_fund_number.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='custom_esi_number'>ESI Available</Label.Root>
            <Controller
              key='field-statutory-custom_esi_number'
              name='custom_esi_number'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.custom_esi_number)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input id='custom_esi_number' {...field} placeholder='Enter ESI code' />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.custom_esi_number && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.custom_esi_number.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='custom_professional_tax_number'>Professional Tax</Label.Root>
            <Controller
              key='field-statutory-custom_professional_tax_number'
              name='custom_professional_tax_number'
              control={control}
              render={({ field }) => (
                <Input.Root hasError={Boolean(errors.custom_professional_tax_number)} size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      id='custom_professional_tax_number'
                      {...field}
                      placeholder='Enter professional tax number'
                    />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors.custom_professional_tax_number && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.custom_professional_tax_number.message}
              </Hint.Root>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBankStep = () => {
    return (
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-label-md text-neutral-500'>Bank Details</h3>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() =>
                appendBank({
                  bank_name: '',
                  account_number: '',
                  account_type: '',
                  ifsc_code: '',
                  micr_code: '',
                  swift_code: '',
                  is_primary: false,
                })
              }
            >
              <Button.Icon as={RiAddLine} className='mr-0.5' />
              Add More Bank Account
            </Button.Root>
          </div>

          <div className='flex flex-col gap-4'>
            {bankFields.map((bank, index) => {
              const bankErrors = errors.banks?.[index];

              return (
                <div key={bank.id} className='rounded-xl border border-stroke-soft-200 pt-0'>
                  <div className='flex items-center justify-between px-2 py-[10px] rounded-t-xl bg-bg-weak-100'>
                    <span className='text-label-xs text-text-sub-500'>
                      BANK ACCOUNT {index + 1}
                    </span>
                    <div className='flex items-center gap-2'>
                      <div className='flex items-center gap-2'>
                        <Controller
                          key={`field-bank-${index}-is_primary`}
                          name={`banks.${index}.is_primary`}
                          control={control}
                          render={({ field }) => (
                            <Switch.Root
                              id={`banks.${index}.is_primary`}
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                // Prevent turning off primary if it's the only one
                                if (!checked) {
                                  const banks = allBanks || [];
                                  const primaryCount = banks.filter((b) => b?.is_primary).length;
                                  if (primaryCount === 1) {
                                    // Don't allow turning off the only primary
                                    return;
                                  }
                                }

                                // If setting this bank as primary, unset all others
                                if (checked) {
                                  bankFields.forEach((_, i) => {
                                    if (i !== index) {
                                      setValue(`banks.${i}.is_primary`, false);
                                    }
                                  });
                                }
                                field.onChange(checked);
                              }}
                            />
                          )}
                        />
                        <Label.Root
                          htmlFor={`banks.${index}.is_primary`}
                          className='text-label-sm text-text-main-900'
                        >
                          Primary
                        </Label.Root>
                      </div>
                      {bankFields.length > 1 && (
                        <>
                          <div className='w-px h-4 bg-stroke-sub-300' />
                          <CompactButton.Root
                            type='button'
                            size='medium'
                            variant='ghost'
                            onClick={() => handleRemoveBank(index)}
                            className='text-text-sub-500'
                          >
                            <CompactButton.Icon as={RiDeleteBinLine} />
                          </CompactButton.Root>
                        </>
                      )}
                    </div>
                  </div>

                  <div className='border-t border-stroke-soft-200 rounded-b-xl bg-white p-4'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`banks.${index}.bank_name`}>
                          Bank Name
                          <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          key={`field-bank-${index}-bank_name`}
                          name={`banks.${index}.bank_name`}
                          control={control}
                          render={({ field }) => (
                            <Input.Root hasError={Boolean(bankErrors?.bank_name)} size='medium'>
                              <Input.Wrapper>
                                <Input.Input
                                  id={`banks.${index}.bank_name`}
                                  {...field}
                                  placeholder='Enter bank name'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {bankErrors?.bank_name && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {bankErrors.bank_name.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`banks.${index}.account_number`}>
                          Account Number
                          <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          key={`field-bank-${index}-account_number`}
                          name={`banks.${index}.account_number`}
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              hasError={Boolean(bankErrors?.account_number)}
                              size='medium'
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  id={`banks.${index}.account_number`}
                                  {...field}
                                  placeholder='Enter account number'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {bankErrors?.account_number && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {bankErrors.account_number.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`banks.${index}.account_type`}>
                          Account Type
                          <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          key={`field-bank-${index}-account_type`}
                          name={`banks.${index}.account_type`}
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              size='medium'
                              hasError={Boolean(bankErrors?.account_type)}
                              options={ACCOUNT_TYPE_OPTIONS}
                              placeholder='Select'
                              searchPlaceholder='Search account type...'
                              showArrow
                              isolateSearchKeyboard
                            />
                          )}
                        />
                        {bankErrors?.account_type && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {bankErrors.account_type.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`banks.${index}.ifsc_code`}>IFSC Code</Label.Root>
                        <Controller
                          key={`field-bank-${index}-ifsc_code`}
                          name={`banks.${index}.ifsc_code`}
                          control={control}
                          render={({ field }) => (
                            <Input.Root hasError={Boolean(bankErrors?.ifsc_code)} size='medium'>
                              <Input.Wrapper>
                                <Input.Input
                                  id={`banks.${index}.ifsc_code`}
                                  {...field}
                                  placeholder='ABCD0123456'
                                  onChange={(e) => {
                                    field.onChange(e.target.value.toUpperCase());
                                  }}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {bankErrors?.ifsc_code && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {bankErrors.ifsc_code.message}
                          </Hint.Root>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='relative flex h-full max-w-[800px] flex-col overflow-hidden'>
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiUserAddLine size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>
                Add New Client
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Enter below details to add new client.
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form onSubmit={handleSubmit(onSubmit)} className='flex h-full flex-col overflow-hidden'>
          <Drawer.Body className='flex-1 overflow-hidden'>
            <TabMenuVertical.Root
              value={currentTab}
              onValueChange={handleTabChange}
              className='flex h-full w-full'
            >
              {/* Left Sidebar - Vertical Tabs */}
              <TabMenuVertical.List className='p-4 w-[240px] bg-bg-weak-100 border-r border-stroke-soft-200'>
                <TabMenuVertical.Trigger
                  value='info'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiInformationLine} />
                  <span className='truncate'>Basic Details</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='statutory'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiShieldCheckLine} />
                  <span className='truncate'>Statutory & Compliance</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='bank'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiBankLine} />
                  <span className='truncate'>Bank Details</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
              </TabMenuVertical.List>

              {/* Right Content Area */}
              <div className='flex-1 overflow-y-auto'>
                <TabMenuVertical.Content value='info' className='h-full'>
                  <div className='px-8 py-5'>
                    <div className='flex flex-col divide-y divide-stroke-soft-200'>
                      {renderBasicInfo()}
                      {renderContactDetails()}
                      {renderAddressStep()}
                    </div>
                  </div>
                </TabMenuVertical.Content>
                <TabMenuVertical.Content value='statutory' className='h-full'>
                  <div className='px-8 py-5'>{renderStatutoryStep()}</div>
                </TabMenuVertical.Content>
                <TabMenuVertical.Content value='bank' className='h-full'>
                  <div className='px-8 py-5'>{renderBankStep()}</div>
                </TabMenuVertical.Content>
              </div>
            </TabMenuVertical.Root>
          </Drawer.Body>

          <Drawer.Footer className='border-t bg-white'>
            <div className='flex items-center justify-end gap-3 p-6'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={handleClose}
                disabled={isSubmitting}
                className='w-20'
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='submit'
                size='medium'
                disabled={isSubmitting || isCreatingClient}
                className='w-20'
              >
                {isSubmitting || isCreatingClient ? 'Creating...' : 'Add'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ClientCreateDrawer;
