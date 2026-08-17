import React from 'react';
import { RiToolsLine, RiMapPin2Line, RiArrowRightSLine, RiArrowLeftSLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as ButtonGroup from '@/components/ui/button-group';

// Skeleton component for individual fields
const SkeletonField = ({ labelWidth = 'w-24', valueWidth = 'w-full' }) => (
  <tr className='border-b border-stroke-soft-200 last:border-b-0'>
    <td className='px-4 py-3 w-[200px]'>
      <div className={`h-4 ${labelWidth} bg-bg-weak-50 rounded animate-pulse`} />
    </td>
    <td className='px-4 py-3'>
      <div className={`h-4 ${valueWidth} bg-bg-weak-50 rounded animate-pulse`} />
    </td>
  </tr>
);

const CenterViewDrawerSkeleton = ({ open, onOpenChange, side = 'right' }) => {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content side={side} className='max-w-[1200px]'>
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='px-6 py-5 flex gap-4 items-center justify-between'>
            <ButtonGroup.Root size='xsmall'>
              <ButtonGroup.Item type='button' size='small' aria-label='Previous center'>
                <ButtonGroup.Icon as={RiArrowLeftSLine} />
              </ButtonGroup.Item>
              <ButtonGroup.Item type='button' size='small' aria-label='Next center'>
                <ButtonGroup.Icon as={RiArrowRightSLine} size={24} />
              </ButtonGroup.Item>
            </ButtonGroup.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='w-full min-h-0'>
          <div className='w-full h-full flex'>
            {/* Left Card Skeleton */}
            <div className='w-[420px] px-6 py-5 border-r border-stroke-soft-200 overflow-y-auto'>
              <div className='space-y-6'>
                {/* Center Name Skeleton */}
                <div className='flex items-center justify-between'>
                  <div className='h-6 w-48 bg-bg-weak-50 rounded animate-pulse' />
                  <div className='h-7 w-7 bg-bg-weak-50 rounded-full animate-pulse' />
                </div>

                {/* Basic Info Table Skeleton */}
                <div className='w-full border border-stroke-soft-200 rounded-lg'>
                  <table className='w-full border-collapse table-fixed'>
                    <tbody>
                      <SkeletonField labelWidth='w-20' valueWidth='w-32' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-24' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-28' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-36' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-32' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-28' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-24' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-32' />
                      <SkeletonField labelWidth='w-20' valueWidth='w-28' />
                    </tbody>
                  </table>
                </div>

                {/* Amenities Section Skeleton */}
                <div>
                  <div className='flex items-center gap-2 pb-3'>
                    <RiToolsLine size={20} className='text-text-soft-400' />
                    <div className='h-4 w-20 bg-bg-weak-50 rounded animate-pulse' />
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className='h-7 w-20 bg-bg-weak-50 rounded-full animate-pulse' />
                    ))}
                  </div>
                </div>

                {/* Address Section Skeleton */}
                <div>
                  <div className='flex items-center gap-2 pb-3'>
                    <RiMapPin2Line size={20} className='text-text-soft-400' />
                    <div className='h-4 w-16 bg-bg-weak-50 rounded animate-pulse' />
                  </div>
                  <div className='space-y-3'>
                    <div className='h-16 w-full bg-bg-weak-50 rounded animate-pulse' />
                    <div className='h-[400px] w-full bg-bg-weak-50 rounded-xl animate-pulse' />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card Skeleton */}
            <div className='flex-1 px-6 py-5 overflow-y-auto'>
              <div className='space-y-4'>
                {/* Tabs Skeleton */}
                <div className='flex gap-4 border-b border-stroke-soft-200 pb-2'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className='h-8 w-24 bg-bg-weak-50 rounded animate-pulse' />
                  ))}
                </div>

                {/* Tab Content Skeleton */}
                <div className='space-y-4 mt-4'>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className='space-y-2'>
                      <div className='h-4 w-3/4 bg-bg-weak-50 rounded animate-pulse' />
                      <div className='h-4 w-1/2 bg-bg-weak-50 rounded animate-pulse' />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CenterViewDrawerSkeleton;
