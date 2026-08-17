import * as LinkButton from '@/components/ui/link-button';
import React from 'react';

function NeedHelp() {
  return (
    <div className='w-full text-[14px] flex flex-row items-center justify-end'>
      <span className='text-[var(--color-text-sub-500)]'>
        Need help?{' '}
        <LinkButton.Root underline={true} variant='primary'>
          Contact us
        </LinkButton.Root>
      </span>
    </div>
  );
}

export default NeedHelp;
