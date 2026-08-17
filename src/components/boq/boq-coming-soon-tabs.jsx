import React, { memo } from 'react';

import ComingSoonMessage from '@/components/coming-soon-message';
import { BOQ_TAB_IDS, BOQ_TABS } from '@/components/boq/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const BoqComingSoonTabs = memo(() => {
  return BOQ_TABS.filter(
    (tab) => tab.id !== BOQ_TAB_IDS.BOQ_TEMPLATES && tab.id !== BOQ_TAB_IDS.PROJECT_BOQS,
  ).map((tab) => (
    <TabMenuHorizontal.Content key={tab.id} value={tab.id} className='min-h-0 flex-1 outline-none'>
      <div className='px-8 py-10'>
        <ComingSoonMessage />
      </div>
    </TabMenuHorizontal.Content>
  ));
});

BoqComingSoonTabs.displayName = 'BoqComingSoonTabs';

export default BoqComingSoonTabs;
