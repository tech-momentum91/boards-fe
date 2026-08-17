/**
 * BoardAttachmentPreview
 *
 * Full-screen modal preview for a single attachment.
 * Supported previewTypes: image, video, audio, pdf, text
 * Everything else shows a "download to view" fallback.
 *
 * Props:
 *   attachment  { id, originalName, previewType, downloadUrl, mimeType }
 *   onClose     () => void
 */

import React, { useEffect } from 'react';
import { RiCloseLine, RiDownloadLine, RiExternalLinkLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';

function PreviewContent({ attachment }) {
  const { previewType, downloadUrl, originalName, mimeType } = attachment;

  if (previewType === 'image') {
    return (
      <img
        src={downloadUrl}
        alt={originalName}
        className='max-h-full max-w-full object-contain'
        draggable={false}
      />
    );
  }

  if (previewType === 'video') {
    return (
      <video
        src={downloadUrl}
        controls
        autoPlay={false}
        className='max-h-full max-w-full'
        aria-label={originalName}
      >
        <source src={downloadUrl} type={mimeType} />
        Your browser does not support video playback.
      </video>
    );
  }

  if (previewType === 'audio') {
    return (
      <div className='flex flex-col items-center gap-4 p-8'>
        <span className='text-6xl' aria-hidden>
          🎵
        </span>
        <p className='text-paragraph-sm font-medium text-text-main-900'>{originalName}</p>
        <audio controls src={downloadUrl} className='w-full max-w-sm'>
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  if (previewType === 'pdf') {
    return (
      <iframe
        src={downloadUrl}
        title={originalName}
        className='h-full w-full border-0'
        loading='lazy'
      />
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 p-8 text-center'>
      <span className='text-6xl' aria-hidden>
        📎
      </span>
      <p className='text-paragraph-sm text-text-sub-500'>
        Preview is not available for this file type.
      </p>
      <a
        href={downloadUrl}
        download={originalName}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center gap-2 rounded-lg bg-primary-base px-4 py-2 text-paragraph-sm font-medium text-white hover:bg-primary-600'
      >
        <RiDownloadLine className='size-4' aria-hidden />
        Download to view
      </a>
    </div>
  );
}

export default function BoardAttachmentPreview({ attachment, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!attachment) return null;

  const { originalName, downloadUrl, previewType } = attachment;
  const canPreview = ['image', 'video', 'audio', 'pdf'].includes(previewType);

  return (
    <div
      role='dialog'
      aria-modal
      aria-label={`Preview: ${originalName}`}
      className='fixed inset-0 z-[9999] flex flex-col bg-black/90'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* Header */}
      <div className='flex shrink-0 items-center justify-between gap-4 px-4 py-3 text-white'>
        <p className='truncate text-paragraph-sm font-medium'>{originalName}</p>
        <div className='flex items-center gap-2'>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={originalName}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1 rounded-md px-2 py-1 text-paragraph-xs text-white/80 hover:bg-white/10 hover:text-white'
              aria-label='Download file'
            >
              <RiExternalLinkLine className='size-4' aria-hidden />
              Download
            </a>
          )}
          <button
            type='button'
            onClick={onClose}
            className='flex size-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white'
            aria-label='Close preview'
          >
            <RiCloseLine className='size-5' aria-hidden />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex flex-1 items-center justify-center overflow-auto',
          canPreview ? 'p-4' : 'p-8',
        )}
      >
        <PreviewContent attachment={attachment} />
      </div>
    </div>
  );
}
