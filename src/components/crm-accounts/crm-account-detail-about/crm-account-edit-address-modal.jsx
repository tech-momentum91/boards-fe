import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiMapPin2Line, RiPriceTag3Line } from 'react-icons/ri';
import { Country, State, City } from 'country-state-city';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import { showErrorToast } from '@/utils/error-utils';
import { optionalAddressEditSchema, defaultAddressValues } from '@/schemas/address-schema';
import { z } from 'zod';

const crmAccountAddressEditSchema = optionalAddressEditSchema.extend({
  custom_legal_name: z.string().optional(),
});

const crmAccountAddressDefaultValues = {
  ...defaultAddressValues,
  custom_legal_name: '',
};

// ── ISO helpers ───────────────────────────────────────────────────────────────
const getCountryIso = (name) => {
  if (!name) return '';
  const match = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === name.toLowerCase() || c.isoCode === name,
  );
  return match?.isoCode || '';
};

const getStateIso = (name, countryCode = 'IN') => {
  if (!name) return '';
  const match = State.getStatesOfCountry(countryCode).find(
    (s) => s.name === name || s.isoCode === name,
  );
  return match?.isoCode || '';
};

const getStateName = (isoCode, countryCode = 'IN') => {
  if (!isoCode) return '';
  const match = State.getStatesOfCountry(countryCode).find((s) => s.isoCode === isoCode);
  return match?.name || isoCode;
};

const getCountryName = (isoCode) => {
  if (!isoCode) return '';
  return Country.getCountryByCode(isoCode)?.name || isoCode;
};

