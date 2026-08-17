import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiArrowUpLine,
  RiAttachment2,
  RiCalendarLine,
  RiCloseLine,
  RiFlagLine,
  RiMailLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiThumbUpFill,
  RiThumbUpLine,
  RiUserLine,
} from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import AttachmentList from '@/components/ui/attachment-list';
import FieldRow from '@/components/ui/field-row';
import { StatusDropdown } from '@/components/ui/status-dropdown';
import SupportIssueStatusDropdown from '@/components/support/support-issue-status-dropdown';
import SupportIssueComments from '@/components/support/support-issue-comments';
import { cn } from '@/utils/cn';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { getSupportIssueDetail } from '@/api/support';
import { useSupportIssueUpvote } from '@/hooks/use-support-issue-upvote';
import { getStatusMetaForOption } from '../ticket-management';
import {
  SUPPORT_FEEDBACK_DEFAULT_STATUS,
  SUPPORT_ISSUE_STATUS_META,
} from '@/components/support/support-feedback-constants';

const BUG_FEATURE_OPTIONS = [
  { value: 'Bug', label: 'Bug' },
  { value: 'Feature', label: 'Feature' },
];

const getBugFeatureOptionMeta = (option) => ({
  color: option?.value === 'Feature' ? 'green' : 'red',
});

const statusBadgeColor = (status) =>
  getStatusMetaForOption(
    { value: status || SUPPORT_FEEDBACK_DEFAULT_STATUS },
    SUPPORT_ISSUE_STATUS_META,
  ).color;

