import React, { useState } from 'react';
import { RiDownloadLine, RiAttachment2 } from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import { formatFileSize } from '@/utils/file-utils';

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'avif',
]);
const IMAGE_MIME_PREFIX = 'image/';

const isImageAttachment = (fileName, fileType) => {
  const type = (fileType || '').toLowerCase();
  if (type.startsWith(IMAGE_MIME_PREFIX)) return true;
  const extension = (fileName || '').split('.').pop()?.toLowerCase();
  return extension ? IMAGE_EXTENSIONS.has(extension) : false;
};

const CommentAttachment = ({ attachment, onDownload, onPreview }) => {
  const { name, file_name, file_size, file_type, file_url, is_private = 0 } = attachment;
  const [imgError, setImgError] = useState(false);

  const fileName = file_name || name || 'Unknown file';
  //@ts-expect-error
  const fileSize = file_size ?? (attachment.size > 0 ? attachment.size : 0);
  const fileType = file_type || attachment.type;
  const fileUrl = file_url || attachment.url;

  const isImage = isImageAttachment(fileName, fileType);
  const showImagePreview = isImage && fileUrl && !imgError;

  // Handle download
  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(attachment);
    } else if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Image preview card
  if (showImagePreview) {
    return (
      <div
        className='inline-flex flex-col rounded-lg border border-stroke-soft-200 bg-bg-white-0 overflow-hidden max-w-[160px] cursor-pointer hover:border-stroke-soft-300 transition-colors'
        onClick={handleDownload}
      >
        <div className='relative w-[160px] h-[120px] bg-bg-weak-100 flex items-center justify-center overflow-hidden'>
          <img
            src={fileUrl}
            alt={fileName}
            className='w-full h-full object-cover'
            onError={() => setImgError(true)}
          />
        </div>
        <div className='flex items-center justify-between gap-1.5 px-2 py-1.5 min-w-0'>
          <div className='flex flex-col min-w-0'>
            <span className='text-sm font-medium text-text-main-900 truncate' title={fileName}>
              {fileName}
            </span>
            {fileSize > 0 && (
              <span className='text-xs text-text-sub-500'>{formatFileSize(fileSize)}</span>
            )}
          </div>
          <CompactButton.Root
            variant='ghost'
            size='small'
            onClick={handleDownload}
            className='text-text-soft-400 hover:text-text-strong-950 cursor-pointer shrink-0'
            aria-label={`Download ${fileName}`}
          >
            <CompactButton.Icon as={RiDownloadLine} />
          </CompactButton.Root>
        </div>
      </div>
    );
  }

  // Non-image or fallback: compact row
  return (
    <div
      className='inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1 cursor-pointer hover:border-stroke-soft-300 transition-colors'
      onClick={handleDownload}
    >
      <RiAttachment2 size={16} className='text-text-soft-400 shrink-0' aria-hidden='true' />

      <div className='flex justify-center items-center gap-1 min-w-0'>
        <span className='text-sm font-medium text-text-main-900 truncate max-w-[150px]'>
          {fileName}
        </span>
        {fileSize > 0 && (
          <span className='text-xs text-text-sub-500'>{formatFileSize(fileSize)}</span>
        )}
      </div>

      <CompactButton.Root
        variant='ghost'
        size='small'
        onClick={handleDownload}
        className='text-text-soft-400 hover:text-text-strong-950 cursor-pointer'
        aria-label={`Download ${fileName}`}
      >
        <CompactButton.Icon as={RiDownloadLine} />
      </CompactButton.Root>
    </div>
  );
};

export default CommentAttachment;
