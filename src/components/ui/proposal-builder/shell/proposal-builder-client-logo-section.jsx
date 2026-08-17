import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiUploadLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import { logoDisplaySrc } from '@/api/crmProposals';
import { cn } from '@/utils/cn';

const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function isLogoActive(candidateUrl, selectedLogoUrl) {
  if (!candidateUrl || !selectedLogoUrl) return false;
  return logoDisplaySrc(candidateUrl) === logoDisplaySrc(selectedLogoUrl);
}

function logoKey(candidate, index) {
  return candidate?.id || candidate?.url || `logo-${index}`;
}

/**
 * Client logo picker — Figma 31602:1870687 horizontal carousel + upload in header.
 */
const ProposalBuilderClientLogoSection = ({
  logoCandidates = [],
  selectedLogoUrl,
  onSelectLogo,
  onUploadLogo,
  themeLoading,
  readOnly,
  className,
}) => {
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro?.disconnect();
    };
  }, [logoCandidates.length, themeLoading, updateScrollState]);

  const scrollByCard = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-logo-card]');
    const cardWidth = card?.offsetWidth ?? el.clientWidth / 3;
    el.scrollBy({ left: direction * (cardWidth + 8), behavior: 'smooth' });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || readOnly) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      onUploadLogo?.(null, { error: 'Use PNG, JPG, WebP, or SVG.' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      onUploadLogo?.(null, { error: 'Logo must be 2 MB or smaller.' });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) onUploadLogo?.(dataUrl);
    });
    reader.addEventListener(
      'error',
      () => {
        onUploadLogo?.(null, { error: 'Could not read that file.' });
      },
      { once: true },
    );
    reader.readAsDataURL(file);
  };

  const items = logoCandidates.filter((c) => c?.url);
  const showCarousel = themeLoading || items.length > 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-label-sm font-semibold text-text-main-900'>Client Logo</p>
        <div className='flex items-center gap-0.5'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='xsmall'
            disabled={readOnly || themeLoading || !canScrollLeft}
            aria-label='Previous logos'
            onClick={() => scrollByCard(-1)}
          >
            <Button.Icon as={RiArrowLeftSLine} />
          </Button.Root>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='xsmall'
            disabled={readOnly || themeLoading || !canScrollRight}
            aria-label='Next logos'
            onClick={() => scrollByCard(1)}
          >
            <Button.Icon as={RiArrowRightSLine} />
          </Button.Root>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='xsmall'
            disabled={readOnly || themeLoading}
            aria-label='Upload logo'
            onClick={() => fileInputRef.current?.click()}
          >
            <Button.Icon as={RiUploadLine} />
          </Button.Root>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type='file'
        accept={ACCEPTED_LOGO_TYPES.join(',')}
        className='sr-only'
        aria-hidden
        onChange={handleFileChange}
      />

      {themeLoading ? (
        <p className='text-paragraph-x-small text-text-soft-400'>Loading logos from website…</p>
      ) : null}

      {showCarousel ? (
        <div
          ref={scrollRef}
          className='no-scrollbar flex w-full gap-2 overflow-x-auto scroll-smooth'
        >
          {themeLoading
            ? [0, 1, 2].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  data-logo-card
                  className='relative h-20 min-w-[calc((100%-16px)/3)] flex-[1_0_calc((100%-16px)/3)] shrink-0 animate-pulse rounded-lg border border-stroke-soft-200/40 bg-bg-weak-100'
                />
              ))
            : items.map((candidate, index) => {
                const rawUrl = candidate.url;
                const active = isLogoActive(rawUrl, selectedLogoUrl);
                const previewSrc = logoDisplaySrc(rawUrl);
                return (
                  <button
                    key={logoKey(candidate, index)}
                    type='button'
                    data-logo-card
                    disabled={readOnly}
                    title={candidate.label || 'Logo'}
                    className={cn(
                      'relative flex h-20 min-w-[calc((100%-16px)/3)] flex-[1_0_calc((100%-16px)/3)] shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200/40 bg-bg-weak-100 px-4 py-1.5 transition hover:border-stroke-sub-300',
                      readOnly && 'pointer-events-none opacity-60',
                    )}
                    onClick={() => onSelectLogo?.(rawUrl)}
                  >
                    {active ? (
                      <span
                        className='absolute right-2 top-2 size-2 rounded-full bg-success-base'
                        aria-hidden
                      />
                    ) : null}
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt={candidate.label || 'Logo option'}
                        className='max-h-14 max-w-full object-contain'
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className='text-lg font-bold text-neutral-200'>LOGO</span>
                    )}
                  </button>
                );
              })}
        </div>
      ) : (
        <p className='text-paragraph-x-small text-text-soft-400'>
          No logos found on the website. Upload one using the button above.
        </p>
      )}
    </div>
  );
};

export default ProposalBuilderClientLogoSection;
