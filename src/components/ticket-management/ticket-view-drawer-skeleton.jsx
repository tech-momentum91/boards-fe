import React from 'react';
import { RiTicketLine, RiChat2Line, RiMailLine } from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
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

// Skeleton for the ticket view drawer
const TicketViewDrawerSkeleton = () => {
  return (
    <div className='flex h-full'>
      {/* Left Panel - Ticket Details Skeleton */}
      <div className='w-[420px] px-6 py-5 border-r border-stroke-soft-200 overflow-y-auto'>
        <div className='space-y-5'>
          {/* Ticket Details Section */}
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <RiTicketLine size={20} className='text-text-soft-400' />
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

          {/* Client & Center Details Section */}
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <RiTicketLine size={20} className='text-text-soft-400' />
              <div className='h-4 w-32 bg-bg-weak-100 rounded animate-pulse' />
            </div>
            <div className='flex flex-col divide-y divide-stroke-soft-200'>
              <SkeletonField labelWidth='w-32' valueWidth='w-2/3' />
              <SkeletonField labelWidth='w-32' valueWidth='w-1/2' />
              <SkeletonField labelWidth='w-32' valueWidth='w-1/3' />
            </div>
          </div>

          {/* Assignment & SLA Details Section */}
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <RiTicketLine size={20} className='text-text-soft-400' />
              <div className='h-4 w-40 bg-bg-weak-100 rounded animate-pulse' />
            </div>
            <div className='flex flex-col divide-y divide-stroke-soft-200'>
              <SkeletonField labelWidth='w-32' valueWidth='w-3/4' />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Comments & Emails Skeleton */}
      <div className='flex flex-1 flex-col h-full overflow-y-auto'>
        {/* Tabs */}
        <TabMenuHorizontal.Root value='comments' className='flex flex-col flex-1 h-full'>
          <TabMenuHorizontal.List className='gap-4 h-auto border-t-0 px-6'>
            <TabMenuHorizontal.Trigger
              className='gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
              value='comments'
            >
              <TabMenuHorizontal.Icon as={RiChat2Line} />
              Comments
            </TabMenuHorizontal.Trigger>
            <TabMenuHorizontal.Trigger
              className='gap-2 px-0 text-label-sm font-medium text-text-sub-600'
              value='emails'
              disabled
            >
              <TabMenuHorizontal.Icon as={RiMailLine} />
              Emails
            </TabMenuHorizontal.Trigger>
          </TabMenuHorizontal.List>

          {/* Tab Content - Comments Skeleton */}
          <TabMenuHorizontal.Content
            value='comments'
            className='flex-1 flex flex-col h-full overflow-y-auto p-6'
          >
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
          </TabMenuHorizontal.Content>
        </TabMenuHorizontal.Root>
      </div>
    </div>
  );
};

export default TicketViewDrawerSkeleton;
