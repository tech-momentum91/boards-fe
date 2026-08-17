import React from 'react';
import {
  RiInformationFill,
  RiMapPinLine,
  RiFileTextLine,
  RiGroupLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

const BASE_SIDEBAR_ITEMS = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill, activeIcon: RiInformationFill },
  { key: 'utm', label: 'UTM Details', icon: RiMapPinLine, activeIcon: RiMapPinLine },
  { key: 'call-details', label: 'Call Details', icon: RiFileTextLine, activeIcon: RiFileTextLine },
];

const AI_SIGNALS_ITEM = {
  key: 'community-inbound',
  label: 'AI Signals',
  icon: RiGroupLine,
  activeIcon: RiGroupLine,
};

const CrmLeadAboutSidebar = ({ activeItem, onItemChange, showCommunityInbound = false }) => {
  const sidebarItems = showCommunityInbound
    ? [...BASE_SIDEBAR_ITEMS, AI_SIGNALS_ITEM]
    : BASE_SIDEBAR_ITEMS;

  return (
    <TabMenuVertical.Root
      value={activeItem}
      onValueChange={onItemChange}
      className='flex h-full w-[240px] flex-col'
    >
      <TabMenuVertical.List className='flex h-full flex-col overflow-y-auto border-r border-stroke-soft-200 bg-bg-weak-100 p-4 gap-2'>
        {sidebarItems.map((item) => {
          const Icon = activeItem === item.key ? item.activeIcon : item.icon;
          return (
            <TabMenuVertical.Trigger
              key={item.key}
              value={item.key}
              className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm w-full'
            >
              <TabMenuVertical.Icon as={Icon} />
              <span className='truncate'>{item.label}</span>
              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
            </TabMenuVertical.Trigger>
          );
        })}
      </TabMenuVertical.List>
    </TabMenuVertical.Root>
  );
};

export default CrmLeadAboutSidebar;
