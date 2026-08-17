import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  PROPOSAL_PAGE6_FRAME,
  renderProposalFloorPlan,
} from '@/components/ui/proposal-builder/proposal-template/sections/proposal-floor-plan-canvas-renderer';

/**
 * Native canvas floor plan preview — shared renderer for live preview and export sync.
 *
 * @param {{
 *   image: HTMLImageElement | null,
 *   annotations?: object[],
 *   viewport?: { x: number, y: number, w: number, h: number } | null,
 *   className?: string,
 *   onReady?: (canvas: HTMLCanvasElement | null) => void,
 * }} props
 */
export default function ProposalPage6FloorPlanCanvas({
  image,
  annotations = [],
  viewport = null,
  className = '',
  onReady,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [size, setSize] = useState({
    width: PROPOSAL_PAGE6_FRAME.width,
    height: PROPOSAL_PAGE6_FRAME.height,
  });

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image?.complete || !image.naturalWidth) return false;

    const dpr = window.devicePixelRatio || 1;
    const viewW = size.width;
    const viewH = size.height;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ok = renderProposalFloorPlan(ctx, {
      image,
      annotations,
      viewWidth: viewW,
      viewHeight: viewH,
      viewport,
    });

    if (ok) {
      canvas.dataset.floorPlanReady = 'true';
      onReady?.(canvas);
    }
    return ok;
  }, [annotations, image, onReady, size.height, size.width, viewport]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    paint();
  }, [paint]);

  return (
    <div
      ref={containerRef}
      className={`proposal-page-6__floor-plan-canvas-wrap ${className}`.trim()}
    >
      <canvas
        ref={canvasRef}
        className='proposal-page-6__floor-plan-canvas'
        aria-label='Floor plan'
        data-floor-plan-ready='false'
      />
    </div>
  );
}
