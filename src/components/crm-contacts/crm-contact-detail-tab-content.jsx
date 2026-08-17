import React, { useCallback, useMemo, useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import CrmContactDetailTabs from './crm-contact-detail-tabs';
import ComingSoonMessage from '@/components/coming-soon-message';
import CrmDetailTasksToolbar from '@/components/crm-tasks/crm-detail-tasks-toolbar';
import { CRM_CONTACT_DETAIL_TAB_READ_MODULE } from '@/components/crm-contacts/constants';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
  useSyncDetailTabSearchParams,
} from '@/hooks/use-detail-tab-permissions';

const CrmEntityActivities = lazy(() => import('@/components/crm-activities/crm-entity-activities'));

const VALID_TABS = Object.freeze(['about', 'tasks', 'account', 'leads', 'proposals', 'activities']);

const CrmContactAboutTab = lazy(() => import('./crm-contact-detail-about/crm-contact-about-tab'));
const CrmContactAccountTab = lazy(() => import('./crm-contact-account-tab'));
const CrmContactLeadsTab = lazy(() => import('./crm-contact-leads-tab'));

const TabLoadingFallback = () => (
  <div className='flex flex-1 overflow-hidden'>
    <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
      <div className='flex items-center justify-center h-full'>
        <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
      </div>
    </div>
  </div>
);

const CrmContactDetailTabContent = ({
  contact,
  onFieldChange,
  onContactUpdated,
  contactOptions = {},
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'about');

  const canReadTab = useCanReadDetailTab(CRM_CONTACT_DETAIL_TAB_READ_MODULE);
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
      <CrmContactDetailTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        permittedTabKeys={permittedTabIds}
      />

      <Suspense fallback={<TabLoadingFallback />}>
        {activeTab === 'about' && (
          <CrmContactAboutTab
            contact={contact}
            onFieldChange={onFieldChange}
            contactOptions={contactOptions}
          />
        )}
        {activeTab === 'tasks' && (
          <div className='flex flex-1 flex-col overflow-hidden bg-white'>
            <CrmDetailTasksToolbar entity={contact} entityType='contact' />
          </div>
        )}
        {activeTab === 'activities' && (
          <div className='flex flex-1 flex-col overflow-hidden bg-white'>
            <CrmEntityActivities activityType='contact' activityId={contact?.name} />
          </div>
        )}
        {activeTab === 'account' && (
          <CrmContactAccountTab contact={contact} onContactUpdated={onContactUpdated} />
        )}
        {activeTab === 'leads' && <CrmContactLeadsTab contact={contact} />}
        {activeTab !== 'about' &&
          activeTab !== 'tasks' &&
          activeTab !== 'activities' &&
          activeTab !== 'account' &&
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

export default CrmContactDetailTabContent;
