import React, { memo } from 'react';

import { PROJECT_BOQ_DETAIL_SECTION_TABS } from '@/components/boq/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const ProjectBoqDetailSectionTabs = memo(() => (
  <TabMenuHorizontal.List
    wrapperClassName='w-full shrink-0'
    className='h-auto min-h-0 gap-6 border-y border-stroke-soft-200 px-8 py-3.5'
  >
    {PROJECT_BOQ_DETAIL_SECTION_TABS.map((tab) => (
      <TabMenuHorizontal.Trigger
        key={tab.id}
        value={tab.id}
        className='h-auto gap-1.5 py-0 text-label-sm data-[state=active]:text-text-main-900'
      >
        <TabMenuHorizontal.Icon as={tab.Icon} className='size-5' />
        {tab.label}
      </TabMenuHorizontal.Trigger>
    ))}
  </TabMenuHorizontal.List>
));

ProjectBoqDetailSectionTabs.displayName = 'ProjectBoqDetailSectionTabs';

export default ProjectBoqDetailSectionTabs;
