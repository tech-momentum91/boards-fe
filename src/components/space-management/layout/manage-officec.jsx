import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { showErrorToast } from '@/utils/error-utils';

import { officeFields } from '@/components/space-management/constants';
import { ActualCarpetAreaField } from '@/components/space-management/layout/co-working';

const Field = ({ field, control, error }) => {
  const name = `managed_office.${field.id}`;
  const totalCarpetArea = useWatch({ control, name: 'managed_office.total_carpet_area' });

  if (field.id === 'actual_carpet_area') {
    return (
      <div className='flex flex-col gap-1'>
        <Label.Root>{field.label}</Label.Root>
        <ActualCarpetAreaField
          control={control}
          name={name}
          agreementArea={totalCarpetArea}
          hasError={error}
        />
        {error?.message ? <ErrorText>{error.message}</ErrorText> : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-1'>
      <Label.Root>
        {field.label}
        {field.required ? <Label.Asterisk /> : null}
      </Label.Root>

      {field.type === 'select' ? (
        <Controller
          name={name}
          control={control}
          render={({ field: rhfField }) => (
            <Select.Root value={rhfField.value || ''} onValueChange={rhfField.onChange}>
              <Select.Trigger className='w-full' hasError={Boolean(error)}>
                <Select.Value placeholder='Select' />
              </Select.Trigger>
              <Select.Content>
                {field.options?.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        />
      ) : (
        <Controller
          name={name}
          control={control}
          render={({ field: rhfField }) => {
            // Check if this is a numeric field (not select, not readOnly, and has numeric placeholder/defaultValue)
            const isNumericField =
              field.type === 'input' &&
              !field.readOnly &&
              (field.id.includes('seats') ||
                field.id.includes('rate') ||
                field.id.includes('area') ||
                field.id.includes('workstations') ||
                field.id.includes('cabins') ||
                field.id.includes('rooms') ||
                field.id.includes('phonebooths') ||
                field.id.includes('breakout') ||
                field.id.includes('credit'));

            return (
              <Input.Root className='w-full' hasError={Boolean(error)}>
                <div className='flex justify-between items-center'>
                  <Input.Wrapper>
                    <Input.Input
                      type={isNumericField ? 'text' : 'text'}
                      placeholder={field.placeholder}
                      value={rhfField.value ?? field.defaultValue ?? ''}
                      onChange={(e) => {
                        if (isNumericField) {
                          const { value } = e.target;
                          const hasNonNumeric = /\D/.test(value);
                          if (hasNonNumeric) {
                            showErrorToast(`${field.label} only accepts numeric values.`);
                          }
                          rhfField.onChange(value.replaceAll(/\D/g, ''));
                        } else {
                          rhfField.onChange(e.target.value);
                        }
                      }}
                      onBlur={rhfField.onBlur}
                      readOnly={field.readOnly}
                    />
                    {field.suffix ? <Input.Affix>{field.suffix}</Input.Affix> : null}
                  </Input.Wrapper>
                </div>
              </Input.Root>
            );
          }}
        />
      )}

      {error?.message ? <ErrorText>{error.message}</ErrorText> : null}
    </div>
  );
};

const ManageOfficeLayout = ({ control, errors, setValue }) => {
  const expectedPerSeatRate = useWatch({ control, name: 'managed_office.expected_per_seat_rate' });
  // Backend now uses total_seats (replaced total_sellable_seats)
  const totalSeats = useWatch({ control, name: 'managed_office.total_seats' });
  const manageOfficeType = useWatch({ control, name: 'managed_office.managed_office_type' });
  const previousManageOfficeTypeRef = useRef(manageOfficeType);

  const pairs = useMemo(() => {
    // Filter fields based on managed_office_type
    let items = [...officeFields];

    // If managed_office_type is "Bare Shell", show only managed_office_type, total_carpet_area, and credit_per_seat
    if (manageOfficeType === 'Bare Shell') {
      items = items.filter(
        (field) =>
          field.id === 'managed_office_type' ||
          field.id === 'total_carpet_area' ||
          field.id === 'credit_per_seat',
      );
    }

    const out = [];
    for (let i = 0; i < items.length; i += 2) out.push([items[i], items[i + 1]].filter(Boolean));
    return out;
  }, [manageOfficeType]);

  // Reset all fields when managed_office_type changes
  useEffect(() => {
    // Skip on initial mount (when ref equals current value)
    if (previousManageOfficeTypeRef.current === manageOfficeType) {
      previousManageOfficeTypeRef.current = manageOfficeType;
      return;
    }

    // Reset all fields except managed_office_type itself
    officeFields.forEach((field) => {
      if (field.id !== 'managed_office_type') {
        const fieldName = `managed_office.${field.id}`;
        const defaultValue = field.defaultValue ?? '';
        setValue?.(fieldName, defaultValue, { shouldDirty: false });
      }
    });

    // Update the ref to track the current value
    previousManageOfficeTypeRef.current = manageOfficeType;
  }, [manageOfficeType, setValue]);

  // Compute total_rate_of_space = expected_per_seat_rate * total_seats
  useEffect(() => {
    const rate = Number.parseFloat(expectedPerSeatRate || '');
    const seats = Number.parseFloat(totalSeats || '');
    if (Number.isFinite(rate) && Number.isFinite(seats)) {
      const total = Math.round(rate * seats);
      setValue?.('managed_office.total_rate_of_space', String(total), { shouldDirty: false });
    } else {
      setValue?.('managed_office.total_rate_of_space', '', { shouldDirty: false });
    }
  }, [expectedPerSeatRate, totalSeats, setValue]);

  return (
    <div className='w-full'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
        {pairs.map((pair, index) => (
          <React.Fragment key={index}>
            {pair.map((f) => (
              <Field
                key={f.id}
                field={f}
                control={control}
                error={errors?.managed_office?.[f.id]}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ManageOfficeLayout;
