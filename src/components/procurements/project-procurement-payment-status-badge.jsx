import React from 'react';

import { cn } from '@/utils/cn';

const STATUS_STYLES = {
  'Partially paid': 'bg-[#fbdfb1] text-[#693d11]',
  Done: 'bg-[#b5dfcc] text-[#045933]',
  Pending: 'bg-[#fbdfb1] text-[#693d11]',
  'Sent to accounts': 'bg-[#cac2ff] text-[#2b1664]',
  'Submitted for approval': 'bg-[#fbdfb1] text-[#693d11]',
  Draft: 'bg-bg-weak-100 text-text-sub-500',
  Approved: 'bg-[#b5dfcc] text-[#045933]',
};

export default function ProjectProcurementPaymentStatusBadge({ value }) {
  if (!value) return <span className='text-paragraph-sm text-text-soft-400'>—</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-[2px] text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px]',
        STATUS_STYLES[value] ?? 'bg-bg-weak-100 text-text-sub-500',
      )}
    >
      {value}
    </span>
  );
}
