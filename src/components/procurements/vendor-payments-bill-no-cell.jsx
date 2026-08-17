import React from 'react';

import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';

export default function VendorPaymentsBillNoCell({ value, onChange }) {
  if (value) {
    return (
      <span className='block truncate text-paragraph-sm whitespace-nowrap text-text-sub-500'>
        {value}
      </span>
    );
  }

  return (
    <Input.Root size='xsmall' className='w-full min-w-[154px]'>
      <Input.Wrapper
        className={cn(
          'h-8 min-h-8 rounded-lg border-stroke-soft-200 bg-bg-white-0',
          'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
        )}
      >
        <Input.Input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder='Bill no.'
          className='text-paragraph-sm text-text-soft-400 placeholder:text-text-soft-400'
          aria-label='Bill number'
        />
      </Input.Wrapper>
    </Input.Root>
  );
}
