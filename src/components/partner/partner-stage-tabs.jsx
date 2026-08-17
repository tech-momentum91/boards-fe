import React from 'react';
import { RiLayoutGridLine } from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const PARTNER_STAGE_TABS_FALLBACK = [{ value: 'all', label: 'All', icon: RiLayoutGridLine }];

const PartnerStageTabs = ({
  value = 'all',
  counts = {},
  onValueChange,
  isLoading = false,
  tabs: tabsProp,
}) => {
  const tabs = tabsProp?.length ? tabsProp : PARTNER_STAGE_TABS_FALLBACK;
  return (
    <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
      <TabMenuHorizontal.List className='gap-4 md:gap-6' wrapperClassName='w-full'>
        {tabs.map((tab) => {
          const count = tab.value === 'all' ? counts.all : counts[tab.value];
          const Icon = tab.icon;
          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              {/* <TabMenuHorizontal.Icon as={Icon} className='size-4 shrink-0' /> */}
              <span className='whitespace-nowrap'>{tab.label}</span>
              <span
                className={
                  'inline-flex min-w-[20px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] ' +
                  'bg-bg-weak-100 text-text-sub-500 ' +
                  'group-data-[state=active]/tab-item:bg-primary-base group-data-[state=active]/tab-item:text-white'
                }
              >
                {count}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {tabs.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default PartnerStageTabs;
