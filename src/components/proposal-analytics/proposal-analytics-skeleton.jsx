import React from 'react';

import { DashboardCard } from '@/components/proposal-analytics/dashboard-card';
import { cn } from '@/utils/cn';

function Bone({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-bg-weak-50', className)} />;
}

export function ProposalAnalyticsSkeleton() {
  return (
    <div className='flex flex-col gap-5'>
      <div className='flex items-center justify-between'>
        <Bone className='h-7 w-32' />
        <Bone className='h-5 w-36' />
      </div>

      <div className='flex flex-wrap gap-2'>
        <Bone className='size-9 rounded-lg' />
        <Bone className='h-9 w-56 rounded-lg' />
        <Bone className='h-9 w-24 rounded-lg' />
      </div>

      <DashboardCard className='p-4'>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`kpi-skel-${index}`}
              className='min-h-[104px] rounded-xl border border-stroke-soft-200 p-4'
            >
              <Bone className='h-3 w-24' />
              <Bone className='mt-8 h-8 w-20' />
            </div>
          ))}
        </div>
        <Bone className='mt-6 h-[220px] w-full' />
      </DashboardCard>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, index) => (
          <DashboardCard key={`list-skel-${index}`} className='min-h-[280px] p-4'>
            <Bone className='h-4 w-28' />
            <div className='mt-4 space-y-2'>
              {Array.from({ length: 5 }).map((__, row) => (
                <Bone key={`row-${index}-${row}`} className='h-10 w-full' />
              ))}
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}

export default ProposalAnalyticsSkeleton;
