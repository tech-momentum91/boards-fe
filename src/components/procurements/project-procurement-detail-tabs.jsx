import React, { memo } from 'react';
import {
  RiBox3Line,
  RiFile3Line,
  RiFileChartLine,
  RiFileCheckLine,
  RiFileList3Line,
  RiFileTextLine,
  RiGroupLine,
  RiInformationLine,
} from 'react-icons/ri';

import { PROJECT_PROCUREMENT_DETAIL_TABS } from '@/components/procurements/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const TAB_ICON_MAP = {
  overview: RiInformationLine,
  'internal-boq': RiFile3Line,
  'purchase-boq': RiFileTextLine,
  packages: RiBox3Line,
  pos: RiFileChartLine,
  vendors: RiGroupLine,
  'billing-qc': RiFileCheckLine,
  'payment-planning': RiFileList3Line,
};

const ProjectProcurementDetailTabs = memo(() => (
  <TabMenuHorizontal.List
    wrapperClassName='w-full shrink-0'
    className='h-auto min-h-0 gap-6 border-y border-stroke-soft-200 px-8 py-3.5'
  >
    {PROJECT_PROCUREMENT_DETAIL_TABS.map((tab) => {
      const Icon = TAB_ICON_MAP[tab.id] ?? RiInformationLine;
      return (
        <TabMenuHorizontal.Trigger
          key={tab.id}
          value={tab.id}
          className='h-auto gap-1.5 py-0 text-label-sm data-[state=active]:text-text-main-900'
        >
          <TabMenuHorizontal.Icon as={Icon} className='size-5' />
          {tab.label}
        </TabMenuHorizontal.Trigger>
      );
    })}
  </TabMenuHorizontal.List>
));

ProjectProcurementDetailTabs.displayName = 'ProjectProcurementDetailTabs';

export default ProjectProcurementDetailTabs;
