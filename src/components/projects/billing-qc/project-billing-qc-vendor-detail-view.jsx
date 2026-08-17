import React, { useCallback, useMemo } from 'react';
import {
  RiArrowLeftSLine,
  RiBuildingLine,
  RiCalendar2Line,
  RiGroupLine,
  RiInformationLine,
  RiListCheck,
  RiMapPinLine,
  RiRuler2Line,
  RiStackLine,
} from 'react-icons/ri';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProjectBillingQcJmrSection from '@/components/projects/billing-qc/project-billing-qc-jmr-section';
import ProjectBillingQcMrSection from '@/components/projects/billing-qc/project-billing-qc-mr-section';
import ComingSoonMessage from '@/components/coming-soon-message';
import { buildProjectDetailHeader } from '@/components/projects/list/project-helpers';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  PROJECT_DETAIL_BILLING_QC_STATUS_META,
  PROJECT_DETAIL_BILLING_QC_VENDOR_TABS,
} from '@/components/projects/constants';
import { cn } from '@/utils/cn';

const VENDOR_TAB_ICON_MAP = {
  'information-line': RiInformationLine,
  'ruler-2-line': RiRuler2Line,
};

function VendorSubHeader({ vendor }) {
  const statusMeta = PROJECT_DETAIL_BILLING_QC_STATUS_META[vendor.status] ?? {
    label: String(vendor.status ?? '').toUpperCase(),
    className: 'bg-bg-weak-100 text-text-sub-500',
  };

  const metaLine = [
    vendor.reference_code,
    vendor.area ? `${vendor.area} Area` : null,
    vendor.submission_date,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className='shrink-0 border-b border-stroke-soft-200 px-8 py-4'>
      <div className='flex flex-col gap-0.5'>
        <div className='flex items-center gap-2'>
          <h2 className='text-label-lg font-medium tracking-[-0.45px] text-text-main-900'>
            {vendor.vendor_name}
          </h2>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.22px] uppercase',
              statusMeta.className,
            )}
          >
            {statusMeta.label}
          </span>
        </div>
        <p className='text-paragraph-xs text-[#737373]'>{metaLine}</p>
      </div>
    </div>
  );
}

export default function ProjectBillingQcVendorDetailView({ projectId, projectDetail, vendor }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const header = useMemo(() => buildProjectDetailHeader(projectDetail), [projectDetail]);

  const activeTab = useMemo(() => {
    const tab = searchParams.get('view');
    if (tab === 'summary') return 'summary';
    if (tab === 'mr') return 'mr';
    return 'jmr';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (nextTab) => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextTab === 'jmr') {
        nextParams.delete('view');
      } else {
        nextParams.set('view', nextTab);
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleBack = useCallback(() => {
    navigate(`/procurements/project-procurements/${encodeURIComponent(projectId)}?tab=billing-qc`);
  }, [navigate, projectId]);

  return (
    <div className='flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 border-b border-stroke-soft-200 px-6 py-5'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex min-w-0 items-center gap-4'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={handleBack}
              aria-label='Back to billing and QC'
            >
              <Button.Icon as={RiArrowLeftSLine} />
            </Button.Root>
            <div className='flex min-w-0 flex-col gap-1.5'>
              <h1 className='truncate text-label-lg font-medium tracking-[-0.27px] text-text-main-900'>
                {header.title}
              </h1>
              <div className='flex flex-wrap items-center gap-2 text-paragraph-sm text-text-sub-500'>
                <Badge.Root
                  variant='light'
                  color={header.stageColor}
                  size='small'
                  className='uppercase'
                >
                  {header.stageBadge}
                </Badge.Root>
                <span className='text-text-soft-400'>•</span>
                <span className='inline-flex items-center gap-1.5 opacity-72'>
                  <RiBuildingLine className='size-5' />
                  {header.locationLabel}
                </span>
                <span className='text-text-soft-400'>•</span>
                <span className='inline-flex items-center gap-1.5 opacity-72'>
                  <RiMapPinLine className='size-5' />
                  {projectDetail?.custom_city || '—'}
                </span>
                <span className='text-text-soft-400'>•</span>
                <span className='inline-flex items-center gap-1.5 opacity-72'>
                  <RiRuler2Line className='size-5' />
                  {header.carpetArea}
                </span>
                <span className='text-text-soft-400'>•</span>
                <span className='inline-flex items-center gap-1.5 opacity-72'>
                  <RiGroupLine className='size-5' />
                  {header.membersLabel}
                </span>
                <button type='button' className='text-label-xs text-primary-base underline'>
                  View All
                </button>
              </div>
            </div>
          </div>

          <ButtonGroup.Root size='xsmall'>
            <ButtonGroup.Item data-state='on'>
              <ButtonGroup.Icon as={RiListCheck} />
            </ButtonGroup.Item>
            <ButtonGroup.Item>
              <ButtonGroup.Icon as={RiCalendar2Line} />
            </ButtonGroup.Item>
            <ButtonGroup.Item>
              <ButtonGroup.Icon as={RiStackLine} />
            </ButtonGroup.Item>
          </ButtonGroup.Root>
        </div>
      </div>

      <VendorSubHeader vendor={vendor} />

      <TabMenuHorizontal.Root
        value={activeTab}
        onValueChange={handleTabChange}
        className='shrink-0'
      >
        <TabMenuHorizontal.List
          wrapperClassName='w-full shrink-0 border-y border-stroke-soft-200'
          className='border-none px-8'
        >
          {PROJECT_DETAIL_BILLING_QC_VENDOR_TABS.map((tab) => {
            const Icon = VENDOR_TAB_ICON_MAP[tab.icon] ?? RiInformationLine;
            return (
              <TabMenuHorizontal.Trigger
                key={tab.id}
                value={tab.id}
                className='gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
              >
                <TabMenuHorizontal.Icon as={Icon} />
                {tab.label}
              </TabMenuHorizontal.Trigger>
            );
          })}
        </TabMenuHorizontal.List>
      </TabMenuHorizontal.Root>

      <div
        className={cn(
          'flex h-0 min-h-0 w-full min-w-0 flex-1 flex-col px-8 py-4',
          activeTab === 'summary' ? 'overflow-y-auto' : 'overflow-hidden',
        )}
      >
        {activeTab === 'mr' ? (
          <ProjectBillingQcMrSection vendorId={vendor.id} />
        ) : activeTab === 'jmr' ? (
          <ProjectBillingQcJmrSection
            vendorId={vendor.id}
            projectId={projectId}
            projectDetail={projectDetail}
          />
        ) : (
          <div className='flex min-h-[50vh] items-center justify-center py-10'>
            <ComingSoonMessage />
          </div>
        )}
      </div>
    </div>
  );
}
