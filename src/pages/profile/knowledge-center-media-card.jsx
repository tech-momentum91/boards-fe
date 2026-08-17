import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiDeleteBinLine, RiFileTextLine, RiPencilLine } from 'react-icons/ri';

import AttachmentPdfThumbnail from '@/components/ui/attachment-pdf-thumbnail';
import AttachmentDocumentThumbnail from '@/components/ui/attachment-document-thumbnail';
import * as CompactButton from '@/components/ui/compact-button';
import MediaPreview from '@/components/ui/media-preview';
import * as Tag from '@/components/ui/tag';
import { useVideoPoster, shouldUseVideoPoster } from '@/hooks/use-video-poster';
import {
  MEDIA_TYPE_BADGE,
  isPresentationMediaType,
} from '@/pages/profile/knowledge-center-media-constants';
import {
  getFileExtension,
  isOfficeDocumentFileUrl,
  isPdfFileUrl,
  resolveFileUrl,
  toAbsoluteAttachmentUrl,
} from '@/lib/utils';
import {
  buildKnowledgeCenterMediaCaption,
  buildKnowledgeCenterMediaPreviewItems,
  getPresentationEmbedUrl,
  hasKnowledgeCenterMediaPreview,
  resolveMediaThumbnailUrl,
} from '@/utils/knowledge-center-media-preview';
import { cn } from '@/utils/cn';

const THUMB_HEIGHT = 140;
const GRID_GAP = 2;

/** Figma 30360:352011 — right edge V-notch (5px), corners rightmost, center indented. */
const RIBBON_CLIP_PATH = 'polygon(0 0, 100% 0, calc(100% - 5px) 50%, 100% 100%, 0 100%)';

function MediaRibbon({ mediaType, className }) {
  const badge = MEDIA_TYPE_BADGE[mediaType] ?? {
    label: mediaType || 'Media',
    color: '#375DFB',
  };
  const color = badge.color ?? '#375DFB';

  return (
    <div
      className={cn(
        'absolute bottom-[10px] left-0 z-10 drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)]',
        className,
      )}
      aria-hidden
    >
      <span
        className='inline-flex items-center justify-center whitespace-nowrap py-[2px] pl-2 pr-2.5 uppercase text-label-xs text-white'
        style={{
          backgroundColor: color,
          clipPath: RIBBON_CLIP_PATH,
        }}
      >
        {badge.label}
      </span>
    </div>
  );
}

