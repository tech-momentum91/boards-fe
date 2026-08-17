import React, { useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/cn';
import ImagePreview from '@/components/ui/image-preview';

function sanitizeForDisplay(html) {
  if (html == null) return '';
  return String(html)
    .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replaceAll(/javascript:/gi, '')
    .replaceAll(/on\w+\s*=/gi, 'data-removed=');
}

/**
 * Root-relative paths in API HTML (e.g. /files/photo.png) must use the API host;
 * otherwise the browser requests them from the SPA origin and images 404.
 */
function resolveImgSrcForDisplay(raw, apiBase) {
  if (raw == null || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return trimmed;
  const base = apiBase?.replace(/\/$/, '') ?? '';
  if (!base) return trimmed;
  if (trimmed.startsWith('/')) return `${base}${trimmed}`;
  return `${base}/${trimmed}`;
}

/**
 * Encode image URLs so browsers can load paths with spaces or other reserved chars.
 * Uses decodeURI before encodeURI when possible to avoid double-encoding valid %XX sequences.
 */
function normalizeImgSrc(raw) {
  if (raw == null || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  try {
    return encodeURI(decodeURI(trimmed));
  } catch {
    try {
      return encodeURI(trimmed);
    } catch {
      return raw;
    }
  }
}

function processImgSrcsInHtml(html, apiBase) {
  return html.replaceAll(/<img\b[^>]*>/gi, (tag) =>
    tag.replace(/\bsrc\s*=\s*(["'])([^"']*)\1/i, (match, quote, src) => {
      const resolved = resolveImgSrcForDisplay(src, apiBase);
      const encoded = normalizeImgSrc(resolved);
      return `src=${quote}${encoded}${quote}`;
    }),
  );
}

/**
 * @param {string} html
 * @param {string} [className]
 */
const ReleaseNoteHtmlContent = ({ html, className }) => {
  const apiBase = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const contentRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);
  const safe = useMemo(
    () => processImgSrcsInHtml(sanitizeForDisplay(html), apiBase),
    [html, apiBase],
  );
  const handleImageClick = useCallback((event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const imgEl = target.closest('img');
    if (!(imgEl instanceof HTMLImageElement)) return;

    const root = contentRef.current;
    if (!(root instanceof HTMLElement)) return;

    const imageElements = [...root.querySelectorAll('img')].filter(
      (img) => img instanceof HTMLImageElement && Boolean(img.src),
    );
    if (imageElements.length === 0) return;

    const images = imageElements.map((img) => ({
      src: img.src,
      alt: img.alt || img.title || 'Release note image',
      caption: img.alt || img.title || '',
    }));
    const clickedSrc = imgEl.src;
    const clickedIndex = Math.max(
      0,
      imageElements.findIndex((img) => img.src === clickedSrc),
    );

    setLightboxImages(images);
    setLightboxIndex(clickedIndex);
    setLightboxOpen(true);
  }, []);

  if (!safe.trim()) return null;

  return (
    <>
      <ImagePreview
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
      <div
        ref={contentRef}
        className={cn(
          'release-note-prose text-paragraph-sm text-text-main-900',
          '[&_a]:text-primary-base [&_a]:underline',
          '[&_img]:my-3 [&_img]:max-h-[min(60vh,480px)] [&_img]:w-auto [&_img]:max-w-full [&_img]:cursor-pointer [&_img]:rounded-md [&_img]:object-contain',
          '[&_p]:mb-3 [&_p]:leading-relaxed',
          '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_blockquote]:border-l-2 [&_blockquote]:border-stroke-soft-200 [&_blockquote]:pl-4 [&_blockquote]:text-text-sub-600',
          '[&_code]:rounded [&_code]:bg-bg-weak-100 [&_code]:px-1 [&_code]:text-label-sm',
          '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-bg-weak-100 [&_pre]:p-3',
          className,
        )}
        onClick={handleImageClick}
        // eslint-disable-next-line react/no-danger -- API HTML; scripts/event handlers stripped
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </>
  );
};

export default ReleaseNoteHtmlContent;
