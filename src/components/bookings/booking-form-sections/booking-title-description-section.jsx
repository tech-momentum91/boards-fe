import React from 'react';
import { Controller } from 'react-hook-form';
import { RiStickyNoteLine } from 'react-icons/ri';
import * as Textarea from '@/components/ui/textarea';
import ErrorText from '@/components/ui/error-text';

const BookingTitleDescriptionSection = ({
  control,
  errors,
  isSubmitted,
  isDescriptionOpen,
  onDescriptionToggle,
}) => {
  return (
    <div className='flex flex-col gap-4 shrink-0'>
      <div>
        <Controller
          name='title'
          control={control}
          render={({ field }) => (
            <Textarea.Root
              {...field}
              id='booking_title'
              placeholder='Enter booking title'
              className='field-sizing-content text-lg'
              hasError={isSubmitted && Boolean(errors.title)}
              simple
            />
          )}
        />
        {isSubmitted && errors.title && <ErrorText>{errors.title.message}</ErrorText>}
      </div>

      {isDescriptionOpen ? (
        <div>
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <Textarea.Root
                {...field}
                placeholder='Add description'
                className='min-h-[100px]'
                hasError={isSubmitted && Boolean(errors.description)}
                simple
              />
            )}
          />
          {isSubmitted && errors.description && <ErrorText>{errors.description.message}</ErrorText>}
        </div>
      ) : (
        <button
          type='button'
          onClick={onDescriptionToggle}
          className='flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors'
        >
          <RiStickyNoteLine className='size-5 text-text-soft-400' />
          <span className='text-[16px] text-text-soft-400'>Add description</span>
        </button>
      )}
    </div>
  );
};

export default BookingTitleDescriptionSection;
