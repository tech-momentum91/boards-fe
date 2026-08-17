import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { SpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-space-info-popover';
import { mergeSpaceWithClientsForPopover } from '@/utils/layout-annotation-space';
import {
  buildLayoutAnnotationsFromSpaces,
  resolveLayoutListAnnotationStyle,
} from '@/utils/space-layout-list-utils';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';

/**
 * Read-only floor plan with hover space details (Figma layout view).
 *
 * @param {{
 *   layoutImagePath: string,
 *   spaces?: object[],
 *   className?: string,
 * }} props
 */
export default function SpaceLayoutFloorPlan({ layoutImagePath, spaces = [], className = '' }) {
  const [imgEl, setImgEl] = useState(null);
  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);

  const src = useMemo(() => toLayoutAssetUrl(layoutImagePath), [layoutImagePath]);

  useEffect(() => {
    if (!src) {
      setImgEl(null);
      return undefined;
    }
    const img = new window.Image();
    const onLoad = () => setImgEl(img);
    const onErr = () => setImgEl(null);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onErr);
    img.src = src;
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onErr);
    };
  }, [src]);

  const imageProp = useMemo(() => {
    if (!imgEl) return null;
    return {
      url: src,
      raster: imgEl,
      width: imgEl.naturalWidth,
      height: imgEl.naturalHeight,
    };
  }, [imgEl, src]);

  const annotations = useMemo(() => {
    if (!imageProp?.width || !imageProp?.height) return [];
    return buildLayoutAnnotationsFromSpaces(spaces, imageProp.width, imageProp.height);
  }, [spaces, imageProp?.width, imageProp?.height]);

  useEffect(() => {
    if (!imageProp) return undefined;
    const timerIds = [0, 150, 400].map((ms) =>
      window.setTimeout(() => {
        setRecenterToFitNonce((previous) => previous + 1);
      }, ms),
    );
    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [imageProp, layoutImagePath]);

  const renderHoveredAnnotationOverlay = useCallback((ann, _center, hoverSchedule) => {
    const mergedSpace = mergeSpaceWithClientsForPopover(ann?.space, ann?.clients) ?? ann?.space;
    if (!mergedSpace) return null;
    return (
      <SpaceInfoCanvasHoverPopover
        space={mergedSpace}
        canManageSubSpaces={false}
        hoverOverlaySchedule={hoverSchedule}
      />
    );
  }, []);

  if (!layoutImagePath) {
    return (
      <div
        className={`flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600 ${className}`}
      >
        No layout image for this floor.
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div
        className={`flex min-h-[420px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600 ${className}`}
      >
        Loading floor plan…
      </div>
    );
  }

  return (
    <div className={`relative flex h-full min-h-0 w-full flex-col ${className}`}>
      <FloorPlanEditor
        key={layoutImagePath}
        image={imageProp}
        annotations={annotations}
        onChange={() => {}}
        readOnly
        listenForAnnotationHits
        showSidebar={false}
        fitContentOnMount
        fillViewport
        fitContentPadding={32}
        recenterToFitNonce={recenterToFitNonce}
        activeToolId={activeTool}
        onActiveToolChange={setActiveTool}
        toolbarEnabledToolIds={[TOOL_IDS.HAND]}
        toolbarShowUndoRedoDelete={false}
        config={{ showGrid: false }}
        resolveAnnotationStyle={resolveLayoutListAnnotationStyle}
        renderHoveredAnnotationOverlay={renderHoveredAnnotationOverlay}
        hoverOverlayCloseDelayMs={900}
        canvasListening
        className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
      />
    </div>
  );
}
