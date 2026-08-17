import React from 'react';
import { Controller } from 'react-hook-form';
import {
  RecurrenceType,
  DAYS_OF_WEEK,
  RECURRING_DATE_OPTIONS,
  RECURRING_MONTH_OPTIONS,
} from '../constants';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import ErrorText from '@/components/ui/error-text';

const BookingRecurrenceFields = ({
  control,
  errors,
  isSubmitted,
  setValue,
  watchedRecurrenceType,
  watchedRecurrenceEndType,
}) => {
  return (
    <div className='flex-1'>
      {/* Weekly Days Selection */}
      {watchedRecurrenceType === RecurrenceType.WEEKLY && (
        <div className='flex-1 flex flex-col gap-1'>
          <Label.Root className='text-text-main-900'>
            Days <Label.Asterisk />
          </Label.Root>
          <Controller
            name='days_of_week'
            control={control}
            render={({ field }) => {
              const selectedDays =
                field.value && typeof field.value === 'string'
                  ? field.value.split(',').filter(Boolean)
                  : Array.isArray(field.value)
                    ? field.value
                    : [];

              const handleDaySelect = (dayValue) => {
                const newDays = selectedDays.includes(dayValue)
                  ? selectedDays.filter((d) => d !== dayValue)
                  : [...selectedDays, dayValue].sort();
                field.onChange(newDays.join(','));
              };

              return (
                <div className='flex items-center justify-between gap-1'>
                  {DAYS_OF_WEEK.map((day, index) => {
                    const isSelected = selectedDays.includes(day.value);
                    return (
                      <Button.Root
                        key={index}
                        type='button'
                        className='rounded-full! size-8 p-1'
                        size='small'
                        onClick={() => handleDaySelect(day.value)}
                        variant={isSelected ? 'primary' : 'neutral'}
                        mode={isSelected ? 'filled' : 'stroke'}
                      >
                        <span>{day.label}</span>
                      </Button.Root>
                    );
                  })}
                </div>
              );
            }}
          />
          {isSubmitted && errors.days_of_week && (
            <ErrorText>{errors.days_of_week.message}</ErrorText>
          )}
        </div>
      )}

      {/* Monthly/Quarterly Recurring Date */}
      {(watchedRecurrenceType === RecurrenceType.MONTHLY ||
        watchedRecurrenceType === RecurrenceType.QUARTERLY) && (
        <div className='flex-1 flex flex-col gap-1'>
          <Label.Root className='text-text-main-900'>
            Recurring Date <Label.Asterisk />
          </Label.Root>
          <Controller
            name='recurring_date'
            control={control}
            render={({ field }) => {
              const selectedOption = RECURRING_DATE_OPTIONS.find(
                (opt) => opt.value === String(field.value || ''),
              );

              return (
                <SearchableSelect
                  size='small'
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(value) =>
                    field.onChange(value ? Number.parseInt(value, 10) : undefined)
                  }
                  hasError={isSubmitted && Boolean(errors.recurring_date)}
                  options={RECURRING_DATE_OPTIONS}
                  placeholder='Select date'
                  showArrow={true}
                  isolateSearchKeyboard
                />
              );
            }}
          />
          {isSubmitted && errors.recurring_date && (
            <ErrorText>{errors.recurring_date.message}</ErrorText>
          )}
        </div>
      )}

      {/* Annually Recurring Month & Date */}
      {watchedRecurrenceType === RecurrenceType.ANNUALLY && (
        <div className='flex-1 flex flex-col gap-1'>
          <Label.Root className='text-text-main-900'>
            Annually Recurring Date <Label.Asterisk />
          </Label.Root>
          <div className='flex gap-2'>
            {/* Month */}
            <div className='flex-1 flex flex-col gap-1'>
              <Controller
                name='recurring_month'
                control={control}
                render={({ field }) => {
                  const selectedMonth = RECURRING_MONTH_OPTIONS.find(
                    (opt) => opt.value === String(field.value || ''),
                  );

                  return (
                    <SearchableSelect
                      size='small'
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) =>
                        field.onChange(value ? Number.parseInt(value, 10) : undefined)
                      }
                      hasError={isSubmitted && Boolean(errors.recurring_month)}
                      options={RECURRING_MONTH_OPTIONS}
                      placeholder='Select month'
                      showArrow={true}
                      isolateSearchKeyboard
                    />
                  );
                }}
              />
              {isSubmitted && errors.recurring_month && (
                <ErrorText>{errors.recurring_month.message}</ErrorText>
              )}
            </div>

            {/* Date */}
            <div className='flex-1 flex flex-col gap-1'>
              <Controller
                name='recurring_date'
                control={control}
                render={({ field }) => {
                  const selectedOption = RECURRING_DATE_OPTIONS.find(
                    (opt) => opt.value === String(field.value || ''),
                  );

                  return (
                    <SearchableSelect
                      size='small'
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) =>
                        field.onChange(value ? Number.parseInt(value, 10) : undefined)
                      }
                      hasError={isSubmitted && Boolean(errors.recurring_date)}
                      options={RECURRING_DATE_OPTIONS}
                      placeholder='Select date'
                      showArrow={true}
                      isolateSearchKeyboard
                    />
                  );
                }}
              />
              {isSubmitted && errors.recurring_date && (
                <ErrorText>{errors.recurring_date.message}</ErrorText>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingRecurrenceFields;
