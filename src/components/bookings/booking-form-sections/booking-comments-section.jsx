import React from 'react';
import { Controller } from 'react-hook-form';
import { RiAddLine, RiChat4Line } from 'react-icons/ri';
import * as Textarea from '@/components/ui/textarea';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';

const BookingCommentsSection = ({
  control,
  errors,
  isSubmitted,
  isCommentOpen,
  onCommentToggle,
}) => {
  if (!isCommentOpen) {
    return (
      <button
        type='button'
        onClick={onCommentToggle}
        className='flex items-center gap-2 rounded-lg hover:bg-surface-secondary transition-colors'
      >
        <RiAddLine className='size-4 text-text-soft-400' />
        <span className='text-[16px] text-text-soft-400'>Add comment</span>
      </button>
    );
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center gap-1.5'>
        <RiChat4Line className='size-4 text-text-soft-400' />
        <Label.Root className='text-subheading-xs uppercase text-text-sub-500' htmlFor='comment'>
          Comment
        </Label.Root>
      </div>
      <Controller
        name='comment'
        control={control}
        render={({ field }) => (
          <Textarea.Root
            {...field}
            placeholder='Add comment'
            className='min-h-[100px]'
            hasError={isSubmitted && Boolean(errors.comment)}
            simple
          />
        )}
      />
      {isSubmitted && errors.comment && <ErrorText>{errors.comment.message}</ErrorText>}
    </div>
  );
};

export default BookingCommentsSection;
