import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import BoqComingSoonTabs from '@/components/boq/boq-coming-soon-tabs';
import BoqTabsList from '@/components/boq/boq-tabs-list';
import { BOQ_DEFAULT_ACTIVE_TAB, BOQ_TAB_IDS, BOQ_TABS } from '@/components/boq/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const BoqTemplates = React.lazy(() => import('@/components/boq/boq-templates'));
const ProjectBoqs = React.lazy(() => import('@/components/boq/project-boqs'));

const LAZY_BOQ_TAB_IDS = new Set([BOQ_TAB_IDS.BOQ_TEMPLATES, BOQ_TAB_IDS.PROJECT_BOQS]);
const VALID_BOQ_TAB_IDS = new Set(BOQ_TABS.map((tab) => tab.id));

const BoqTabLoading = ({ value }) => (
  <TabMenuHorizontal.Content value={value} className='min-h-0 flex-1 outline-none'>
    <div className='flex min-h-0 flex-1 items-center justify-center px-8 py-10'>
      <span className='paragraph-small text-text-sub-600'>Loading BOQ section...</span>
    </div>
  </TabMenuHorizontal.Content>
);

const BoqView = () => {
  const navigate = useNavigate();
  const { section } = useParams();
  const activeTab = VALID_BOQ_TAB_IDS.has(section) ? section : BOQ_DEFAULT_ACTIVE_TAB;
  const [loadedTabs, setLoadedTabs] = useState(() => new Set([activeTab]));

  useEffect(() => {
    if (section && !VALID_BOQ_TAB_IDS.has(section)) {
      navigate(`/boq/${BOQ_DEFAULT_ACTIVE_TAB}`, { replace: true });
    }
  }, [navigate, section]);

  useEffect(() => {
    if (!LAZY_BOQ_TAB_IDS.has(activeTab)) return;
    setLoadedTabs((previous) => {
      if (previous.has(activeTab)) return previous;
      const next = new Set(previous);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    navigate(`/boq/${nextTab}`);
  };

  return (
    <div className='flex w-full flex-1 flex-col'>
      <div className='w-full flex-1 border-t border-stroke-soft-200 bg-bg-white-0'>
        <TabMenuHorizontal.Root
          value={activeTab}
          onValueChange={handleTabChange}
          className='boq-module-tabs flex w-full flex-col [&_.group\\/tab-list>div:last-child]:!bg-[#16a34a]'
        >
          <BoqTabsList activeTab={activeTab} />

          <Suspense fallback={<BoqTabLoading value={activeTab} />}>
            {loadedTabs.has(BOQ_TAB_IDS.BOQ_TEMPLATES) ? (
              <BoqTemplates isActive={activeTab === BOQ_TAB_IDS.BOQ_TEMPLATES} />
            ) : null}
            {loadedTabs.has(BOQ_TAB_IDS.PROJECT_BOQS) ? (
              <ProjectBoqs isActive={activeTab === BOQ_TAB_IDS.PROJECT_BOQS} />
            ) : null}
          </Suspense>

          <BoqComingSoonTabs />
        </TabMenuHorizontal.Root>
      </div>
    </div>
  );
};

export default BoqView;
