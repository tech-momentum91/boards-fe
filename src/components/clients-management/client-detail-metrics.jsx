import React from 'react';
import {
  RiGroupLine,
  RiTicketFill,
  RiStarFill,
  RiHandHeartFill,
  RiUserAddLine,
  RiMoneyDollarCircleLine,
  RiStarSmileFill,
  RiShakeHandsFill,
  RiUserReceived2Fill,
  RiTokenSwapFill,
} from 'react-icons/ri';
import { PiChairFill } from 'react-icons/pi';
import { cn } from '@/lib/utils';

const metricsConfig = [
  {
    key: 'totalSeats',
    label: 'Total Seats',
    icon: PiChairFill,
    bgColor: 'bg-[#ebf1ff]',
    iconColor: 'text-[#162664]',
  },
  {
    key: 'openTickets',
    label: 'Open Tickets',
    icon: RiTicketFill,
    bgColor: 'bg-[#eeebff]',
    iconColor: 'text-[#5a36bf]',
  },
  {
    key: 'csiScore',
    label: 'Avg. CSI Score',
    icon: RiStarSmileFill,
    bgColor: 'bg-[#ebfaff]',
    iconColor: 'text-[#1f87ad]',
  },
  {
    key: 'engagement',
    label: 'Engagement',
    icon: RiShakeHandsFill,
    bgColor: 'bg-[#fef3eb]',
    iconColor: 'text-[#c2540a]',
  },
  {
    key: 'onboarding',
    label: 'Onboarding',
    icon: RiUserReceived2Fill,
    bgColor: 'bg-[#fdebff]',
    iconColor: 'text-[#9c23a9]',
  },
  {
    key: 'totalCredits',
    label: 'Total Credits',
    icon: RiTokenSwapFill,
    bgColor: 'bg-[#e6f4ee]',
    iconColor: 'text-[#067644]',
  },
];

const MetricItem = ({ label, value, icon: Icon, bgColor, iconColor }) => {
  return (
    <div className='flex flex-1 items-center gap-3'>
      <div className={cn('flex items-center justify-center rounded-full p-2.5', bgColor)}>
        <Icon className={cn('size-5', iconColor)} />
      </div>
      <div className='flex flex-col gap-1 flex-1 min-w-0'>
        <p className='text-subheading-2xs uppercase tracking-wider text-text-soft-400'>{label}</p>
        <p className='text-label-md text-text-main-900'>{value || '--'}</p>
      </div>
    </div>
  );
};

const ClientDetailMetrics = ({ metrics = {} }) => {
  return (
    <div className='flex items-center gap-5 px-6 py-4'>
      {metricsConfig.map((config, index) => {
        const value = metrics[config.key];
        return (
          <React.Fragment key={config.key}>
            {index > 0 && <div className='h-10 w-px border-l border-stroke-soft-200 shrink-0' />}
            <MetricItem
              label={config.label}
              value={value}
              icon={config.icon}
              bgColor={config.bgColor}
              iconColor={config.iconColor}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ClientDetailMetrics;
