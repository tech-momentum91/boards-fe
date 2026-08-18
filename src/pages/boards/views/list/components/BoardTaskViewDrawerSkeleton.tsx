import { RiPriceTag3Line, RiStickyNoteLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';

function SkeletonField({ labelWidth = 'w-24', valueWidth = 'w-full' }) {
  return (
    <div className='group relative flex items-start gap-4 py-2'>
      <div className={cn('flex min-h-8 shrink-0 items-center', labelWidth)}>
        <div className='ml-4 h-4 w-full animate-pulse rounded bg-bg-weak-100' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex min-h-8 w-full items-center'>
          <div className={cn('h-4 animate-pulse rounded bg-bg-weak-100', valueWidth)} />
        </div>
      </div>
    </div>
  );
}

export default function BoardTaskViewDrawerSkeleton() {
  return (
    <div className='flex h-full'>
      <div className='w-[422px] overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
        <div className='space-y-5'>
          <div className='h-8 w-3/4 animate-pulse rounded bg-bg-weak-100' />

          <div>
            <div className='mb-1 flex items-center gap-2'>
              <RiPriceTag3Line size={20} className='text-text-soft-400' />
              <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-100' />
            </div>
            <div className='flex flex-col divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
              <SkeletonField labelWidth='w-32' valueWidth='w-24' />
              <SkeletonField labelWidth='w-32' valueWidth='w-32' />
              <SkeletonField labelWidth='w-32' valueWidth='w-32' />
              <SkeletonField labelWidth='w-32' valueWidth='w-20' />
            </div>
          </div>

          <div>
            <div className='mb-1 flex items-center gap-2'>
              <RiStickyNoteLine size={20} className='text-text-soft-400' />
              <div className='h-4 w-32 animate-pulse rounded bg-bg-weak-100' />
            </div>
            <div className='space-y-2'>
              <div className='h-3 w-full animate-pulse rounded bg-bg-weak-100' />
              <div className='h-3 w-5/6 animate-pulse rounded bg-bg-weak-100' />
              <div className='h-3 w-4/6 animate-pulse rounded bg-bg-weak-100' />
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-1 flex-col'>
        <div className='border-b border-stroke-soft-200 px-6 py-3.5'>
          <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-100' />
        </div>
        <div className='space-y-4 px-6 py-5'>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className='flex gap-3'>
              <div className='size-8 shrink-0 animate-pulse rounded-full bg-bg-weak-100' />
              <div className='flex-1 space-y-2'>
                <div className='h-3 w-28 animate-pulse rounded bg-bg-weak-100' />
                <div className='h-3 w-full animate-pulse rounded bg-bg-weak-100' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
