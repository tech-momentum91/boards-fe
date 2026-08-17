import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiMapPin2Line, RiPriceTag3Line } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Checkbox from '@/components/ui/checkbox';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import { Country, State, City } from 'country-state-city';
import { updateCpAccountAddress, addCpAccountAddresses } from '@/services/cp-accounts-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { optionalAddressEditSchema, defaultAddressValues } from '@/schemas/address-schema';

function normalizeSpaceLower(value) {
  return String(value).replaceAll(/\s+/g, ' ').trim().toLowerCase();
}

function resolveCountryIsoFromStored(countryRaw) {
  if (countryRaw == null || String(countryRaw).trim() === '') {
    return '';
  }
  const t = String(countryRaw).trim();
  const upper = t.toUpperCase();
  const byCode = Country.getCountryByCode(upper);
  if (byCode) {
    return byCode.isoCode;
  }
  const byName = Country.getAllCountries().find((c) => c.name.toLowerCase() === t.toLowerCase());
  return byName?.isoCode || '';
}

function resolveStateIsoFromStored(stateRaw, countryIso = 'IN') {
  if (stateRaw == null || String(stateRaw).trim() === '') {
    return '';
  }
  const trimmed = String(stateRaw).trim();
  const states = State.getStatesOfCountry(countryIso);
  if (!states?.length) {
    return '';
  }

  const upper = trimmed.toUpperCase();
  const byIso = states.find((s) => s.isoCode === upper || s.isoCode === trimmed);
  if (byIso) {
    return byIso.isoCode;
  }

  const byExactName = states.find((s) => s.name === trimmed);
  if (byExactName) {
    return byExactName.isoCode;
  }

  const lower = trimmed.toLowerCase();
  const byNameCi = states.find((s) => s.name.toLowerCase() === lower);
  if (byNameCi) {
    return byNameCi.isoCode;
  }

  const collapsedInput = normalizeSpaceLower(trimmed);
  const byCollapsed = states.find((s) => normalizeSpaceLower(s.name) === collapsedInput);
  return byCollapsed?.isoCode || '';
}

function getCountryNameFromIso(isoCode) {
  if (!isoCode) return '';
  const country = Country.getCountryByCode(isoCode);
  return country?.name || isoCode;
}

function getStateNameFromIso(isoCode, countryCode = 'IN') {
  if (!isoCode || !countryCode) return '';
  const states = State.getStatesOfCountry(countryCode);
  const state = states.find((s) => s.isoCode === isoCode);
  return state?.name || isoCode;
}

function buildCityOptionsForSelect(countryIso, stateIso, currentCity) {
  if (!countryIso || !stateIso) {
    return [];
  }
  const fromLibrary = City.getCitiesOfState(countryIso, stateIso).map((city) => ({
    value: city.name,
    label: city.name,
  }));
  const trimmed = currentCity != null ? String(currentCity).trim() : '';
  if (trimmed === '') {
    return fromLibrary;
  }
  const hasMatch = fromLibrary.some((o) => o.value === trimmed);
  if (hasMatch) {
    return fromLibrary;
  }
  return [{ value: trimmed, label: trimmed }, ...fromLibrary];
}

function buildStateOptionsForSelect(countryIso, currentStateIso) {
  if (!countryIso) {
    return [];
  }
  const fromLibrary = State.getStatesOfCountry(countryIso).map((state) => ({
    value: state.isoCode,
    label: state.name,
  }));
  const trimmed = currentStateIso != null ? String(currentStateIso).trim() : '';
  if (trimmed === '') {
    return fromLibrary;
  }
  const hasMatch = fromLibrary.some((o) => o.value === trimmed);
  if (hasMatch) {
    return fromLibrary;
  }
  const label = getStateNameFromIso(trimmed, countryIso) || trimmed;
  return [{ value: trimmed, label }, ...fromLibrary];
}

