import React from 'react';

import { cn } from '@/utils/cn';

/**
 * Dimmed overlay with a clear proposal page 6 aspect-ratio frame.
 * Uses four panels (not box-shadow) so dimming cannot bleed outside the canvas.
 *
 * @param {{
 *   frameRect: { x: number, y: number, width: number, height: number } | null,
 *   className?: string,
 * }} props
 */
export default function ProposalPage6FloorPlanViewportFrameOverlay({ frameRect, className = '' }) {
  if (!frameRect?.width || !frameRect?.height) return null;

  const { x, y, width, height } = frameRect;
  const dimClass = 'absolute bg-black/48';

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-10 overflow-hidden', className)}
      aria-hidden
    >
      <div className={dimClass} style={{ left: 0, top: 0, right: 0, height: y }} />
      <div className={dimClass} style={{ left: 0, top: y + height, right: 0, bottom: 0 }} />
      <div className={dimClass} style={{ left: 0, top: y, width: x, height }} />
      <div className={dimClass} style={{ left: x + width, top: y, right: 0, height }} />

      <div
        className='absolute rounded-sm border-2 border-white/90 ring-2 ring-primary-base/80'
        style={{ left: x, top: y, width, height }}
      />

      <div
        className='absolute left-1/2 -translate-x-1/2 rounded-full bg-bg-white-0/95 px-3 py-1 text-label-xs font-medium text-text-sub-600 shadow-regular-xs'
        style={{ top: Math.max(y - 36, 8) }}
      >
        Proposal page frame
      </div>
    </div>
  );
}
