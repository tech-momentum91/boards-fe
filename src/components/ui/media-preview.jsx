import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine, RiDownloadLine } from 'react-icons/ri';

import MediaPreviewCaption from '@/components/ui/media-preview-caption';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as Button from '@/components/ui/button';
import { useMediaPreviewLayerLock } from '@/hooks/use-media-preview-layer-lock';
import { getOfficeDocumentIconColor, toAbsoluteAttachmentUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

const MediaPreview = ({ items = [], initialIndex = 0, open, onClose, customCaption = null }) => {
  const [index, setIndex] = useState(initialIndex);
  const videoRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const total = items.length;
  const current = items[index] ?? {};
  const isVideo = current.type === 'video';
  const isPdf = current.type === 'pdf';
  const isDocument = current.type === 'document';
  const isMatterport = current.type === 'matterport';
  const isPresentation = current.type === 'presentation';
  const isEmbed = isMatterport || isPresentation || isPdf;

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

  useEffect(() => {
    if (!open || !isVideo || !videoRef.current) return;
    videoRef.current.play().catch(() => {});
  }, [open, isVideo, current.src, index]);

  const download = useCallback(() => {
    const href = current.externalUrl || current.src;
    if (!href) return;
    const a = Object.assign(document.createElement('a'), {
      href,
      download: isMatterport || isPresentation ? undefined : current.alt || 'media',
      target: '_blank',
      rel: 'noreferrer',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [current.src, current.alt, current.externalUrl, isMatterport, isPresentation]);

  const openDocument = useCallback(() => {
    const href = toAbsoluteAttachmentUrl(current.externalUrl || current.src);
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  }, [current.externalUrl, current.src]);

  if (!open || total === 0) return null;

  return ReactDOM.createPortal(
    <div
      ref={layerRef}
      className='fixed inset-0 flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='media-preview-title'
    >
      <h2 id='media-preview-title' className='sr-only'>
        Media preview
      </h2>

      <div
        className={cn(
          'absolute inset-0 z-0',
          'bg-overlay backdrop-blur-[10px]',
          'animate-in fade-in-0 duration-200',
        )}
        aria-hidden
      />

      <div className='relative z-10 flex w-[min(80vw,960px)] max-w-full max-h-full flex-col items-stretch gap-3'>
        <div className='flex min-h-0 flex-1 items-center justify-center'>
          {isDocument ? (
            <div className='flex max-w-md flex-col items-center gap-4 rounded-12 bg-bg-white-0 px-8 py-10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]'>
              <FileFormatIcon.Root
                format={current.format || 'FILE'}
                size='medium'
                color={getOfficeDocumentIconColor(current.format)}
              />
              <p className='line-clamp-2 text-center text-label-sm text-text-main-900'>
                {current.alt || 'Document'}
              </p>
              <Button.Root type='button' size='small' onClick={openDocument}>
                Open file
              </Button.Root>
            </div>
          ) : isEmbed ? (
            <iframe
              key={current.embedUrl || current.src}
              src={current.embedUrl || current.src}
              title={
                current.alt ||
                (isPdf ? 'PDF preview' : isPresentation ? 'Link preview' : 'Matterport tour')
              }
              allow={isPdf ? undefined : 'fullscreen; xr-spatial-tracking'}
              allowFullScreen
              className='h-[min(82vh,720px)] w-full max-w-full rounded-12 border-0 bg-black shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
            />
          ) : isVideo ? (
            <video
              key={current.src}
              ref={videoRef}
              src={current.src}
              controls
              playsInline
              className='max-h-[82vh] max-w-full rounded-12 bg-black object-contain shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
            />
          ) : (
            <img
              key={current.src}
              src={current.src}
              alt={current.alt || ''}
              className='max-h-[82vh] max-w-full rounded-12 object-contain shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
              draggable={false}
            />
          )}
        </div>

        {customCaption ? (
          <MediaPreviewCaption
            {...customCaption}
            title={customCaption.title || current.alt || current.caption || ''}
            pageIndex={index}
            pageTotal={total}
            className='w-full shrink-0'
          />
        ) : current.caption || total > 1 ? (
          <div className='mt-3 flex self-center max-w-[60vw] select-none gap-2.5 text-[13px] text-white/75'>
            {current.caption ? <span className='truncate'>{current.caption}</span> : null}
            {total > 1 ? (
              <span className='shrink-0'>
                {index + 1} / {total}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label='Close'
        className='absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40'
      >
        <RiCloseLine size={20} />
      </button>

      {current.src ? (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            if (isDocument) {
              openDocument();
              return;
            }
            download();
          }}
          aria-label={
            isMatterport
              ? 'Open in Matterport'
              : isDocument
                ? 'Open file'
                : isPdf
                  ? 'Open PDF'
                  : 'Download'
          }
          className='absolute right-[60px] top-4 z-20 flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition-all hover:bg-black/40'
        >
          <RiDownloadLine size={18} />
        </button>
      ) : null}

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

export default MediaPreview;