const CpAccountEditAddressModal = ({
  open,
  onOpenChange,
  primaryAddress: primaryAddressProperty,
  billingAddress: billingAddressProperty,
  cpAccountName,
  addressType = 'primary',
  isAdding = false,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(optionalAddressEditSchema),
    defaultValues: defaultAddressValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedState = useWatch({ control, name: 'state' });
  const selectedCity = useWatch({ control, name: 'city' });

  const isEditingBillingOnly = addressType === 'billing';
  const hasExistingBilling = Boolean(billingAddressProperty);
  // Offer "billing same as primary" in primary mode, but not while adding a
  // primary when a separate billing address already exists.
  const showSameAsPrimary = !isEditingBillingOnly && !(isAdding && hasExistingBilling);

  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map((country) => ({
      value: country.isoCode,
      label: country.name,
    }));
  }, []);

  const stateOptions = useMemo(
    () => buildStateOptionsForSelect(selectedCountry, selectedState),
    [selectedCountry, selectedState],
  );

  const cityOptions = useMemo(
    () => buildCityOptionsForSelect(selectedCountry, selectedState, selectedCity),
    [selectedCountry, selectedState, selectedCity],
  );

  const getInitialValues = useCallback(() => {
    const primaryAddr = primaryAddressProperty;
    const billingAddr = billingAddressProperty;

    if (isEditingBillingOnly && billingAddr) {
      const countryIso = resolveCountryIsoFromStored(billingAddr.country);
      const stateIso = resolveStateIsoFromStored(billingAddr.state, countryIso);
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

    const primaryCountryIso = resolveCountryIsoFromStored(primaryAddr?.country);

    return {
      address_line1: primaryAddr?.address_line_1 || '',
      address_line2: primaryAddr?.address_line_2 || '',
      country: primaryCountryIso,
      state: resolveStateIsoFromStored(primaryAddr?.state, primaryCountryIso),
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

  useEffect(() => {
    if (!open) return;
    if (isAdding) {
      // New address (primary or billing): start fully blank.
      reset({ ...defaultAddressValues, billing_same_as_primary: false });
      return;
    }
    const hasAddress = isEditingBillingOnly ? billingAddressProperty : primaryAddressProperty;
    if (hasAddress) {
      reset(getInitialValues());
    }
  }, [
    open,
    isAdding,
    getInitialValues,
    reset,
    isEditingBillingOnly,
    primaryAddressProperty,
    billingAddressProperty,
  ]);

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

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange?.(false);
      reset(defaultAddressValues);
    }
  }, [isSubmitting, onOpenChange, reset]);

  const renderAddressFields = useCallback(
    (prefix = '', disabled = false) => {
      const addressLine1Field = prefix ? `${prefix}_address_line1` : 'address_line1';
      const addressLine2Field = prefix ? `${prefix}_address_line2` : 'address_line2';
      const countryField = prefix ? `${prefix}_country` : 'country';
      const stateField = prefix ? `${prefix}_state` : 'state';
      const cityField = prefix ? `${prefix}_city` : 'city';
      const pincodeField = prefix ? `${prefix}_pincode` : 'pincode';

      const stepKey = prefix || 'primary';
      const fieldKeyPrefix = `cp-field-address-${stepKey}`;

      return (
        <>
          <FieldRow icon={RiPriceTag3Line} label='Address Line 1'>
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

          <FieldRow icon={RiPriceTag3Line} label='Address Line 2'>
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

          <FieldRow icon={RiPriceTag3Line} label='Country'>
            <Controller
              key={`${fieldKeyPrefix}-country`}
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
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[countryField])}
                  disabled={disabled}
                  options={countryOptions}
                  placeholder='Select country'
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors[countryField] && <ErrorText>{errors[countryField].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='State'>
            <Controller
              key={`${fieldKeyPrefix}-state`}
              name={stateField}
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue(cityField, '');
                  }}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[stateField])}
                  disabled={disabled || !selectedCountry}
                  options={stateOptions}
                  placeholder={selectedCountry ? 'Select state' : 'Select country first'}
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors[stateField] && <ErrorText>{errors[stateField].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Primary City' required>
            <Controller
              key={`${fieldKeyPrefix}-city`}
              name={cityField}
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[cityField])}
                  disabled={disabled || !selectedState}
                  options={cityOptions}
                  placeholder={selectedState ? 'Select city' : 'Select state first'}
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors[cityField] && <ErrorText>{errors[cityField].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Pin Code'>
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
    [
      control,
      errors,
      selectedCountry,
      selectedState,
      countryOptions,
      stateOptions,
      cityOptions,
      setValue,
    ],
  );

  const onSubmit = async (formValues) => {
    setIsSubmitting(true);

    try {
      if (isAdding) {
        if (!cpAccountName) {
          showErrorToast('CP account information is missing');
          return;
        }

        const hasAnyPrimaryField = [
          formValues.address_line1,
          formValues.address_line2,
          formValues.country,
          formValues.state,
          formValues.city,
          formValues.pincode,
        ].some((v) => v != null && String(v).trim() !== '');
        if (!hasAnyPrimaryField) {
          showErrorToast('Please fill at least one address field.');
          return;
        }

        // Add the targeted address independently as its own row. When adding a
        // primary with "billing same as primary" checked (only offered when no
        // billing exists yet), the same row also serves as the billing address.
        const sameAsPrimary = formValues.billing_same_as_primary && !hasExistingBilling;
        const newRow = isEditingBillingOnly
          ? { ...buildAddressFields(formValues), is_primary: 0, is_billing: 1 }
          : { ...buildAddressFields(formValues), is_primary: 1, is_billing: sameAsPrimary ? 1 : 0 };

        const { error } = await addCpAccountAddresses(cpAccountName, [newRow]);
        if (error) {
          showErrorToast(error, { defaultMessage: 'Failed to add address' });
        } else {
          showSuccessToast('Address added successfully.');
          onSuccess?.();
          handleClose();
        }
        return;
      }

      if (isEditingBillingOnly) {
        if (!billingAddressProperty?.name || !cpAccountName) {
          showErrorToast('Billing address information is missing');
          return;
        }

        const billingFields = buildAddressFields(formValues);
        const { error } = await updateCpAccountAddress(
          cpAccountName,
          billingAddressProperty.name,
          billingFields,
        );

        if (error) {
          showErrorToast(error, { defaultMessage: 'Failed to update billing address' });
        } else {
          showSuccessToast('Billing address updated successfully.');
          onSuccess?.();
          handleClose();
        }
        return;
      }

      if (!primaryAddressProperty?.name || !cpAccountName) {
        showErrorToast('Address information is missing');
        return;
      }

      const primaryFields = buildAddressFields(formValues);

      // Serialize saves: parallel requests both load/save the same CP Account and can deadlock MySQL.
      const primaryOutcome = await updateCpAccountAddress(
        cpAccountName,
        primaryAddressProperty.name,
        primaryFields,
      );
      if (primaryOutcome.error) {
        showErrorToast(primaryOutcome.error, { defaultMessage: 'Failed to update address' });
        return;
      }

      if (formValues.billing_same_as_primary && billingAddressProperty?.name) {
        const billingFields = buildAddressFields(formValues);
        const billingOutcome = await updateCpAccountAddress(
          cpAccountName,
          billingAddressProperty.name,
          billingFields,
        );
        if (billingOutcome.error) {
          showErrorToast(billingOutcome.error, {
            defaultMessage: 'Primary address saved but billing address could not be synced.',
          });
          return;
        }
      }

      showSuccessToast('Address updated successfully.');
      onSuccess?.();
      handleClose();
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
          title={
            isAdding
              ? isEditingBillingOnly
                ? 'Add Billing Address'
                : 'Add Primary Address'
              : isEditingBillingOnly
                ? 'Edit Billing Address'
                : 'Edit Primary Address'
          }
          description={
            isAdding
              ? isEditingBillingOnly
                ? 'Enter the details of the billing address.'
                : 'Enter the details of the primary address.'
              : isEditingBillingOnly
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

                {showSameAsPrimary && (
                  <div className='flex gap-2 items-center'>
                    <Controller
                      name='billing_same_as_primary'
                      control={control}
                      render={({ field }) => (
                        <Checkbox.Root
                          id='billing_same_as_primary_cp_account'
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            setValue('billing_same_as_primary', checked)
                          }
                          disabled={isSubmitting}
                        />
                      )}
                    />
                    <label
                      htmlFor='billing_same_as_primary_cp_account'
                      className='text-paragraph-small text-text-sub-500 cursor-pointer'
                    >
                      Billing address same as primary address
                    </label>
                  </div>
                )}
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

export default CpAccountEditAddressModal;
