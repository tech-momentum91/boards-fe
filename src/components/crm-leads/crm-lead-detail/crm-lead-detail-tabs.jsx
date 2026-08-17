import React from 'react';
import {
  RiInformationLine,
  RiInformationFill,
  RiTaskLine,
  RiTaskFill,
  RiUserFollowLine,
  RiUserFollowFill,
  RiFileList2Line,
  RiFileList2Fill,
  RiCalendarLine,
  RiCalendarFill,
  RiBox2Line,
  RiBox2Fill,
  RiAccountCircleLine,
  RiAccountCircleFill,
  RiBuildingLine,
  RiBuildingFill,
} from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Badge from '@/components/ui/badge';

const CRM_LEAD_DETAIL_TABS_ALL = [
  {
    key: 'about',
    label: 'About Lead',
    icon: RiInformationLine,
    activeIcon: RiInformationFill,
  },
  { key: 'tasks', label: 'Tasks', icon: RiTaskLine, activeIcon: RiTaskFill },
  {
    key: 'contacts',
    label: 'Contacts',
    icon: RiAccountCircleLine,
    activeIcon: RiAccountCircleFill,
  },
  { key: 'account', label: 'Account', icon: RiBuildingLine, activeIcon: RiBuildingFill },
  {
    key: 'suggested-inventory',
    label: 'Suggested Inventory',
    icon: RiBox2Line,
    activeIcon: RiBox2Fill,
    countKey: 'suggestedInventory',
  },
  { key: 'proposals', label: 'Proposals', icon: RiFileList2Line, activeIcon: RiFileList2Fill },
  { key: 'activities', label: 'Activities', icon: RiCalendarLine, activeIcon: RiCalendarFill },
];

const CrmLeadDetailTabs = ({ activeTab, onTabChange, permittedTabKeys, tabCounts = {} }) => {
  const tabs =
    permittedTabKeys == null
      ? CRM_LEAD_DETAIL_TABS_ALL
      : CRM_LEAD_DETAIL_TABS_ALL.filter((t) => permittedTabKeys.includes(t.key));

  return (
    <TabMenuHorizontal.Root value={activeTab} onValueChange={onTabChange}>
      <TabMenuHorizontal.List className='gap-6 px-6' wrapperClassName='w-full'>
        {tabs.map((tab) => {
          const Icon = activeTab === tab.key ? tab.activeIcon : tab.icon;
          return (
            <TabMenuHorizontal.Trigger
              key={tab.key}
              value={tab.key}
              className='h-12 gap-1.5 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <TabMenuHorizontal.Icon as={Icon} className='size-5' fill='currentColor' />
              <span>{tab.label}</span>
              {tab.countKey != null && tabCounts[tab.countKey] != null ? (
                <Badge.Root color='green' variant='filled' size='small' className='ml-1'>
                  {tabCounts[tab.countKey]}
                </Badge.Root>
              ) : null}
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

export default CrmLeadDetailTabs;
