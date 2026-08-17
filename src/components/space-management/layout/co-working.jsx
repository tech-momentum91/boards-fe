import React, { useEffect, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { RiInformationLine } from 'react-icons/ri';

import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import ErrorText from '@/components/ui/error-text';
import { showErrorToast } from '@/utils/error-utils';

import {
  CO_WORKING_SPACE_TYPE_OPTIONS,
  calcActualCarpetPctFromSqft,
  calcActualCarpetSqftFromPct,
  isValidActualCarpetDecimalInput,
} from '@/components/space-management/constants';

export function ActualCarpetAreaField(props) {
  if (props.sqftValue !== undefined) {
    return <ActualCarpetAreaFieldControlled {...props} />;
  }
  return (
    <Controller
      name={props.name}
      control={props.control}
      render={({ field }) => (
        <ActualCarpetAreaFieldControlled
          {...props}
          sqftValue={field.value ?? ''}
          onSqftChange={field.onChange}
          onSqftBlur={() => field.onBlur()}
        />
      )}
    />
  );
}

function ActualCarpetAreaFieldControlled({
  agreementArea,
  hasError,
  sqftValue,
  onSqftChange,
  onSqftBlur,
  variant,
  size,
  className = 'w-full',
  inputClassName,
}) {
  const isDetail = size === 'xsmall';
  const [pct, setPct] = useState('');
  const editingRef = useRef(null);
  const sqftRef = useRef(sqftValue);
  sqftRef.current = sqftValue;

  useEffect(() => {
    if (editingRef.current === 'pct') return;
    setPct(
      sqftValue === '' || sqftValue == null
        ? ''
        : calcActualCarpetPctFromSqft(sqftValue, agreementArea),
    );
  }, [sqftValue, agreementArea]);

  return (
    <Input.Root variant={variant} size={size} className={className} hasError={Boolean(hasError)}>
      <div
        className={
          isDetail
            ? 'flex min-w-0 flex-[2] items-center justify-between'
            : 'flex min-w-0 flex-[3] items-center justify-between'
        }
      >
        <Input.Wrapper className='min-w-0 flex-1'>
          <Input.Input
            type='text'
            placeholder={isDetail ? '0' : 'Enter sq.ft.'}
            value={sqftValue === '' || sqftValue == null ? '' : String(sqftValue)}
            className={inputClassName}
            onChange={(e) => {
              const { value } = e.target;
              if (!isValidActualCarpetDecimalInput(value)) return;
              editingRef.current = 'sqft';
              sqftRef.current = value;
              onSqftChange(value);
              setPct(value === '' ? '' : calcActualCarpetPctFromSqft(value, agreementArea));
            }}
            onBlur={() => {
              editingRef.current = null;
              onSqftBlur?.(sqftRef.current);
            }}
          />
        </Input.Wrapper>
        <p className={`shrink-0 ${isDetail ? 'mr-5' : 'mr-1'}`}>sq.ft.</p>
      </div>
      <div
        className={
          isDetail
            ? 'flex min-w-0 flex-1 items-center justify-between'
            : 'flex min-w-0 flex-[2] items-center justify-between'
        }
      >
        <Input.Wrapper className='min-w-0 flex-1'>
          <Input.Input
            type='text'
            placeholder={isDetail ? '0' : '0'}
            value={pct === '' || pct == null ? '' : String(pct)}
            className={inputClassName}
            onChange={(e) => {
              const { value } = e.target;
              if (!isValidActualCarpetDecimalInput(value)) return;
              editingRef.current = 'pct';
              setPct(value);
              const nextSqft =
                value === '' ? '' : calcActualCarpetSqftFromPct(value, agreementArea);
              sqftRef.current = nextSqft;
              onSqftChange(nextSqft);
            }}
            onBlur={() => {
              editingRef.current = null;
              onSqftBlur?.(sqftRef.current);
            }}
          />
        </Input.Wrapper>
        <p className={`shrink-0 ${isDetail ? 'mr-8' : 'mr-2'}`}>%</p>
      </div>
    </Input.Root>
  );
}

const CoWorkingLayout = ({ control, errors, setValue }) => {
  const expectedPerSeatRate = useWatch({ control, name: 'co_working.expected_per_seat_rate' });
  // Backend now uses total_seats (replaced no_of_seats)
  const totalSeats = useWatch({ control, name: 'co_working.total_seats' });
  const creditPerSeat = useWatch({ control, name: 'co_working.credit_per_seat' });
  const coWorkingType = useWatch({ control, name: 'co_working.co_working_space_type' });
  const totalCarpetArea = useWatch({ control, name: 'co_working.total_carpet_area' });
  const previousCoWorkingTypeRef = useRef(coWorkingType);

  // Reset all co_working fields when co_working_space_type changes
  useEffect(() => {
    // Skip on initial mount (when ref equals current value)
    if (previousCoWorkingTypeRef.current === coWorkingType) {
      previousCoWorkingTypeRef.current = coWorkingType;
      return;
    }

    const fieldKeys = [
      'total_carpet_area',
      'actual_carpet_area',
      'expected_carpet_rate',
      'total_seats',
      'expected_per_seat_rate',
      'credit_per_seat',
      'total_rate_of_space',
      'total_credits',
    ];

    fieldKeys.forEach((key) => {
      const fieldName = `co_working.${key}`;
      if (key === 'credit_per_seat') {
        setValue?.(fieldName, 2, { shouldDirty: false });
      } else {
        setValue?.(fieldName, '', { shouldDirty: false });
      }
    });

    previousCoWorkingTypeRef.current = coWorkingType;
  }, [coWorkingType, setValue]);

  useEffect(() => {
    const rate = Number.parseFloat(expectedPerSeatRate || '');
    const seats = Number.parseFloat(totalSeats || '');
    const credits = Number.parseFloat(creditPerSeat || '');

    if (Number.isFinite(rate) && Number.isFinite(seats)) {
      setValue?.('co_working.total_rate_of_space', String(Math.round(rate * seats)), {
        shouldDirty: false,
      });
    } else {
      setValue?.('co_working.total_rate_of_space', '', { shouldDirty: false });
    }

    if (Number.isFinite(credits) && Number.isFinite(seats)) {
      setValue?.('co_working.total_credits', String(Math.round(credits * seats)), {
        shouldDirty: false,
      });
    } else {
      setValue?.('co_working.total_credits', '', { shouldDirty: false });
    }
  }, [creditPerSeat, expectedPerSeatRate, totalSeats, setValue]);

  const totalRate = useWatch({ control, name: 'co_working.total_rate_of_space' });
  const totalCredits = useWatch({ control, name: 'co_working.total_credits' });

  return (
    <div className='w-full'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
        <div className='flex flex-col gap-1'>
          <Label.Root>
            Co-Working Space Type <Label.Asterisk />
          </Label.Root>
          <Controller
            name='co_working.co_working_space_type'
            control={control}
            render={({ field }) => (
              <Select.Root value={field.value || ''} onValueChange={field.onChange}>
                <Select.Trigger
                  className='w-full'
                  hasError={Boolean(errors?.co_working?.co_working_space_type)}
                >
                  <Select.Value placeholder='Select' />
                </Select.Trigger>
                <Select.Content>
                  {CO_WORKING_SPACE_TYPE_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
          />
          {errors?.co_working?.co_working_space_type?.message ? (
            <ErrorText>{errors.co_working.co_working_space_type.message}</ErrorText>
          ) : null}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root>Agreement Carpet Area</Label.Root>
          <Controller
            name='co_working.total_carpet_area'
            control={control}
            render={({ field }) => (
              <Input.Root className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='Enter agreement carpet area'
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const { value } = e.target;
                      if (/\D/.test(value)) {
                        showErrorToast('Agreement Carpet Area only accepts numeric values.');
                      }
                      field.onChange(value.replaceAll(/\D/g, ''));
                    }}
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
            name='co_working.actual_carpet_area'
            agreementArea={totalCarpetArea}
            hasError={errors?.co_working?.actual_carpet_area}
          />
          {errors?.co_working?.actual_carpet_area?.message ? (
            <ErrorText>{errors.co_working.actual_carpet_area.message}</ErrorText>
          ) : null}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root>Expected Carpet Rate</Label.Root>
          <Controller
            name='co_working.expected_carpet_rate'
            control={control}
            render={({ field }) => (
              <Input.Root className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='Enter rate per sq.ft.'
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const { value } = e.target;
                      if (/\D/.test(value)) {
                        showErrorToast('Expected Carpet Rate only accepts numeric values.');
                      }
                      field.onChange(value.replaceAll(/\D/g, ''));
                    }}
                  />
                  <Input.Affix>₹</Input.Affix>
                </Input.Wrapper>
              </Input.Root>
            )}
          />
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root>
            Total Sellable Seats <Label.Asterisk />
          </Label.Root>
          <Controller
            name='co_working.total_seats'
            control={control}
            render={({ field }) => (
              <Input.Root
                className='w-full'
                hasError={Boolean(
                  errors?.co_working?.total_seats || errors?.co_working?.no_of_seats,
                )}
              >
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='Total sellable seats'
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const { value } = e.target;
                      if (/\D/.test(value)) {
                        showErrorToast('Total Sellable Seats only accepts numeric values.');
                      }
                      field.onChange(value.replaceAll(/\D/g, ''));
                    }}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors?.co_working?.total_seats?.message || errors?.co_working?.no_of_seats?.message ? (
            <ErrorText>
              {errors.co_working.total_seats?.message || errors.co_working.no_of_seats.message}
            </ErrorText>
          ) : null}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root>Expected Per Seat Rate</Label.Root>
          <Controller
            name='co_working.expected_per_seat_rate'
            control={control}
            render={({ field }) => (
              <Input.Root className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='Enter rate per seat'
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const { value } = e.target;
                      if (/\D/.test(value)) {
                        showErrorToast('Expected Per Seat Rate only accepts numeric values.');
                      }
                      field.onChange(value.replaceAll(/\D/g, ''));
                    }}
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
            name='co_working.credit_per_seat'
            control={control}
            render={({ field }) => (
              <Input.Root className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='Credit per seat'
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const { value } = e.target;
                      if (/\D/.test(value)) {
                        showErrorToast('Credit Per Seat only accepts numeric values.');
                      }
                      field.onChange(value.replaceAll(/\D/g, ''));
                    }}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
        </div>

        <div className='flex flex-col gap-1 col-span-2 mb-2'>
          <Label.Root>Total Rate of Space</Label.Root>
          <Input.Root className='w-full'>
            <Input.Wrapper>
              <Input.Input value={totalRate || ''} readOnly />
            </Input.Wrapper>
          </Input.Root>

          {totalCredits ? (
            <div className='mt-2 rounded-lg bg-information-lighter px-3 py-2'>
              <Hint.Root>
                <Hint.Icon as={RiInformationLine} />
                <span className='text-paragraph-xs text-text-sub-600'>
                  You&apos;ll receive <span className='font-medium'>{totalCredits}</span> credits.
                  Use them at the time of booking.
                </span>
              </Hint.Root>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CoWorkingLayout;
