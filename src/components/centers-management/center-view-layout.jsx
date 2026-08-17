import React from 'react';
import { RiStackFill } from 'react-icons/ri';

import { buildLayoutAnnotationPath } from '@/utils/layout-annotation-filter-utils';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';

/**
 * Main content for the Space tab when the list (layout) tool is active.
 * Toolbar and shell live in center-view-space.jsx.
 */
const CenterViewLayout = ({
  layouts = [],
  isLoading = false,
  error = null,
  centerId = '',
  onLayoutClick,
}) => {
  if (isLoading) {
    return (
      <div className='flex min-h-[220px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading layouts...
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-error-lighter bg-bg-weak-50 px-6 text-paragraph-sm text-error-base'>
        {String(error)}
      </div>
    );
  }

  if (layouts.length === 0) {
    return (
      <div className='flex min-h-[240px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 py-12 text-center'>
        <p className='text-paragraph-sm text-text-sub-600'>
          No layouts created yet. Use{' '}
          <span className='font-medium text-text-strong-950'>Add Layout</span> to upload the floor
          plan.
        </p>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-wrap items-center gap-10'>
      {layouts.map((layout) => {
        const floorLabel = layout?.block_floor_id
          ? String(layout.block_floor_id)
          : layout?.floor
            ? `Floor ${layout.floor}`
            : 'Floor -';
        const imgSrc = toLayoutAssetUrl(layout?.thumbnail || layout?.image);
        const layoutKey = layout?.name ?? layout?.id ?? '';
        return (
          <div
            key={layoutKey || String(layout)}
            className='flex flex-col gap-2 rounded-2xl border border-stroke-soft-200 bg-bg-weak-100 p-2'
          >
            <button
              type='button'
              className='h-[300px] w-[500px] text-left hover:cursor-pointer'
              onClick={() => {
                const floorRef = String(layout?.name ?? layout?.id ?? '').trim();
                const cid = String(centerId || '').trim();
                const path = buildLayoutAnnotationPath(cid, floorRef);
                if (path) {
                  window.open(path, '_blank', 'noopener,noreferrer');
                }
                onLayoutClick?.(layout);
              }}
            >
              <div className='h-full w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-50'>
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={layout?.name || 'Layout'}
                    className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]'
                  />
                ) : (
                  <div className='flex h-full items-center justify-center text-paragraph-sm text-text-sub-600'>
                    No preview
                  </div>
                )}
              </div>
            </button>
            <div className='flex min-w-0 items-center gap-1.5'>
              <RiStackFill className='size-4 shrink-0 text-text-sub-600' />
              <span className='text-paragraph-sm font-medium font-semibold text-text-main-900'>
                Floor {floorLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CenterViewLayout;
