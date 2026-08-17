import React from 'react';
import { RiImageLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

export default function ProjectThreeDAttachmentCard({
  attachment,
  version,
  onClick,
  className,
  showTaskTitle = false,
}) {
  const displayVersion = version ?? attachment?.version ?? 'V1';
  const previewSrc =
    attachment?.previewUrl ||
    (attachment?.fileUrl ? toAbsoluteAttachmentUrl(attachment.fileUrl) : '');
  const Component = onClick ? 'button' : 'div';

  const displayName = attachment?.fileName ?? attachment?.name ?? 'Untitled';
  const displayNameFull = attachment?.fileNameFull ?? displayName;

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative w-[220px] shrink-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 text-left',
        onClick && 'cursor-pointer transition hover:border-stroke-sub-300 hover:shadow-regular-xs',
        className,
      )}
    >
      <div className='relative flex h-[176px] items-center justify-center bg-bg-weak-100'>
        {displayVersion ? (
          <Badge.Root
            size='small'
            variant='light'
            color='green'
            className='absolute left-2 top-2 z-10'
          >
            {displayVersion}
          </Badge.Root>
        ) : null}
        {previewSrc ? (
          <img src={previewSrc} alt={displayNameFull} className='h-full w-full object-cover' />
        ) : (
          <RiImageLine className='size-6 text-text-soft-400' />
        )}
      </div>
      <div className='space-y-1 px-4 py-3'>
        {showTaskTitle && attachment?.taskTitle ? (
          <p className='truncate text-paragraph-xs text-text-sub-500'>{attachment.taskTitle}</p>
        ) : null}
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <p className='truncate text-label-sm text-text-main-900'>{displayName}</p>
          </Tooltip.Trigger>
          <Tooltip.Content size='xsmall' side='top'>
            {displayNameFull}
          </Tooltip.Content>
        </Tooltip.Root>
        <p className='truncate text-paragraph-xs text-text-sub-500'>
          {attachment?.size ?? '—'} • {attachment?.uploadedAt ?? '—'}
        </p>
      </div>
    </Component>
  );
}
