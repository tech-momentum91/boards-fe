import React from 'react';
import { RiArrowRightSLine, RiBarChartBoxLine } from 'react-icons/ri';

import { DashboardIcon } from '@/components/dashboard-master/dashboard-icon-utils.jsx';

export default function DashboardListCard({ dashboard, onOpen }) {
  const icon = dashboard.icon?.trim();

  return (
    <button
      type='button'
      onClick={() => onOpen(dashboard)}
      className='flex w-full items-center justify-between rounded-xl border border-[#e5e7eb] bg-bg-white-0 p-[17px] text-left transition hover:border-stroke-soft-200 hover:shadow-sm'
    >
      <div className='flex min-w-0 flex-1 items-center gap-4'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(243,244,246,0.6)] text-lg'>
          {icon ? (
            <DashboardIcon iconId={icon} className='size-6 text-text-sub-600' />
          ) : (
            <RiBarChartBoxLine className='size-6 text-text-sub-600' />
          )}
        </div>
        <div className='flex min-w-0 flex-col gap-1'>
          <div className='text-[14px] font-semibold leading-5 text-[#1b2232] truncate'>
            {dashboard.dashboard_name}
          </div>
          <div className='text-[12px] leading-4 text-[#737b8c] truncate'>
            {dashboard.description || 'Create and manage widgets under this dashboard'}
          </div>
        </div>
      </div>
      <RiArrowRightSLine className='size-4 shrink-0 text-text-sub-500' />
    </button>
  );
}
