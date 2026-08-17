import React, { memo } from 'react';

import { PRODUCTS_TABS } from '@/components/products/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const ProductsTabsList = memo(() => {
  return (
    <TabMenuHorizontal.List
      wrapperClassName='w-full shrink-0 bg-bg-white-0'
      className='h-auto min-h-12 gap-6 border-t-0 border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-3.5'
    >
      {PRODUCTS_TABS.map((tab) => (
        <TabMenuHorizontal.Trigger
          key={tab.id}
          value={tab.id}
          className='h-auto gap-1.5 py-0 text-text-sub-500 data-[state=active]:text-text-main-900'
        >
          <TabMenuHorizontal.Icon
            as={tab.icon}
            className='text-text-sub-500 group-data-[state=active]/tab-item:text-primary-base'
          />
          {tab.label}
        </TabMenuHorizontal.Trigger>
      ))}
    </TabMenuHorizontal.List>
  );
});

ProductsTabsList.displayName = 'ProductsTabsList';

export default ProductsTabsList;