function MediaThumbnail({ src, mediaType, className, title }) {
  const isVideo = shouldUseVideoPoster(src, mediaType);
  const isPdf = isPdfFileUrl(src);
  const isOfficeDocument = isOfficeDocumentFileUrl(src);
  const { containerRef, videoRef, inView, failed, loading } = useVideoPoster(src, isVideo);

  const pdfSrc = useMemo(() => {
    if (!isPdf) return '';
    return toAbsoluteAttachmentUrl(resolveFileUrl(src));
  }, [isPdf, src]);

  const officeFormat = useMemo(() => {
    if (!isOfficeDocument) return 'FILE';
    return getFileExtension(src.split('/').pop() || src).toUpperCase() || 'FILE';
  }, [isOfficeDocument, src]);

  if (!src) return null;

  if (isOfficeDocument) {
    return (
      <AttachmentDocumentThumbnail
        format={officeFormat}
        className={className}
        ariaLabel={title || 'Document'}
      />
    );
  }

  if (isPdf) {
    return (
      <AttachmentPdfThumbnail
        src={pdfSrc}
        className={className}
        lazy
        title={title || 'PDF preview'}
      />
    );
  }

  if (isVideo) {
    return (
      <div ref={containerRef} className={cn('absolute inset-0 overflow-hidden', className)}>
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
        {loading ? <div className='absolute inset-0 bg-[#20232d]' aria-hidden /> : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=''
      className={cn('absolute inset-0 size-full object-cover', className)}
      loading='lazy'
    />
  );
}

function GridCell({ src, className, overlayCount, mediaType, title }) {
  return (
    <div className={cn('relative min-h-0 min-w-0 flex-1 overflow-hidden', className)}>
      <div className='absolute inset-0 overflow-hidden'>
        {src ? <MediaThumbnail src={src} mediaType={mediaType} title={title} /> : null}
        {overlayCount > 0 ? (
          <>
            {src ? <div className='absolute inset-0 bg-black/40' aria-hidden /> : null}
            <p className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-title-h6 font-semibold text-white'>
              +{overlayCount}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PresentationEmbedThumbnail({ url, title, className }) {
  const embedUrl = useMemo(() => getPresentationEmbedUrl(url), [url]);
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!embedUrl) return undefined;

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
  }, [embedUrl]);

  if (!embedUrl) {
    return (
      <RiFileTextLine
        className='absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-text-soft-400'
        aria-hidden
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden bg-[#20232d]', className)}
    >
      {inView ? (
        <iframe
          src={embedUrl}
          title={title || 'Presentation preview'}
          className='pointer-events-none size-full border-0'
          loading='lazy'
          tabIndex={-1}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function ThumbnailArea({ row }) {
  const ribbon = <MediaRibbon mediaType={row.media_type} />;
  const thumbTitle = row.media_name || row.name || 'Media';

  const presentationEmbedUrl = useMemo(() => {
    if (!isPresentationMediaType(row.media_type) || !row.presentation_url) return '';
    return getPresentationEmbedUrl(row.presentation_url);
  }, [row.media_type, row.presentation_url]);

  const urls = useMemo(() => {
    const { media_type: mediaType } = row;
    const mapThumb = (path) => {
      const resolved = resolveFileUrl(path);
      const thumb = resolveMediaThumbnailUrl(resolved, mediaType);
      if (isPresentationMediaType(mediaType)) {
        if (thumb) return thumb;
        if (isPdfFileUrl(resolved) || isOfficeDocumentFileUrl(resolved)) return resolved;
        return '';
      }
      return thumb || resolved;
    };

    const fromApi = Array.isArray(row.thumbnail_urls) ? row.thumbnail_urls : [];
    if (fromApi.length > 0) {
      return fromApi.map(mapThumb).filter(Boolean);
    }
    if (row.matterport_url) {
      const thumb = mapThumb(row.matterport_url);
      return thumb ? [thumb] : [];
    }
    return [];
  }, [row.thumbnail_urls, row.matterport_url, row.media_type]);

  const attachmentCount = row.attachment_count ?? urls.length;
  const showGrid = attachmentCount > 1 && urls.length > 0;

  if (presentationEmbedUrl) {
    return (
      <div
        className='relative w-full overflow-hidden rounded-[6px] bg-[#20232d]'
        style={{ height: THUMB_HEIGHT }}
      >
        <PresentationEmbedThumbnail url={row.presentation_url} title={thumbTitle} />
        {ribbon}
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div
        className='relative flex w-full items-center justify-center rounded-[6px] bg-[#20232d]'
        style={{ height: THUMB_HEIGHT }}
      >
        <span className='text-label-xs text-text-soft-400'>No preview</span>
      </div>
    );
  }

  if (showGrid) {
    const slots = [0, 1, 2, 3].map((i) => urls[i] ?? null);
    const overflowCount = attachmentCount > 4 ? attachmentCount - 4 : 0;

    return (
      <div
        className='relative flex w-full flex-col overflow-hidden rounded-[6px] bg-[#20232d]'
        style={{ height: THUMB_HEIGHT, gap: GRID_GAP }}
      >
        <div className='flex min-h-0 flex-1' style={{ gap: GRID_GAP }}>
          <GridCell
            src={slots[0]}
            mediaType={row.media_type}
            title={thumbTitle}
            className='overflow-hidden rounded-tl-[6px]'
          />
          <GridCell
            src={slots[1]}
            mediaType={row.media_type}
            title={thumbTitle}
            className='overflow-hidden rounded-tr-[6px]'
          />
        </div>
        <div className='flex min-h-0 flex-1' style={{ gap: GRID_GAP }}>
          <GridCell
            src={slots[2]}
            mediaType={row.media_type}
            title={thumbTitle}
            className='rounded-bl-[6px]'
          />
          <GridCell
            src={slots[3]}
            mediaType={row.media_type}
            title={thumbTitle}
            className='rounded-br-[6px]'
            overlayCount={overflowCount}
          />
        </div>
        {ribbon}
      </div>
    );
  }

  return (
    <div
      className='relative w-full overflow-hidden rounded-[6px] bg-[#20232d]'
      style={{ height: THUMB_HEIGHT }}
    >
      <MediaThumbnail src={urls[0]} mediaType={row.media_type} title={thumbTitle} />
      {ribbon}
    </div>
  );
}

function KnowledgeCenterMediaCard({ row, onEdit, onDelete, isDeleting = false }) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const visibleTags = tags.slice(0, 2);
  const overflowCount = tags.length - visibleTags.length;

  const subtitle = useMemo(() => {
    const centerName = row.center_name;
    const floor = row.floor;
    const centerCity = row.center_city;

    if (centerName) {
      let text = centerName;
      if (floor) text += `, ${floor}`;
      if (centerCity) text += ` (${centerCity})`;
      return text;
    }

    return [floor, centerCity].filter(Boolean).join(', ');
  }, [row.center_name, row.floor, row.center_city]);

  const previewItems = useMemo(() => buildKnowledgeCenterMediaPreviewItems(row), [row]);
  const previewCaption = useMemo(() => buildKnowledgeCenterMediaCaption(row), [row]);
  const canPreview = hasKnowledgeCenterMediaPreview(row);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleOpenPreview = useCallback(() => {
    if (!canPreview) return;
    setPreviewOpen(true);
  }, [canPreview]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!canPreview) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOpenPreview();
      }
    },
    [canPreview, handleOpenPreview],
  );

  const handleEditClick = useCallback(
    (event) => {
      event.stopPropagation();
      if (!onEdit || isDeleting) return;
      onEdit(row);
    },
    [isDeleting, onEdit, row],
  );

  const handleDeleteClick = useCallback(
    (event) => {
      event.stopPropagation();
      if (!onDelete || isDeleting) return;
      onDelete(row);
    },
    [isDeleting, onDelete, row],
  );

  return (
    <>
      <article
        className={cn(
          'group flex w-full flex-col items-start gap-3 rounded-[10px] border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] px-2 pb-4 pt-2 shadow-regular-xs',
          canPreview && 'cursor-pointer transition-shadow hover:shadow-regular-sm',
        )}
        aria-label={row.media_name || row.name}
        role={canPreview ? 'button' : undefined}
        tabIndex={canPreview ? 0 : undefined}
        onClick={canPreview ? handleOpenPreview : undefined}
        onKeyDown={canPreview ? handleKeyDown : undefined}
      >
        <div className='relative w-full'>
          <ThumbnailArea row={row} />
          {onEdit || onDelete ? (
            <div className='absolute right-2 top-2 z-20 hidden items-center gap-1 group-hover:flex'>
              {onEdit ? (
                <CompactButton.Root
                  type='button'
                  size='large'
                  variant='ghost'
                  className='bg-bg-white-0 shadow-regular-xs'
                  aria-label={`Edit ${row.media_name || row.name || 'media'}`}
                  disabled={isDeleting}
                  onClick={handleEditClick}
                >
                  <CompactButton.Icon as={RiPencilLine} />
                </CompactButton.Root>
              ) : null}
              {onDelete ? (
                <CompactButton.Root
                  type='button'
                  size='large'
                  variant='ghost'
                  className='bg-bg-white-0 shadow-regular-xs'
                  aria-label={`Delete ${row.media_name || row.name || 'media'}`}
                  disabled={isDeleting}
                  onClick={handleDeleteClick}
                >
                  <CompactButton.Icon as={RiDeleteBinLine} />
                </CompactButton.Root>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className='flex w-full flex-col gap-1 px-1.5'>
          <p className='line-clamp-1 text-label-sm font-semibold text-text-main-900 capitalize'>
            {row.media_name || row.name}
          </p>
          {subtitle ? (
            <p className='line-clamp-1 text-label-xs text-text-soft-400 capitalize'>{subtitle}</p>
          ) : null}
        </div>

        {tags.length > 0 ? (
          <div className='flex flex-wrap items-center gap-1.5 px-1.5'>
            {visibleTags.map((tag) => (
              <Tag.Root key={tag} variant='stroke' className='h-[22px] shrink-0'>
                {tag}
              </Tag.Root>
            ))}
            {overflowCount > 0 ? (
              <Tag.Root variant='stroke' className='h-[22px] shrink-0'>
                +{overflowCount}
              </Tag.Root>
            ) : null}
          </div>
        ) : null}
      </article>

      <MediaPreview
        items={previewItems}
        customCaption={previewCaption}
        initialIndex={0}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}

export default memo(KnowledgeCenterMediaCard);
