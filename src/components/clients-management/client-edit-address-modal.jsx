import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { RiMapPin2Line, RiPriceTag3Line } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import { Country, State, City } from 'country-state-city';
import { updateClientAddressThunk, getClientDetailThunk } from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { addressEditSchema, defaultAddressValues } from '@/schemas/address-schema';

// Helper functions outside component
const getCountryIsoCode = (countryName) => {
  if (!countryName) return 'IN'; // Default to India
  const country = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase(),
  );
  return country?.isoCode || 'IN';
};

const getCountryNameFromIso = (isoCode) => {
  if (!isoCode) return '';
  const country = Country.getCountryByCode(isoCode);
  return country?.name || isoCode;
};

const getStateIsoCode = (stateName, countryCode = 'IN') => {
  if (!stateName) return '';
  const states = State.getStatesOfCountry(countryCode);
  const state = states.find((s) => s.name === stateName);
  return state?.isoCode || '';
};

const getStateNameFromIso = (isoCode, countryCode = 'IN') => {
  if (!isoCode || !countryCode) return '';
  const states = State.getStatesOfCountry(countryCode);
  const state = states.find((s) => s.isoCode === isoCode);
  return state?.name || isoCode;
};

const ClientEditAddressModal = ({
  open,
  onOpenChange,
  primaryAddress: primaryAddressProperty,
  billingAddress: billingAddressProperty,
  clientId,
  addressType = 'primary',
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressEditSchema),
    defaultValues: defaultAddressValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedState = useWatch({ control, name: 'state' });
  const billingSameAsPrimary = useWatch({ control, name: 'billing_same_as_primary' });

  // Determine if we're editing billing address only (not primary)
  // When editing billing, we should NOT show the "billing same as primary" checkbox
  const isEditingBillingOnly = addressType === 'billing';

  // Memoized country options
  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map((country) => ({
      value: country.isoCode,
      label: country.name,
    }));
  }, []);

  // Memoized state options based on selected country
  const stateOptions = useMemo(() => {
    if (!selectedCountry) return [];
    return State.getStatesOfCountry(selectedCountry).map((state) => ({
      value: state.isoCode,
      label: state.name,
    }));
  }, [selectedCountry]);

  // Memoized city options based on selected state and country
  const cityOptions = useMemo(() => {
    if (!selectedCountry || !selectedState) return [];
    return City.getCitiesOfState(selectedCountry, selectedState).map((city) => ({
      value: city.name,
      label: city.name,
    }));
  }, [selectedCountry, selectedState]);

  // Memoized initial values function
  const getInitialValues = useCallback(() => {
    const primaryAddr = primaryAddressProperty;
    const billingAddr = billingAddressProperty;

    if (isEditingBillingOnly && billingAddr) {
      const countryIso = getCountryIsoCode(billingAddr.country);
      const stateIso = getStateIsoCode(billingAddr.state, countryIso);
      return {
        address_line1: billingAddr.address_line_1 || '',
        address_line2: billingAddr.address_line_2 || '',
        country: countryIso,
        state: stateIso,
        city: billingAddr.city || '',
        pincode: billingAddr.pincode || '',
        billing_same_as_primary: false,
        billing_address_line1: billingAddr.address_line_1 || '',
        billing_address_line2: billingAddr.address_line_2 || '',
        billing_country: countryIso,
        billing_state: stateIso,
        billing_city: billingAddr.city || '',
        billing_pincode: billingAddr.pincode || '',
      };
    }

    const billingSameAsPrimaryFlag =
      !billingAddr ||
      (primaryAddr &&
        billingAddr &&
        primaryAddr.name === billingAddr.name &&
        billingAddr.is_billing === 1 &&
        billingAddr.is_primary === 1);

    const primaryCountryIso = getCountryIsoCode(primaryAddr?.country);

    return {
      address_line1: primaryAddr?.address_line_1 || '',
      address_line2: primaryAddr?.address_line_2 || '',
      country: primaryCountryIso,
      state: getStateIsoCode(primaryAddr?.state, primaryCountryIso),
      city: primaryAddr?.city || '',
      pincode: primaryAddr?.pincode || '',
      billing_same_as_primary: billingSameAsPrimaryFlag,
      billing_address_line1: '',
      billing_address_line2: '',
      billing_country: '',
      billing_state: '',
      billing_city: '',
      billing_pincode: '',
    };
  }, [primaryAddressProperty, billingAddressProperty, isEditingBillingOnly]);

  // Initialize form when modal opens
  useEffect(() => {
    const hasAddress = isEditingBillingOnly ? billingAddressProperty : primaryAddressProperty;
    if (open && hasAddress) {
      reset(getInitialValues());
    }
  }, [
    open,
    getInitialValues,
    reset,
    isEditingBillingOnly,
    primaryAddressProperty,
    billingAddressProperty,
  ]);

  // Helper to build address fields payload
  const buildAddressFields = useCallback(
    (formValues, overrides = {}) => ({
      address_line_1: formValues.address_line1 || '',
      address_line_2: formValues.address_line2 || '',
      city: formValues.city || '',
      state: getStateNameFromIso(formValues.state, formValues.country),
      pincode: formValues.pincode || '',
      country: getCountryNameFromIso(formValues.country),
      ...overrides,
    }),
    [],
  );

  // Memoized close handler
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange?.(false);
      reset(defaultAddressValues);
    }
  }, [isSubmitting, onOpenChange, reset]);

  // Render address fields
  const renderAddressFields = useCallback(
    (prefix = '', disabled = false) => {
      const addressLine1Field = prefix ? `${prefix}_address_line1` : 'address_line1';
      const addressLine2Field = prefix ? `${prefix}_address_line2` : 'address_line2';
      const countryField = prefix ? `${prefix}_country` : 'country';
      const stateField = prefix ? `${prefix}_state` : 'state';
      const cityField = prefix ? `${prefix}_city` : 'city';
      const pincodeField = prefix ? `${prefix}_pincode` : 'pincode';

      const stepKey = prefix || 'primary';
      const fieldKeyPrefix = `field-address-${stepKey}`;

      return (
        <>
          <FieldRow icon={RiPriceTag3Line} label='Address Line 1' required>
            <Controller
              key={`${fieldKeyPrefix}-address_line1`}
              name={addressLine1Field}
              control={control}
              render={({ field }) => (
                <Input.Root
                  hasError={Boolean(errors[addressLine1Field])}
                  size='xsmall'
                  variant='borderless'
                >
                  <Input.Wrapper>
                    <Input.Input {...field} placeholder='Type here...' disabled={disabled} />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors[addressLine1Field] && (
              <ErrorText>{errors[addressLine1Field].message}</ErrorText>
            )}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Address Line 2' required>
            <Controller
              key={`${fieldKeyPrefix}-address_line2`}
              name={addressLine2Field}
              control={control}
              render={({ field }) => (
                <Input.Root
                  hasError={Boolean(errors[addressLine2Field])}
                  size='xsmall'
                  variant='borderless'
                >
                  <Input.Wrapper>
                    <Input.Input {...field} placeholder='Type here...' disabled={disabled} />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors[addressLine2Field] && (
              <ErrorText>{errors[addressLine2Field].message}</ErrorText>
            )}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Country' required>
            <Controller
              key={`${fieldKeyPrefix}-country`}
              name={countryField}
              control={control}
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue(stateField, '');
                    setValue(cityField, '');
                  }}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[countryField])}
                  disabled={disabled}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select country' />
                  </Select.Trigger>
                  <Select.Content>
                    {countryOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors[countryField] && <ErrorText>{errors[countryField].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='State' required>
            <Controller
              key={`${fieldKeyPrefix}-state`}
              name={stateField}
              control={control}
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue(cityField, '');
                  }}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[stateField])}
                  disabled={disabled || !selectedCountry}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value
                      placeholder={selectedCountry ? 'Select state' : 'Select country first'}
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {stateOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors[stateField] && <ErrorText>{errors[stateField].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='City' required>
            <Controller
              key={`${fieldKeyPrefix}-city`}
              name={cityField}
              control={control}
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={field.onChange}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[cityField])}
                  disabled={disabled || !selectedState}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value
                      placeholder={selectedState ? 'Select city' : 'Select state first'}
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {cityOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors[cityField] && <ErrorText>{errors[cityField].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Pin Code' required>
            <Controller
              key={`${fieldKeyPrefix}-pincode`}
              name={pincodeField}
              control={control}
              render={({ field }) => (
                <Input.Root
                  hasError={Boolean(errors[pincodeField])}
                  size='xsmall'
                  variant='borderless'
                >
                  <Input.Wrapper>
                    <Input.Input {...field} placeholder='Enter pin code' disabled={disabled} />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors[pincodeField] && <ErrorText>{errors[pincodeField].message}</ErrorText>}
          </FieldRow>
        </>
      );
    },
    [control, errors, selectedState, cityOptions, setValue],
  );

  const onSubmit = async (formValues) => {
    setIsSubmitting(true);

    try {
      // Case 3: Handle billing-only edit
      if (isEditingBillingOnly) {
        if (!billingAddressProperty?.name || !clientId) {
          showErrorToast('Billing address information is missing');
          return;
        }

        const billingFields = buildAddressFields(formValues);

        const result = await dispatch(
          updateClientAddressThunk({
            addressName: billingAddressProperty.name,
            fields: billingFields,
          }),
        );

        if (updateClientAddressThunk.fulfilled.match(result)) {
          showSuccessToast('Billing address updated successfully.');
          onSuccess?.();
          handleClose();
        } else {
          const errorMessage =
            result.payload || result.error?.message || 'Failed to update billing address';
          showErrorToast(errorMessage, {
            defaultMessage: 'Failed to update billing address',
          });
        }
        return;
      }

      // Cases 1 & 2: Handle primary address edit
      if (!primaryAddressProperty?.name || !clientId) {
        showErrorToast('Address information is missing');
        return;
      }

      const primaryFields = buildAddressFields(formValues);

      const promises = [
        dispatch(
          updateClientAddressThunk({
            addressName: primaryAddressProperty.name,
            fields: primaryFields,
          }),
        ),
      ];

      // Case 1: Sync billing address with primary when checkbox is checked
      if (formValues.billing_same_as_primary && billingAddressProperty?.name) {
        const billingFields = buildAddressFields(formValues);

        promises.push(
          dispatch(
            updateClientAddressThunk({
              addressName: billingAddressProperty.name,
              fields: billingFields,
            }),
          ),
        );
      }
      // Case 2: When billing_same_as_primary is false, only primary is updated (no billing update)

      const results = await Promise.all(promises);

      const errorResult = results.find(
        (r) =>
          updateClientAddressThunk.rejected.match(r) || (r.type && r.type.includes('rejected')),
      );

      if (errorResult) {
        const errorMessage =
          errorResult.payload || errorResult.error?.message || 'Failed to update address';
        showErrorToast(errorMessage, {
          defaultMessage: 'Failed to update address',
        });
      } else {
        showSuccessToast('Address updated successfully.');
        // Parent (client-detail-page) handles refetch via onSuccess
        onSuccess?.();
        handleClose();
      }
    } catch (error) {
      console.error('Failed to update address:', error);
      showErrorToast(error?.message || String(error), {
        defaultMessage: 'Failed to update address',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={handleClose}>
      <Modal.Content className='max-w-[560px]' showClose={true}>
        <Modal.Header
          icon={RiMapPin2Line}
          title={isEditingBillingOnly ? 'Edit Billing Address' : 'Edit Primary Address'}
          description={
            isEditingBillingOnly
              ? 'Modify the details of the billing address.'
              : 'Modify the details of the primary address.'
          }
        />

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Modal.Body className='flex flex-col gap-6'>
            {isEditingBillingOnly ? (
              <div className='flex flex-col gap-3'>
                <h3 className='text-label-md text-neutral-500'>Billing Address</h3>
                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  {renderAddressFields('', isSubmitting)}
                </div>
              </div>
            ) : (
              <>
                <div className='flex flex-col gap-3'>
                  <h3 className='text-label-md text-neutral-500'>Primary Address</h3>
                  <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                    {renderAddressFields('', isSubmitting)}
                  </div>
                </div>

                <div className='flex gap-2 items-center'>
                  <Controller
                    name='billing_same_as_primary'
                    control={control}
                    render={({ field }) => (
                      <Checkbox.Root
                        id='billing_same_as_primary'
                        checked={field.value}
                        onCheckedChange={(checked) => setValue('billing_same_as_primary', checked)}
                        disabled={isSubmitting}
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
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' size='medium' disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button.Root>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default ClientEditAddressModal;
