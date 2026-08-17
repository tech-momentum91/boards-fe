import React, { useMemo, useState } from 'react';
import { RiArrowRightSLine, RiMailLine } from 'react-icons/ri';
import CommentAttachment from '@/components/ui/comment-attachment';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { safeDisplayDateTime } from '@/utils/date-utils';

const getDeliveryStatusColor = (status) => {
  if (!status) return 'gray';
  const normalized = String(status).toLowerCase();
  const colorMap = {
    sent: 'green',
    read: 'blue',
    opened: 'blue',
    clicked: 'blue',
    sending: 'yellow',
    scheduled: 'purple',
    bounced: 'red',
    'soft-bounced': 'orange',
    rejected: 'red',
    delayed: 'orange',
    error: 'red',
    expired: 'red',
    'marked as spam': 'red',
    'recipient unsubscribed': 'red',
  };
  return colorMap[normalized] || 'gray';
};

const formatDeliveryStatus = (status) => {
  if (!status) return null;
  return status
    .replace(/marked as /i, '')
    .replaceAll('-', ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getEmailInitials = (value) => {
  if (!value) return 'C';
  const trimmedValue = String(value).trim();
  if (!trimmedValue) return 'C';
  const mailboxPart = trimmedValue.split('@')[0];
  return mailboxPart ? mailboxPart.charAt(0).toUpperCase() : 'C';
};

const renderEmailContent = (htmlContent, subject, showSubject) => {
  if (!htmlContent && !showSubject) return null;
  let sanitizedContent = htmlContent || '';
  sanitizedContent = sanitizedContent
    .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replaceAll(/javascript:/gi, '');

  if (showSubject && subject) {
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <RiMailLine size={16} className='text-text-soft-400 shrink-0' aria-hidden />
          <p className='text-paragraph-sm font-medium text-text-main-900 break-words'>{subject}</p>
        </div>
        {sanitizedContent ? (
          <div
            className='text-sm leading-5 tracking-[-0.084px] text-text-main-900 [&>p]:mb-0 [&>p:last-child]:mb-0'
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        ) : null}
      </div>
    );
  }
  if (!sanitizedContent) return null;
  return (
    <div
      className='text-sm leading-5 tracking-[-0.084px] text-text-main-900 [&>p]:mb-0 [&>p:last-child]:mb-0 max-h-[200px] overflow-y-auto'
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

/**
 * Single email in a thread - same layout as ticket-management EmailItem (header + body).
 */
const ThreadEmailItem = ({ email, isFirst, isLast }) => {
  const {
    subject,
    sender,
    recipients,
    content,
    creation,
    direction,
    attachments = [],
    delivery_status,
  } = email;

  const emailAddress = sender || recipients || '';
  const isFromSupport =
    direction === 'outbound' ||
    (emailAddress &&
      (emailAddress.toLowerCase().includes('support') ||
        emailAddress.toLowerCase().includes('devx')));
  const hasAttachments = attachments && attachments.length > 0;

  return (
    <section
      className='relative flex flex-col'
      aria-label={`Email from ${emailAddress || 'sender'}`}
    >
      <header
        className={cn(
          'flex items-center justify-between bg-bg-weak-100 px-4 py-2.5 border-t border-stroke-soft-200',
          isFirst && 'rounded-tl-[10px] rounded-tr-[10px]',
          !isFirst && '-ml-[1px] border-l border-stroke-soft-200',
          !isFirst && '-mr-[1px] border-r border-stroke-soft-200',
        )}
      >
        <div className='flex w-[190px] items-center gap-2 min-w-0'>
          <Avatar.Root
            size='20'
            color={isFromSupport ? 'green' : 'gray'}
            className={cn('shrink-0', isFromSupport && 'bg-green-base text-text-white-0')}
            aria-hidden='true'
          >
            {getEmailInitials(emailAddress)}
          </Avatar.Root>
          <p className='text-sm font-normal leading-5 tracking-[-0.084px] text-text-sub-500 truncate'>
            {emailAddress}
          </p>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          {delivery_status && (
            <Badge.Root
              variant='light'
              color={getDeliveryStatusColor(delivery_status)}
              size='small'
            >
              {formatDeliveryStatus(delivery_status)}
            </Badge.Root>
          )}
          <p className='text-xs font-normal leading-4 text-text-sub-500'>
            {safeDisplayDateTime(creation)}
          </p>
        </div>
      </header>
      <div
        className={cn(
          'border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-4',
          isLast && 'rounded-bl-[10px] rounded-br-[10px]',
          '-ml-[1px] border-l border-stroke-soft-200',
          '-mr-[1px] border-r border-stroke-soft-200',
        )}
      >
        {renderEmailContent(content, subject, isFirst)}
        {hasAttachments ? (
          <div className='mt-4 flex flex-wrap items-start gap-2'>
            {attachments.map((attachmentItem, attachmentIndex) => (
              <CommentAttachment
                key={attachmentItem.name || attachmentItem.file_name || attachmentIndex}
                attachment={attachmentItem}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

/**
 * Email activity: single from/to header; collapse/expand chevron on hover; header click toggles body.
 * Supports single email (sender, recipients, content, ...) or thread (communications[] like email-thread).
 */
const CrmAccountActivitiesEmailItem = ({ activity }) => {
  const {
    sender,
    recipients,
    content,
    creation,
    subject,
    attachments = [],
    delivery_status,
    defaultExpanded = false,
    communications,
  } = activity;

  const [expanded, setExpanded] = useState(defaultExpanded);

  const isThread = Array.isArray(communications) && communications.length > 0;

  const sortedThreadEmails = useMemo(() => {
    if (!isThread) return [];
    return [...communications].sort((a, b) => new Date(a.creation) - new Date(b.creation));
  }, [isThread, communications]);

  const threadSummary = useMemo(() => {
    if (!isThread || sortedThreadEmails.length === 0) return null;
    const first = sortedThreadEmails[0];
    const last = sortedThreadEmails.at(-1);
    return {
      sender: first.sender || first.recipients || '—',
      creation: last.creation,
      delivery_status: last.delivery_status,
      count: sortedThreadEmails.length,
    };
  }, [isThread, sortedThreadEmails]);

  const emailAddress = sender || recipients || '';

  const renderBody = () => {
    if (isThread) {
      return (
        <div className='flex flex-col rounded-b-[10px] border border-t-0 border-stroke-soft-200 overflow-hidden'>
          {sortedThreadEmails.map((emailItem, emailIndex) => (
            <ThreadEmailItem
              key={emailItem.name || emailIndex}
              email={emailItem}
              isFirst={emailIndex === 0}
              isLast={emailIndex === sortedThreadEmails.length - 1}
            />
          ))}
        </div>
      );
    }
    return (
      <div className='border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-4'>
        {renderEmailContent(content, subject, true)}
        {attachments && attachments.length > 0 ? (
          <div className='mt-4 flex flex-wrap items-start gap-2'>
            {attachments.map((attachmentItem, attachmentIndex) => (
              <CommentAttachment
                key={attachmentItem.name || attachmentItem.file_name || attachmentIndex}
                attachment={attachmentItem}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const headerLabel = isThread
    ? `${threadSummary.sender} · ${threadSummary.count} message${threadSummary.count === 1 ? '' : 's'}`
    : emailAddress;

  const headerCreation = isThread ? threadSummary.creation : creation;
  const headerStatus = isThread ? threadSummary.delivery_status : delivery_status;

  return (
    <div className='flex flex-col rounded-[10px] border border-stroke-soft-200 overflow-hidden bg-bg-white-0'>
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={() => setExpanded((previous) => !previous)}
              className={cn(
                'group w-full flex items-center justify-between gap-4 px-4 py-2.5 rounded-t-[10px]',
                'bg-bg-weak-100 hover:bg-bg-weak-200 transition-colors text-left',
              )}
            >
              <div className='flex items-center gap-2 min-w-0 flex-1'>
                <span
                  className={cn(
                    'flex shrink-0 transition-opacity duration-150',
                    'opacity-0 group-hover:opacity-100',
                  )}
                  aria-hidden
                >
                  <RiArrowRightSLine
                    size={16}
                    className={cn(
                      'text-text-soft-500 transition-transform duration-200',
                      expanded && 'rotate-90',
                    )}
                  />
                </span>
                <div className='flex flex-col min-w-0'>
                  <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                    {headerLabel}
                  </span>
                  {!isThread && recipients ? (
                    <span className='text-paragraph-xs text-text-soft-500 truncate'>
                      To: {recipients}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                {headerStatus && (
                  <Badge.Root
                    variant='light'
                    color={getDeliveryStatusColor(headerStatus)}
                    size='small'
                  >
                    {formatDeliveryStatus(headerStatus)}
                  </Badge.Root>
                )}
                <span className='text-paragraph-xs text-text-soft-500'>
                  {safeDisplayDateTime(headerCreation)}
                </span>
              </div>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content size='xsmall' side='top'>
            {expanded ? 'Collapse' : 'Expand'}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      {expanded && renderBody()}
    </div>
  );
};

export default CrmAccountActivitiesEmailItem;
