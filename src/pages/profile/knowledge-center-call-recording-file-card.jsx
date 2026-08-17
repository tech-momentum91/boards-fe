import React from 'react';
import { RiDeleteBinLine, RiDownloadLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import { formatFileSize } from '@/utils/file-utils';

/**
 * MP3 attachment row — shared by add and view call recording drawers.
 */
export default function KnowledgeCenterCallRecordingFileCard({
  attachment,
  disabled,
  onDownload,
  onRemove,
}) {
  const fileName = attachment.fileName || attachment.name || 'Recording.mp3';
  const fileSize = attachment.size ?? attachment.file_size;

  return (
    <div className='rounded-[12px] border border-stroke-soft-200 bg-bg-white-0'>
      <div className='flex items-center gap-3 px-[14px] py-3 pr-4'>
        <FileFormatIcon.Root format='MP3' size='small' color='red' />
        <div className='flex min-w-0 flex-1 flex-col gap-[6px]'>
          <p className='label-small w-full truncate text-text-main-900'>{fileName}</p>
          {fileSize ? (
            <p className='text-paragraph-xs text-text-sub-500'>{formatFileSize(fileSize)}</p>
          ) : null}
        </div>
        {onDownload ? (
          <CompactButton.Root
            variant='ghost'
            size='large'
            onClick={() => onDownload(attachment)}
            disabled={disabled}
            aria-label={`Download ${fileName}`}
            className='shrink-0 cursor-pointer'
          >
            <CompactButton.Icon as={RiDownloadLine} />
          </CompactButton.Root>
        ) : null}
        {onRemove ? (
          <CompactButton.Root
            variant='ghost'
            size='large'
            onClick={() => onRemove(attachment)}
            disabled={disabled}
            aria-label={`Remove ${fileName}`}
            className='shrink-0 cursor-pointer'
          >
            <CompactButton.Icon as={RiDeleteBinLine} />
          </CompactButton.Root>
        ) : null}
      </div>
    </div>
  );
}
