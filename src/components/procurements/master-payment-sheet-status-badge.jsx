import React from 'react';

import { MASTER_PAYMENT_SHEETS_STATUS_BADGE_STYLES } from '@/components/procurements/constants';
import { cn } from '@/utils/cn';

export default function MasterPaymentSheetStatusBadge({ value }) {
  if (!value) return <span className='text-paragraph-sm text-text-soft-400'>—</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-[2px] text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px]',
        MASTER_PAYMENT_SHEETS_STATUS_BADGE_STYLES[value] ?? 'bg-bg-weak-100 text-text-sub-500',
      )}
    >
      {value}
    </span>
  );
}