// ── Component ─────────────────────────────────────────────────────────────────
const CrmAccountEditAddressModal = ({
  open,
  onOpenChange,
  addressType = 'primary',
  primaryAddress,
  billingAddress,
  companyLegalName = '',
  onSave,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBillingOnly = addressType === 'billing';
  // Adding when the targeted address (primary or billing) doesn't exist yet.
  const isAdding = isBillingOnly ? !billingAddress : !primaryAddress;
  const hasExistingBilling = Boolean(billingAddress);
  // Offer "billing same as primary" in primary mode, but not while adding a
  // primary when a separate billing address already exists.
  const showSameAsPrimary = !isBillingOnly && !(isAdding && hasExistingBilling);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(crmAccountAddressEditSchema),
    defaultValues: crmAccountAddressDefaultValues,
    mode: 'onChange',
  });

  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedState = useWatch({ control, name: 'state' });
  const billingSameAsPrimary = useWatch({ control, name: 'billing_same_as_primary' });

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

  // Populate form when modal opens. Default: billing same as primary is unchecked.
  // When unchecked, billing section shows existing billing address (pre-filled), not a new empty one.
  useEffect(() => {
    if (!open) return;

    const legalName = companyLegalName || '';

    if (isAdding) {
      // New address (primary or billing): start blank (keep company legal name for primary).
      reset({
        ...crmAccountAddressDefaultValues,
        custom_legal_name: isBillingOnly ? '' : legalName,
        billing_same_as_primary: false,
      });
      return;
    }

    if (isBillingOnly && billingAddress) {
      const countryIso = getCountryIso(billingAddress.country);
      reset({
        ...crmAccountAddressDefaultValues,
        address_line1: billingAddress.address_line1 || '',
        address_line2: billingAddress.address_line2 || '',
        country: countryIso,
        state: getStateIso(billingAddress.state, countryIso),
        city: billingAddress.city || '',
        pincode: billingAddress.pin_code || '',
        custom_legal_name: '',
        billing_same_as_primary: false,
      });
    } else if (primaryAddress) {
      const countryIso = getCountryIso(primaryAddress.country);
      const billingCountryIso = billingAddress ? getCountryIso(billingAddress.country) : countryIso;
      const billingStateIso = billingAddress
        ? getStateIso(billingAddress.state, billingCountryIso)
        : '';
      reset({
        ...crmAccountAddressDefaultValues,
        custom_legal_name: legalName,
        address_line1: primaryAddress.address_line1 || '',
        address_line2: primaryAddress.address_line2 || '',
        country: countryIso,
        state: getStateIso(primaryAddress.state, countryIso),
        city: primaryAddress.city || '',
        pincode: primaryAddress.pin_code || '',
        billing_same_as_primary: false,
        billing_address_line1: billingAddress?.address_line1 ?? '',
        billing_address_line2: billingAddress?.address_line2 ?? '',
        billing_country: billingCountryIso,
        billing_state: billingStateIso,
        billing_city: billingAddress?.city ?? '',
        billing_pincode: billingAddress?.pin_code ?? '',
      });
    } else {
      reset({ ...crmAccountAddressDefaultValues, custom_legal_name: legalName });
    }
  }, [open, isAdding, isBillingOnly, primaryAddress, billingAddress, companyLegalName, reset]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) onOpenChange?.(false);
  }, [isSubmitting, onOpenChange]);

  const onSubmit = async (values) => {
    if (isAdding) {
      const hasAnyPrimaryField = [
        values.address_line1,
        values.address_line2,
        values.country,
        values.state,
        values.city,
        values.pincode,
      ].some((v) => v != null && String(v).trim() !== '');
      if (!hasAnyPrimaryField) {
        showErrorToast('Please fill at least one address field.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const buildAddr = (prefix = '') => {
        const p = prefix ? `${prefix}_` : '';
        const countryIso = values[`${p}country`];
        const stateIso = values[`${p}state`];
        return {
          address_line1: values[`${p}address_line1`] || '',
          address_line2: values[`${p}address_line2`] || '',
          country: getCountryName(countryIso),
          state: getStateName(stateIso, countryIso),
          city: values[`${p}city`] || '',
          pin_code: values[`${p}pincode`] || '',
        };
      };

      if (isAdding) {
        if (isBillingOnly) {
          await onSave?.({ billing: buildAddr() });
        } else {
          const primary = buildAddr();
          // When adding a primary and "billing same as primary" is checked
          // (only offered when no billing exists yet), also create the billing copy.
          if (values.billing_same_as_primary && !hasExistingBilling) {
            await onSave?.({
              primary,
              billing: { ...primary },
              custom_legal_name: values.custom_legal_name ?? '',
            });
          } else {
            await onSave?.({
              primary,
              custom_legal_name: values.custom_legal_name ?? '',
            });
          }
        }
        handleClose();
        return;
      }

      if (isBillingOnly) {
        await onSave?.({ billing: buildAddr() });
      } else if (values.billing_same_as_primary) {
        const primary = buildAddr();
        await onSave?.({
          primary,
          billing: { ...primary },
          custom_legal_name: values.custom_legal_name ?? '',
        });
      } else {
        const primary = buildAddr();
        const billing = buildAddr('billing');
        await onSave?.({
          primary,
          billing,
          custom_legal_name: values.custom_legal_name ?? '',
        });
      }

      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFields = useCallback(
    (prefix = '') => {
      const f = (name) => (prefix ? `${prefix}_${name}` : name);
      const selCountry = selectedCountry;
      const selState = selectedState;

      return (
        <>
          <FieldRow icon={RiPriceTag3Line} label='Address Line 1'>
            <Controller
              name={f('address_line1')}
              control={control}
              render={({ field }) => (
                <Input.Root
                  hasError={Boolean(errors[f('address_line1')])}
                  size='xsmall'
                  variant='borderless'
                >
                  <Input.Wrapper>
                    <Input.Input {...field} placeholder='Type here...' disabled={isSubmitting} />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors[f('address_line1')] && (
              <ErrorText>{errors[f('address_line1')].message}</ErrorText>
            )}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Address Line 2'>
            <Controller
              name={f('address_line2')}
              control={control}
              render={({ field }) => (
                <Input.Root
                  hasError={Boolean(errors[f('address_line2')])}
                  size='xsmall'
                  variant='borderless'
                >
                  <Input.Wrapper>
                    <Input.Input {...field} placeholder='Type here...' disabled={isSubmitting} />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors[f('address_line2')] && (
              <ErrorText>{errors[f('address_line2')].message}</ErrorText>
            )}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Country'>
            <Controller
              name={f('country')}
              control={control}
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue(f('state'), '');
                    setValue(f('city'), '');
                  }}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[f('country')])}
                  disabled={isSubmitting}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select country' />
                  </Select.Trigger>
                  <Select.Content>
                    {countryOptions.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors[f('country')] && <ErrorText>{errors[f('country')].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='State'>
            <Controller
              name={f('state')}
              control={control}
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue(f('city'), '');
                  }}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[f('state')])}
                  disabled={isSubmitting || !selCountry}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value
                      placeholder={selCountry ? 'Select state' : 'Select country first'}
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {stateOptions.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors[f('state')] && <ErrorText>{errors[f('state')].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='City'>
            <Controller
              name={f('city')}
              control={control}
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={field.onChange}
                  variant='borderless'
                  size='xsmall'
                  hasError={Boolean(errors[f('city')])}
                  disabled={isSubmitting || !selState}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder={selState ? 'Select city' : 'Select state first'} />
                  </Select.Trigger>
                  <Select.Content>
                    {cityOptions.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors[f('city')] && <ErrorText>{errors[f('city')].message}</ErrorText>}
          </FieldRow>

          <FieldRow icon={RiPriceTag3Line} label='Pin Code'>
            <Controller
              name={f('pincode')}
              control={control}
              render={({ field }) => (
                <Input.Root
                  hasError={Boolean(errors[f('pincode')])}
                  size='xsmall'
                  variant='borderless'
                >
                  <Input.Wrapper>
                    <Input.Input {...field} placeholder='Enter pin code' disabled={isSubmitting} />
                  </Input.Wrapper>
                </Input.Root>
              )}
            />
            {errors[f('pincode')] && <ErrorText>{errors[f('pincode')].message}</ErrorText>}
          </FieldRow>
        </>
      );
    },
    [
      control,
      errors,
      selectedCountry,
      selectedState,
      stateOptions,
      cityOptions,
      countryOptions,
      setValue,
      isSubmitting,
    ],
  );

  return (
    <Modal.Root open={open} onOpenChange={handleClose}>
      <Modal.Content className='max-w-[560px]' showClose>
        <Modal.Header
          icon={RiMapPin2Line}
          title={
            isAdding
              ? isBillingOnly
                ? 'Add Billing Address'
                : 'Add Primary Address'
              : isBillingOnly
                ? 'Edit Billing Address'
                : 'Edit Primary Address'
          }
          description={
            isAdding
              ? isBillingOnly
                ? 'Enter the details of the billing address.'
                : 'Enter the details of the primary address.'
              : isBillingOnly
                ? 'Modify the details of the billing address.'
                : 'Modify the details of the primary address.'
          }
        />

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Modal.Body className='flex flex-col gap-6'>
            <div className='flex flex-col gap-3'>
              <h3 className='text-label-md text-neutral-500'>
                {isBillingOnly ? 'Billing Address' : 'Primary Address'}
              </h3>
              <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                {!isBillingOnly && (
                  <FieldRow icon={RiPriceTag3Line} label='Company Legal Name'>
                    <Controller
                      name='custom_legal_name'
                      control={control}
                      render={({ field }) => (
                        <Input.Root
                          hasError={Boolean(errors.custom_legal_name)}
                          size='xsmall'
                          variant='borderless'
                        >
                          <Input.Wrapper>
                            <Input.Input
                              {...field}
                              placeholder='Enter company legal name'
                              disabled={isSubmitting}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.custom_legal_name && (
                      <ErrorText>{errors.custom_legal_name.message}</ErrorText>
                    )}
                  </FieldRow>
                )}
                {renderFields()}
              </div>
            </div>

            {showSameAsPrimary && (
              <div className='flex items-center gap-2'>
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
                  className='text-paragraph-sm text-text-sub-500 cursor-pointer select-none'
                >
                  Billing address same as primary address
                </label>
              </div>
            )}

            {showSameAsPrimary && billingSameAsPrimary && (
              <p className='text-paragraph-sm text-text-sub-500'>
                Billing address will use the primary address above.
              </p>
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

export default CrmAccountEditAddressModal;
