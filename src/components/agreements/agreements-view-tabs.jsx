import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { AGREEMENTS_VIEW_TABS } from '@/components/agreements/constants';

const AgreementsViewTabs = ({ value = 'list', onValueChange }) => {
  return (
    <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
      <TabMenuHorizontal.List className='gap-6' wrapperClassName='w-full'>
        {AGREEMENTS_VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabMenuHorizontal.Trigger
              key={tab.id}
              value={tab.id}
              className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              {Icon && <TabMenuHorizontal.Icon as={Icon} className='size-4' />}
              <span>{tab.label}</span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {AGREEMENTS_VIEW_TABS.map((tab) => (
        <TabMenuHorizontal.Content key={tab.id} value={tab.id} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default AgreementsViewTabs;
