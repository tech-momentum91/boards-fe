import React, { useCallback, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import ProjectOrderCategoryTab from '@/pages/profile/project-master/project-order-category-tab';
import ProjectSelectionCategoryTab from '@/pages/profile/project-master/project-selection-category-tab';
import ProjectTaskStatusTab from '@/pages/profile/project-master/project-task-status-tab';
import {
  loadPersistedSelectionStatuses,
  persistSelectionStatuses,
  PROJECT_ORDER_SELECTION_TABS,
} from '@/pages/profile/project-master/project-master.constants';

export default function ProjectOrderSelectionMaster({ onOrderSelectionClick }) {
  const [activeTab, setActiveTab] = useState('OrderCategory');
  const [statuses, setStatuses] = useState(() => loadPersistedSelectionStatuses());

  const updateStatuses = useCallback((updater) => {
    setStatuses((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistSelectionStatuses(next);
      return next;
    });
  }, []);

  return (
    <div className='flex w-full flex-col'>
      <div className='flex items-center gap-2 border-b border-stroke-soft-200 pb-2'>
        <button
          type='button'
          onClick={onOrderSelectionClick}
          className='text-label-sm text-text-sub-500 hover:text-text-strong-950'
        >
          Projects Master
        </button>
        <RiArrowRightSLine className='size-4 text-text-sub-500' />
        <div className='text-label-sm text-text-strong-950'>Order &amp; Selection</div>
      </div>

      <section className='flex flex-col gap-5'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none'
          >
            {PROJECT_ORDER_SELECTION_TABS.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>

        {activeTab === 'OrderCategory' ? (
          <ProjectOrderCategoryTab />
        ) : activeTab === 'SelectionCategory' ? (
          <ProjectSelectionCategoryTab />
        ) : (
          <ProjectTaskStatusTab
            title='Selection Statuses'
            subtitle='Create and manage selection statuses'
            statuses={statuses}
            onToggle={(statusId, enabled) => {
              updateStatuses((prev) =>
                prev.map((status) => (status.id === statusId ? { ...status, enabled } : status)),
              );
            }}
            onDelete={(statusId) => {
              updateStatuses((prev) => prev.filter((status) => status.id !== statusId));
            }}
            onAddStatus={() => {
              updateStatuses((prev) => [
                ...prev,
                {
                  id: `selection-status-${Date.now()}`,
                  label: `Status ${prev.length + 1}`,
                  color: 'bg-blue-base',
                  enabled: true,
                },
              ]);
            }}
          />
        )}
      </section>
    </div>
  );
}
