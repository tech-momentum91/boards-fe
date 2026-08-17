import React from 'react';
import { RiArrowLeftLine, RiDashboardLine } from 'react-icons/ri';

import { DashboardIcon } from '@/components/dashboard-master/dashboard-icon-utils.jsx';

export default function DashboardHeader({ dashboard, onBack, embedded = false }) {
  const showBack = Boolean(onBack);

  return (
    <div className='flex shrink-0 items-center gap-[14px] border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-5'>
      {showBack && (
        <button
          type='button'
          onClick={onBack}
          className='shrink-0 text-text-sub-500 hover:text-text-strong-950'
          aria-label='Back'
        >
          <RiArrowLeftLine className='size-5' />
        </button>
      )}
      <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-bg-weak-100 p-3'>
        {dashboard.icon ? (
          <DashboardIcon iconId={dashboard.icon} className='size-6 text-text-sub-600' />
        ) : (
          <RiDashboardLine className='size-6 text-text-sub-600' />
        )}
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <div className='truncate label-large text-text-main-900'>{dashboard.dashboard_name}</div>
        {dashboard.description && (
          <div className='truncate paragraph-small text-text-sub-500'>{dashboard.description}</div>
        )}
      </div>
    </div>
  );
}
