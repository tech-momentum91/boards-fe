import React from 'react';
import { RiCheckboxCircleFill } from 'react-icons/ri';
import { cn } from '@/utils/cn';

export default function JmrCompletedBadge({ className }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded bg-[#b5dfcc] py-[5px] pl-1.5 pr-2',
        className,
      )}
    >
      <RiCheckboxCircleFill className='size-3 shrink-0 text-[#045933]' aria-hidden />
      <span className='text-[9px] font-bold uppercase tracking-[0.72px] text-[#045933]'>
        completed
      </span>
    </span>
  );
}
