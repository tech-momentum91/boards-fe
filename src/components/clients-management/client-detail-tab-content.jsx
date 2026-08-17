import React, { useCallback, useMemo, Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ClientDetailTabs from '@/components/clients-management/client-detail-tabs';
import { CLIENT_DETAIL_TAB_ITEMS } from '@/components/clients-management/client-detail-tab-config';
import { CLIENT_DETAIL_TAB_READ_MODULE } from '@/components/clients-management/constants';
import ComingSoonMessage from '@/components/coming-soon-message';
import {
  usePermittedTabDefs,
  useSyncDetailTabSearchParams,
  tabDefId,
} from '@/hooks/use-detail-tab-permissions';

const VALID_TABS = Object.freeze(CLIENT_DETAIL_TAB_ITEMS.map((t) => t.key));

const ClientDetailAboutTab = lazy(
  () => import('@/components/clients-management/client-detail-about/client-detail-about-tab'),
);
const ClientDetailTicketsTab = lazy(
  () => import('@/components/clients-management/client-detail-tickets/client-detail-tickets-tab'),
);
const ClientDetailOnboardingTab = lazy(
  () =>
    import('@/components/clients-management/client-detail-onboarding/client-detail-onboarding-tab'),
);
const ClientDetailEngagementTab = lazy(
  () =>
    import('@/components/clients-management/client-detail-engagement/client-detail-engagement-tab'),
);
const ClientDetailExitTab = lazy(
  () => import('@/components/clients-management/client-detail-exit/client-detail-exit-tab'),
);
const ClientDetailCsiTab = lazy(
  () => import('@/components/clients-management/client-detail-csi/client-detail-csi-tab'),
);
const ClientDetailAllocateTab = lazy(
  () => import('@/components/clients-management/client-detail-allocate/client-detail-allocate-tab'),
);
const ClientDetailBillingTab = lazy(
  () => import('@/components/clients-management/client-detail-billing/client-detail-billing-tab'),
);
const ClientDetailBookingTab = lazy(
  () => import('@/components/clients-management/client-detail-booking/client-detail-booking-tab'),
);
const ClientDetailCoworkersPage = lazy(
  () =>
    import('@/components/clients-management/client-detail-coworkers/client-detail-coworkers-page'),
);
const ClientDetailCustomVmsTab = lazy(
  () =>
    import('@/components/clients-management/client-detail-custom-vms/client-detail-custom-vms-tab'),
);

/**
 * Isolated tab content that uses URL search params for tab state.
 * This component is the only one that re-renders on tab change,
 * preventing cascade re-renders of PageLayout and Sidebar.
 */
const ClientDetailTabContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'about');

  const permittedTabs = usePermittedTabDefs(CLIENT_DETAIL_TAB_ITEMS, CLIENT_DETAIL_TAB_READ_MODULE);
  const permittedTabIds = useMemo(() => permittedTabs.map((t) => tabDefId(t)), [permittedTabs]);

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
          if (tab !== 'allocate') {
            next.delete('allocateLayout');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const tabPanel = useMemo(() => {
    switch (activeTab) {
      case 'about':
        return <ClientDetailAboutTab />;
      case 'tickets':
        return <ClientDetailTicketsTab />;
      case 'onboarding':
        return <ClientDetailOnboardingTab />;
      case 'engagement':
        return <ClientDetailEngagementTab />;
      case 'exit':
        return <ClientDetailExitTab />;
      case 'billing':
        return <ClientDetailBillingTab />;
      case 'csi':
        return <ClientDetailCsiTab />;
      case 'allocate':
        return <ClientDetailAllocateTab />;
      case 'bookings':
        return <ClientDetailBookingTab />;
      case 'co-worker':
        return <ClientDetailCoworkersPage />;
      case 'custom-vms':
        return <ClientDetailCustomVmsTab />;
      default:
        return (
          <div className='flex flex-1 overflow-hidden'>
            <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
              <ComingSoonMessage />
            </div>
          </div>
        );
    }
  }, [activeTab]);

  return (
    <>
      <ClientDetailTabs activeTab={activeTab} onTabChange={handleTabChange} tabs={permittedTabs} />

      <Suspense
        fallback={
          <div className='flex flex-1 overflow-hidden'>
            <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
              <div className='flex items-center justify-center h-full'>
                <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
              </div>
            </div>
          </div>
        }
      >
        {tabPanel}
      </Suspense>
    </>
  );
};

export default ClientDetailTabContent;
