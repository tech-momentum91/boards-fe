import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  PROJECT_PROCUREMENT_DETAIL_DEFAULT_TAB,
  PROJECT_PROCUREMENT_DETAIL_TAB_IDS,
} from '@/components/procurements/constants';
import ProjectProcurementDetailHeader from '@/components/procurements/project-procurement-detail-header';
import ProjectProcurementDetailStatCards from '@/components/procurements/project-procurement-detail-stat-cards';
import ProjectProcurementDetailTabs from '@/components/procurements/project-procurement-detail-tabs';
import ProjectProcurementInternalBoqTab from '@/components/procurements/project-procurement-internal-boq-tab';
import ProjectProcurementPackagesTab from '@/components/procurements/project-procurement-packages-tab';
import ProjectProcurementPaymentPlanningTab from '@/components/procurements/project-procurement-payment-planning-tab';
import ProjectProcurementPosTab from '@/components/procurements/project-procurement-pos-tab';
import ProjectProcurementPurchaseBoqTab from '@/components/procurements/project-procurement-purchase-boq-tab';
import ProjectProcurementVendorsTab from '@/components/procurements/project-procurement-vendors-tab';
import ComingSoonMessage from '@/components/coming-soon-message';
import { ProjectBillingQcSection } from '@/components/projects';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const PLACEHOLDER_TAB_IDS = [PROJECT_PROCUREMENT_DETAIL_TAB_IDS.OVERVIEW];

export default function ProjectProcurementDetailView({ project }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPackage, setSelectedPackage] = useState(null);

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab');
    if (tab && Object.values(PROJECT_PROCUREMENT_DETAIL_TAB_IDS).includes(tab)) {
      return tab;
    }
    return PROJECT_PROCUREMENT_DETAIL_DEFAULT_TAB;
  }, [searchParams]);

  const selectedPoId = useMemo(() => {
    if (activeTab !== PROJECT_PROCUREMENT_DETAIL_TAB_IDS.POS) return null;
    const poId = searchParams.get('po')?.trim();
    return poId || null;
  }, [activeTab, searchParams]);

  const isPackageDetailOpen =
    activeTab === PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PACKAGES && Boolean(selectedPackage);
  const isPoDetailOpen =
    activeTab === PROJECT_PROCUREMENT_DETAIL_TAB_IDS.POS && Boolean(selectedPoId);
  const isNestedDetailOpen = isPackageDetailOpen || isPoDetailOpen;

  const handleTabChange = useCallback(
    (nextTab) => {
      setSearchParams(
        (current) => {
          const nextParams = new URLSearchParams(current);
          if (nextTab === PROJECT_PROCUREMENT_DETAIL_DEFAULT_TAB) {
            nextParams.delete('tab');
          } else {
            nextParams.set('tab', nextTab);
          }

          if (nextTab !== PROJECT_PROCUREMENT_DETAIL_TAB_IDS.POS) {
            nextParams.delete('po');
          }

          return nextParams;
        },
        { replace: true },
      );

      if (nextTab !== PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PACKAGES) {
        setSelectedPackage(null);
      }
    },
    [setSearchParams],
  );

  const handleBack = useCallback(() => {
    navigate('/procurements/project-procurements');
  }, [navigate]);

  const handleSelectPackage = useCallback((packageRow) => {
    setSelectedPackage(packageRow);
  }, []);

  const handleSelectPo = useCallback(
    (poRow) => {
      setSearchParams(
        (current) => {
          const nextParams = new URLSearchParams(current);
          nextParams.set('tab', PROJECT_PROCUREMENT_DETAIL_TAB_IDS.POS);
          const poId = poRow?.id ?? poRow?.po_number ?? '';
          if (poId) {
            nextParams.set('po', String(poId));
          } else {
            nextParams.delete('po');
          }
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ProjectProcurementDetailHeader
        title={project?.name}
        stage={project?.stage}
        city={project?.city}
        onBack={handleBack}
      />

      <TabMenuHorizontal.Root
        value={activeTab}
        onValueChange={handleTabChange}
        className='flex min-h-0 flex-1 flex-col'
      >
        <ProjectProcurementDetailTabs />

        <div
          className={
            isPoDetailOpen
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-8 pb-8 pt-5'
          }
        >
          {!isNestedDetailOpen ? (
            <div className='shrink-0'>
              <ProjectProcurementDetailStatCards project={project} activeTab={activeTab} />
            </div>
          ) : null}

          <TabMenuHorizontal.Content
            value={PROJECT_PROCUREMENT_DETAIL_TAB_IDS.INTERNAL_BOQ}
            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
          >
            <ProjectProcurementInternalBoqTab project={project} />
          </TabMenuHorizontal.Content>

          <TabMenuHorizontal.Content
            value={PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PURCHASE_BOQ}
            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
          >
            <ProjectProcurementPurchaseBoqTab project={project} />
          </TabMenuHorizontal.Content>

          <TabMenuHorizontal.Content
            value={PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PACKAGES}
            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
          >
            <ProjectProcurementPackagesTab
              project={project}
              selectedPackage={selectedPackage}
              onSelectPackage={handleSelectPackage}
            />
          </TabMenuHorizontal.Content>

          <TabMenuHorizontal.Content
            value={PROJECT_PROCUREMENT_DETAIL_TAB_IDS.POS}
            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
          >
            <ProjectProcurementPosTab
              project={project}
              selectedPoId={selectedPoId}
              onSelectPo={handleSelectPo}
            />
          </TabMenuHorizontal.Content>

          <TabMenuHorizontal.Content
            value={PROJECT_PROCUREMENT_DETAIL_TAB_IDS.VENDORS}
            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
          >
            <ProjectProcurementVendorsTab projectId={project?.id ?? project?.name} />
          </TabMenuHorizontal.Content>

          <TabMenuHorizontal.Content
            value={PROJECT_PROCUREMENT_DETAIL_TAB_IDS.BILLING_QC}
            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
          >
            <ProjectBillingQcSection projectId={project?.id ?? project?.name} />
          </TabMenuHorizontal.Content>

          <TabMenuHorizontal.Content
            value={PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PAYMENT_PLANNING}
            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
          >
            <ProjectProcurementPaymentPlanningTab projectId={project?.id ?? project?.name} />
          </TabMenuHorizontal.Content>

          {PLACEHOLDER_TAB_IDS.map((tabId) => (
            <TabMenuHorizontal.Content
              key={tabId}
              value={tabId}
              className='min-h-0 flex-1 overflow-y-auto outline-none data-[state=inactive]:hidden'
            >
              <div className='flex min-h-[50vh] items-center justify-center py-10'>
                <ComingSoonMessage />
              </div>
            </TabMenuHorizontal.Content>
          ))}
        </div>
      </TabMenuHorizontal.Root>
    </div>
  );
}
