import React, { useEffect, useRef } from 'react';
import { RiCloseLine, RiImageLine, RiPlayFill } from 'react-icons/ri';

import { getVariationMediaItems } from '@/components/products/variation-media';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';

export function normalizeGalleryItems(galleryImages, fallbackImageUrl) {
  const rawItems =
    Array.isArray(galleryImages) && galleryImages.length > 0
      ? galleryImages
      : fallbackImageUrl
        ? [fallbackImageUrl]
        : [];

  return rawItems.map((item, index) => {
    if (typeof item === 'string') {
      return {
        url: item,
        isVideo: index === rawItems.length - 1 && rawItems.length >= 5,
      };
    }
    return {
      url: item.url,
      isVideo: Boolean(item.isVideo),
    };
  });
}

function appendGalleryItem(items, seenUrls, url, meta = {}) {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl || seenUrls.has(normalizedUrl)) return;

  seenUrls.add(normalizedUrl);
  items.push({
    id: `${meta.variationId || 'main'}-${items.length}-${normalizedUrl}`,
    url: normalizedUrl,
    isVideo: Boolean(meta.isVideo),
    variationId: meta.variationId ?? null,
    variationName: meta.variationName ?? null,
  });
}

export function buildProductGalleryItems(product = {}) {
  const items = [];
  const seenUrls = new Set();

  normalizeGalleryItems(product.galleryImages, product.imageUrl).forEach((item) => {
    appendGalleryItem(items, seenUrls, item.url, { isVideo: item.isVideo });
  });

  (product.variations ?? []).forEach((variation) => {
    const variationMeta = {
      variationId: variation.id,
      variationName: variation.name || variation.attributeValue,
    };

    getVariationMediaItems(variation).forEach((item) => {
      appendGalleryItem(items, seenUrls, item.url, {
        ...variationMeta,
        isVideo: item.type === 'video',
      });
    });
  });

  return items;
}

export function findFirstGalleryIndexForVariation(items = [], variationId) {
  if (!variationId) return -1;
  return items.findIndex((item) => item.variationId === variationId);
}

export default function ProductDetailImageGallery({
  items = [],
  selectedIndex = 0,
  onSelectIndex,
  onRemoveImage,
  isRemovingImage = false,
  productName = 'Product',
}) {
  const thumbnailRefs = useRef([]);
  const selectedItem = items[selectedIndex];
  const mainImageUrl = selectedItem?.url;

  useEffect(() => {
    thumbnailRefs.current[selectedIndex]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selectedIndex, items.length]);

  return (
    <div className='relative aspect-square w-full max-h-[500px] shrink-0 bg-[#31353f] lg:aspect-auto lg:size-[500px]'>
      {mainImageUrl ? (
        <>
          <img
            src={mainImageUrl}
            alt={selectedItem?.variationName || productName}
            className='pointer-events-none absolute inset-0 size-full object-contain'
          />
          {selectedItem?.isVideo ? (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
              <div className='flex size-14 items-center justify-center rounded-full bg-black/40'>
                <RiPlayFill className='size-8 text-white' />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className='flex size-full items-center justify-center'>
          <RiImageLine className='size-12 text-white/40' />
        </div>
      )}

      {items.length > 0 ? (
        <div
          className={cn(
            'absolute bottom-5 left-5 right-5 flex h-[90px] gap-1 overflow-x-auto rounded-xl',
            'border border-white/20 bg-[#31353f] p-1',
            'shadow-[0px_16px_32px_-12px_rgba(88,92,95,0.1)]',
            '[scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin]',
            '[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/35',
            '[&::-webkit-scrollbar-track]:bg-transparent',
          )}
        >
          {items.map((item, index) => {
            const isSelected = selectedIndex === index;

            return (
              <button
                key={item.id || `${item.url}-${index}`}
                ref={(node) => {
                  thumbnailRefs.current[index] = node;
                }}
                type='button'
                onClick={() => onSelectIndex?.(index)}
                className={cn(
                  'relative h-full w-[90px] shrink-0 overflow-hidden rounded-lg bg-[#f6f6f6] transition-opacity',
                  isSelected ? 'border-2 border-white opacity-100' : 'opacity-50',
                )}
                aria-label={
                  item.variationName
                    ? `View ${item.variationName} media ${index + 1}`
                    : `View image ${index + 1}`
                }
                aria-pressed={isSelected}
              >
                {item.url ? (
                  <img
                    src={item.url}
                    alt=''
                    className={cn(
                      'pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-none -translate-x-1/2 -translate-y-1/2',
                      isSelected ? 'object-contain' : 'size-full object-cover',
                    )}
                  />
                ) : (
                  <div className='flex size-full items-center justify-center'>
                    <RiImageLine className='size-5 text-text-soft-400' />
                  </div>
                )}

                {item.isVideo ? (
                  <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20'>
                    <RiPlayFill className='size-6 text-white/80' />
                  </div>
                ) : null}

                {isSelected && onRemoveImage ? (
                  <CompactButton.Root
                    type='button'
                    variant='ghost'
                    size='medium'
                    disabled={isRemovingImage}
                    className='absolute right-2 top-2 z-10 rounded-md bg-error-dark p-px shadow-regular-xs hover:bg-error-dark disabled:opacity-60'
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveImage(index);
                    }}
                    aria-label='Remove image'
                  >
                    <CompactButton.Icon
                      as={RiCloseLine}
                      className='size-[18px] text-static-white'
                    />
                  </CompactButton.Root>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
