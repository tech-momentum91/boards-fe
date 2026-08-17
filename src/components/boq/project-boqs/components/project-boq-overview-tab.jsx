import React, { memo, useEffect, useMemo, useState } from 'react';
import { RiMoneyDollarCircleLine, RiPercentFill, RiRuler2Line } from 'react-icons/ri';

import { fetchProjectBoqOverview } from '@/api/projectBoqs';
import ProjectBoqCostEstimationSidebar from '@/components/boq/project-boqs/components/project-boq-cost-estimation-sidebar';
import ProjectBoqCostEstimationTable from '@/components/boq/project-boqs/components/project-boq-cost-estimation-table';
import ProjectBoqOverviewCompactCostTable from '@/components/boq/project-boqs/components/project-boq-overview-compact-cost-table';
import ProjectBoqOverviewFilterBar from '@/components/boq/project-boqs/components/project-boq-overview-filter-bar';
import ProjectBoqOverviewStatCard from '@/components/boq/project-boqs/components/project-boq-overview-stat-card';
import {
  PROJECT_BOQ_OVERVIEW_FILTER_ALL,
  buildProjectBoqOverviewFilterOptions,
  formatProjectBoqOverviewPercent,
  formatProjectBoqOverviewPerSqft,
  formatProjectBoqOverviewRupee,
  formatProjectBoqOverviewSqft,
  normalizeProjectBoqOverviewResponse,
} from '@/components/boq/project-boqs/components/project-boq-overview-utils';

const EMPTY_OVERVIEW = normalizeProjectBoqOverviewResponse();

