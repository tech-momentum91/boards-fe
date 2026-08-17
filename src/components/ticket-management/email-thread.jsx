import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import CommentAttachment from '@/components/ui/comment-attachment';
import EmailInput from '@/components/ticket-management/email-input';
import EmptyIllustration from '@/components/ui/empty-illustration';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { isClient } from '@/constants/users-constants';

const EmailThread = ({
  ticketId,
  commentsData = {},
  loading = false,
  onSendEmail,
  isSubmittingEmail = false,
}) => {
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);

  // commentsData is already the structured object from Redux
  const { communications = [] } = commentsData || {};

  const sortedEmails = useMemo(() => {
    if (!communications || communications.length === 0) {
      return [];
    }

    return [...communications].sort(
      (firstEmail, secondEmail) => new Date(firstEmail.creation) - new Date(secondEmail.creation),
    );
  }, [communications]);

  const hasEmails = sortedEmails.length > 0;

  // Extract recipient emails from the last email for reply-to functionality
  const defaultRecipients = useMemo(() => {
    if (!hasEmails) return [];
    const lastEmail = sortedEmails.at(-1);
    // If last email is outbound, get recipients; if inbound, get sender
    if (lastEmail.direction === 'outbound') {
      return lastEmail.recipients ? [lastEmail.recipients] : [];
    } else {
      return lastEmail.sender ? [lastEmail.sender] : [];
    }
  }, [sortedEmails, hasEmails]);

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center py-8'>
        <div className='text-sm text-text-sub-600'>Loading emails...</div>
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col'>
      {hasEmails ? (
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          <div className='flex flex-col rounded-[10px] border-l border-r border-b border-stroke-soft-200 overflow-hidden'>
            {sortedEmails.map((emailItem, emailIndex) => (
              <EmailItem
                key={emailItem.name || emailIndex}
                email={emailItem}
                isFirst={emailIndex === 0}
                isLast={emailIndex === sortedEmails.length - 1}
                ticketId={ticketId}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className='flex-1 flex flex-col items-center justify-center gap-5 py-12 px-4 h-full'>
          <EmptyIllustration className='shrink-0' />
          <p className='text-sm leading-5 text-text-soft-400 text-center'>
            There are no emails here yet.
          </p>
        </div>
      )}

      {/* Email Input - Only show for non-client users */}
      {onSendEmail && !isClientUser && (
        <div className='pb-6 px-6 relative z-10 bg-white'>
          {/* Fade overlay */}
          {hasEmails && (
            <div
              className='absolute -top-10 left-0 right-0 h-10
               bg-gradient-to-t from-white to-transparent pointer-events-none'
            />
          )}
          <div className='w-full h-1 bg-white' />
          <EmailInput
            onSubmit={onSendEmail}
            isSubmitting={isSubmittingEmail}
            placeholder='Type your message...'
            defaultTo={defaultRecipients}
          />
        </div>
      )}
    </div>
  );
};

const EmailItem = ({ email, isFirst = false, isLast = false }) => {
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
    emailAddress.toLowerCase().includes('support') ||
    emailAddress.toLowerCase().includes('devx');

  const getEmailInitials = (value) => {
    if (!value) {
      return 'C';
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return 'C';
    }

    const mailboxPart = trimmedValue.split('@')[0];

    if (!mailboxPart) {
      return 'C';
    }

    return mailboxPart.charAt(0).toUpperCase();
  };

  const renderContent = (htmlContent, showSubject) => {
    if (!htmlContent && !showSubject) {
      return null;
    }

    let sanitizedContent = htmlContent || '';

    sanitizedContent = sanitizedContent
      .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replaceAll(/javascript:/gi, '');

    if (showSubject && subject) {
      return (
        <div className='space-y-2'>
          <p className='text-base font-medium leading-6 tracking-[-0.176px] text-text-main-900'>
            {subject}
          </p>
          {sanitizedContent ? (
            <div
              className='text-sm leading-5 tracking-[-0.084px] text-text-main-900 [&>p]:mb-0 [&>p:last-child]:mb-0'
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          ) : null}
        </div>
      );
    }

    if (!sanitizedContent) {
      return null;
    }

    return (
      <div
        className='text-sm leading-5 tracking-[-0.084px] text-text-main-900 [&>p]:mb-0 [&>p:last-child]:mb-0'
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  };

  const hasAttachments = attachments && attachments.length > 0;

  // Map delivery status to badge color
  const getDeliveryStatusColor = (status) => {
    if (!status) return 'gray';
    const normalized = status.toLowerCase();
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

  // Format delivery status for display
  const formatDeliveryStatus = (status) => {
    if (!status) return null;
    // Convert "Marked As Spam" to "Spam", "Soft-Bounced" to "Soft Bounced", etc.
    return status
      .replace(/marked as /i, '')
      .replaceAll('-', ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <section
      className='group relative flex flex-col'
      aria-label={`Email from ${emailAddress || 'sender'}`}
      tabIndex={0}
      onClick={() => {}}
      onKeyDown={() => {}}
    >
      <header
        className={cn(
          'flex items-center justify-between bg-bg-weak-100 px-4 py-2.5 border-t border-stroke-soft-200 pb-[18px]',
          'rounded-tl-[10px] rounded-tr-[10px]',
          !isFirst && '-ml-[1px] border-l border-stroke-soft-200',
          !isFirst && '-mr-[1px] border-r border-stroke-soft-200',
        )}
      >
        <div className='flex w-[190px] items-center gap-2'>
          <Avatar.Root
            size='20'
            color={isFromSupport ? 'green' : 'gray'}
            className={cn('shrink-0', isFromSupport ? 'bg-green-base text-text-white-0' : '')}
            aria-hidden='true'
          >
            {getEmailInitials(emailAddress)}
          </Avatar.Root>
          <p className='text-sm font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
            {emailAddress}
          </p>
        </div>
        <div className='flex items-center gap-2'>
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

      {/* body */}
      <div
        className={cn(
          'border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-4 rounded-tl-[10px] rounded-tr-[10px]',
          isLast && 'rounded-bl-[10px] rounded-br-[10px]',
          '-mt-2',
          '-ml-[1px] border-l border-stroke-soft-200',
          '-mr-[1px] border-r border-stroke-soft-200',
        )}
      >
        {renderContent(content, isFirst)}

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

export default EmailThread;
