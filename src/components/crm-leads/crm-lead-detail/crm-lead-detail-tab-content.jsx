import React, { useCallback, useMemo, useState, Suspense, lazy } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import CrmLeadDetailTabs from './crm-lead-detail-tabs';
import ComingSoonMessage from '@/components/coming-soon-message';

import CrmDetailTasksToolbar from '@/components/crm-tasks/crm-detail-tasks-toolbar';
import { CRM_LEAD_DETAIL_TAB_READ_MODULE } from '@/components/crm-leads/constants';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
  useSyncDetailTabSearchParams,
} from '@/hooks/use-detail-tab-permissions';

const CrmEntityActivities = lazy(() => import('@/components/crm-activities/crm-entity-activities'));

const VALID_TABS = Object.freeze([
  'about',
  'tasks',
  'contacts',
  'account',
  'suggested-inventory',
  'proposals',
  'activities',
]);

const CrmLeadAboutTab = lazy(() => import('./crm-lead-about/crm-lead-about-tab'));
const CrmLeadAccountTab = lazy(() => import('./crm-lead-account-tab'));
const CrmLeadContactTab = lazy(() => import('./crm-lead-contact-tab'));
const CrmLeadSuggestedInventoryTab = lazy(
  () => import('../crm-lead-suggested-inventory/crm-lead-suggested-inventory-tab'),
);
const CrmLeadProposalsTab = lazy(() => import('./crm-lead-proposals-tab'));

const TabLoadingFallback = () => (
  <div className='flex flex-1 overflow-hidden'>
    <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
      <div className='flex h-full items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary-base border-t-transparent' />
      </div>
    </div>
  </div>
);

const CrmLeadDetailTabContent = ({
  lead,
  onFieldChange,
  onBatchFieldChange,
  onLeadUpdated,
  isSaving,
  isSavingContacts = false,
}) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'about');
  const [suggestedInventoryCount, setSuggestedInventoryCount] = useState(null);

  const canReadTab = useCanReadDetailTab(CRM_LEAD_DETAIL_TAB_READ_MODULE);
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
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === 'about') {
            next.delete('tab');
          } else {
            next.set('tab', tab);
          }
          return next;
        },
        { replace: true, state: location.state },
      );
    },
    [location.state, setSearchParams],
  );

  return (
    <>
      <CrmLeadDetailTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        permittedTabKeys={permittedTabIds}
        tabCounts={
          suggestedInventoryCount == null ? {} : { suggestedInventory: suggestedInventoryCount }
        }
      />

      <Suspense fallback={<TabLoadingFallback />}>
        {activeTab === 'about' && (
          <CrmLeadAboutTab
            lead={lead}
            onFieldChange={onFieldChange}
            onBatchFieldChange={onBatchFieldChange}
            isSaving={isSaving}
            isSavingContacts={isSavingContacts}
          />
        )}
        {activeTab === 'tasks' && (
          <div className='flex flex-1 flex-col overflow-hidden bg-white'>
            <CrmDetailTasksToolbar entity={lead} entityType='lead' />
          </div>
        )}
        {activeTab === 'activities' && (
          <div className='flex flex-1 flex-col overflow-hidden bg-white'>
            <CrmEntityActivities activityType='lead' activityId={lead?.name} />
          </div>
        )}
        {activeTab === 'account' && <CrmLeadAccountTab lead={lead} onLeadUpdated={onLeadUpdated} />}
        {activeTab === 'contacts' && (
          <CrmLeadContactTab lead={lead} onLeadUpdated={onLeadUpdated} />
        )}
        {activeTab === 'suggested-inventory' && (
          <CrmLeadSuggestedInventoryTab
            lead={lead}
            onInventoryCountChange={setSuggestedInventoryCount}
          />
        )}
        {activeTab === 'proposals' && <CrmLeadProposalsTab lead={lead} />}
        {activeTab !== 'about' &&
          activeTab !== 'tasks' &&
          activeTab !== 'activities' &&
          activeTab !== 'account' &&
          activeTab !== 'contacts' &&
          activeTab !== 'suggested-inventory' &&
          activeTab !== 'proposals' && (
            <div className='flex flex-1 overflow-hidden'>
              <div className='flex min-w-0 flex-1 flex-col overflow-y-auto bg-white'>
                <ComingSoonMessage />
              </div>
            </div>
          )}
      </Suspense>
    </>
  );
};

export default CrmLeadDetailTabContent;
