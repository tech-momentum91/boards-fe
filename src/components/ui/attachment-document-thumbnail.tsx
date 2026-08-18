import type { MouseEventHandler, ReactNode } from 'react';

import * as FileFormatIcon from '@/components/ui/file-format-icon';
import { getOfficeDocumentIconColor } from '@/lib/utils';
import { cn } from '@/utils/cn';

interface AttachmentDocumentThumbnailProps {
  format?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
}

function AttachmentDocumentThumbnail({
  format = 'FILE',
  className,
  onClick,
  ariaLabel = 'Preview document',
}: AttachmentDocumentThumbnailProps) {
  const interactive = Boolean(onClick);
  const iconColor = getOfficeDocumentIconColor(format) as
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'sky'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'gray'
    | undefined;

  const content: ReactNode = (
    <div className='flex flex-col items-center justify-center gap-2 px-3 text-center'>
      <FileFormatIcon.Root format={format} size='medium' color={iconColor} />
      <span className='text-paragraph-xs text-text-sub-500'>Click to open</span>
    </div>
  );

  if (interactive) {
    return (
      <button
        type='button'
        className={cn(
          'flex h-full w-full cursor-pointer items-center justify-center bg-bg-weak-100 focus:outline-none',
          className,
        )}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn('absolute inset-0 flex items-center justify-center bg-bg-weak-100', className)}
    >
      {content}
    </div>
  );
}

export default AttachmentDocumentThumbnail;
