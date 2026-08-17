import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  RiFocus2Line,
  RiAccountCircleLine,
  RiSuitcaseLine,
  RiLock2Line,
  RiVipCrownLine,
} from 'react-icons/ri';
import { CP_CONTACTS_STATUS_OPTIONS } from './constants-cp-contacts';

const TAB_ICONS = {
  mql: RiFocus2Line,
  sql: RiAccountCircleLine,
  opportunity: RiSuitcaseLine,
  closure: RiLock2Line,
  customer: RiVipCrownLine,
};

const CpContactsStatusTabs = ({ value = 'all', counts = {}, onValueChange }) => (
  <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
    <TabMenuHorizontal.List className='gap-6 border-t-0' wrapperClassName='w-full'>
      {CP_CONTACTS_STATUS_OPTIONS.map((tab) => {
        const count =
          tab.value === 'all'
            ? (counts.all ?? Object.values(counts).reduce((a, b) => a + b, 0))
            : (counts[tab.value] ?? 0);
        const Icon = TAB_ICONS[tab.value];
        return (
          <TabMenuHorizontal.Trigger
            key={tab.value}
            value={tab.value}
            className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
          >
            {Icon ? (
              <Icon className='size-4 text-text-sub-600 data-[state=active]:text-text-strong-950' />
            ) : null}
            <span>{tab.label}</span>
            <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 data-[state=active]:text-text-strong-950'>
              {count}
            </span>
          </TabMenuHorizontal.Trigger>
        );
      })}
    </TabMenuHorizontal.List>
    {CP_CONTACTS_STATUS_OPTIONS.map((tab) => (
      <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
        {tab.label}
      </TabMenuHorizontal.Content>
    ))}
  </TabMenuHorizontal.Root>
);

export default CpContactsStatusTabs;
