import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import AumAssetPage from '@/components/aum/asset/asset-page';
import AumAssetInPage from '@/components/aum/asset-in/asset-in-page';
import AumAssetOutPage from '@/components/aum/asset-out/asset-out-page';
import MaintenanceSchedulerPage from '@/components/aum/maintenance-scheduler/maintenance-scheduler-page';
import MaintenanceTaskPage from '@/components/aum/maintenance-task/maintenance-task-page';
import PreventiveChecksPage from '@/components/aum/preventive-checks/preventive-checks-page';
import AumTabsList from '@/components/aum/aum-tabs-list';
import { AUM_DEFAULT_ACTIVE_TAB, AUM_TAB_IDS, AUM_TABS } from '@/components/aum/constants';
import ErrorBoundary from '@/components/ui/error-boundary';
import { resetAumAssetList } from '@/redux/aumAssetSlice';
import { resetAssetInList } from '@/redux/aumAssetInSlice';
import { resetAssetOutList } from '@/redux/aumAssetOutSlice';
import { resetMaintenanceTasksList, resetPreventiveChecksList } from '@/redux/aumMaintenanceSlice';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const VALID_AUM_TAB_IDS = new Set(AUM_TABS.map((tab) => tab.id));

function AumTabBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={
        <div className='flex flex-1 items-center justify-center px-8 py-16 text-center text-label-sm text-text-sub-500'>
          Something went wrong loading this tab. Refresh the page or switch tabs and try again.
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

const AumView = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { section } = useParams();
  const activeTab = VALID_AUM_TAB_IDS.has(section) ? section : AUM_DEFAULT_ACTIVE_TAB;
  const [loadedTabs, setLoadedTabs] = useState(() => new Set([activeTab]));

  useEffect(() => {
    if (!section || !VALID_AUM_TAB_IDS.has(section)) {
      navigate(`/aum/${AUM_DEFAULT_ACTIVE_TAB}`, { replace: true });
    }
  }, [navigate, section]);

  useEffect(() => {
    if (
      activeTab !== AUM_TAB_IDS.ASSET &&
      activeTab !== AUM_TAB_IDS.IN &&
      activeTab !== AUM_TAB_IDS.OUT &&
      activeTab !== AUM_TAB_IDS.MAINTENANCE_SCHEDULER &&
      activeTab !== AUM_TAB_IDS.PREVENTIVE_CHECKS &&
      activeTab !== AUM_TAB_IDS.MAINTENANCE_TASK
    ) {
      return;
    }
    setLoadedTabs((previous) => {
      if (previous.has(activeTab)) return previous;
      const next = new Set(previous);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    return () => {
      dispatch(resetAumAssetList());
      dispatch(resetAssetInList());
      dispatch(resetAssetOutList());
      dispatch(resetPreventiveChecksList());
      dispatch(resetMaintenanceTasksList());
    };
  }, [dispatch]);

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    navigate(`/aum/${nextTab}`);
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='min-h-0 flex-1 border-t border-stroke-soft-200 bg-bg-white-0'>
        <TabMenuHorizontal.Root
          value={activeTab}
          onValueChange={handleTabChange}
          className='flex min-h-0 flex-1 flex-col'
        >
          <AumTabsList activeTab={activeTab} />

          {loadedTabs.has(AUM_TAB_IDS.ASSET) ? (
            <AumTabBoundary>
              <AumAssetPage />
            </AumTabBoundary>
          ) : null}
          {loadedTabs.has(AUM_TAB_IDS.IN) ? (
            <AumTabBoundary>
              <AumAssetInPage />
            </AumTabBoundary>
          ) : null}
          {loadedTabs.has(AUM_TAB_IDS.OUT) ? (
            <AumTabBoundary>
              <AumAssetOutPage />
            </AumTabBoundary>
          ) : null}
          {loadedTabs.has(AUM_TAB_IDS.MAINTENANCE_SCHEDULER) ? (
            <AumTabBoundary>
              <MaintenanceSchedulerPage />
            </AumTabBoundary>
          ) : null}
          {loadedTabs.has(AUM_TAB_IDS.PREVENTIVE_CHECKS) ? (
            <AumTabBoundary>
              <PreventiveChecksPage />
            </AumTabBoundary>
          ) : null}
          {loadedTabs.has(AUM_TAB_IDS.MAINTENANCE_TASK) ? (
            <AumTabBoundary>
              <MaintenanceTaskPage />
            </AumTabBoundary>
          ) : null}
        </TabMenuHorizontal.Root>
      </div>
    </div>
  );
};

export default AumView;
