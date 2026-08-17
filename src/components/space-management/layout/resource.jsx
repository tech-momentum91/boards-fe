import React, { useEffect, useRef } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { showErrorToast } from '@/utils/error-utils';
import { ActualCarpetAreaField } from '@/components/space-management/layout/co-working';

import { fetchResourceTypes, selectResourceTypesData } from '@/redux/commonSlice';

const numericOnChange = (label) => (field) => (e) => {
  const { value } = e.target;
  if (/\D/.test(value)) showErrorToast(`${label} only accepts numeric values.`);
  field.onChange(value.replaceAll(/\D/g, ''));
};

const ResourceLayout = ({ control, errors, setValue }) => {
  const dispatch = useDispatch();
  const resourceTypeOptions = useSelector(selectResourceTypesData) || [];
  const resourceTypesStatus = useSelector((state) => state.common.resourceTypes.status);

  useEffect(() => {
    if (resourceTypesStatus === 'idle') {
      dispatch(fetchResourceTypes());
    }
  }, [dispatch, resourceTypesStatus]);

  const resourceType = useWatch({ control, name: 'resource.resource_type' });
  const bookable = useWatch({ control, name: 'resource.bookable' });
  const agreementArea = useWatch({ control, name: 'resource.agreement_carpet_area' });
  const expectedPerSeatRate = useWatch({ control, name: 'resource.expected_per_seat_rate' });
  const pax = useWatch({ control, name: 'resource.pax' });
  const showExtra = Boolean(resourceType);
  const isBookable = bookable !== false && bookable !== 'No';
  const previousResourceTypeRef = useRef(resourceType);

  // Reset fields when resource_type changes (keep bookable header state)
  useEffect(() => {
    if (previousResourceTypeRef.current === resourceType) {
      previousResourceTypeRef.current = resourceType;
      return;
    }

    [
      'pax',
      'credit_per_hour',
      'agreement_carpet_area',
      'actual_carpet_area',
      'expected_carpet_rate',
      'expected_per_seat_rate',
      'credit_per_seat',
      'total_rate_of_space',
    ].forEach((key) => {
      const defaultValue = key === 'credit_per_hour' || key === 'credit_per_seat' ? 2 : '';
      setValue?.(`resource.${key}`, defaultValue, { shouldDirty: false });
    });

    previousResourceTypeRef.current = resourceType;
  }, [resourceType, setValue]);

  // total_rate_of_space = expected_per_seat_rate * pax (non-bookable)
  useEffect(() => {
    if (isBookable) return;
    const rate = Number.parseFloat(expectedPerSeatRate || '');
    const seats = Number.parseFloat(pax || '');
    setValue?.(
      'resource.total_rate_of_space',
      Number.isFinite(rate) && Number.isFinite(seats) ? String(Math.round(rate * seats)) : '',
      { shouldDirty: false },
    );
  }, [expectedPerSeatRate, pax, isBookable, setValue]);

  return (
    <div className='w-full'>
      <div className='grid grid-cols-2 gap-x-4 pb-4 gap-y-4'>
        <div className='flex flex-col gap-1'>
          <Label.Root>
            Resource Type <Label.Asterisk />
          </Label.Root>
          <Controller
            name='resource.resource_type'
            control={control}
            render={({ field }) => (
              <Select.Root value={field.value || ''} onValueChange={field.onChange}>
                <Select.Trigger
                  className='w-full'
                  hasError={Boolean(errors?.resource?.resource_type)}
                >
                  <Select.Value placeholder='Select' />
                </Select.Trigger>
                <Select.Content>
                  {(resourceTypeOptions || []).map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
          />
          {errors?.resource?.resource_type?.message ? (
            <ErrorText>{errors.resource.resource_type.message}</ErrorText>
          ) : null}
        </div>

        {isBookable ? (
          <>
            <div className='flex flex-col gap-1'>
              <Label.Root>
                PAX (Max Capacity) <Label.Asterisk />
              </Label.Root>
              <Controller
                name='resource.pax'
                control={control}
                render={({ field }) => (
                  <Input.Root className='w-full' hasError={Boolean(errors?.resource?.pax)}>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder='No. of seats'
                        value={field.value ?? ''}
                        onChange={numericOnChange('PAX (Max Capacity)')(field)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors?.resource?.pax?.message ? (
                <ErrorText>{errors.resource.pax.message}</ErrorText>
              ) : null}
            </div>

            {showExtra ? (
              <div className='flex flex-col gap-1'>
                <Label.Root>Credit Per Hour</Label.Root>
                <Controller
                  name='resource.credit_per_hour'
                  control={control}
                  render={({ field }) => (
                    <Input.Root className='w-full'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          placeholder='Credit per hour'
                          value={field.value ?? ''}
                          onChange={numericOnChange('Credit Per Hour')(field)}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className='flex flex-col gap-1'>
              <Label.Root>Agreement Carpet Area</Label.Root>
              <Controller
                name='resource.agreement_carpet_area'
                control={control}
                render={({ field }) => (
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder='Enter agreement carpet area'
                        value={field.value ?? ''}
                        onChange={numericOnChange('Agreement Carpet Area')(field)}
                      />
                      <Input.Affix>sq.ft.</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>Actual Carpet Area</Label.Root>
              <ActualCarpetAreaField
                control={control}
                name='resource.actual_carpet_area'
                agreementArea={agreementArea}
                hasError={errors?.resource?.actual_carpet_area}
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>Expected Carpet Rate</Label.Root>
              <Controller
                name='resource.expected_carpet_rate'
                control={control}
                render={({ field }) => (
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder='Enter rate per sq.ft.'
                        value={field.value ?? ''}
                        onChange={numericOnChange('Expected Carpet Rate')(field)}
                      />
                      <Input.Affix>₹</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>
                PAX (Max Capacity) <Label.Asterisk />
              </Label.Root>
              <Controller
                name='resource.pax'
                control={control}
                render={({ field }) => (
                  <Input.Root className='w-full' hasError={Boolean(errors?.resource?.pax)}>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder='No. of seats'
                        value={field.value ?? ''}
                        onChange={numericOnChange('PAX (Max Capacity)')(field)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors?.resource?.pax?.message ? (
                <ErrorText>{errors.resource.pax.message}</ErrorText>
              ) : null}
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>Expected Per Seat Rate</Label.Root>
              <Controller
                name='resource.expected_per_seat_rate'
                control={control}
                render={({ field }) => (
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder='Enter rate per seat'
                        value={field.value ?? ''}
                        onChange={numericOnChange('Expected Per Seat Rate')(field)}
                      />
                      <Input.Affix>₹</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>Credit Per Seat</Label.Root>
              <Controller
                name='resource.credit_per_seat'
                control={control}
                render={({ field }) => (
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder='Credit per seat'
                        value={field.value ?? ''}
                        onChange={numericOnChange('Credit Per Seat')(field)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>Total Rate of Space</Label.Root>
              <Controller
                name='resource.total_rate_of_space'
                control={control}
                render={({ field }) => (
                  <Input.Root className='w-full'>
                    <Input.Wrapper>
                      <Input.Input type='text' placeholder='-' value={field.value ?? ''} readOnly />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResourceLayout;
