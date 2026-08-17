import React from 'react';
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri';

import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import EmptyIllustration from '@/components/ui/empty-illustration';
import { cn, getInitials } from '@/lib/utils';

function TranscriptRoleBadge({ role }) {
  const isDevX = role === 'DevX';

  return (
    <Badge.Root
      size='medium'
      variant='light'
      color={isDevX ? 'green' : 'blue'}
      className='shrink-0 rounded-full px-2 py-0.5 normal-case'
    >
      {role}
    </Badge.Root>
  );
}

function TranscriptDirectionIcon({ role }) {
  const isDevX = role === 'DevX';

  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg border',
        isDevX
          ? 'border-success-light bg-success-lighter text-success-base'
          : 'border-highlighted-light bg-highlighted-lighter text-highlighted-base',
      )}
      aria-hidden
    >
      {isDevX ? (
        <RiArrowRightUpLine className='size-4' />
      ) : (
        <RiArrowLeftDownLine className='size-4' />
      )}
    </div>
  );
}

function TranscriptMessageCard({ message }) {
  const initials = getInitials(message.speakerName) || '?';

  return (
    <div className='flex gap-3'>
      <TranscriptDirectionIcon role={message.role} />
      <div className='min-w-0 flex-1 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-regular-xs'>
        <div className='mb-3 flex items-center gap-2'>
          <Avatar.Root size='24' color='gray' className='shrink-0'>
            {initials}
          </Avatar.Root>
          <span className='label-small text-text-main-900'>{message.speakerName}</span>
          <TranscriptRoleBadge role={message.role} />
          <span className='ml-auto shrink-0 text-paragraph-xs text-text-soft-400'>
            {message.timestamp}
          </span>
        </div>
        <p className='paragraph-small text-text-main-900'>{message.text}</p>
      </div>
    </div>
  );
}

export function CallRecordingTranscriptEmptyState() {
  return (
    <div className='flex h-full min-h-[280px] flex-col items-center justify-center gap-5 px-6 py-12'>
      <EmptyIllustration className='size-[108px]' />
      <p className='paragraph-small text-center text-text-soft-400'>No data</p>
    </div>
  );
}

export default function CallRecordingTranscript({ messages = [] }) {
  if (messages.length === 0) {
    return <CallRecordingTranscriptEmptyState />;
  }

  return (
    <div className='flex flex-col gap-4 p-6'>
      {messages.map((message) => (
        <TranscriptMessageCard key={message.id} message={message} />
      ))}
    </div>
  );
}
