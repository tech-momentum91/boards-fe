import React, { memo, useMemo } from 'react';
import { RiBox3Line, RiFileChartLine, RiMoneyDollarCircleLine } from 'react-icons/ri';

import { PROJECT_PROCUREMENT_DETAIL_TAB_IDS } from '@/components/procurements/constants';
import ProjectProcurementsStatCard from '@/components/procurements/project-procurements-stat-card';
import {
  buildProjectProcurementInternalBoqStats,
  buildProjectProcurementPurchaseBoqStats,
} from '@/components/procurements/project-procurements-utils';

const ICON_MAP = {
  money: RiMoneyDollarCircleLine,
  chart: RiFileChartLine,
  box: RiBox3Line,
};

const STAT_BUILDERS = {
  [PROJECT_PROCUREMENT_DETAIL_TAB_IDS.INTERNAL_BOQ]: buildProjectProcurementInternalBoqStats,
  [PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PURCHASE_BOQ]: buildProjectProcurementPurchaseBoqStats,
};

const ProjectProcurementDetailStatCards = memo(({ project, activeTab }) => {
  const stats = useMemo(() => {
    const buildStats = STAT_BUILDERS[activeTab];
    return buildStats ? buildStats(project) : [];
  }, [activeTab, project]);

  if (stats.length === 0) return null;

  return (
    <div className='flex w-full min-w-0 items-center gap-4 overflow-x-auto'>
      {stats.map(({ value, label, tone, icon }) => (
        <ProjectProcurementsStatCard
          key={label}
          value={value}
          label={label}
          tone={tone}
          icon={ICON_MAP[icon]}
          className='min-w-[140px]'
        />
      ))}
    </div>
  );
});

ProjectProcurementDetailStatCards.displayName = 'ProjectProcurementDetailStatCards';

export default ProjectProcurementDetailStatCards;
