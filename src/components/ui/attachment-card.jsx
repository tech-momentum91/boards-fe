import React from 'react';
import { RiDeleteBinLine, RiDownloadLine, RiImage2Line } from 'react-icons/ri';

import AttachmentVideoThumbnail from '@/components/ui/attachment-video-thumbnail';
import AttachmentPdfThumbnail from '@/components/ui/attachment-pdf-thumbnail';
import AttachmentDocumentThumbnail from '@/components/ui/attachment-document-thumbnail';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as Tooltip from '@/components/ui/tooltip';
import { formatFileSize } from '@/utils/file-utils';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { cn } from '@/utils/cn';

function AttachmentCard({
  attachment,
  disabled = false,
  dangerRemove = false,
  showDownload = true,
  showFormatIcon = true,
  previewError = false,
  onPreviewError,
  onRemove,
  onDownload,
  onPreviewClick,
  className,
}) {
  const hasSize =
    attachment.size !== null &&
    attachment.size !== undefined &&
    attachment.size !== '' &&
    attachment.size > 0;
  const hasDate = Boolean(attachment.createdAt);
  const showImagePreview = attachment.isImage && attachment.fileUrl && !previewError;
  const showVideoPreview = attachment.isVideo && attachment.fileUrl && !previewError;
  const showPdfPreview = attachment.isPdf && attachment.fileUrl && !previewError;
  const showOfficeDocPreview = attachment.isOfficeDocument && attachment.fileUrl && !previewError;

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100',
        className,
      )}
    >
      <div className='relative flex h-[176px] w-full items-center justify-center bg-bg-weak-100'>
        {(attachment.fileUrl || onRemove || onDownload) && (
          <div className='absolute right-2 top-2 z-10 flex gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'>
            {showDownload && attachment.fileUrl && onDownload ? (
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => onDownload(attachment)}
                disabled={disabled}
                aria-label={`Download ${attachment.fileName || 'attachment'}`}
                type='button'
                className='bg-white shadow-regular-xs ring-1 ring-stroke-soft-200'
              >
                <CompactButton.Icon as={RiDownloadLine} />
              </CompactButton.Root>
            ) : null}
            {onRemove ? (
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => onRemove(attachment.id, attachment.childRowId)}
                disabled={disabled}
                aria-label={`Remove ${attachment.fileName || 'attachment'}`}
                type='button'
                className={cn(
                  'bg-white shadow-regular-xs ring-1 ring-stroke-soft-200',
                  dangerRemove && 'text-error-base hover:bg-error-50 hover:text-error-base',
                )}
              >
                <CompactButton.Icon as={RiDeleteBinLine} />
              </CompactButton.Root>
            ) : null}
          </div>
        )}
        {showImagePreview ? (
          <button
            type='button'
            className='h-full w-full cursor-zoom-in focus:outline-none'
            onClick={() => onPreviewClick?.(attachment)}
            aria-label={`Preview ${attachment.fileName || 'image'}`}
          >
            <img
              src={attachment.fileUrl}
              alt={attachment.fileName}
              className='h-full w-full object-cover'
              loading='lazy'
              onError={() => onPreviewError?.(attachment.id)}
            />
          </button>
        ) : showVideoPreview ? (
          <AttachmentVideoThumbnail
            src={attachment.fileUrl}
            className='h-full w-full'
            onClick={() => onPreviewClick?.(attachment)}
            onFailed={() => onPreviewError?.(attachment.id)}
            ariaLabel={`Preview ${attachment.fileName || 'video'}`}
          />
        ) : showPdfPreview ? (
          <AttachmentPdfThumbnail
            src={attachment.fileUrl}
            className='h-full w-full'
            onClick={() => onPreviewClick?.(attachment)}
            ariaLabel={`Preview ${attachment.fileName || 'PDF'}`}
            title={attachment.fileName || 'PDF preview'}
          />
        ) : showOfficeDocPreview ? (
          <AttachmentDocumentThumbnail
            format={attachment.extension || 'FILE'}
            className='h-full w-full'
            onClick={() => onPreviewClick?.(attachment)}
            ariaLabel={`Preview ${attachment.fileName || 'document'}`}
          />
        ) : (
          <div className='flex flex-col items-center justify-center gap-2 px-3 text-center text-text-sub-500'>
            <div className='flex size-10 items-center justify-center rounded-lg border border-stroke-soft-200 bg-white shadow-sm'>
              <RiImage2Line className='size-5 text-text-sub-500' aria-hidden />
            </div>
            <span className='text-paragraph-xs text-text-sub-500'>Preview unavailable</span>
          </div>
        )}
      </div>
      <div className='border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-3 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <div className='flex min-w-0 items-center gap-2'>
          {showFormatIcon ? (
            <FileFormatIcon.Root
              format={attachment.extension || 'FILE'}
              size='small'
              color='purple'
              className='shrink-0'
            />
          ) : null}
          <div className='min-w-0 flex-1'>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <p className='label-small truncate text-text-main-900'>{attachment.fileName}</p>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' side='top'>
                {attachment.fileNameFull || attachment.fileName}
              </Tooltip.Content>
            </Tooltip.Root>
            <div className='mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-paragraph-xs text-text-sub-500'>
              {hasSize ? <span>{formatFileSize(attachment.size)}</span> : null}
              {hasSize && hasDate ? (
                <span className='size-1 rounded-full bg-text-sub-500' aria-hidden />
              ) : null}
              {hasDate ? <span>{safeDisplayDateTime(attachment.createdAt)}</span> : null}
              {!hasSize && !hasDate ? <span>--</span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttachmentCard;
