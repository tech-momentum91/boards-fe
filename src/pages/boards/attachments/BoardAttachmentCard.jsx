/**
 * BoardAttachmentCard
 *
 * Two display modes:
 *  - "uploading" mode  : shows file name, progress bar, cancel & retry actions
 *  - "completed" mode  : shows preview thumbnail or icon, download, optional delete
 *
 * Props (completed mode):
 *   attachment   { id, originalName, mimeType, previewType, size, downloadUrl }
 *   canDelete    boolean – show delete button
 *   onPreview    (attachment) => void
 *   onDelete     (id) => void
 *
 * Props (uploading mode):
 *   uploadEntry  { tempId, file, status, progress, error }
 *   onCancel     (tempId) => void
 *   onRetry      (tempId) => void
 *   onDismiss    (tempId) => void
 */

import React from 'react';
import { RiCloseLine, RiDeleteBinLine, RiDownloadLine, RiRefreshLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';
import { formatFileSize } from '@/utils/file-utils';

// ── Preview thumbnail helpers ──────────────────────────────────────────────────

function PreviewArea({ attachment, onPreview, onPreviewError, previewFailed }) {
  const { previewType, downloadUrl, originalName } = attachment;

  if (!previewFailed && previewType === 'image' && downloadUrl) {
    return (
      <button
        type='button'
        className='h-full w-full cursor-zoom-in focus:outline-none'
        onClick={() => onPreview?.(attachment)}
        aria-label={`Preview ${originalName}`}
      >
        <img
          src={downloadUrl}
          alt={originalName}
          className='h-full w-full object-cover'
          loading='lazy'
          onError={onPreviewError}
        />
      </button>
    );
  }

  const iconMap = {
    video: '🎬',
    audio: '🎵',
    pdf: '📄',
    text: '📝',
    archive: '🗜️',
  };

  const icon = iconMap[previewType] ?? '📎';

  return (
    <button
      type='button'
      className='flex h-full w-full flex-col items-center justify-center gap-2 text-center focus:outline-none'
      onClick={
        previewType !== 'other' && previewType !== 'archive'
          ? () => onPreview?.(attachment)
          : undefined
      }
      aria-label={`Preview ${originalName}`}
    >
      <span className='text-3xl' aria-hidden>
        {icon}
      </span>
      <span className='text-paragraph-xs text-text-sub-500'>
        {previewType === 'other' || previewType === 'archive' ? 'No preview' : 'Click to preview'}
      </span>
    </button>
  );
}

// ── Uploading card ─────────────────────────────────────────────────────────────

function UploadingCard({ entry, onCancel, onRetry, onDismiss }) {
  const { tempId, file, status, progress, error } = entry;
  const isError = status === 'error';

  return (
    <div className='flex flex-col overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100'>
      <div className='flex h-[176px] flex-col items-center justify-center gap-3 px-4'>
        {isError ? (
          <>
            <span className='text-2xl' aria-hidden>
              ⚠️
            </span>
            <p className='text-center text-paragraph-xs text-text-sub-500 line-clamp-2'>
              {error ?? 'Upload failed'}
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => onRetry?.(tempId)}
                className='flex items-center gap-1 rounded-md bg-bg-white-0 px-2 py-1 text-paragraph-xs font-medium text-text-main-900 shadow-sm hover:bg-bg-weak-100'
              >
                <RiRefreshLine className='size-3' aria-hidden />
                Retry
              </button>
              <button
                type='button'
                onClick={() => onDismiss?.(tempId)}
                className='flex items-center gap-1 rounded-md px-2 py-1 text-paragraph-xs font-medium text-text-sub-500 hover:text-text-main-900'
              >
                Dismiss
              </button>
            </div>
          </>
        ) : (
          <>
            <p className='text-center text-paragraph-xs text-text-sub-500 line-clamp-2 px-2'>
              {file.name}
            </p>
            <div className='w-full px-4'>
              <div className='h-1.5 w-full overflow-hidden rounded-full bg-stroke-soft-200'>
                <div
                  className='h-full rounded-full bg-primary-base transition-all duration-200'
                  style={{ width: `${progress}%` }}
                  role='progressbar'
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className='mt-1 text-right text-paragraph-xs text-text-sub-500'>{progress}%</p>
            </div>
            <button
              type='button'
              onClick={() => onCancel?.(tempId)}
              className='flex items-center gap-1 rounded-md px-2 py-1 text-paragraph-xs font-medium text-text-sub-500 hover:text-text-main-900'
            >
              <RiCloseLine className='size-3' aria-hidden />
              Cancel
            </button>
          </>
        )}
      </div>

      <div className='border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-3'>
        <p className='label-small truncate text-text-main-900'>{file.name}</p>
        <p className='mt-0.5 text-paragraph-xs text-text-sub-500'>
          {isError ? 'Failed' : 'Uploading…'}
        </p>
      </div>
    </div>
  );
}

// ── Completed card ─────────────────────────────────────────────────────────────

function CompletedCard({ attachment, canDelete, onPreview, onDelete }) {
  const [previewFailed, setPreviewFailed] = React.useState(false);

  const { id, originalName, size, downloadUrl } = attachment;
  const hasSize = Number(size) > 0;

  return (
    <div className='group relative flex flex-col overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100'>
      <div className='relative flex h-[176px] w-full items-center justify-center bg-bg-weak-100'>
        <div className='absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100'>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={originalName}
              target='_blank'
              rel='noopener noreferrer'
              className='flex size-7 items-center justify-center rounded-md bg-white text-text-sub-500 shadow-sm hover:text-text-main-900'
              aria-label={`Download ${originalName}`}
            >
              <RiDownloadLine className='size-4' aria-hidden />
            </a>
          ) : null}
          {canDelete ? (
            <button
              type='button'
              onClick={() => onDelete?.(id)}
              className='flex size-7 items-center justify-center rounded-md bg-white text-error-base shadow-sm hover:bg-error-50'
              aria-label={`Delete ${originalName}`}
            >
              <RiDeleteBinLine className='size-4' aria-hidden />
            </button>
          ) : null}
        </div>

        <PreviewArea
          attachment={attachment}
          onPreview={onPreview}
          previewFailed={previewFailed}
          onPreviewError={() => setPreviewFailed(true)}
        />
      </div>

      <div className='border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-3 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <p className='label-small truncate text-text-main-900' title={originalName}>
          {originalName}
        </p>
        {hasSize ? (
          <p className='mt-0.5 text-paragraph-xs text-text-sub-500'>{formatFileSize(size)}</p>
        ) : null}
      </div>
    </div>
  );
}

// ── Public component ───────────────────────────────────────────────────────────

export default function BoardAttachmentCard({
  attachment,
  uploadEntry,
  canDelete = false,
  onPreview,
  onDelete,
  onCancel,
  onRetry,
  onDismiss,
  className,
}) {
  return (
    <div className={cn('w-[200px] shrink-0', className)}>
      {uploadEntry ? (
        <UploadingCard
          entry={uploadEntry}
          onCancel={onCancel}
          onRetry={onRetry}
          onDismiss={onDismiss}
        />
      ) : (
        <CompletedCard
          attachment={attachment}
          canDelete={canDelete}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
