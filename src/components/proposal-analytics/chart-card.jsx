import React from 'react';

import { DashboardCard } from '@/components/proposal-analytics/dashboard-card';
import { cn } from '@/utils/cn';

export function ChartCard({ title, description, action, className, children, bodyClassName }) {
  return (
    <DashboardCard className={cn('flex min-h-[280px] flex-col', className)}>
      <div className='flex items-start justify-between gap-3 px-4 pb-1 pt-4'>
        <div className='min-w-0'>
          <h3 className='text-[14px] font-semibold text-text-strong-950'>{title}</h3>
          {description ? (
            <p className='mt-0.5 text-[12px] text-text-soft-400'>{description}</p>
          ) : null}
        </div>
        {action ? <div className='shrink-0'>{action}</div> : null}
      </div>
      <div className={cn('flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3', bodyClassName)}>
        {children}
      </div>
    </DashboardCard>
  );
}

export default ChartCard;
