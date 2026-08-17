import React from 'react';
import { RiArrowRightSLine, RiInformationFill } from 'react-icons/ri';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

const SIDEBAR_ITEMS = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill, activeIcon: RiInformationFill },
];

/**
 * Sidebar for About CP Contact: Basic Details, Social Links.
 * Selection is controlled by parent via value and onValueChange.
 */
const CpContactAboutSidebar = ({ value, onValueChange }) => {
  return (
    <TabMenuVertical.Root
      value={value}
      onValueChange={onValueChange}
      className='h-full flex flex-col'
    >
      <TabMenuVertical.List className='h-full min-w-[240px] p-4 bg-bg-weak-100 border-r border-stroke-soft-200'>
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const ActiveIcon = item.activeIcon;
          return (
            <TabMenuVertical.Trigger
              key={item.key}
              value={item.key}
              className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
            >
              <TabMenuVertical.Icon as={value === item.key ? ActiveIcon : Icon} />
              <span className='truncate'>{item.label}</span>
              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
            </TabMenuVertical.Trigger>
          );
        })}
      </TabMenuVertical.List>
    </TabMenuVertical.Root>
  );
};

export default CpContactAboutSidebar;
export { SIDEBAR_ITEMS };
