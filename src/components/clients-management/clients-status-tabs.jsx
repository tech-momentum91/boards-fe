import React from 'react';
import { RiUserFollowLine, RiUser3Line, RiBuilding4Line, RiGlobalLine } from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { STATUS_TAB_OPTIONS } from './constants';

const TAB_ICONS = {
  active: RiUserFollowLine,
  regular: RiUser3Line,
  resource: RiBuilding4Line,
  virtual: RiGlobalLine,
};

const ClientsStatusTabs = ({ value = 'active', counts = {}, onValueChange }) => {
  return (
    <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
      <TabMenuHorizontal.List
        className='h-auto min-h-12 gap-6 border-t-0 border-b border-stroke-soft-200 py-3.5'
        wrapperClassName='w-full'
      >
        {STATUS_TAB_OPTIONS.map((tab) => {
          const count = counts[tab.value] ?? 0;
          const Icon = TAB_ICONS[tab.value];

          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='group h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              {Icon ? <TabMenuHorizontal.Icon as={Icon} className='size-5' /> : null}
              <span>{tab.label}</span>
              <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 group-data-[state=active]:bg-green-500 group-data-[state=active]:text-white group-data-[state=active]:font-semibold'>
                {count ?? 0}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {STATUS_TAB_OPTIONS.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default ClientsStatusTabs;
