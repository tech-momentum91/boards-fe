import React from 'react';
import {
  RiInformationFill,
  RiFileList2Fill,
  RiFileUploadFill,
  RiMoneyDollarCircleFill,
  RiBuildingFill,
} from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import { withPrefix } from '@/lib/utils';
import { CURRENCY } from '@/constants/constants';

// 1. Static Configuration: Definitions for styles and icons
const STATS_CONFIG = {
  const_per_sq_ft: {
    label: 'COST PER SQ FT',
    icon: RiBuildingFill,
    styles: {
      gradient: 'from-[#cac2ff] to-[#eeebff]',
      text: 'text-[#2b1664]',
      icon: 'text-[#5A36BF]',
    },
  },
  total_opex_amount: {
    label: 'TOTAL OPEX AMOUNT',
    icon: RiMoneyDollarCircleFill,
    styles: {
      gradient: 'from-[#fbedb1] to-[#fef7ec]',
      text: 'text-[#693d11]',
      icon: 'text-[#B47818]',
    },
  },
  total_pending: {
    label: 'BILLS PENDING APPROVAL',
    icon: RiFileList2Fill,
    styles: {
      gradient: 'from-[#c2d6ff] to-[#ebf1ff]',
      text: 'text-[#162664]',
      icon: 'text-[#253EA7]',
    },
  },
  bills_expected: {
    label: 'BILLS UPLOADED VS EXPECTED',
    icon: RiFileUploadFill,
    styles: {
      gradient: 'from-[#f9c2ff] to-[#fdebff]',
      text: 'text-[#620f6c]',
      icon: 'text-[#9C23A9]',
    },
  },
};

// 2. Sub-component: Handles the Popover logic specifically
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
          <p className='label-small text-text-main-900'>Pending approval breakdown</p>
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

// 3. Sub-component: Reusable Card UI
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

// 4. Main Component
const OpexStats = ({ stats }) => {
  const {
    const_per_sq_ft = 0,
    total_opex_amount = 0,
    total_pending = 0,
    bills_pending_breakdown = {},
    bills_uploaded = 0,
    bills_expected = 0,
  } = stats?.data || {};

  const breakdownEntries = Object.entries(bills_pending_breakdown || {});
  const statKeys = ['const_per_sq_ft', 'total_opex_amount', 'total_pending', 'bills_expected'];

  // Helper to map data to config
  const getCardProps = (key) => {
    const config = STATS_CONFIG[key];
    let value;
    let extraAction = null;

    switch (key) {
      case 'const_per_sq_ft':
        value = withPrefix(CURRENCY, const_per_sq_ft);
        break;
      case 'total_opex_amount':
        value = withPrefix(CURRENCY, total_opex_amount);
        break;
      case 'total_pending':
        value = total_pending;
        // Inject the Popover only where needed
        extraAction = <BreakdownPopover entries={breakdownEntries} />;
        break;
      case 'bills_expected':
        value = `${bills_uploaded} / ${bills_expected || 0}`;
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

export default OpexStats;
