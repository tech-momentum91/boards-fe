import React from 'react';
import { cn } from '@/lib/utils';

const SkeletonField = ({ labelWidth = 'w-24', valueWidth = 'w-full' }) => (
  <div className='flex items-center gap-3 py-2'>
    <div className={cn('shrink-0 h-4 bg-bg-weak-100 rounded animate-pulse', labelWidth)} />
    <div className={cn('flex-1 h-9 bg-bg-weak-100 rounded animate-pulse', valueWidth)} />
  </div>
);

const BookingCreateDrawerFormSkeleton = () => (
  <div className='flex flex-col gap-5' aria-busy='true'>
    {/* Title & Description section */}
    <div className='space-y-3'>
      <div className='h-4 w-28 bg-bg-weak-100 rounded animate-pulse' />
      <SkeletonField labelWidth='w-16' valueWidth='w-full' />
      <div className='h-4 w-20 bg-bg-weak-100 rounded animate-pulse' />
    </div>

    {/* Space details section */}
    <div className='space-y-3'>
      <div className='h-4 w-32 bg-bg-weak-100 rounded animate-pulse' />
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <SkeletonField labelWidth='w-14' valueWidth='w-full' />
        <SkeletonField labelWidth='w-24' valueWidth='w-full' />
      </div>
      <SkeletonField labelWidth='w-14' valueWidth='w-full' />
    </div>

    {/* Client section */}
    <div className='space-y-3'>
      <div className='h-4 w-20 bg-bg-weak-100 rounded animate-pulse' />
      <SkeletonField labelWidth='w-14' valueWidth='w-full' />
    </div>

    {/* Date & time section */}
    <div className='space-y-3'>
      <div className='h-4 w-28 bg-bg-weak-100 rounded animate-pulse' />
      <div className='flex flex-wrap gap-3'>
        <div className='h-9 w-[140px] bg-bg-weak-100 rounded animate-pulse' />
        <div className='h-9 w-[100px] bg-bg-weak-100 rounded animate-pulse' />
        <div className='h-9 w-[100px] bg-bg-weak-100 rounded animate-pulse' />
      </div>
      <div className='h-4 w-36 bg-bg-weak-100 rounded animate-pulse' />
    </div>

    {/* Comments section */}
    <div className='space-y-3'>
      <div className='h-4 w-24 bg-bg-weak-100 rounded animate-pulse' />
      <div className='h-20 w-full bg-bg-weak-100 rounded animate-pulse' />
    </div>
  </div>
);

export default BookingCreateDrawerFormSkeleton;
