import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/cn';

function AttachmentPdfThumbnail({
  src,
  className,
  onClick,
  ariaLabel = 'Preview PDF',
  lazy = true,
  title = 'PDF preview',
}) {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(!lazy);
  const interactive = Boolean(onClick);

  useEffect(() => {
    if (!lazy || !src) return undefined;

    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, src]);

  if (!src) return null;

  const iframe = inView ? (
    <iframe
      src={src}
      title={title}
      className={cn(
        'size-full border-0 bg-white',
        interactive ? 'pointer-events-none' : 'pointer-events-none',
      )}
      loading='lazy'
      tabIndex={-1}
      aria-hidden={!interactive}
    />
  ) : null;

  if (interactive) {
    return (
      <button
        ref={containerRef}
        type='button'
        className={cn(
          'relative h-full w-full cursor-zoom-in overflow-hidden bg-bg-weak-100 focus:outline-none',
          className,
        )}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {iframe}
      </button>
    );
  }

  return (
    <div ref={containerRef} className={cn('absolute inset-0 overflow-hidden bg-white', className)}>
      {iframe}
    </div>
  );
}

export default AttachmentPdfThumbnail;
