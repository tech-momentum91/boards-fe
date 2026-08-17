import React from 'react';
import {
  RiBuilding2Line,
  RiInformation2Fill,
  RiTaskLine,
  RiBuildingLine,
  RiMoneyDollarCircleLine,
  RiFileList2Line,
  RiHistoryLine,
} from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const CP_CONTACT_DETAIL_TAB_DEFS = [
  { key: 'about', label: 'About Contact', icon: RiInformation2Fill },
  { key: 'cpAccount', label: 'CP Account', icon: RiBuilding2Line },
  { key: 'tasks', label: 'Tasks', icon: RiTaskLine },
  { key: 'account', label: 'Account', icon: RiBuildingLine },
  { key: 'leads', label: 'Leads', icon: RiMoneyDollarCircleLine },
  { key: 'proposals', label: 'Proposals', icon: RiFileList2Line },
  { key: 'activities', label: 'Activities', icon: RiHistoryLine },
];

const CpContactDetailTabs = ({ activeTab, onTabChange, permittedTabIds }) => {
  const tabs = CP_CONTACT_DETAIL_TAB_DEFS.filter((tab) => permittedTabIds.includes(tab.key));

  return (
    <TabMenuHorizontal.Root value={activeTab} onValueChange={onTabChange}>
      <TabMenuHorizontal.List wrapperClassName='w-full shrink-0' className='px-4'>
        {tabs.map((tab) => (
          <TabMenuHorizontal.Trigger key={tab.key} value={tab.key}>
            <TabMenuHorizontal.Icon as={tab.icon} />
            {tab.label}
          </TabMenuHorizontal.Trigger>
        ))}
      </TabMenuHorizontal.List>
      {tabs.map((tab) => (
        <TabMenuHorizontal.Content key={tab.key} value={tab.key} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default CpContactDetailTabs;