const SupportFeedbackViewDrawer = ({
  open,
  onOpenChange,
  item,
  viewerEmail,
  onDetailMutated,
  canChangeStatus = false,
  canChangeType = false,
  statusOptions = [],
  onStatusChange,
  onTypeChange,
  updatingStatusId = '',
  updatingTypeId = '',
  canDelete = false,
  onDelete,
  deletingId = '',
}) => {
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!open || !item?.id) {
      setDetailItem(null);
      setIsDetailLoading(false);
      setDetailError('');
      return undefined;
    }

    let isMounted = true;
    setIsDetailLoading(true);
    setDetailError('');

    getSupportIssueDetail(item.id)
      .then((result) => {
        if (!isMounted) return;

        setDetailItem(result);
      })
      .catch((error) => {
        if (!isMounted) return;
        setDetailError(error?.message || 'Failed to load issue details.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsDetailLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, item?.id]);

  const displayItem = useMemo(() => {
    if (!item) return null;
    if (!detailItem) return item;
    return {
      ...item,
      ...detailItem,
      /** Prefer list row `item` after optimistic status / type updates from parent */
      status: item?.status ?? detailItem?.status,
      upvoteCount: detailItem.upvoteCount ?? item.upvoteCount,
      userUpvoted: detailItem.userUpvoted ?? item.userUpvoted,
      commentCount: detailItem.commentCount ?? item.commentCount,
      type: item?.type ?? detailItem?.type,
    };
  }, [detailItem, item]);

  const serverVoted = displayItem?.userUpvoted ?? item?.userUpvoted ?? false;
  const serverCount = displayItem?.upvoteCount ?? item?.upvoteCount ?? 0;
  const {
    voted: upvoteVoted,
    count: upvoteCount,
    toggle: toggleUpvote,
  } = useSupportIssueUpvote(item?.id, serverVoted, serverCount);

  const handleToggleUpvote = useCallback(() => {
    onDetailMutated?.();
    toggleUpvote();
  }, [onDetailMutated, toggleUpvote]);

  const handlePhotoDownload = useCallback((attachment) => {
    const url =
      attachment?.fileUrl || attachment?.file_url || attachment?.url || attachment?.file || '';
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  if (!item) return null;

  const rawType = displayItem?.type;
  const typeValue =
    rawType === 'Feature' || String(rawType ?? '').toLowerCase() === 'feature' ? 'Feature' : 'Bug';

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[1200px]'>
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full gap-3'>
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              {/* <Badge.Root variant='filled' color={typeBadgeColor(item.type)} size='small' className='shrink-0'>
                {item.type}
              </Badge.Root> */}
            </div>
            {canDelete ? (
              <Button.Root
                variant='error'
                size='xsmall'
                onClick={() => (displayItem?.id ? onDelete?.(displayItem.id) : undefined)}
                className='shrink-0'
                disabled={!displayItem?.id || deletingId === displayItem?.id}
              >
                {deletingId === displayItem?.id ? 'Deleting...' : 'Delete'}
              </Button.Root>
            ) : null}
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() => onOpenChange(false)}
              className='shrink-0'
            >
              <Button.Icon as={RiCloseLine} className='shrink-0' />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
          <div className='flex h-full min-h-[480px]'>
            <div className='w-[420px] border-r border-stroke-soft-200 overflow-y-auto'>
              <div className='px-6 pt-5 pb-8 flex flex-col gap-5'>
                <div className='flex flex-wrap gap-2 items-start justify-between'>
                  <div className='flex min-w-0 flex-1 flex-col gap-1'>
                    <h2 className='text-title-h5 text-text-main-900'>{displayItem?.title}</h2>
                    {isDetailLoading ? (
                      <p className='text-paragraph-xs text-text-sub-600'>
                        Loading issue details...
                      </p>
                    ) : null}
                    {detailError ? (
                      <p className='text-paragraph-xs text-error-base'>{detailError}</p>
                    ) : null}
                  </div>
                  {canChangeType ? (
                    <StatusDropdown.Root
                      value={typeValue}
                      onValueChange={(newType) =>
                        displayItem?.id ? onTypeChange?.(displayItem.id, newType) : undefined
                      }
                      statusOptions={BUG_FEATURE_OPTIONS}
                      getOptionMeta={getBugFeatureOptionMeta}
                      disabled={updatingTypeId === displayItem?.id}
                      size='small'
                      variant='inline'
                      indicator='dot'
                      className='shrink-0'
                      placeholder='Type'
                    >
                      <StatusDropdown.Trigger />
                      <StatusDropdown.Content />
                    </StatusDropdown.Root>
                  ) : (
                    <Badge.Root
                      variant='light'
                      color={typeValue === 'Feature' ? 'green' : 'red'}
                      size='small'
                      className='shrink-0'
                    >
                      {typeValue}
                    </Badge.Root>
                  )}
                </div>

                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  <FieldRow icon={RiCalendarLine} label='Date' editable={false}>
                    <span className='text-paragraph-sm text-text-main-900'>
                      {safeDisplayDateTime(displayItem?.createdAt) || '—'}
                    </span>
                  </FieldRow>
                  <FieldRow icon={RiUserLine} label='Raised by' editable={false}>
                    <span className='text-paragraph-sm text-text-main-900'>
                      {displayItem?.raisedByName || '—'}
                    </span>
                  </FieldRow>
                  <FieldRow icon={RiMailLine} label='Email' editable={false}>
                    <span className='text-paragraph-sm text-text-main-900 text-ellipsis overflow-hidden max-w-full'>
                      {displayItem?.email || '—'}
                    </span>
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Status' editable={false}>
                    <div
                      className='min-w-0 w-full max-w-[260px]'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canChangeStatus ? (
                        <SupportIssueStatusDropdown
                          value={displayItem?.status || SUPPORT_FEEDBACK_DEFAULT_STATUS}
                          onValueChange={(newStatus) =>
                            displayItem?.id
                              ? onStatusChange?.(displayItem.id, newStatus)
                              : undefined
                          }
                          statusOptions={statusOptions}
                          disabled={updatingStatusId === displayItem?.id}
                          size='small'
                          className='w-full'
                        />
                      ) : (
                        <Badge.Root
                          variant='light'
                          color={statusBadgeColor(displayItem?.status)}
                          size='small'
                        >
                          {displayItem?.status || SUPPORT_FEEDBACK_DEFAULT_STATUS}
                        </Badge.Root>
                      )}
                    </div>
                  </FieldRow>
                  <FieldRow icon={RiArrowUpLine} label='Upvotes' editable={false}>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='ghost'
                        size='xsmall'
                        className='gap-1.5 text-text-sub-600'
                        disabled={!displayItem?.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleUpvote();
                        }}
                      >
                        <Button.Icon
                          as={upvoteVoted ? RiThumbUpFill : RiThumbUpLine}
                          className='text-primary-base'
                        />
                        <span className='text-paragraph-sm text-text-main-900 tabular-nums'>
                          {upvoteCount}
                        </span>
                      </Button.Root>
                    </div>
                  </FieldRow>
                </div>

                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiPriceTag3Line size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Modules</span>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    {displayItem?.modules?.map((module) => (
                      <Badge.Root key={module} variant='light' color='blue'>
                        {module}
                      </Badge.Root>
                    ))}
                  </div>

                  <div className='flex items-center pt-2 gap-2'>
                    <RiAttachment2 size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Photos</span>
                  </div>
                  {displayItem?.photos?.length ? (
                    <AttachmentList
                      attachments={displayItem.photos}
                      onDownload={handlePhotoDownload}
                      emptyStateMessage='No photos attached.'
                      emptyStateDescription=''
                    />
                  ) : (
                    <p className='text-paragraph-sm text-text-sub-600'>No photos attached.</p>
                  )}
                </div>

                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Description</span>
                  </div>
                  <p className='text-paragraph-sm text-text-main-900 whitespace-pre-wrap'>
                    {displayItem?.description?.trim() || 'No description provided'}
                  </p>
                </div>
              </div>
            </div>

            <div className='flex flex-1 flex-col min-h-0 h-full overflow-hidden'>
              <TabMenuHorizontal.Root
                value='activity'
                className='flex flex-col flex-1 min-h-0 h-full'
              >
                <TabMenuHorizontal.List className='gap-4 h-auto shrink-0 border-t-0 px-6'>
                  <TabMenuHorizontal.Trigger
                    className='gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
                    value='activity'
                  >
                    Comments
                  </TabMenuHorizontal.Trigger>
                </TabMenuHorizontal.List>
                <TabMenuHorizontal.Content
                  value='activity'
                  className={cn(
                    'flex flex-1 flex-col min-h-0 overflow-hidden p-0 data-[state=inactive]:hidden',
                  )}
                >
                  {displayItem?.id ? (
                    <SupportIssueComments
                      issueId={displayItem.id}
                      viewerEmail={viewerEmail}
                      onCommentsMutated={onDetailMutated}
                    />
                  ) : (
                    <div className='flex min-h-[200px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
                      <p className='text-label-sm text-text-sub-600'>Issue id missing.</p>
                    </div>
                  )}
                </TabMenuHorizontal.Content>
              </TabMenuHorizontal.Root>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default SupportFeedbackViewDrawer;
