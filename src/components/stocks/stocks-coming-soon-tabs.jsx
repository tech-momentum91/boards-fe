import React, { memo } from 'react';

import ComingSoonMessage from '@/components/coming-soon-message';
import { STOCKS_TAB_IDS, STOCKS_TABS } from '@/components/stocks/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const StocksComingSoonTabs = memo(() => {
  return STOCKS_TABS.filter(
    (tab) =>
      tab.id !== STOCKS_TAB_IDS.CURRENT_STOCK &&
      tab.id !== STOCKS_TAB_IDS.PRODUCT_MASTER &&
      tab.id !== STOCKS_TAB_IDS.STOCK_RULES &&
      tab.id !== STOCKS_TAB_IDS.VENDOR_RC &&
      tab.id !== STOCKS_TAB_IDS.ORDERS &&
      tab.id !== STOCKS_TAB_IDS.STOCK_IN &&
      tab.id !== STOCKS_TAB_IDS.STOCK_OUT,
  ).map((tab) => (
    <TabMenuHorizontal.Content key={tab.id} value={tab.id} className='min-h-0 flex-1 outline-none'>
      <div className='px-8 py-10'>
        <ComingSoonMessage />
      </div>
    </TabMenuHorizontal.Content>
  ));
});

StocksComingSoonTabs.displayName = 'StocksComingSoonTabs';

export default StocksComingSoonTabs;
