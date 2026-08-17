import React, { memo } from 'react';

import { PRODUCT_CATEGORY_TABS } from '@/pages/profile/product-categories/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const ProductCategoriesTabsList = memo(({ activeTab }) => {
  return (
    <TabMenuHorizontal.List
      wrapperClassName='w-full shrink-0'
      className='h-auto min-h-12 border-t-0 border-b border-stroke-soft-200 py-3.5'
    >
      {PRODUCT_CATEGORY_TABS.map((tab) => (
        <TabMenuHorizontal.Trigger
          key={tab.id}
          value={tab.id}
          className='h-auto gap-1.5 py-0 data-[state=active]:text-text-strong-950'
        >
          {tab.label}
        </TabMenuHorizontal.Trigger>
      ))}
    </TabMenuHorizontal.List>
  );
});

ProductCategoriesTabsList.displayName = 'ProductCategoriesTabsList';

export default ProductCategoriesTabsList;
