import React, { useCallback, useMemo, useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import CrmAccountDetailTabs from './crm-account-detail-tabs';
import ComingSoonMessage from '@/components/coming-soon-message';
import CrmDetailTasksToolbar from '@/components/crm-tasks/crm-detail-tasks-toolbar';
import { CRM_ACCOUNT_DETAIL_TAB_READ_MODULE } from '@/components/crm-accounts/constants';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
  useSyncDetailTabSearchParams,
} from '@/hooks/use-detail-tab-permissions';

const VALID_TABS = Object.freeze([
  'about',
  'tasks',
  'contacts',
  'leads',
  'proposals',
  'activities',
]);

const CrmAccountAboutTab = lazy(() => import('./crm-account-detail-about/crm-account-about-tab'));
const CrmAccountContactsTab = lazy(() => import('./crm-account-contacts-tab'));
const CrmAccountLeadsTab = lazy(() => import('./crm-account-leads-tab'));
const CrmEntityActivities = lazy(() => import('@/components/crm-activities/crm-entity-activities'));

const TabLoadingFallback = () => (
  <div className='flex flex-1 overflow-hidden'>
    <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
      <div className='flex items-center justify-center h-full'>
        <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
      </div>
    </div>
  </div>
);

const CrmAccountDetailTabContent = ({
  account,
  onFieldChange,
  onAddressUpdate,
  onAddressModalSave,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'about');

  const canReadTab = useCanReadDetailTab(CRM_ACCOUNT_DETAIL_TAB_READ_MODULE);
  const permittedTabIds = useMemo(() => VALID_TABS.filter((id) => canReadTab(id)), [canReadTab]);
  useClampActiveTabToPermitted(activeTab, setActiveTab, permittedTabIds);
  useSyncDetailTabSearchParams({
    validTabs: VALID_TABS,
    defaultTabKey: 'about',
    permittedIds: permittedTabIds,
    searchParams,
    setSearchParams,
    setActiveTab,
  });

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (tab === 'about') {
            next.delete('tab');
          } else {
            next.set('tab', tab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <>
      <CrmAccountDetailTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        permittedTabKeys={permittedTabIds}
      />

      <Suspense fallback={<TabLoadingFallback />}>
        {activeTab === 'about' && (
          <CrmAccountAboutTab
            account={account}
            onFieldChange={onFieldChange}
            onAddressUpdate={onAddressUpdate}
            onAddressModalSave={onAddressModalSave}
            onAddBank={onAddBank}
            onUpdateBank={onUpdateBank}
            onDeleteBank={onDeleteBank}
          />
        )}
        {activeTab === 'activities' && (
          <div className='flex flex-1 flex-col overflow-hidden bg-white'>
            <CrmEntityActivities activityType='account' activityId={account?.name} />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className='flex flex-1 flex-col overflow-hidden bg-white'>
            <CrmDetailTasksToolbar entity={account} entityType='account' />
          </div>
        )}
        {activeTab === 'contacts' && <CrmAccountContactsTab account={account} />}
        {activeTab === 'leads' && <CrmAccountLeadsTab account={account} />}
        {activeTab !== 'about' &&
          activeTab !== 'activities' &&
          activeTab !== 'tasks' &&
          activeTab !== 'contacts' &&
          activeTab !== 'leads' && (
            <div className='flex flex-1 overflow-hidden'>
              <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
                <ComingSoonMessage />
              </div>
            </div>
          )}
      </Suspense>
    </>
  );
};

export default CrmAccountDetailTabContent;
