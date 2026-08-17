import React from 'react';
import { RiCheckboxCircleLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';

export default function JmrMarkAsCompletedRow({ onClick, className }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex h-12 w-full items-center gap-3 border-t border-stroke-soft-200 bg-[#fbfbfb] pl-[50px] pr-5 text-left transition-colors hover:bg-bg-weak-50',
        className,
      )}
    >
      <RiCheckboxCircleLine className='size-[18px] shrink-0 text-text-sub-500' aria-hidden />
      <span className='text-label-xs font-medium tracking-[-0.072px] text-text-sub-500'>
        Mark as Completed
      </span>
    </button>
  );
}