const ProjectBoqOverviewTab = memo(
  ({ familyMembers = [], familyCode = '', activeBoqCode = '' }) => {
    const [overviewFilterId, setOverviewFilterId] = useState(PROJECT_BOQ_OVERVIEW_FILTER_ALL);
    const [overviewVersionId, setOverviewVersionId] = useState('');
    const [overviewData, setOverviewData] = useState(EMPTY_OVERVIEW);
    const [isLoadingOverview, setIsLoadingOverview] = useState(false);
    const [overviewLoadError, setOverviewLoadError] = useState('');

    const filterOptions = useMemo(
      () => buildProjectBoqOverviewFilterOptions(familyMembers),
      [familyMembers],
    );

    const overviewScopeCode = familyCode || activeBoqCode;

    useEffect(() => {
      if (!overviewScopeCode) {
        setOverviewData(EMPTY_OVERVIEW);
        setOverviewLoadError('');
        return undefined;
      }

      let cancelled = false;
      setIsLoadingOverview(true);
      setOverviewLoadError('');

      const filterBoqCode =
        overviewFilterId !== PROJECT_BOQ_OVERVIEW_FILTER_ALL ? overviewFilterId : undefined;

      fetchProjectBoqOverview(overviewScopeCode, {
        filterBoqCode,
        filterVersionCode: overviewVersionId || undefined,
      })
        .then((response) => {
          if (cancelled) return;
          setOverviewData(normalizeProjectBoqOverviewResponse(response));
        })
        .catch((error) => {
          if (!cancelled) {
            setOverviewData(EMPTY_OVERVIEW);
            setOverviewLoadError(error?.message || 'Failed to load BOQ overview.');
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoadingOverview(false);
        });

      return () => {
        cancelled = true;
      };
    }, [overviewFilterId, overviewScopeCode, overviewVersionId]);

    const summary = overviewData;
    const showBoqBreakdownInfo = overviewFilterId === PROJECT_BOQ_OVERVIEW_FILTER_ALL;

    return (
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <ProjectBoqOverviewFilterBar
          options={filterOptions}
          activeId={overviewFilterId}
          onChange={(nextFilterId) => {
            setOverviewFilterId(nextFilterId);
            setOverviewVersionId('');
            setOverviewData(EMPTY_OVERVIEW);
            setOverviewLoadError('');
          }}
          versions={
            overviewFilterId === PROJECT_BOQ_OVERVIEW_FILTER_ALL ? [] : overviewData.versionOptions
          }
          activeVersionId={overviewVersionId || overviewData.selectedVersionCode}
          onVersionChange={setOverviewVersionId}
        />

        <div className='flex min-h-0 flex-1 overflow-hidden'>
          <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-8 py-6'>
            {isLoadingOverview ? (
              <div className='flex flex-1 items-center justify-center py-16'>
                <p className='text-paragraph-sm text-text-soft-400'>Loading overview…</p>
              </div>
            ) : overviewLoadError ? (
              <div className='flex flex-1 items-center justify-center py-16'>
                <p className='text-paragraph-sm text-error-base'>{overviewLoadError}</p>
              </div>
            ) : (
              <div className='flex flex-col gap-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                  <ProjectBoqOverviewStatCard
                    tone='pink'
                    value={formatProjectBoqOverviewSqft(summary.totalSqft)}
                    label='Total Sq.ft'
                    icon={RiRuler2Line}
                  />
                  <ProjectBoqOverviewStatCard
                    tone='yellow'
                    value={formatProjectBoqOverviewRupee(summary.buyTotal)}
                    label='Internal Total Cost'
                    icon={RiMoneyDollarCircleLine}
                    showInfo={showBoqBreakdownInfo}
                    infoBreakdown={summary.internalCostBreakdown}
                  />
                  <ProjectBoqOverviewStatCard
                    tone='blue'
                    value={formatProjectBoqOverviewRupee(summary.sellTotal)}
                    label='Client Total Cost'
                    icon={RiMoneyDollarCircleLine}
                    showInfo={showBoqBreakdownInfo}
                    infoBreakdown={summary.clientCostBreakdown}
                  />
                  <ProjectBoqOverviewStatCard
                    tone='purple'
                    value={formatProjectBoqOverviewRupee(summary.marginTotal)}
                    label='Anticipated Margin Cost'
                    icon={RiMoneyDollarCircleLine}
                  />
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                  <ProjectBoqOverviewStatCard
                    tone='teal'
                    value={formatProjectBoqOverviewRupee(summary.designBoqCost)}
                    label='Design BOQ'
                    icon={RiMoneyDollarCircleLine}
                  />
                  <ProjectBoqOverviewStatCard
                    tone='yellow'
                    value={formatProjectBoqOverviewPerSqft(summary.internalCostPerSqft)}
                    label='Internal Sq.ft Cost'
                    icon={RiMoneyDollarCircleLine}
                  />
                  <ProjectBoqOverviewStatCard
                    tone='blue'
                    value={formatProjectBoqOverviewPerSqft(summary.clientCostPerSqft)}
                    label='Client Sq.ft Cost'
                    icon={RiMoneyDollarCircleLine}
                  />
                  <ProjectBoqOverviewStatCard
                    tone='purple'
                    value={formatProjectBoqOverviewPercent(summary.marginPercent)}
                    label='Anticipated Margin'
                    icon={RiPercentFill}
                  />
                </div>

                <ProjectBoqCostEstimationTable
                  title='Master Cost Estimation'
                  rows={summary.categoryRows}
                />

                <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
                  <ProjectBoqOverviewCompactCostTable
                    title='Client Cost Estimation'
                    rows={summary.categoryRows}
                    costPerSqftKey='clientCostPerSqft'
                    totalCostKey='clientTotalCost'
                  />
                  <ProjectBoqOverviewCompactCostTable
                    title='Internal Cost Estimation'
                    rows={summary.categoryRows}
                    costPerSqftKey='internalCostPerSqft'
                    totalCostKey='internalTotalCost'
                  />
                </div>
              </div>
            )}
          </div>

          <ProjectBoqCostEstimationSidebar
            costMarginTarget={summary.costMarginTarget}
            revenueMargin={summary.revenueMargin}
            projectTotalCost={summary.projectTotalCost}
            projectCostPerSqft={summary.projectCostPerSqft}
            differenceCost={summary.differenceCost}
            totalSqft={summary.totalSqft}
          />
        </div>
      </div>
    );
  },
);

ProjectBoqOverviewTab.displayName = 'ProjectBoqOverviewTab';

export default ProjectBoqOverviewTab;
