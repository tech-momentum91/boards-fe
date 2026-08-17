import React from 'react';
import { RiTimeLine, RiBuildingLine, RiStickyNoteLine, RiStarSmileFill } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Avatar from '@/components/ui/avatar';

const ClientDetailCsiDrawerSkeleton = ({ isOpen, onOpenChange }) => {
  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[600px]'>
        {/* Header Skeleton */}
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-3'>
              <ButtonGroup.Root size='xsmall' className='shadow-regular-xs'>
                <ButtonGroup.Item disabled>
                  <div className='h-4 w-4 bg-bg-weak-50 rounded-full animate-pulse' />
                </ButtonGroup.Item>
                <ButtonGroup.Item disabled>
                  <div className='h-4 w-4 bg-bg-weak-50 rounded-full animate-pulse' />
                </ButtonGroup.Item>
              </ButtonGroup.Root>
            </div>

            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='shadow-regular-xs'
              disabled
            >
              <div className='h-4 w-4 bg-bg-weak-50 rounded-full animate-pulse' />
            </Button.Root>
          </div>
        </Drawer.Header>

        {/* Body Skeleton */}
        <Drawer.Body className='px-6 py-5 overflow-y-auto'>
          <div className='space-y-6'>
            {/* Survey Metadata Skeleton */}
            <div className='flex flex-col gap-2'>
              <div className='h-6 w-40 bg-bg-weak-50 rounded animate-pulse' />
              <div className='flex items-center gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <RiTimeLine className='size-5 text-text-soft-400' />
                  <div className='h-4 w-32 bg-bg-weak-50 rounded animate-pulse' />
                </div>
                <span className='size-1 rounded-full bg-bg-weak-100' />
                <div className='flex items-center gap-2'>
                  <RiBuildingLine className='size-5 text-text-soft-400' />
                  <div className='h-4 w-32 bg-bg-weak-50 rounded animate-pulse' />
                </div>
                <span className='size-1 rounded-full bg-bg-weak-100' />
                <div className='flex items-center gap-1.5'>
                  <Avatar.Root size='24' color='gray'>
                    <div className='h-4 w-4 bg-bg-weak-50 rounded-full animate-pulse' />
                  </Avatar.Root>
                  <div className='h-4 w-28 bg-bg-weak-50 rounded animate-pulse' />
                </div>
              </div>
            </div>

            {/* CSI Score Card Skeleton */}
            <div className='mb-2 bg-linear-to-b from-[#fbedb1] to-[#fef7ec] rounded-xl p-4'>
              <div className='flex items-start gap-4'>
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='flex items-baseline gap-2'>
                    <div className='h-6 w-16 bg-[#f3d28a] rounded animate-pulse' />
                    <div className='h-4 w-20 bg-[#f3d28a] rounded animate-pulse' />
                  </div>
                  <div className='h-3 w-24 bg-[#f3d28a] rounded animate-pulse' />
                </div>
                <div className='bg-white rounded-full p-1 shadow-regular-xs shrink-0 flex items-center justify-center'>
                  <RiStarSmileFill className='size-5 text-[#e7c06a] opacity-60' />
                </div>
              </div>
            </div>

            {/* Service Ratings Skeleton */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='h-4 w-32 bg-bg-weak-50 rounded animate-pulse' />
                <div className='h-4 w-28 bg-bg-weak-50 rounded animate-pulse' />
              </div>

              {/* Rating Scale Skeleton (popover trigger area only) */}
              <div className='border border-stroke-soft-200 rounded-xl overflow-hidden'>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className='border-b border-stroke-soft-200 last:border-b-0 bg-white px-5 py-4'
                  >
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center justify-between'>
                        <div className='h-4 w-40 bg-bg-weak-50 rounded animate-pulse' />
                      </div>
                      <div className='h-4 w-48 bg-bg-weak-50 rounded animate-pulse' />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comment Skeleton */}
            <div className='bg-bg-weak-100 rounded-xl p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <RiStickyNoteLine className='size-5 text-text-soft-400' />
                <div className='h-4 w-16 bg-bg-weak-50 rounded animate-pulse' />
              </div>
              <div className='space-y-2'>
                <div className='h-4 w-full bg-bg-weak-50 rounded animate-pulse' />
                <div className='h-4 w-5/6 bg-bg-weak-50 rounded animate-pulse' />
                <div className='h-4 w-2/3 bg-bg-weak-50 rounded animate-pulse' />
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ClientDetailCsiDrawerSkeleton;
