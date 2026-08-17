import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const CpAccountsStatusTabs = ({ value = 'all', counts = {}, onValueChange, tabs = [] }) => {
  const tabList = tabs.length > 0 ? tabs : [{ value: 'all', label: 'All' }];
  return (
    <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
      <TabMenuHorizontal.List className='gap-6 border-t-0' wrapperClassName='w-full'>
        {tabList.map((tab) => {
          const count = tab.value === 'all' ? (counts.all ?? 0) : (counts[tab.value] ?? 0);
          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <span>{tab.label}</span>
              <span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-weak-100 px-1.5 text-label-xs text-text-sub-600 group-data-[state=active]/tab-item:bg-primary-base group-data-[state=active]/tab-item:text-static-white'>
                {count}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {tabList.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default CpAccountsStatusTabs;
