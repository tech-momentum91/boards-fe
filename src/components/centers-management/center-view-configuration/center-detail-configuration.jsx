import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import {
  RiArrowRightSLine,
  RiTimer2Fill,
  RiMoneyDollarCircleFill,
  RiGroupFill,
} from 'react-icons/ri';
import CenterDetailConfigurationTracker from './center-detail-configuration-tracker';
import CenterDetailConfigurationPricing from './center-detail-configuration-pricing';
import CenterDetailConfigurationTeams from './center-detail-configuration-teams';

const sidebarItems = [
  { key: 'tracker', label: 'Tracker', icon: RiTimer2Fill },
  { key: 'pricing', label: 'Pricing', icon: RiMoneyDollarCircleFill },
  { key: 'teams', label: 'Teams', icon: RiGroupFill },
];

const LeftSidebar = ({ activeTab, onTabChange }) => {
  return (
    <div className='w-[240px] bg-bg-weak-100 h-full flex shrink-0'>
      <TabMenuVertical.Root
        value={activeTab}
        onValueChange={onTabChange}
        className='flex flex-col w-full'
      >
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
    </div>
  );
};

const CenterDetailConfiguration = ({ centerId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSubtab = searchParams.get('subtab') || 'tracker';
  const [activeTab, setActiveTab] = useState(initialSubtab);

  useEffect(() => {
    const subtabParam = searchParams.get('subtab');
    if (subtabParam && ['tracker', 'pricing', 'teams'].includes(subtabParam)) {
      setActiveTab(subtabParam);
    }
  }, [searchParams]);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'configuration');
        next.set('subtab', nextTab);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className='flex h-full min-h-0 w-full'>
      <LeftSidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className='flex-1 min-h-0 min-w-0 overflow-y-auto p-6'>
        {activeTab === 'tracker' && <CenterDetailConfigurationTracker centerId={centerId} />}
        {activeTab === 'pricing' && <CenterDetailConfigurationPricing centerId={centerId} />}
        {activeTab === 'teams' && <CenterDetailConfigurationTeams centerId={centerId} />}
      </div>
    </div>
  );
};

export default CenterDetailConfiguration;
