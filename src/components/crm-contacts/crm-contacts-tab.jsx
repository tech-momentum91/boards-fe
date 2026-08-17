import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { CRM_CONTACTS_STATUS_OPTIONS } from './constants';
import { cn } from '@/utils/cn';

const CrmContactsTab = ({ value = 'all', counts = {}, onValueChange }) => {
  return (
    <div className='w-full overflow-x-auto'>
      <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
        <TabMenuHorizontal.List className='gap-6 border-b' wrapperClassName='w-full'>
          {CRM_CONTACTS_STATUS_OPTIONS.map((tab) => {
            const count = counts[tab.value] ?? 0;
            const Icon = tab.icon;
            const isActive = value === tab.value;

            return (
              <TabMenuHorizontal.Trigger
                key={tab.value}
                value={tab.value}
                className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950 flex items-center shrink-0 border-b-2 border-transparent data-[state=active]:border-text-strong-950 rounded-none bg-transparent hover:bg-transparent'
              >
                {Icon && <TabMenuHorizontal.Icon as={Icon} className='size-4' />}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-medium transition-colors',
                    isActive ? 'bg-text-strong-950 text-white' : 'bg-bg-weak-100 text-text-sub-600',
                  )}
                >
                  {count}
                </span>
              </TabMenuHorizontal.Trigger>
            );
          })}
        </TabMenuHorizontal.List>

        {CRM_CONTACTS_STATUS_OPTIONS.map((tab) => (
          <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
            {tab.label}
          </TabMenuHorizontal.Content>
        ))}
      </TabMenuHorizontal.Root>
    </div>
  );
};

export default CrmContactsTab;
