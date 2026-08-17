import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
const DEFAULT_EVENT_STATUS_TABS = [{ value: 'all', label: 'All' }];

/**
 * Reusable status filter tab bar for all Events sub-modules (micro, external, community).
 * Uses the shared horizontal tab UI; active tab uses green accent, inactive grey.
 *
 * @param {string} value - Current selected tab value (e.g. 'all', 'exploration')
 * @param {function} onValueChange - (value) => void
 * @param {object} counts - { [tabValue]: number } for badge counts
 */
const EventStatusTabs = ({ value = 'all', onValueChange, counts = {}, tabs: tabsProp }) => {
  const tabs = tabsProp?.length ? tabsProp : DEFAULT_EVENT_STATUS_TABS;

  return (
    <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
      <TabMenuHorizontal.List
        className='gap-6 border-t-1 border-b border-stroke-soft-200'
        wrapperClassName='w-full'
      >
        {tabs.map((tab) => {
          const count = counts[tab.value] ?? 0;
          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-500 data-[state=active]:text-primary-base'
            >
              <span>{tab.label}</span>
              <span
                className={
                  'inline-flex min-w-[20px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] ' +
                  'bg-bg-weak-100 text-text-sub-500 ' +
                  'group-data-[state=active]/tab-item:bg-primary-base group-data-[state=active]/tab-item:text-white'
                }
              >
                {count}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {tabs.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default EventStatusTabs;
