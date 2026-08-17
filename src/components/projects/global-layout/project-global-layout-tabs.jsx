import React from 'react';

import { PROJECT_GLOBAL_LAYOUT_TABS } from '@/components/projects/global-layout/project-global-layout-task-icons';
import ProjectGlobalLayoutStatusFilter from '@/components/projects/global-layout/project-global-layout-status-filter';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

export default function ProjectGlobalLayoutTabs({
  activeTabId = 'all',
  onTabChange,
  statusFiltersByTaskType = {},
  onStatusFiltersApply,
  disabled = false,
}) {
  return (
    <TabMenuHorizontal.Root value={activeTabId} onValueChange={onTabChange}>
      <TabMenuHorizontal.List
        wrapperClassName='w-full shrink-0 border-b border-stroke-soft-200'
        className='border-none px-6'
      >
        {PROJECT_GLOBAL_LAYOUT_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabMenuHorizontal.Trigger key={tab.id} value={tab.id} disabled={disabled}>
              <TabMenuHorizontal.Icon as={Icon} />
              {tab.label}
            </TabMenuHorizontal.Trigger>
          );
        })}

        <ProjectGlobalLayoutStatusFilter
          activeTabId={activeTabId}
          statusFiltersByTaskType={statusFiltersByTaskType}
          onStatusFiltersApply={onStatusFiltersApply}
          disabled={disabled}
        />
      </TabMenuHorizontal.List>
    </TabMenuHorizontal.Root>
  );
}
