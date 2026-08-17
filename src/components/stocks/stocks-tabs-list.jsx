import React, { memo } from 'react';

import { STOCKS_TABS } from '@/components/stocks/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const StocksTabsList = memo(({ activeTab }) => {
  return (
    <TabMenuHorizontal.List
      wrapperClassName='w-full shrink-0'
      className='h-auto min-h-12 gap-6 border-t-0 border-b border-stroke-soft-200 px-8 py-3.5'
    >
      {STOCKS_TABS.map((tab) => {
        const Icon = activeTab === tab.id ? tab.IconFill : tab.IconLine;
        return (
          <TabMenuHorizontal.Trigger
            key={tab.id}
            value={tab.id}
            className='h-auto gap-1.5 py-0 data-[state=active]:text-text-strong-950'
          >
            <TabMenuHorizontal.Icon as={Icon} />
            {tab.label}
          </TabMenuHorizontal.Trigger>
        );
      })}
    </TabMenuHorizontal.List>
  );
});

StocksTabsList.displayName = 'StocksTabsList';

export default StocksTabsList;
