import React from 'react';

import { cn } from '@/utils/cn';

function PropertyCardDecorPattern() {
  return (
    <div
      className='pointer-events-none absolute right-0 top-[-1px] h-[60px] w-[71px] overflow-hidden opacity-70'
      aria-hidden
    >
      {[0, 12, 24, 36].map((inset) => (
        <div
          key={inset}
          className='absolute rounded-full border border-stroke-soft-200/60'
          style={{
            width: 103 - inset * 2,
            height: 103 - inset * 2,
            right: -15 + inset,
            top: -34 + inset,
          }}
        />
      ))}
    </div>
  );
}

export function ProductDetailPropertyCard({ value, label, icon: Icon, tone = 'muted' }) {
  return (
    <div
      className={cn(
        'relative flex h-[60px] min-w-0 flex-1 flex-col items-start overflow-hidden rounded-lg border border-[#eaecf0] p-3',
        tone === 'white' ? 'bg-bg-white-0 shadow-regular-xs' : 'bg-[#f9fafb]',
      )}
    >
      <div className='relative z-[1] flex w-full min-w-0 flex-col gap-0'>
        <span className='truncate text-[12px] font-semibold leading-[18px] text-[#475467]'>
          {value}
        </span>
        <span className='truncate text-[12px] font-medium leading-[18px] text-[#475467]'>
          {label}
        </span>
      </div>
      {Icon ? (
        <Icon
          className='absolute right-2.5 top-2.5 z-[1] size-4 shrink-0 text-text-sub-500'
          aria-hidden
        />
      ) : null}
      <PropertyCardDecorPattern />
    </div>
  );
}
