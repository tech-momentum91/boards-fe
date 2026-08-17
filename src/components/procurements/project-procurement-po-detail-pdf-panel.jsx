import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiDownloadLine, RiFilePdf2Line, RiSubtractLine, RiAddLine } from 'react-icons/ri';

import {
  buildPoPreviewEmbedUrl,
  DUMMY_PO_PREVIEW_PDF_URL,
} from '@/components/procurements/constants';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';

export default function ProjectProcurementPoDetailPdfPanel({
  filename = 'PO-2026-DRAFT.pdf',
  pages = 5,
  zoom: initialZoom = 100,
  src = DUMMY_PO_PREVIEW_PDF_URL,
  className,
}) {
  const [zoom, setZoom] = useState(initialZoom);
  const zoomScale = zoom / 100;
  const embedSrc = useMemo(() => buildPoPreviewEmbedUrl(src), [src]);

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  const handleDownload = useCallback(() => {
    if (!src) return;

    const anchor = Object.assign(document.createElement('a'), {
      href: src,
      download: filename || 'purchase-order.pdf',
      target: '_blank',
      rel: 'noreferrer',
    });
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [filename, src]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className='flex shrink-0 items-center justify-between border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-3'>
        <div className='flex min-w-0 items-center gap-1.5'>
          <RiFilePdf2Line className='size-6 shrink-0 text-[#df1c41]' aria-hidden />
          <span className='truncate text-paragraph-sm font-medium text-text-sub-500'>
            {filename}
          </span>
          {pages ? (
            <span className='shrink-0 text-paragraph-sm text-text-soft-400'>
              {pages} {pages === 1 ? 'Page' : 'Pages'}
            </span>
          ) : null}
        </div>

        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-2'>
            <CompactButton.Root
              type='button'
              variant='stroke'
              size='medium'
              className='shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              aria-label='Zoom out'
              onClick={() => setZoom((current) => Math.max(25, current - 10))}
            >
              <CompactButton.Icon as={RiSubtractLine} />
            </CompactButton.Root>
            <span className='text-[12px] font-semibold uppercase tracking-[0.48px] text-text-soft-400'>
              {zoom}%
            </span>
            <CompactButton.Root
              type='button'
              variant='stroke'
              size='medium'
              className='shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              aria-label='Zoom in'
              onClick={() => setZoom((current) => Math.min(200, current + 10))}
            >
              <CompactButton.Icon as={RiAddLine} />
            </CompactButton.Root>
          </div>

          <span className='h-5 w-px bg-stroke-soft-200' aria-hidden />

          <CompactButton.Root
            type='button'
            variant='stroke'
            size='medium'
            className='shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            aria-label='Download PDF'
            onClick={handleDownload}
            disabled={!src}
          >
            <CompactButton.Icon as={RiDownloadLine} />
          </CompactButton.Root>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-auto bg-bg-weak-100'>
        {embedSrc ? (
          <div
            className='mx-auto min-h-full w-full origin-top'
            style={{
              transform: `scale(${zoomScale})`,
              width: `${100 / zoomScale}%`,
              minHeight: `${100 / zoomScale}%`,
            }}
          >
            <iframe
              src={embedSrc}
              title={filename}
              className='h-full min-h-[720px] w-full border-0 bg-white'
            />
          </div>
        ) : (
          <div className='flex h-full items-center justify-center'>
            <p className='text-paragraph-sm text-text-soft-400'>PO preview will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
