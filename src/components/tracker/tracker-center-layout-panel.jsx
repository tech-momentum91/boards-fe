import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Hand, ZoomIn, ZoomOut } from 'lucide-react';

import { FloorPlanEditor, GlassPanel, TOOL_IDS } from '@/components/floor-plan-editor';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { SpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-space-info-popover';
import { flattenLayoutShapesToAnnotations } from '@/utils/layout-annotation-space';
import { getLayoutImagePathFromRecord } from '@/utils/layout-image-path';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { resolveLayoutListAnnotationStyle } from '@/utils/space-layout-list-utils';
import { cn } from '@/utils/cn';

/**
 * Read-only floor layout panel for center tracker task drawer.
 *
 * @param {{
 *   layoutDetail?: object | null,
 *   floorRef?: string,
 *   floorLabel?: string,
 *   isLoading?: boolean,
 *   error?: string | null,
 *   emptyMessage?: string,
 * }} props
 */
export default function TrackerCenterLayoutPanel({
  layoutDetail = null,
  floorRef = '',
  floorLabel = '',
  isLoading = false,
  error = null,
  emptyMessage = 'Select a floor to view the layout.',
}) {
  const [imgEl, setImgEl] = useState(null);
  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);

  const floorRecord = layoutDetail?.floor_detail ?? layoutDetail?.layout ?? layoutDetail ?? null;
  const layoutImagePath = useMemo(() => getLayoutImagePathFromRecord(floorRecord), [floorRecord]);
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
    if (!layoutDetail) return [];
    return flattenLayoutShapesToAnnotations(layoutDetail).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    }));
  }, [layoutDetail]);

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
  }, [imageProp, layoutImagePath, floorRef]);

  const renderHoveredAnnotationOverlay = useCallback((ann, _center, hoverSchedule) => {
    const space = ann?.space;
    if (!space) return null;
    return (
      <SpaceInfoCanvasHoverPopover
        space={space}
        canManageSubSpaces={false}
        hoverOverlaySchedule={hoverSchedule}
      />
    );
  }, []);

  const renderToolbar = useCallback(
    (ctx) => (
      <div className='pointer-events-none absolute bottom-4 left-1/2 z-20 flex w-full -translate-x-1/2 justify-center px-2'>
        <GlassPanel className='pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-2'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                size='small'
                variant={ctx.activeToolId === TOOL_IDS.HAND ? 'primary' : 'neutral'}
                mode={ctx.activeToolId === TOOL_IDS.HAND ? 'filled' : 'stroke'}
                title='Hand (H)'
                aria-label='Hand (H)'
                aria-pressed={ctx.activeToolId === TOOL_IDS.HAND}
                onClick={() => ctx.setActiveTool(TOOL_IDS.HAND)}
              >
                <Hand className='size-4 shrink-0' aria-hidden />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Hand</p>
            </Tooltip.Content>
          </Tooltip.Root>

          <div className='mx-1 h-6 w-px bg-stroke-soft-200' aria-hidden />

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                size='small'
                variant='neutral'
                mode='stroke'
                title='Zoom in'
                aria-label='Zoom in'
                onClick={() => ctx.zoomIn?.()}
              >
                <ZoomIn className='size-4 shrink-0' aria-hidden />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Zoom in</p>
            </Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                size='small'
                variant='neutral'
                mode='stroke'
                title='Zoom out'
                aria-label='Zoom out'
                onClick={() => ctx.zoomOut?.()}
              >
                <ZoomOut className='size-4 shrink-0' aria-hidden />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Zoom out</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </GlassPanel>
      </div>
    ),
    [],
  );

  if (isLoading) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading floor layout…
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 items-center justify-center bg-bg-weak-50 px-6 text-center text-paragraph-sm text-error-base'>
        {error}
      </div>
    );
  }

  if (!layoutDetail) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 items-center justify-center bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600'>
        {emptyMessage}
      </div>
    );
  }

  if (!layoutImagePath) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 flex-col items-center justify-center gap-2 bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600'>
        <p>No layout image for {floorLabel || 'this floor'}.</p>
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading floor plan…
      </div>
    );
  }

  return (
    <div
      className='relative flex h-full min-h-0 flex-1 flex-col'
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      {floorLabel ? (
        <div className='absolute left-3 top-3 z-30 rounded-lg border border-stroke-soft-200 bg-bg-white-0/95 px-3 py-1.5 text-label-sm font-medium text-text-strong-950 shadow-regular-xs'>
          {floorLabel}
        </div>
      ) : null}

      <FloorPlanEditor
        key={`${floorRef}-${layoutImagePath}`}
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
        renderToolbar={renderToolbar}
        hoverOverlayCloseDelayMs={900}
        className={cn('h-full min-h-0 flex-1 gap-0 lg:flex-col')}
      />
    </div>
  );
}
