import React from 'react';
import { RiArrowRightSLine, RiFileFill, RiInformationFill } from 'react-icons/ri';

import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

const sidebarItems = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill },
  { key: 'photos', label: 'Photos & Files', icon: RiFileFill },
];

const SpaceDetailAboutSidebar = ({ value, onValueChange }) => {
  return (
    <TabMenuVertical.Root value={value} onValueChange={onValueChange} className='  flex flex-col'>
      <TabMenuVertical.List className='h-full min-w-[240px] p-4 bg-bg-weak-100 border-r border-stroke-soft-200'>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
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

export default SpaceDetailAboutSidebar;
