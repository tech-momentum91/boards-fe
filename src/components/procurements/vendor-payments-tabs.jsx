import React, { memo } from 'react';

import { VENDOR_PAYMENTS_TABS } from '@/components/procurements/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const VendorPaymentsTabs = memo(({ activeTab }) => (
  <TabMenuHorizontal.List
    wrapperClassName='w-full shrink-0'
    className='h-auto min-h-0 gap-6 border-y border-stroke-soft-200 px-8 py-3.5'
  >
    {VENDOR_PAYMENTS_TABS.map((tab) => {
      const isActive = activeTab === tab.id;
      const Icon = isActive ? tab.IconFill : tab.IconLine;

      return (
        <TabMenuHorizontal.Trigger
          key={tab.id}
          value={tab.id}
          className='h-auto gap-1.5 py-0 text-label-sm data-[state=active]:text-text-main-900'
        >
          <TabMenuHorizontal.Icon as={Icon} className='size-5' />
          {tab.label}
        </TabMenuHorizontal.Trigger>
      );
    })}
  </TabMenuHorizontal.List>
));

VendorPaymentsTabs.displayName = 'VendorPaymentsTabs';

export default VendorPaymentsTabs;
