import React from 'react';
import {
  RiInformationFill,
  RiShieldCheckLine,
  RiBankLine,
  RiArrowRightSLine,
  RiShieldCheckFill,
  RiBankFill,
} from 'react-icons/ri';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

const sidebarItems = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill, activeIcon: RiInformationFill },
  {
    key: 'statutory',
    label: 'Statutory & Compliance',
    icon: RiShieldCheckLine,
    activeIcon: RiShieldCheckFill,
  },
  { key: 'bank', label: 'Bank Details', icon: RiBankLine, activeIcon: RiBankFill },
];

const LandlordDetailAboutSidebar = ({ value, onValueChange }) => {
  return (
    <TabMenuVertical.Root
      value={value}
      onValueChange={onValueChange}
      className='flex h-full shrink-0 flex-col'
    >
      <TabMenuVertical.List className='h-full min-w-[240px] shrink-0 p-4 bg-bg-weak-100 border-r border-stroke-soft-200'>
        {sidebarItems.map((item) => {
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

export default LandlordDetailAboutSidebar;
