import React, { useEffect } from 'react';
import { RiPlayCircleLine } from 'react-icons/ri';

import { useVideoPoster } from '@/hooks/use-video-poster';
import { cn } from '@/utils/cn';

function AttachmentVideoThumbnail({
  src,
  className,
  onClick,
  onFailed,
  ariaLabel = 'Preview video',
}) {
  const { containerRef, videoRef, inView, failed, loading } = useVideoPoster(src, Boolean(src));

  useEffect(() => {
    if (failed) onFailed?.();
  }, [failed, onFailed]);

  if (!src) return null;

  return (
    <button
      ref={containerRef}
      type='button'
      className={cn(
        'relative h-full w-full cursor-pointer overflow-hidden focus:outline-none',
        className,
      )}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {inView && !failed ? (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload='auto'
          className={cn(
            'size-full object-cover pointer-events-none',
            loading ? 'opacity-0' : 'opacity-100',
          )}
          aria-hidden
        />
      ) : null}
      {loading ? <div className='absolute inset-0 bg-bg-weak-100' aria-hidden /> : null}
      {!loading && !failed ? (
        <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20'>
          <RiPlayCircleLine className='size-10 text-white drop-shadow-md' aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

export default AttachmentVideoThumbnail;
