import React from 'react';

import { cn } from '@/utils/cn';

export default function ProcurementPosStageBadge({ value }) {
  if (!value) return <span className='text-paragraph-sm text-text-soft-400'>—</span>;

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center truncate rounded-full bg-bg-weak-100 px-2 py-[2px]',
        'text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px] text-text-sub-500',
      )}
      title={String(value)}
    >
      {value}
    </span>
  );
}
