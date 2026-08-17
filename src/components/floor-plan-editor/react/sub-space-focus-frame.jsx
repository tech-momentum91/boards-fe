import React, { useMemo } from 'react';

import * as Badge from '@/components/ui/badge';
import {
  LAYOUT_FOCUS_FRAME_PADDING_PX,
  LAYOUT_FOCUS_FRAME_STROKE_COLOR,
} from '@/constants/layout/focus-constants';
import { getLayoutInventoryTypeBadgeColor } from '@/utils/layout-inventory-badge';

import { computeAnnotationBBox } from '../core/annotation-bounds.js';
import { buildSubSpaceFocusOutline } from '../core/focus-outline.js';

/**
 * Border + title tab for sub-space mode (Save / Close live in the host viewport overlay).
 *
 * @param {{
 *   annotation: object,
 *   imageWidth: number,
 *   imageHeight: number,
 *   title: string,
 *   inventoryType?: string,
 * }} props
 */
export function SubSpaceFocusFrame({
  annotation,
  imageWidth,
  imageHeight,
  title,
  inventoryType = '',
}) {
  const outline = useMemo(
    () =>
      buildSubSpaceFocusOutline(annotation, imageWidth, imageHeight, LAYOUT_FOCUS_FRAME_PADDING_PX),
    [annotation, imageWidth, imageHeight],
  );

  const bbox = useMemo(
    () => computeAnnotationBBox(annotation, imageWidth, imageHeight),
    [annotation, imageWidth, imageHeight],
  );

  if (!outline || !bbox) return null;

  const frameTop = outline.kind === 'rect' ? outline.y : bbox.y;
  const frameLeft = outline.kind === 'rect' ? outline.x : bbox.x;
  const tabTop = Math.max(0, frameTop);
  const tabLeft = frameLeft;
  const strokeWidth = outline.strokeWidth ?? 1;

  return (
    <div
      className='pointer-events-none absolute inset-0 z-[25]'
      style={{ width: imageWidth, height: imageHeight }}
    >
      <svg
        className='pointer-events-none absolute left-0 top-0 overflow-visible'
        width={imageWidth}
        height={imageHeight}
        aria-hidden
      >
        {outline.kind === 'rect' ? (
          <rect
            x={outline.x}
            y={outline.y}
            width={outline.width}
            height={outline.height}
            rx={outline.rx}
            ry={outline.rx}
            fill='none'
            stroke={LAYOUT_FOCUS_FRAME_STROKE_COLOR}
            strokeWidth={strokeWidth}
          />
        ) : outline.kind === 'polygon' ? (
          <polygon
            points={outline.points}
            fill='none'
            stroke={LAYOUT_FOCUS_FRAME_STROKE_COLOR}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
            strokeLinecap='round'
          />
        ) : (
          <polyline
            points={outline.points}
            fill='none'
            stroke={LAYOUT_FOCUS_FRAME_STROKE_COLOR}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
            strokeLinecap='round'
          />
        )}
      </svg>

      <div
        className='pointer-events-auto absolute z-30 flex max-w-[min(72vw,24rem)] items-center gap-2 rounded-t-xl px-3 py-2 shadow-regular-md'
        style={{
          left: tabLeft,
          top: tabTop,
          transform: 'translateY(-100%)',
          backgroundColor: LAYOUT_FOCUS_FRAME_STROKE_COLOR,
        }}
      >
        <span className='truncate text-label-sm font-semibold text-white' title={title}>
          {title || 'Space'}
        </span>
        {inventoryType ? (
          <Badge.Root
            color={getLayoutInventoryTypeBadgeColor(inventoryType)}
            variant='light'
            className='shrink-0 capitalize'
          >
            {inventoryType}
          </Badge.Root>
        ) : null}
      </div>
    </div>
  );
}
