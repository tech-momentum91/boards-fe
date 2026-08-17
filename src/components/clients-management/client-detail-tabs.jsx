import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { CLIENT_DETAIL_TAB_ITEMS } from '@/components/clients-management/client-detail-tab-config';

const ClientDetailTabs = ({ activeTab, onTabChange, tabs = CLIENT_DETAIL_TAB_ITEMS }) => {
  return (
    <TabMenuHorizontal.Root value={activeTab} onValueChange={onTabChange}>
      <TabMenuHorizontal.List className='gap-6 px-6' wrapperClassName='w-full'>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const ActiveIcon = tab.activeIcon;
          return (
            <TabMenuHorizontal.Trigger
              key={tab.key}
              value={tab.key}
              className='h-12 gap-1.5 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <TabMenuHorizontal.Icon
                as={activeTab === tab.key ? ActiveIcon : Icon}
                className='size-5'
                fill='currentColor'
              />
              <span>{tab.label}</span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {tabs.map((tab) => (
        <TabMenuHorizontal.Content key={tab.key} value={tab.key} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default ClientDetailTabs;
