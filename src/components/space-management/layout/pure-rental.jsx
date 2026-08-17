import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { showErrorToast } from '@/utils/error-utils';

import { pureRentalFields } from '@/components/space-management/constants';
import { ActualCarpetAreaField } from '@/components/space-management/layout/co-working';

const Field = ({ field, control, error }) => {
  const name = `pure_rental.${field.id}`;
  const totalCarpetArea = useWatch({ control, name: 'pure_rental.total_carpet_sft' });

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
            // Check if this is a numeric field
            const isNumericField =
              field.type === 'input' &&
              !field.readOnly &&
              (field.id.includes('area') || field.id.includes('rate') || field.id.includes('sft'));

            return (
              <Input.Root className='w-full' hasError={Boolean(error)}>
                <Input.Wrapper>
                  <Input.Input
                    type={isNumericField ? 'text' : 'text'}
                    placeholder={field.placeholder}
                    value={rhfField.value ?? field.defaultValue ?? ''}
                    onChange={(e) => {
                      if (isNumericField) {
                        const { value } = e.target;
                        // Check if input contains non-numeric characters
                        const hasNonNumeric = /\D/.test(value);

                        // Show toast error if non-numeric characters are detected
                        if (hasNonNumeric) {
                          showErrorToast(`${field.label} only accepts numeric values.`);
                        }

                        // Remove all non-numeric characters
                        const numericValue = value.replaceAll(/\D/g, '');
                        rhfField.onChange(numericValue);
                      } else {
                        rhfField.onChange(e.target.value);
                      }
                    }}
                    readOnly={field.readOnly}
                  />
                  {field.suffix ? <Input.Affix>{field.suffix}</Input.Affix> : null}
                </Input.Wrapper>
              </Input.Root>
            );
          }}
        />
      )}

      {error?.message ? <ErrorText>{error.message}</ErrorText> : null}
    </div>
  );
};

const PureRentalLayout = ({ control, errors, setValue }) => {
  const pureRentalType = useWatch({ control, name: 'pure_rental.pure_rental_type' });
  const previousPureRentalTypeRef = useRef(pureRentalType);

  const pairs = useMemo(() => {
    const items = [...pureRentalFields];
    const out = [];
    for (let i = 0; i < items.length; i += 2) out.push([items[i], items[i + 1]].filter(Boolean));
    return out;
  }, []);

  // Reset all fields when pure_rental_type changes
  useEffect(() => {
    // Skip on initial mount (when ref equals current value)
    if (previousPureRentalTypeRef.current === pureRentalType) {
      previousPureRentalTypeRef.current = pureRentalType;
      return;
    }

    // Reset all fields except pure_rental_type itself
    pureRentalFields.forEach((field) => {
      if (field.id !== 'pure_rental_type') {
        const fieldName = `pure_rental.${field.id}`;
        const defaultValue = field.defaultValue ?? '';
        setValue?.(fieldName, defaultValue, { shouldDirty: false });
      }
    });

    // Update the ref to track the current value
    previousPureRentalTypeRef.current = pureRentalType;
  }, [pureRentalType, setValue]);

  return (
    <div className='w-full'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
        {pairs.map((pair, index) => (
          <React.Fragment key={index}>
            {pair.map((f) => (
              <Field key={f.id} field={f} control={control} error={errors?.pure_rental?.[f.id]} />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default PureRentalLayout;
