import React from 'react';

import { PROCUREMENT_POS_STATUS_TABS } from '@/components/procurements/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { cn } from '@/utils/cn';

export default function ProcurementPosStatusTabs({ counts = {} }) {
  return (
    <TabMenuHorizontal.List className='h-12 gap-8 px-8' wrapperClassName='w-full shrink-0'>
      {PROCUREMENT_POS_STATUS_TABS.map((tab) => {
        const count = counts[tab.id] ?? 0;

        return (
          <TabMenuHorizontal.Trigger
            key={tab.id}
            value={tab.id}
            className='h-12 gap-1.5 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'inline-flex min-w-4 items-center justify-center rounded-full bg-bg-weak-100 px-1.5 py-0.5',
                'text-[12px] leading-4 text-text-sub-600 group-data-[state=active]/tab-item:text-text-strong-950',
              )}
            >
              {count}
            </span>
          </TabMenuHorizontal.Trigger>
        );
      })}
    </TabMenuHorizontal.List>
  );
}
