import React, { useCallback } from 'react';
import { RiCalendarLine, RiMessage2Line, RiThumbUpFill, RiThumbUpLine } from 'react-icons/ri';

import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import SupportIssueStatusDropdown from '@/components/support/support-issue-status-dropdown';
import { getStatusMetaForOption } from '@/components/ticket-management/constants';
import {
  SUPPORT_FEEDBACK_DEFAULT_STATUS,
  SUPPORT_ISSUE_STATUS_META,
} from '@/components/support/support-feedback-constants';
import { useSupportIssueUpvote } from '@/hooks/use-support-issue-upvote';

import { cn } from '@/utils/cn';
import { safeDisplayDateTime } from '@/utils/date-utils';

const statusBadgeColor = (status) =>
  getStatusMetaForOption(
    { value: status || SUPPORT_FEEDBACK_DEFAULT_STATUS },
    SUPPORT_ISSUE_STATUS_META,
  ).color;

const SupportFeedbackCard = ({
  item,
  onOpen,
  onStatusChange,
  statusOptions = [],
  isStatusUpdating = false,
  canChangeStatus = false,
  className,
}) => {
  const preview = item.description?.trim() || 'No description provided.';
  const displayName = item.raisedByName || item.email || 'Unknown';
  const modulesList = Array.isArray(item.modules) ? item.modules.filter(Boolean) : [];
  const moduleBadgeLabel =
    modulesList.length === 0
      ? item.module?.trim() || '—'
      : modulesList.length === 1
        ? modulesList[0]
        : `${modulesList[0]} +${modulesList.length - 1}`;
  const {
    voted: hasUpvoted,
    count: upvoteDisplayCount,
    toggle: toggleUpvote,
  } = useSupportIssueUpvote(item.id, item.userUpvoted, item.upvoteCount ?? 0);

  const handleToggleUpvote = useCallback(
    (event) => {
      event.stopPropagation();
      toggleUpvote();
    },
    [toggleUpvote],
  );

  const commentCount = item.commentCount ?? 0;

  return (
    <div
      onClick={() => onOpen(item)}
      className={cn(
        'flex  w-full relative flex-col shadow-md hover:cursor-pointer gap-3 rounded-xl border border-stroke-soft-200 p-4 text-left transition-colors',
        'hover:border-stroke-soft-300 hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/40',
        className,
      )}
    >
      <div className='flex flex-col gap-1 min-w-0'>
        <div className='w-full flex items-start justify-between gap-2'>
          <span className='text-title-h6 text-text-main-900 line-clamp-2'>{item.title}</span>
          <div
            onClick={(event) => {
              event.stopPropagation();
            }}
            className='shrink-0 max-w-[min(100%,140px)]'
          >
            {canChangeStatus ? (
              <SupportIssueStatusDropdown
                value={item.status || SUPPORT_FEEDBACK_DEFAULT_STATUS}
                onValueChange={(newStatus) => onStatusChange?.(item.id, newStatus)}
                statusOptions={statusOptions}
                disabled={isStatusUpdating}
                size='small'
                className='w-full'
              />
            ) : (
              <Badge.Root variant='light' color={statusBadgeColor(item.status)} size='small'>
                {item.status}
              </Badge.Root>
            )}
          </div>
        </div>
        <span className='text-paragraph-sm text-text-sub-600 line-clamp-3'>{preview}</span>
      </div>

      <div className='flex pb-8 items-center justify-start gap-2'>
        <div className='flex flex-wrap items-center gap-2 min-w-0'>
          <Badge.Root variant='light' color='pink' size='small' className='truncate max-w-[160px]'>
            {moduleBadgeLabel}
          </Badge.Root>
        </div>

        <span className='inline-flex min-w-0 items-center gap-1'>
          <CrmAccountAvatar name={displayName} size={24} className='shrink-0' />
          <span className='truncate text-paragraph-sm text-text-main-900'>{displayName}</span>
        </span>
      </div>

      <div className='absolute px-3 bottom-0 left-0 right-0 w-full flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Button.Root
            onClick={handleToggleUpvote}
            mode='neutral'
            variant='ghost'
            size='xsmall'
            className='gap-2 text-text-sub-500'
          >
            <Button.Icon as={hasUpvoted ? RiThumbUpFill : RiThumbUpLine} />
            {upvoteDisplayCount}
          </Button.Root>

          <Button.Root
            mode='neutral'
            variant='ghost'
            size='xsmall'
            className='gap-2 text-text-sub-500'
            aria-label={`${commentCount} comment${commentCount === 1 ? '' : 's'}`}
          >
            <Button.Icon as={RiMessage2Line} />
            {commentCount}
          </Button.Root>
        </div>

        <span className='inline-flex text-paragraph-xs text-text-sub-500 items-center gap-1'>
          <RiCalendarLine className='size-3.5 shrink-0' />
          {safeDisplayDateTime(item.createdAt) || '—'}
        </span>
      </div>
    </div>
  );
};

export default SupportFeedbackCard;
