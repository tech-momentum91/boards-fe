import React from 'react';
import { RiStickyNoteLine } from 'react-icons/ri';
import { cn } from '@/lib/utils';

// Skeleton component for individual fields
const SkeletonField = ({ labelWidth = 'w-24', valueWidth = 'w-full' }) => (
  <div className='group relative flex items-start gap-4 py-2'>
    <div className={cn('shrink-0 min-h-8 flex items-center', labelWidth)}>
      <div className='h-4 bg-bg-weak-100 rounded animate-pulse w-full' />
    </div>
    <div className='flex-1 min-w-0'>
      <div className='min-h-8 w-full flex items-center'>
        <div className={cn('h-4 bg-bg-weak-100 rounded animate-pulse', valueWidth)} />
      </div>
    </div>
  </div>
);

// Skeleton for the booking event detail drawer
const BookingEventDetailDrawerSkeleton = () => {
  return (
    <div className='flex h-full'>
      {/* Left Panel - Booking Details Skeleton */}
      <div className='w-[480px] px-6 py-5 border-r border-stroke-soft-200 overflow-y-auto'>
        <div className='space-y-6 pt-[60px]'>
          {/* Title Skeleton */}
          <div className='h-8 w-3/4 bg-bg-weak-100 rounded animate-pulse' />

          {/* Details Section Skeleton */}
          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
            <SkeletonField labelWidth='w-[184px]' valueWidth='w-32' />
            <SkeletonField labelWidth='w-[184px]' valueWidth='w-24' />
            <SkeletonField labelWidth='w-[184px]' valueWidth='w-40' />
          </div>

          {/* Space Details Card Skeleton */}
          <div className='space-y-3'>
            <div className='h-5 w-32 bg-bg-weak-100 rounded animate-pulse' />
            <div className='border border-stroke-soft-200 rounded-xl p-3 bg-white'>
              <div className='flex gap-3 items-center'>
                <div className='w-9 h-9 rounded-full bg-bg-weak-100 animate-pulse shrink-0' />
                <div className='flex-1 space-y-2'>
                  <div className='h-4 w-40 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-3 w-48 bg-bg-weak-100 rounded animate-pulse' />
                </div>
                <div className='h-5 w-24 bg-bg-weak-100 rounded-full animate-pulse' />
              </div>
            </div>
          </div>

          {/* Client Details Card Skeleton */}
          <div className='space-y-3'>
            <div className='h-5 w-32 bg-bg-weak-100 rounded animate-pulse' />
            <div className='border border-stroke-soft-200 rounded-xl p-3 bg-white'>
              <div className='flex gap-3 items-center'>
                <div className='w-9 h-9 rounded-full bg-bg-weak-100 animate-pulse shrink-0' />
                <div className='flex-1 space-y-2'>
                  <div className='h-4 w-40 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-3 w-56 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </div>
            </div>
          </div>

          {/* Description Section Skeleton */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <RiStickyNoteLine size={20} className='text-text-sub-500' />
              <div className='h-5 w-24 bg-bg-weak-100 rounded animate-pulse' />
            </div>
            <div className='h-4 w-full bg-bg-weak-100 rounded animate-pulse' />
            <div className='h-4 w-3/4 bg-bg-weak-100 rounded animate-pulse' />
          </div>
        </div>
      </div>

      {/* Right Panel - Comments Skeleton */}
      <div className='flex flex-1 flex-col h-full overflow-y-auto'>
        <div className='border-b border-stroke-soft-200 px-6 py-3.5'>
          <div className='flex items-center gap-2'>
            <RiStickyNoteLine size={20} className='text-text-sub-500' />
            <div className='h-5 w-24 bg-bg-weak-100 rounded animate-pulse' />
          </div>
        </div>
        <div className='flex-1 p-6'>
          <div className='space-y-4'>
            {/* Comment skeleton items */}
            {[1, 2, 3].map((i) => (
              <div key={i} className='flex gap-3'>
                {/* Avatar skeleton */}
                <div className='w-8 h-8 rounded-full bg-bg-weak-100 animate-pulse shrink-0' />
                <div className='flex-1 space-y-2'>
                  {/* Header skeleton */}
                  <div className='flex items-center gap-2'>
                    <div className='h-4 w-24 bg-bg-weak-100 rounded animate-pulse' />
                    <div className='h-3 w-16 bg-bg-weak-100 rounded animate-pulse' />
                  </div>
                  {/* Content skeleton */}
                  <div className='space-y-2'>
                    <div className='h-3 w-full bg-bg-weak-100 rounded animate-pulse' />
                    <div className='h-3 w-5/6 bg-bg-weak-100 rounded animate-pulse' />
                    <div className='h-3 w-4/6 bg-bg-weak-100 rounded animate-pulse' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingEventDetailDrawerSkeleton;
