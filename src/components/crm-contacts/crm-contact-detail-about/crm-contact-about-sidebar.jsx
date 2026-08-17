import React from 'react';
import { RiInformationFill, RiArrowRightSLine } from 'react-icons/ri';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

const sidebarItems = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill, activeIcon: RiInformationFill },
];

const CrmContactAboutSidebar = ({ activeItem, onItemChange }) => {
  return (
    <TabMenuVertical.Root
      value={activeItem}
      onValueChange={onItemChange}
      className='h-full w-[240px] flex flex-col'
    >
      <TabMenuVertical.List className='h-full p-4 bg-bg-weak-100 border-r border-stroke-soft-200'>
        {sidebarItems.map((item) => {
          const Icon = activeItem === item.key ? item.activeIcon : item.icon;
          return (
            <TabMenuVertical.Trigger
              key={item.key}
              value={item.key}
              className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
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

export default CrmContactAboutSidebar;
