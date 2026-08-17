/**
 * CRM Task History Item — for task comment section (account/contact/lead tasks).
 * Uses dynamic action parsing (same as account activities).
 * User visible by default; hover on user name shows user card (name only).
 * Keeps the same compact gap as task comment section.
 */
import React from 'react';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { ActivityActionDisplay } from '@/components/crm-accounts/crm-account-activities/activity-action-display';
import { activityUserDisplayName } from '@/utils/activity-user-display-name';
import { safeDisplayDateTime } from '@/utils/date-utils';
import LayoutVersionBadge from '@/components/ui/layout-version-badge';

const CrmTaskHistoryItem = ({ historyItem, isLast = false }) => {
  const {
    action,
    field,
    creation,
    user,
    owner,
    layout_display_version: layoutVersion,
  } = historyItem;
  const userName = activityUserDisplayName(user, owner);

  const userImage = user?.image ?? user?.user_image ?? null;

  const userChip = (
    <span className='inline-flex items-center gap-1.5 shrink-0'>
      <CrmAccountAvatar name={userName} image={userImage} size={24} className='shrink-0' />
      <span className='text-text-strong-950 font-medium'>{userName}</span>
    </span>
  );

  return (
    <div className='relative flex items-center gap-2.5 py-0 z-10'>
      {/* Dot - same as HistoryItem */}
      <div className='shrink-0 w-1.5 h-4 flex items-center justify-center'>
        <div className='w-1.5 h-1.5 rounded-full bg-stroke-soft-200' />
      </div>

      {/* Content - user visible by default, action with dynamic parsing */}
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
                    <div className='flex min-w-0 flex-col'>
                      <span className='truncate text-label-sm font-semibold text-text-main-900'>
                        {userName}
                      </span>
                    </div>
                  </div>
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
          <ActivityActionDisplay action={action} field={field} className='text-text-sub-500' />
          <LayoutVersionBadge version={layoutVersion} />
        </div>
        <span className='text-text-sub-500 whitespace-nowrap shrink-0'>
          {safeDisplayDateTime(creation)}
        </span>
      </div>
    </div>
  );
};

export default CrmTaskHistoryItem;
