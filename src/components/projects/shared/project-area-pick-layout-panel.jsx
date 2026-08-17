import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import {
  flattenProjectLayoutAreasToAnnotations,
  getProjectLayoutAreaId,
  isProjectLayoutAnnotationSaved,
} from '@/components/projects/layouts/project-layout-annotation-helpers';
import ProjectAreaPickToolbar from '@/components/projects/shared/project-area-pick-toolbar';
import { resolveFileUrl } from '@/lib/utils';

function useLayoutRasterImage(imageUrl, enabled = true) {
  const [raster, setRaster] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!enabled || !imageUrl) {
      setRaster(null);
      setIsLoading(false);
      setHasError(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setRaster(null);

    const img = new Image();
    const onLoad = () => {
      if (cancelled) return;
      if (img.naturalWidth > 0) {
        setRaster(img);
        setHasError(false);
      } else {
        setRaster(null);
        setHasError(true);
      }
      setIsLoading(false);
    };
    const onError = () => {
      if (cancelled) return;
      setRaster(null);
      setHasError(true);
      setIsLoading(false);
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = imageUrl;

    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [enabled, imageUrl]);

  return { raster, isLoading, hasError };
}

/**
 * Compact read-only floor layout for picking an area (hand pan / select to pick).
 */
export default function ProjectAreaPickLayoutPanel({
  layout = null,
  selectedAreaId = '',
  onAreaPick,
  isLoading = false,
  error = null,
}) {
  const [activeTool, setActiveTool] = useState(TOOL_IDS.SELECT);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);

  const layoutImageUrl = resolveFileUrl(layout?.layout_image);
  const {
    raster,
    isLoading: imageLoading,
    hasError: imageError,
  } = useLayoutRasterImage(layoutImageUrl, Boolean(layout));

  const imageSize = useMemo(
    () => ({
      imageWidth: raster?.naturalWidth ?? 0,
      imageHeight: raster?.naturalHeight ?? 0,
    }),
    [raster?.naturalHeight, raster?.naturalWidth],
  );

  const areaAnnotations = useMemo(
    () =>
      flattenProjectLayoutAreasToAnnotations(layout?.areas, imageSize).map((ann) => ({
        ...ann,
        locked: true,
        visible: true,
      })),
    [imageSize, layout?.areas],
  );

  const focusAnnotationId = useMemo(() => {
    const selected = String(selectedAreaId ?? '').trim();
    if (!selected) return '';
    const match = areaAnnotations.find((ann) => getProjectLayoutAreaId(ann) === selected);
    return match?.id ?? '';
  }, [areaAnnotations, selectedAreaId]);

  useEffect(() => {
    if (!raster || focusAnnotationId) return undefined;
    const timerIds = [0, 150, 400].map((ms) =>
      window.setTimeout(() => {
        setRecenterToFitNonce((previous) => previous + 1);
      }, ms),
    );
    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [focusAnnotationId, layoutImageUrl, raster]);

  const resolveAnnotationStyle = useCallback(
    (annotation) => {
      const color = String(annotation?.color ?? '').trim() || '#2563eb';
      const areaId = getProjectLayoutAreaId(annotation);
      const isSelected = Boolean(selectedAreaId && areaId === selectedAreaId);
      return {
        stroke: color,
        fill: isSelected ? `${color}66` : `${color}38`,
        strokeWidth: isSelected ? 3 : 2,
      };
    },
    [selectedAreaId],
  );

  const handleAnnotationSelect = useCallback(
    (annotation) => {
      if (activeTool !== TOOL_IDS.SELECT) return;
      if (!isProjectLayoutAnnotationSaved(annotation)) return;
      const areaId = getProjectLayoutAreaId(annotation);
      if (!areaId) return;
      onAreaPick?.(areaId);
    },
    [activeTool, onAreaPick],
  );

  const renderHoveredAnnotationOverlay = useCallback((annotation) => {
    if (!isProjectLayoutAnnotationSaved(annotation)) return null;
    const label = annotation?.area_label ?? annotation?.label ?? 'Area';
    return (
      <div className='pointer-events-none whitespace-nowrap rounded-md bg-text-strong-950 px-3 py-1.5 text-paragraph-xs font-medium text-white shadow-regular-md'>
        {label}
      </div>
    );
  }, []);

  const renderToolbar = useCallback(
    (ctx) => (
      <ProjectAreaPickToolbar activeToolId={ctx.activeToolId} setActiveTool={ctx.setActiveTool} />
    ),
    [],
  );

  if (isLoading && !layout) {
    return (
      <div className='flex h-[280px] items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading floor layout…
      </div>
    );
  }

  if (error && !layout) {
    return (
      <div className='flex h-[280px] items-center justify-center px-4 text-center text-paragraph-sm text-error-base'>
        {error}
      </div>
    );
  }

  if (!layoutImageUrl) {
    return (
      <div className='flex h-[280px] items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        No layout image for this floor.
      </div>
    );
  }

  if (imageLoading || !raster) {
    return (
      <div className='flex h-[280px] items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        {imageError ? 'Failed to load layout image.' : 'Loading floor plan…'}
      </div>
    );
  }

  return (
    <div className='relative h-[280px] min-h-0 overflow-hidden rounded-t-2xl bg-bg-weak-50'>
      <FloorPlanEditor
        key={`${layoutImageUrl}-${raster.naturalWidth}x${raster.naturalHeight}`}
        className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
        viewportClassName='h-full min-h-0'
        image={{
          url: raster.src,
          width: raster.naturalWidth,
          height: raster.naturalHeight,
          raster,
        }}
        annotations={areaAnnotations}
        onChange={() => true}
        readOnly={false}
        listenForAnnotationHits
        showSidebar={false}
        fillViewport
        fitContentOnMount
        recenterToFitNonce={recenterToFitNonce}
        fitContentPadding={24}
        focusAnnotationIdOnMount={focusAnnotationId || undefined}
        activeToolId={activeTool}
        onActiveToolChange={setActiveTool}
        toolbarEnabledToolIds={[TOOL_IDS.HAND, TOOL_IDS.SELECT]}
        toolbarShowUndoRedoDelete={false}
        config={{ showGrid: false }}
        resolveAnnotationStyle={resolveAnnotationStyle}
        renderHoveredAnnotationOverlay={renderHoveredAnnotationOverlay}
        renderToolbar={renderToolbar}
        onAnnotationSelect={handleAnnotationSelect}
        hoverOverlayCloseDelayMs={120}
      />
    </div>
  );
}
