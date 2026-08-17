import React, { memo } from 'react';

import { STOCKS_STAT_CARDS_CONFIG } from '@/components/stocks/constants';

const StocksStatCards = memo(({ totalSku, totalStockValueLabel, criticalCount }) => {
  const values = { totalSku, totalStockValueLabel, criticalCount };

  return (
    <div className='flex w-full min-w-0 flex-col gap-4 sm:flex-row'>
      {STOCKS_STAT_CARDS_CONFIG.map((def) => {
        const { Icon, valueKey, label, color } = def;
        return (
          <div
            key={valueKey}
            className='flex min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-[12px] border border-stroke-soft-200 bg-bg-weak-100 px-4 py-3'
          >
            <div className='flex w-full items-center gap-4'>
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <div className='text-[20px] font-medium leading-7 text-text-main-900'>
                  {values[valueKey]}
                </div>
                <div className='text-[12px] font-medium uppercase leading-4 text-text-sub-500 opacity-72 [font-family:var(--font-figtree,Figtree),ui-sans-serif,sans-serif] tracking-[0.48px]'>
                  {label}
                </div>
              </div>
              <div
                className='flex size-8 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 p-1.5 shadow-[0px_2px_4px_0px_rgba(27,28,29,0.04)]'
                aria-hidden
              >
                <Icon className='size-5 text-text-sub-600' color={color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

StocksStatCards.displayName = 'StocksStatCards';

export default StocksStatCards;
