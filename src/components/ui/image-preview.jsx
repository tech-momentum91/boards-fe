import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiUploadLine,
} from 'react-icons/ri';

import { useMediaPreviewLayerLock } from '@/hooks/use-media-preview-layer-lock';
import { cn } from '@/utils/cn';

const ImagePreview = ({
  images = [],
  initialIndex = 0,
  open,
  onClose,
  onUpdate,
  onRemove,
  isUpdateDisabled = false,
  isRemoveDisabled = false,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const layerRef = useRef(null);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const total = images.length;
  const current = images[index] ?? {};

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useMediaPreviewLayerLock(open, layerRef);

  const download = useCallback(() => {
    if (!current.src) return;
    const a = Object.assign(document.createElement('a'), {
      href: current.src,
      download: current.alt || 'image',
      target: '_blank',
      rel: 'noreferrer',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [current.src, current.alt]);

  if (!open || total === 0) return null;

  return ReactDOM.createPortal(
    <div
      ref={layerRef}
      className='fixed inset-0 flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='image-preview-title'
    >
      <h2 id='image-preview-title' className='sr-only'>
        Image preview
      </h2>

      <div
        className={cn(
          'absolute inset-0 z-0',
          'bg-overlay backdrop-blur-[10px]',
          'animate-in fade-in-0 duration-200',
        )}
        aria-hidden
      />

      <div className='relative z-10 flex max-h-full max-w-full flex-col items-center gap-3'>
        <img
          key={current.src}
          src={current.src}
          alt={current.alt || ''}
          className='max-h-[82vh] max-w-[80vw] rounded-12 object-contain shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
          draggable={false}
        />
        {(current.caption || total > 1) && (
          <div className='flex max-w-[60vw] select-none gap-2.5 text-[13px] text-white/75'>
            {current.caption && <span className='truncate'>{current.caption}</span>}
            {total > 1 && (
              <span className='shrink-0'>
                {index + 1} / {total}
              </span>
            )}
          </div>
        )}
      </div>

      <div className='absolute right-4 top-4 z-20 flex items-center gap-2'>
        {onUpdate ? (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onUpdate();
            }}
            disabled={isUpdateDisabled}
            aria-label='Update layout'
            className='flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-40'
          >
            <RiUploadLine size={18} />
          </button>
        ) : null}

        {onRemove ? (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={isRemoveDisabled}
            aria-label='Remove layout'
            className='flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-40'
          >
            <RiDeleteBinLine size={18} />
          </button>
        ) : null}

        {current.src ? (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              download();
            }}
            aria-label='Download'
            className='flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40'
          >
            <RiDownloadLine size={18} />
          </button>
        ) : null}

        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label='Close'
          className='flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40'
        >
          <RiCloseLine size={20} />
        </button>
      </div>

      {total > 1 ? (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          disabled={index === 0}
          aria-label='Previous'
          className='absolute left-4 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-25'
        >
          <RiArrowLeftSLine size={26} />
        </button>
      ) : null}

      {total > 1 ? (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          disabled={index === total - 1}
          aria-label='Next'
          className='absolute right-4 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-25'
        >
          <RiArrowRightSLine size={26} />
        </button>
      ) : null}
    </div>,
    document.body,
  );
};

export default ImagePreview;
