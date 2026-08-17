import React, { memo } from 'react';

import { AUM_STAT_CARDS_CONFIG } from '@/components/aum/constants';

const AumStatCards = memo((props) => {
  return (
    <div className='flex w-full min-w-0 gap-2 overflow-x-auto'>
      {AUM_STAT_CARDS_CONFIG.map((def) => {
        const { Icon, valueKey, label, color } = def;
        return (
          <div
            key={valueKey}
            className='flex min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100 px-2 py-2'
          >
            <div className='flex w-full items-center gap-2'>
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <div className='truncate text-[14px] font-medium leading-5 text-text-main-900'>
                  {props[valueKey]}
                </div>
                <div className='truncate text-[9px] font-medium uppercase leading-3 text-text-sub-500 opacity-72 [font-family:var(--font-figtree,Figtree),ui-sans-serif,sans-serif] tracking-[0.36px]'>
                  {label}
                </div>
              </div>
              <div
                className='flex size-6 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 p-1 shadow-[0px_2px_4px_0px_rgba(27,28,29,0.04)]'
                aria-hidden
              >
                <Icon className='size-3.5 text-text-sub-600' color={color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

AumStatCards.displayName = 'AumStatCards';

export default AumStatCards;
