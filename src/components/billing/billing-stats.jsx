import React from 'react';
import {
  RiInformationFill,
  RiFileList2Fill,
  RiMoneyDollarCircleFill,
  RiTimeLine,
  RiCheckboxCircleFill,
} from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import { withPrefix } from '@/lib/utils';
import { CURRENCY } from '@/constants/constants';

// Static Configuration: Definitions for styles and icons
const STATS_CONFIG = {
  total_billing_amount: {
    label: 'TOTAL BILLING AMOUNT',
    icon: RiMoneyDollarCircleFill,
    styles: {
      gradient: 'from-[#fbedb1] to-[#fef7ec]',
      text: 'text-[#693d11]',
      icon: 'text-[#B47818]',
    },
  },
  pending_records: {
    label: 'PENDING RECORDS',
    icon: RiFileList2Fill,
    styles: {
      gradient: 'from-[#c2d6ff] to-[#ebf1ff]',
      text: 'text-[#162664]',
      icon: 'text-[#253EA7]',
    },
  },
  received_records: {
    label: 'RECEIVED RECORDS',
    icon: RiCheckboxCircleFill,
    styles: {
      gradient: 'from-[#c2f0c2] to-[#ebffeb]',
      text: 'text-[#166416]',
      icon: 'text-[#36A736]',
    },
  },
  overdue_records: {
    label: 'OVERDUE RECORDS',
    icon: RiTimeLine,
    styles: {
      gradient: 'from-[#ffccc2] to-[#ffebeb]',
      text: 'text-[#641616]',
      icon: 'text-[#A73636]',
    },
  },
};

// Sub-component: Handles the Popover logic specifically
const BreakdownPopover = ({ entries }) => {
  if (!entries || entries.length === 0) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div className='text-[#162664] cursor-pointer hover:opacity-80 transition-opacity'>
          <RiInformationFill />
        </div>
      </Popover.Trigger>
      <Popover.Content side='top' align='start' className='min-w-[220px]'>
        <div className='flex flex-col gap-2'>
          <p className='label-small text-text-main-900'>Stage breakdown</p>
          <div className='flex flex-col gap-1'>
            {entries.map(([key, value]) => (
              <div key={key} className='flex items-center justify-between'>
                <span className='paragraph-small text-text-sub-600 capitalize'>
                  {String(key).replaceAll('_', ' ')}
                </span>
                <span className='paragraph-small text-text-main-900 font-medium'>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

// Sub-component: Reusable Card UI
const StatCard = ({ label, value, icon: Icon, styles, extraAction }) => (
  <div
    className={`flex min-h-[96px] items-center justify-between gap-4 rounded-2xl bg-linear-to-b px-4 py-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${styles.gradient}`}
  >
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <div className={`text-title-h5 ${styles.text}`}>{value}</div>
      </div>
      <div className='flex items-center gap-1.5'>
        <span className={`text-subheading-sm ${styles.text} opacity-70`}>{label}</span>
        {extraAction}
      </div>
    </div>

    <div className='flex items-center justify-center p-1 shrink-0 rounded-full bg-white/90 shadow-[0px_2px_4px_rgba(27,28,29,0.1)] self-start'>
      <Icon className={`size-5 ${styles.icon}`} />
    </div>
  </div>
);

// Main Component
const BillingStats = ({ stats }) => {
  const {
    total_billing_amount = 0,
    pending_records = 0,
    received_records = 0,
    overdue_records = 0,
    stage_breakdown = {},
  } = stats?.data || {};

  const breakdownEntries = Object.entries(stage_breakdown || {});
  const statKeys = [
    'total_billing_amount',
    'pending_records',
    'received_records',
    'overdue_records',
  ];

  // Helper to map data to config
  const getCardProps = (key) => {
    const config = STATS_CONFIG[key];
    let value;
    let extraAction = null;

    switch (key) {
      case 'total_billing_amount':
        value = withPrefix(CURRENCY, total_billing_amount);
        break;
      case 'pending_records':
        value = pending_records;
        // Inject the Popover only where needed
        extraAction = <BreakdownPopover entries={breakdownEntries} />;
        break;
      case 'received_records':
        value = received_records;
        break;
      case 'overdue_records':
        value = overdue_records;
        break;
      default:
        value = '-';
    }

    return { ...config, value, extraAction };
  };

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-5'>
      {statKeys.map((key) => (
        <StatCard key={key} {...getCardProps(key)} />
      ))}
    </div>
  );
};

export default BillingStats;
