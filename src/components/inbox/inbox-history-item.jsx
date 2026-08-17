/**
 * Inbox activity row — same visual pattern as CRM task history (crm-task-history-item):
 * avatar + name tooltip, segmented action with priority/status pills from ActivityActionDisplay.
 */
import React from 'react';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { ActivityActionDisplay } from '@/components/crm-accounts/crm-account-activities/activity-action-display';
import { safeDisplayDateTime } from '@/utils/date-utils';

const InboxHistoryItem = ({ historyItem, isLast = false }) => {
  const { action, field, creation, user, owner } = historyItem;
  const userName = user?.name ?? user?.email ?? owner ?? 'Unknown';
  const userEmail = user?.email ?? '';
  const userImage = user?.image ?? user?.user_image ?? null;

  const userChip = (
    <span className='inline-flex items-center gap-1.5 shrink-0'>
      <CrmAccountAvatar name={userName} image={userImage} size={24} className='shrink-0' />
      <span className='text-text-strong-950 font-medium'>{userName}</span>
    </span>
  );

  return (
    <div className='relative flex items-center gap-2.5 py-0 z-10'>
      <div className='shrink-0 w-1.5 h-4 flex items-center justify-center'>
        <div className='w-1.5 h-1.5 rounded-full bg-stroke-soft-200' />
      </div>

      <div className='flex-1 min-w-0 flex items-center justify-between gap-3 paragraph-xsmall'>
        <div className='flex-1 min-w-0 flex items-center gap-1.5 flex-wrap'>
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className='cursor-default shrink-0 inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity'>
                  {userChip}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content size='medium' variant='light' side='top' className='max-w-[220px]'>
                <div className='flex flex-col gap-2 py-1'>
                  <div className='flex items-center gap-2'>
                    <CrmAccountAvatar
                      name={userName}
                      image={userImage}
                      size={24}
                      className='shrink-0'
                    />
                    <div className='flex flex-col min-w-0'>
                      <span className='text-label-sm font-semibold text-text-main-900 truncate'>
                        {userName}
                      </span>
                      {userEmail && (
                        <span className='text-paragraph-xs text-text-sub-500 truncate'>
                          {userEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
          <ActivityActionDisplay action={action} field={field} className='text-text-sub-500' />
        </div>
        <span className='text-text-sub-500 whitespace-nowrap shrink-0'>
          {safeDisplayDateTime(creation)}
        </span>
      </div>
    </div>
  );
};

export default InboxHistoryItem;
