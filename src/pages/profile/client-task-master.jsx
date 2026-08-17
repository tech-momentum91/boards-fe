import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import ClientOnboarding from './client-onboarding';
import ClientEngagement from './client-engagement';
import ClientExit from './client-exit';

const CLIENT_TASK_TABS = [
  { id: 'onboarding', label: 'Client Onboarding' },
  { id: 'engagement', label: 'Client Engagement' },
  { id: 'exit', label: 'Client Exit' },
];

const VALID_TAB_IDS = new Set(CLIENT_TASK_TABS.map((t) => t.id));

function getTabFromSearchParams(searchParams) {
  const id = (searchParams.get('tab') || '').toLowerCase();
  return VALID_TAB_IDS.has(id) ? id : 'onboarding';
}

const ClientTaskMaster = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParameter = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => getTabFromSearchParams(searchParams));

  // Sync tab with URL ?tab=: when param changes (e.g. back/forward) sync state
  useEffect(() => {
    const id = getTabFromSearchParams(searchParams);
    setActiveTab(id);
  }, [tabParameter, searchParams]);

  const handleTabChange = useCallback(
    (value) => {
      setActiveTab(value);
      setSearchParams({ tab: value });
    },
    [setSearchParams],
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding':
        return <ClientOnboarding />;
      case 'engagement':
        return <ClientEngagement />;
      case 'exit':
        return <ClientExit />;
      default:
        return <ClientOnboarding />;
    }
  };

  return (
    <div className='w-full flex flex-col gap-6'>
      <div className='w-full'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={handleTabChange}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none h-12 gap-6'
          >
            {CLIENT_TASK_TABS.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>
      </div>

      <div className='w-full'>{renderContent()}</div>
    </div>
  );
};

export default ClientTaskMaster;
// ferbfeg
