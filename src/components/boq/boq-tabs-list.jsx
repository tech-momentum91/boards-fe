import React, { memo } from 'react';

import { BOQ_TABS } from '@/components/boq/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const BoqTabsList = memo(({ activeTab }) => {
  return (
    <TabMenuHorizontal.List
      wrapperClassName='w-full shrink-0'
      className='h-auto min-h-12 gap-6 border-t-0 border-b border-stroke-soft-200 px-8 py-3.5'
    >
      {BOQ_TABS.map((tab) => {
        const Icon = activeTab === tab.id ? tab.IconFill : tab.IconLine;
        const isActive = activeTab === tab.id;
        return (
          <TabMenuHorizontal.Trigger
            key={tab.id}
            value={tab.id}
            className='h-auto gap-1.5 py-0 data-[state=active]:text-[#16a34a]'
          >
            <TabMenuHorizontal.Icon as={Icon} className={isActive ? 'text-[#16a34a]' : undefined} />
            {tab.label}
          </TabMenuHorizontal.Trigger>
        );
      })}
    </TabMenuHorizontal.List>
  );
});

BoqTabsList.displayName = 'BoqTabsList';

export default BoqTabsList;
