import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowRightSLine,
  RiShieldCheckLine,
  RiBankLine,
  RiAddLine,
  RiDeleteBinLine,
  RiUserAddLine,
  RiInformationLine,
  RiInformationFill,
  RiPriceTag3Line,
  RiCloseLine,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Checkbox from '@/components/ui/checkbox';
import * as Switch from '@/components/ui/switch';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as Badge from '@/components/ui/badge';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import { PhoneInputController } from '@/components/ui/phone-input';
import {
  createLandlordThunk,
  fetchDepartmentListThunk,
  selectDepartmentList,
} from '@/redux/landlordSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { ENGAGEMENT_MODE_OPTIONS } from './constants';
import {
  GST_STATUS_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from '@/components/clients-management/constants';
import { State, City } from 'country-state-city';
import {
  landlordCreateSchema,
  defaultLandlordValues,
  landlordStepFields,
} from '@/schemas/landlord-schemas';
import { getDepartmentOptions } from '@/components/landlords-management/constants';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import * as Tooltip from '@/components/ui/tooltip';

const CreateLandlordModal = ({
  landlordData,
  isOpen,
  isLoading: externalLoading,
  handleOpenChange,
  handleSave: _handleSave,
  onSuccess,
  defaultCenter,
}) => {
  const dispatch = useDispatch();
  const [currentTab, setCurrentTab] = useState('basic');
  const [tags, setTags] = useState([]);

  const departmentList = useSelector(selectDepartmentList);
  const DEPARTMENT_OPTIONS = useMemo(() => getDepartmentOptions(departmentList), [departmentList]);
  const centerAccess = useSelector(selectCenterAccess);
  const centers = centerAccess?.data || [];
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchDepartmentListThunk());
      dispatch(fetchCenterAccess({ silent: true }));
    }
  }, [isOpen, dispatch]);
  const {
    control,
    handleSubmit,
    trigger,
    reset,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(landlordCreateSchema),
    defaultValues: defaultLandlordValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({ control, name: 'contacts' });

  const {
    fields: bankFields,
    append: appendBank,
    remove: removeBank,
  } = useFieldArray({ control, name: 'banks' });

  const gstStatus = useWatch({ control, name: 'custom_gst_status' });
  const selectedState = useWatch({ control, name: 'state' });
  const selectedBillingState = useWatch({ control, name: 'billing_state' });
  const billingSameAsPrimary = useWatch({ control, name: 'billing_same_as_primary' });
  const primaryAddress = useWatch({
    control,
    name: ['address_line1', 'address_line2', 'state', 'city', 'pincode'],
  });
  const allContacts = useWatch({ control, name: 'contacts' });
  const allBanks = useWatch({ control, name: 'banks' });

  useEffect(() => {
    if (gstStatus && gstStatus !== 'Registered' && gstStatus !== 'Composition') {
      setValue('gstin', '');
      clearErrors('gstin');
    }
  }, [gstStatus, setValue, clearErrors]);

  useEffect(() => {
    if (isOpen && defaultCenter) {
      setValue('center', defaultCenter);
    }
  }, [isOpen, defaultCenter, setValue]);

  const stateOptions = useMemo(() => {
    const indianStates = State.getStatesOfCountry('IN');
    return indianStates.map((state) => ({
      value: state.isoCode,
      label: state.name,
    }));
  }, []);

  const cityOptions = useMemo(() => {
    if (!selectedState) return [];
    const cities = City.getCitiesOfState('IN', selectedState);
    return cities.map((city) => ({ value: city.name, label: city.name }));
  }, [selectedState]);

  const billingCityOptions = useMemo(() => {
    if (!selectedBillingState) return [];
    const cities = City.getCitiesOfState('IN', selectedBillingState);
    return cities.map((city) => ({ value: city.name, label: city.name }));
  }, [selectedBillingState]);

  React.useEffect(() => {
    if (billingSameAsPrimary) {
      setValue('billing_address_line1', primaryAddress[0] || '');
      setValue('billing_address_line2', primaryAddress[1] || '');
      setValue('billing_state', primaryAddress[2] || '');
      setValue('billing_city', primaryAddress[3] || '');
      setValue('billing_pincode', primaryAddress[4] || '');
    }
  }, [primaryAddress, billingSameAsPrimary, setValue]);

  const handleClose = () => {
    if (!isSubmitting) {
      handleOpenChange?.(false);
      setCurrentTab('basic');
      reset(defaultLandlordValues);
    }
  };

  const getFieldsForTab = (tab) => {
    switch (tab) {
      case 'basic':
        return [
          ...landlordStepFields.basic,
          ...landlordStepFields.address,
          'billing_address_line1',
          'billing_address_line2',
          'billing_state',
          'billing_city',
          'billing_pincode',
        ];
      case 'statutory':
        return landlordStepFields.statutory;
      case 'bank':
        return landlordStepFields.bank;
      default:
        return [];
    }
  };

  const handleTabChange = async (value) => {
    const fieldsToValidate = getFieldsForTab(currentTab);
    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }
    setCurrentTab(value);
  };

  const handleRemoveContact = (index) => {
    const contacts = allContacts || [];
    const contactToRemove = contacts[index];
    if (contactToRemove?.is_spoc) {
      const spocCount = contacts.filter((c) => c?.is_spoc).length;
      if (spocCount === 1 && contacts.length > 1) {
        const nextContactIndex = contacts.findIndex((_, i) => i !== index);
        if (nextContactIndex !== -1) {
          setValue(`contacts.${nextContactIndex}.is_spoc`, true);
        }
      }
    }
    removeContact(index);
  };

  const handleRemoveBank = (index) => {
    const banks = allBanks || [];
    const bankToRemove = banks[index];
    if (bankToRemove?.is_primary) {
      const primaryCount = banks.filter((b) => b?.is_primary).length;
      if (primaryCount === 1 && banks.length > 1) {
        const nextBankIndex = banks.findIndex((_, i) => i !== index);
        if (nextBankIndex !== -1) {
          setValue(`banks.${nextBankIndex}.is_primary`, true);
        }
      }
    }
    removeBank(index);
  };

  const getStateName = (isoCode) => {
    if (!isoCode) return '';
    const state = stateOptions.find((opt) => opt.value === isoCode);
    return state?.label || isoCode;
  };

  const onSubmit = async (formValues) => {
    const address = [];
    if (formValues.address_line1 || formValues.city || formValues.state) {
      address.push({
        address_line_1: formValues.address_line1 || '',
        address_line_2: formValues.address_line2 || '',
        state: getStateName(formValues.state),
        city: formValues.city || '',
        pincode: formValues.pincode || '',
        is_primary: 1,
        is_billing: 0,
        is_shipping: 0,
      });
    }
    if (formValues.billing_same_as_primary) {
      if (formValues.address_line1 || formValues.city || formValues.state) {
        address.push({
          address_line_1: formValues.address_line1 || '',
          address_line_2: formValues.address_line2 || '',
          state: getStateName(formValues.state),
          city: formValues.city || '',
          pincode: formValues.pincode || '',
          is_primary: 0,
          is_billing: 1,
          is_shipping: 0,
        });
      }
    } else if (
      formValues.billing_address_line1 ||
      formValues.billing_city ||
      formValues.billing_state
    ) {
      address.push({
        address_line_1: formValues.billing_address_line1 || '',
        address_line_2: formValues.billing_address_line2 || '',
        state: getStateName(formValues.billing_state),
        city: formValues.billing_city || '',
        pincode: formValues.billing_pincode || '',
        is_primary: 0,
        is_billing: 1,
        is_shipping: 0,
      });
    }

    const contact = (formValues.contacts || []).map((c) => ({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      contact_email: c.email || '',
      mobile_number: c.phone || '',
      department: c.department || '',
      is_primary: c.is_spoc ? 1 : 0,
    }));

    const bank_account_details = (formValues.banks || [])
      .filter((bank) => bank.bank_name || bank.account_number)
      .map((bank) => ({
        bank_name: bank.bank_name || '',
        account_type: bank.account_type || 'Savings',
        account_number: bank.account_number || '',
        ifsc_code: bank.ifsc_code || '',
        is_primary: bank.is_primary ? 1 : 0,
      }));

    const payload = {
      landlord_name: formValues.name || '',
      legal_name: formValues.legal_name || '',
      engagement_mode: formValues.engagement_mode || '',
      registration_number: formValues.custom_organization_registration_number || '',
      pan_number: formValues.pan || '',
      tan_number: formValues.custom_tan_number || '',
      gst_status: formValues.custom_gst_status || '',
      gstin: formValues.gstin || '',
      pf_available: formValues.custom_provident_fund_number || '',
      msme_registered: formValues.custom__msme_registered_number || '',
      professional_tax: formValues.custom_professional_tax_number || '',
      esi_available: formValues.custom_esi_number || '',
      bank_account_details,
      contact,
      address,
      tags,
      center_details: [
        {
          center: formValues.center || '',
          shop_number: formValues.shop_number
            ? JSON.stringify(
                formValues.shop_number
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            : JSON.stringify([]),
          block_floor: formValues.block_floor || '',
        },
      ],
    };

    try {
      if (_handleSave) {
        await _handleSave(payload);
        showSuccessToast('Landlord created successfully.');
        onSuccess?.();
        handleOpenChange?.(false);
        setCurrentTab('basic');
        reset(defaultLandlordValues);
      } else {
        const result = await dispatch(createLandlordThunk(payload));
        if (createLandlordThunk.fulfilled.match(result)) {
          showSuccessToast('Landlord created successfully.');
          onSuccess?.(result.payload);
          handleOpenChange?.(false);
          setCurrentTab('basic');
          reset(defaultLandlordValues);
        } else if (createLandlordThunk.rejected.match(result)) {
          const errorMessage =
            result.payload || result.error?.message || 'Failed to create landlord';
          showErrorToast(errorMessage, { defaultMessage: 'Failed to create landlord' });
          return;
        }
      }
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  };

  const renderBasicInfo = () => (
    <div className='flex flex-col gap-3 pb-5'>
      <h3 className='text-label-md text-neutral-500'>Basic Information</h3>
      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='name'>
            Name
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='name'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.name)} size='medium'>
                <Input.Wrapper>
                  <Input.Input id='name' {...field} placeholder='Enter landlord name' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors.name && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.name.message}
            </Hint.Root>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='legal_name'>
            Legal Name
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='legal_name'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.legal_name)} size='medium'>
                <Input.Wrapper>
                  <Input.Input id='legal_name' {...field} placeholder='Enter legal name' />
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
          <Label.Root htmlFor='center'>
            Center
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='center'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                size='medium'
                hasError={!!errors.center}
                disabled={!!defaultCenter}
                options={centers.map((center) => ({
                  value: center.name,
                  label: center.center_name,
                }))}
                placeholder='Select'
                searchPlaceholder='Search center...'
                triggerClassName='data-[disabled]:font-bold data-[disabled]:text-gray-600'
                showArrow
                isolateSearchKeyboard
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
          <Label.Root htmlFor='shop_number'>
            Shop No.
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className='inline-flex cursor-default'>
                  <RiInformationLine className='text-text-sub-400 ml-1' />
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='top'>
                Enter multiple shop numbers separated by commas (e.g. 101, 102, 103)
              </Tooltip.Content>
            </Tooltip.Root>
          </Label.Root>
          <Controller
            name='shop_number'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.shop_number)} size='medium'>
                <Input.Wrapper>
                  <Input.Input id='shop_number' {...field} placeholder='Enter shop number' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors.shop_number && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.shop_number.message}
            </Hint.Root>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='block_floor'>Block / Floor</Label.Root>
          <Controller
            name='block_floor'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.block_floor)} size='medium'>
                <Input.Wrapper>
                  <Input.Input id='block_floor' {...field} placeholder='Enter block/floor' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors.block_floor && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.block_floor.message}
            </Hint.Root>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='engagement_mode'>
            Engagement Mode
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='engagement_mode'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                size='medium'
                hasError={Boolean(errors.engagement_mode)}
                options={ENGAGEMENT_MODE_OPTIONS}
                placeholder='Select'
                searchPlaceholder='Search engagement mode...'
                showArrow
                isolateSearchKeyboard
              />
            )}
          />
          {errors.engagement_mode && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.engagement_mode.message}
            </Hint.Root>
          )}
        </div>
      </div>
    </div>
  );

  const renderContactDetails = () => (
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
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              department: '',
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
          return (
            <div key={contact.id} className='rounded-xl border border-stroke-soft-200 pt-0'>
              <div className='flex items-center justify-between px-2 py-[10px] rounded-t-xl bg-bg-weak-100'>
                <span className='text-label-xs text-text-sub-500'>CONTACT {index + 1}</span>
                <div className='flex items-center gap-2'>
                  <div className='flex items-center gap-2'>
                    <Controller
                      name={`contacts.${index}.is_spoc`}
                      control={control}
                      render={({ field }) => (
                        <Switch.Root
                          id={`contacts.${index}.is_spoc`}
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              const contacts = allContacts || [];
                              const spocCount = contacts.filter((c) => c?.is_spoc).length;
                              if (spocCount === 1) return;
                            }
                            if (checked) {
                              contactFields.forEach((_, i) => {
                                if (i !== index) setValue(`contacts.${i}.is_spoc`, false);
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
                      name={`contacts.${index}.first_name`}
                      control={control}
                      render={({ field }) => (
                        <Input.Root hasError={Boolean(contactErrors?.first_name)} size='medium'>
                          <Input.Wrapper>
                            <Input.Input {...field} placeholder='Enter first name' />
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
                      name={`contacts.${index}.last_name`}
                      control={control}
                      render={({ field }) => (
                        <Input.Root hasError={Boolean(contactErrors?.last_name)} size='medium'>
                          <Input.Wrapper>
                            <Input.Input {...field} placeholder='Enter last name' />
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
                      name={`contacts.${index}.email`}
                      control={control}
                      render={({ field }) => (
                        <Input.Root hasError={Boolean(contactErrors?.email)} size='medium'>
                          <Input.Wrapper>
                            <Input.Input
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
                      name={`contacts.${index}.phone`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <PhoneInputController
                          value={field.value}
                          onChange={field.onChange}
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
                      name={`contacts.${index}.department`}
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          size='medium'
                          hasError={Boolean(contactErrors?.department)}
                          disabled={departmentList.isLoading}
                          options={DEPARTMENT_OPTIONS}
                          placeholder={departmentList.isLoading ? 'Loading...' : 'Select'}
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAddressFields = (prefix, errs) => {
    const addressLine1Field = prefix ? `${prefix}_address_line1` : 'address_line1';
    const addressLine2Field = prefix ? `${prefix}_address_line2` : 'address_line2';
    const stateField = prefix ? `${prefix}_state` : 'state';
    const cityField = prefix ? `${prefix}_city` : 'city';
    const pincodeField = prefix ? `${prefix}_pincode` : 'pincode';
    const options = prefix ? billingCityOptions : cityOptions;
    const selState = prefix ? selectedBillingState : selectedState;

    return (
      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={addressLine1Field}>
            Address Line 1
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name={addressLine1Field}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errs[addressLine1Field])} size='medium'>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Type here...' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errs[addressLine1Field] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errs[addressLine1Field].message}
            </Hint.Root>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={addressLine2Field}>
            Address Line 2
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name={addressLine2Field}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errs[addressLine2Field])} size='medium'>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Type here...' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errs[addressLine2Field] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errs[addressLine2Field].message}
            </Hint.Root>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={stateField}>
            State
            <Label.Asterisk />
          </Label.Root>
          <Controller
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
                hasError={Boolean(errs[stateField])}
                options={stateOptions}
                placeholder='Select'
                searchPlaceholder='Search state...'
                showArrow
                isolateSearchKeyboard
              />
            )}
          />
          {errs[stateField] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errs[stateField].message}
            </Hint.Root>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={cityField}>
            City
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name={cityField}
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                size='medium'
                hasError={Boolean(errs[cityField])}
                disabled={!selState}
                options={options}
                placeholder={selState ? 'Select' : 'Select state first'}
                searchPlaceholder='Search city...'
                showArrow
                isolateSearchKeyboard
              />
            )}
          />
          {errs[cityField] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errs[cityField].message}
            </Hint.Root>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor={pincodeField}>
            Pin Code
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name={pincodeField}
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errs[pincodeField])} size='medium'>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Enter pin code' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errs[pincodeField] && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errs[pincodeField].message}
            </Hint.Root>
          )}
        </div>
      </div>
    );
  };

  const renderAddressStep = () => {
    const handleBillingSameAsPrimaryChange = (checked) => {
      setValue('billing_same_as_primary', checked);
      if (checked) {
        setValue('billing_address_line1', primaryAddress[0] || '');
        setValue('billing_address_line2', primaryAddress[1] || '');
        setValue('billing_state', primaryAddress[2] || '');
        setValue('billing_city', primaryAddress[3] || '');
        setValue('billing_pincode', primaryAddress[4] || '');
      }
    };
    return (
      <div className='flex flex-col gap-5 pt-4'>
        <div className='flex flex-col gap-3'>
          <h3 className='text-label-md text-neutral-500'>Primary Address</h3>
          {renderAddressFields('', errors)}
          <div className='flex gap-2 items-center mt-1'>
            <Controller
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
        {!billingSameAsPrimary && (
          <div className='flex flex-col gap-3'>
            <h3 className='text-label-md text-neutral-500'>Billing Address</h3>
            {renderAddressFields('billing', errors)}
          </div>
        )}
        <div className='w-full flex flex-col gap-3'>
          <div className='flex items-center gap-1'>
            <RiPriceTag3Line className='text-[var(--color-text-soft-400)]' size={20} />
            <span className='label-medium text-[var(--color-text-sub-500)]'>Tags</span>
          </div>
          <div className='flex flex-col gap-1'>
            <span className='label-small text-[var(--color-text-main-900)]'>Tags</span>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setTags([...tags, e.target.value]);
                      e.target.value = '';
                    }
                  }}
                  placeholder='Type and press enter to create'
                />
              </Input.Wrapper>
            </Input.Root>
            {tags.length > 0 && (
              <div className='w-full flex pt-2 flex-wrap gap-2'>
                {tags.map((item, ind) => (
                  <Badge.Root key={ind} variant='stroke' className='flex items-center gap-1 pr-1'>
                    {item}
                    <RiCloseLine
                      onClick={() => setTags(tags.filter((_, i) => i !== ind))}
                      size={14}
                      className='hover:cursor-pointer text-(--color-text-sub-500)'
                    />
                  </Badge.Root>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStatutoryStep = () => (
    <div className='flex flex-col'>
      <h3 className='text-label-md text-neutral-500 mb-3'>Statutory & Compliance</h3>
      {/* Order: Row1 Reg#|PAN, Row2 TAN|GST Status, Row3 GSTIN full width, Row4 MSME|PF, Row5 ESI|Prof Tax */}
      <div className='grid grid-cols-2 gap-3'>
        {/* Row 1: Registration Number | PAN Number */}
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='custom_organization_registration_number'>
            Registration Number
          </Label.Root>
          <Controller
            name='custom_organization_registration_number'
            control={control}
            render={({ field }) => (
              <Input.Root
                hasError={Boolean(errors.custom_organization_registration_number)}
                size='medium'
              >
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Enter registration number' />
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
            name='pan'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.pan)} size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...field}
                    placeholder='Enter pan number'
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
        {/* Row 2: TAN Number | GST Status */}
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='custom_tan_number'>TAN Number</Label.Root>
          <Controller
            name='custom_tan_number'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.custom_tan_number)} size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...field}
                    placeholder='Enter tan number'
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
        {/* Row 3: GSTIN - full width */}
        <div className='flex flex-col gap-1 col-span-2'>
          <Label.Root htmlFor='gstin'>
            GSTIN
            {(gstStatus === 'Registered' || gstStatus === 'Composition') && <Label.Asterisk />}
          </Label.Root>
          <Controller
            name='gstin'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.gstin)} size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...field}
                    placeholder='Enter GSTIN'
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
        {/* Row 4: MSME Registered | PF Available */}
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='custom__msme_registered_number'>MSME Registered</Label.Root>
          <Controller
            name='custom__msme_registered_number'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.custom__msme_registered_number)} size='medium'>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Enter MSME registration number' />
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
            name='custom_provident_fund_number'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.custom_provident_fund_number)} size='medium'>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Enter PF number' />
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
        {/* Row 5: ESI Available | Professional Tax */}
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='custom_esi_number'>ESI Available</Label.Root>
          <Controller
            name='custom_esi_number'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.custom_esi_number)} size='medium'>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Enter ESI code' />
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
            name='custom_professional_tax_number'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={Boolean(errors.custom_professional_tax_number)} size='medium'>
                <Input.Wrapper>
                  <Input.Input {...field} placeholder='Enter professional tax number' />
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

  const renderBankStep = () => (
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
                account_type: 'Savings',
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
        <div className='flex  flex-col gap-4'>
          {bankFields.map((bank, index) => {
            const bankErrors = errors.banks?.[index];
            return (
              <div key={bank.id} className='rounded-xl border border-stroke-soft-200 pt-0'>
                <div className='flex items-center justify-between px-2 py-[10px] rounded-t-xl bg-bg-weak-100'>
                  <span className='text-label-xs text-text-sub-500'>BANK ACCOUNT {index + 1}</span>
                  <div className='flex items-center gap-2'>
                    <div className='flex items-center gap-2'>
                      <Controller
                        name={`banks.${index}.is_primary`}
                        control={control}
                        render={({ field }) => (
                          <Switch.Root
                            id={`banks.${index}.is_primary`}
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              if (!checked) {
                                const banks = allBanks || [];
                                const primaryCount = banks.filter((b) => b?.is_primary).length;
                                if (primaryCount === 1) return;
                              }
                              if (checked) {
                                bankFields.forEach((_, i) => {
                                  if (i !== index) setValue(`banks.${i}.is_primary`, false);
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
                        name={`banks.${index}.account_number`}
                        control={control}
                        render={({ field }) => (
                          <Input.Root hasError={Boolean(bankErrors?.account_number)} size='medium'>
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
                      <Label.Root htmlFor={`banks.${index}.ifsc_code`}>
                        IFSC Code
                        <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name={`banks.${index}.ifsc_code`}
                        control={control}
                        render={({ field }) => (
                          <Input.Root hasError={Boolean(bankErrors?.ifsc_code)} size='medium'>
                            <Input.Wrapper>
                              <Input.Input
                                id={`banks.${index}.ifsc_code`}
                                {...field}
                                placeholder='ABCD0123456'
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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

  const loading = isSubmitting || externalLoading;

  const collectErrorMessages = (object, out = []) => {
    if (!object || typeof object !== 'object') return out;
    if (typeof object.message === 'string' && object.message.trim())
      out.push(object.message.trim());
    for (const key of Object.keys(object)) {
      if (key === 'message') continue;
      collectErrorMessages(object[key], out);
    }
    return out;
  };

  const onError = (formErrors) => {
    if (formErrors.banks) {
      showErrorToast('Bank details are mandatory');
      return;
    }
    const messages = collectErrorMessages(formErrors);
    // Prefer a descriptive message over the generic "Required"
    const generic = /^required\.?$/i;
    const message =
      messages.find((m) => !generic.test(m)) ||
      messages[0] ||
      'Please fix the errors in the form before submitting.';
    showErrorToast(message);
  };
  return (
    <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Content className='relative flex h-full max-w-[800px] flex-col overflow-hidden'>
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiUserAddLine size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>
                Add New Landlord
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Enter below details to add new landlord.
              </p>
            </div>
          </div>
        </Drawer.Header>
        <form
          onSubmit={handleSubmit(onSubmit, onError)}
          className='flex h-full flex-col overflow-hidden'
        >
          <Drawer.Body className='flex-1 overflow-hidden'>
            <TabMenuVertical.Root
              value={currentTab}
              onValueChange={handleTabChange}
              className='flex h-full w-full'
            >
              <TabMenuVertical.List className='p-4 w-[240px] bg-bg-weak-100 border-r border-stroke-soft-200'>
                <TabMenuVertical.Trigger
                  value='basic'
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
                  {errors.banks && (
                    <RiInformationFill className='text-red-500 shrink-0' size={16} />
                  )}
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
              </TabMenuVertical.List>
              <div className='flex-1 overflow-y-auto'>
                <TabMenuVertical.Content value='basic' className='h-full'>
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
                disabled={loading}
                className='w-20'
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' size='medium' disabled={loading} className='w-20'>
                {loading ? 'Creating...' : 'Add'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateLandlordModal;
