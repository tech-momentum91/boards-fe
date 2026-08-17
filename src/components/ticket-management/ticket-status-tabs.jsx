import React from 'react';
import { RiErrorWarningLine, RiTeamLine, RiTicketLine } from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

/**
 * List-level tabs: All, Incident-only, Requires RM. HD ticket statuses are not listed here;
 * they come from Status Configuration via filters / table status controls.
 */
export const STATUS_TAB_OPTIONS = [
  { value: 'all', label: 'All', icon: RiTicketLine },
  { value: 'Incident', label: 'Incident', icon: RiErrorWarningLine },
  { value: 'requires_rm', label: 'Requires RM', icon: RiTeamLine },
];

const TicketStatusTabs = ({ value = 'all', counts = {}, onValueChange, hideBorderTop = false }) => {
  const safeValue = STATUS_TAB_OPTIONS.some((tab) => tab.value === value) ? value : 'all';

  return (
    <TabMenuHorizontal.Root value={safeValue} onValueChange={onValueChange} className=''>
      <TabMenuHorizontal.List
        className={`gap-6 ${hideBorderTop ? 'border-t-0' : ''}`}
        wrapperClassName='w-full '
      >
        {STATUS_TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.value] ?? 0;

          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='group h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <TabMenuHorizontal.Icon as={Icon} className='size-4' />
              <span>{tab.label}</span>
              <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 group-data-[state=active]:bg-green-500 group-data-[state=active]:text-white group-data-[state=active]:font-semibold'>
                {count ?? 0}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {STATUS_TAB_OPTIONS.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default TicketStatusTabs;
