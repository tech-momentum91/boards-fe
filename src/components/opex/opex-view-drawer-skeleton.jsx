import React from 'react';
import { RiPriceTag3Line, RiChat2Line, RiAttachment2 } from 'react-icons/ri';
import { cn } from '@/lib/utils';

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

const OpexViewDrawerSkeleton = () => {
  return (
    <div className='flex h-full'>
      {/* Left Panel - Opex Details Skeleton */}
      <div className='w-[420px] px-6 py-5 border-r border-stroke-soft-200 overflow-y-auto'>
        <div className='space-y-5'>
          {/* Primary Details Section */}
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <RiPriceTag3Line size={20} className='text-text-soft-400' />
              <div className='h-4 w-24 bg-bg-weak-100 rounded animate-pulse' />
            </div>
            <div className='flex flex-col divide-y divide-stroke-soft-200'>
              <SkeletonField labelWidth='w-32' valueWidth='w-full' />
              <SkeletonField labelWidth='w-32' valueWidth='w-3/4' />
              <SkeletonField labelWidth='w-32' valueWidth='w-2/3' />
              <SkeletonField labelWidth='w-32' valueWidth='w-1/2' />
              <SkeletonField labelWidth='w-32' valueWidth='w-24' />
              <SkeletonField labelWidth='w-32' valueWidth='w-24' />
              <SkeletonField labelWidth='w-32' valueWidth='w-1/2' />
              <SkeletonField labelWidth='w-32' valueWidth='w-40' />
              <SkeletonField labelWidth='w-32' valueWidth='w-40' />
            </div>
          </div>

          {/* Status / Action Fields Section */}
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <RiPriceTag3Line size={20} className='text-text-soft-400' />
              <div className='h-4 w-32 bg-bg-weak-100 rounded animate-pulse' />
            </div>
            <div className='flex flex-col divide-y divide-stroke-soft-200'>
              <SkeletonField labelWidth='w-32' valueWidth='w-28' />
              <SkeletonField labelWidth='w-32' valueWidth='w-20' />
              <SkeletonField labelWidth='w-32' valueWidth='w-28' />
              <SkeletonField labelWidth='w-32' valueWidth='w-28' />
              <SkeletonField labelWidth='w-32' valueWidth='w-28' />
            </div>
          </div>

          {/* Other Fields Section */}
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <RiPriceTag3Line size={20} className='text-text-soft-400' />
              <div className='h-4 w-28 bg-bg-weak-100 rounded animate-pulse' />
            </div>
            <div className='flex flex-col divide-y divide-stroke-soft-200'>
              <SkeletonField labelWidth='w-32' valueWidth='w-2/3' />
              <SkeletonField labelWidth='w-32' valueWidth='w-1/2' />
              <SkeletonField labelWidth='w-32' valueWidth='w-24' />
              <SkeletonField labelWidth='w-32' valueWidth='w-24' />
            </div>
          </div>

          {/* Attachments Section */}
          <div>
            <div className='flex items-center justify-between gap-2 mb-2'>
              <div className='flex items-center gap-2'>
                <RiAttachment2 size={20} className='text-text-soft-400' />
                <div className='h-4 w-24 bg-bg-weak-100 rounded animate-pulse' />
              </div>
              <div className='h-8 w-24 bg-bg-weak-100 rounded animate-pulse' />
            </div>
            <div className='flex gap-2'>
              <div className='h-24 w-32 rounded-lg bg-bg-weak-100 animate-pulse shrink-0' />
              <div className='h-24 w-32 rounded-lg bg-bg-weak-100 animate-pulse shrink-0' />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Comments Skeleton */}
      <div className='flex flex-1 flex-col h-full overflow-y-auto'>
        <div className='px-6 pt-5 pb-2'>
          <div className='flex items-center gap-2'>
            <RiChat2Line size={20} className='text-text-soft-400' />
            <span className='label-small text-text-sub-500'>Comments</span>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='flex gap-3'>
                <div className='w-8 h-8 rounded-full bg-bg-weak-100 animate-pulse shrink-0' />
                <div className='flex-1 space-y-2'>
                  <div className='flex items-center gap-2'>
                    <div className='h-4 w-24 bg-bg-weak-100 rounded animate-pulse' />
                    <div className='h-3 w-16 bg-bg-weak-100 rounded animate-pulse' />
                  </div>
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

export default OpexViewDrawerSkeleton;
