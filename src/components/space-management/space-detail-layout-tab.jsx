import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiDownloadLine } from 'react-icons/ri';

import { getCenterFloorLayoutImage } from '@/api/layoutCoordinates';
import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { SpaceLayoutSpotlightOverlay } from '@/components/floor-plan-editor/react/shapes/space-layout-spotlight-overlay';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { layoutCoordinateToAnnotationShape } from '@/utils/client-floor-layout-annotations';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { getLayoutImagePathFromRecord } from '@/utils/layout-image-path';
import { resolveFloorRefForCenter } from '@/utils/resolve-floor-ref';
import { downloadSpaceDetailLayoutImage } from '@/utils/space-layout-export';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';

const SPACE_ANNOTATION_ID = 'space-detail-layout-region';
const SPACE_HIGHLIGHT = {
  fill: 'rgba(147, 51, 234, 0.35)', // increased opacity
  stroke: '#7e22ce', // slightly darker purple
  strokeWidth: 5,
};

function parseLayoutCoordinateObject(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw;
  return null;
}

function shapeToPointPairs(shape) {
  if (!shape) return [];
  if (shape.type === 'polygon' && Array.isArray(shape.points)) {
    const pairs = [];
    for (let i = 0; i < shape.points.length; i += 2) {
      pairs.push([shape.points[i], shape.points[i + 1]]);
    }
    return pairs;
  }
  if (shape.type === 'rectangle') {
    const { x, y, width, height } = shape;
    return [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ];
  }
  return [];
}

function buildSpaceLayoutAnnotation(shape) {
  if (!shape) return null;
  if (shape.type === 'polygon') {
    return {
      id: SPACE_ANNOTATION_ID,
      type: 'polygon',
      points: shape.points,
      locked: true,
      visible: true,
    };
  }
  if (shape.type === 'rectangle') {
    return {
      id: SPACE_ANNOTATION_ID,
      type: 'rectangle',
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      locked: true,
      visible: true,
    };
  }
  return null;
}

/**
 * Read-only floor plan for Space detail → Layout tab.
 * Uses FloorPlanEditor (no toolbar) for in-canvas zoom/pan; blurs everything
 * outside the mapped space polygon.
 *
 * @param {{
 *   isActive: boolean,
 *   centerId: string,
 *   floorValue: string,
 *   layoutCoordinateRaw: unknown,
 *   spaceName?: string,
 * }} props
 */
export default function SpaceDetailLayoutTab({
  isActive,
  centerId,
  floorValue,
  layoutCoordinateRaw,
  spaceName = '',
}) {
  const [layoutImagePath, setLayoutImagePath] = useState('');
  const [layoutExportRecord, setLayoutExportRecord] = useState(null);
  const [resolvedFloorRef, setResolvedFloorRef] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imgEl, setImgEl] = useState(null);
  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);
  const [viewportReady, setViewportReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const parsedCoordinate = useMemo(
    () => parseLayoutCoordinateObject(layoutCoordinateRaw),
    [layoutCoordinateRaw],
  );
  const annotationShape = useMemo(
    () => layoutCoordinateToAnnotationShape(parsedCoordinate),
    [parsedCoordinate],
  );
  const spaceAnnotation = useMemo(
    () => buildSpaceLayoutAnnotation(annotationShape),
    [annotationShape],
  );
  const spotlightPointPairs = useMemo(() => shapeToPointPairs(annotationShape), [annotationShape]);
  const hasCoordinates = Boolean(spaceAnnotation);
  const shouldFocusSpace = hasCoordinates;

  useEffect(() => {
    if (!isActive) return undefined;

    const center = String(centerId || '').trim();
    const floor = String(floorValue || '').trim();
    if (!center || !floor) {
      setLayoutImagePath('');
      setLayoutExportRecord(null);
      setResolvedFloorRef('');
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadLayout = async () => {
      setIsLoading(true);
      setError(null);
      setLayoutImagePath('');
      setLayoutExportRecord(null);
      setResolvedFloorRef('');

      try {
        const floorRef = await resolveFloorRefForCenter({ centerId: center, floorValue: floor });
        if (cancelled) return;
        setResolvedFloorRef(floorRef);

        const payload = await getCenterFloorLayoutImage({ center, floor_ref: floorRef });
        if (cancelled) return;

        const floorDetail =
          payload?.floor_detail && typeof payload.floor_detail === 'object'
            ? payload.floor_detail
            : null;
        const exportRecord = {
          ...floorDetail,
          layout_image_proxy_url:
            payload?.layout_image_proxy_url ||
            floorDetail?.layout_image_proxy_url ||
            payload?.floor_detail?.layout_image_proxy_url ||
            '',
          layout_image:
            floorDetail?.layout_image || payload?.layout_image || floorDetail?.layout_image_url,
          layout_image_url:
            floorDetail?.layout_image_url || payload?.layout_image_url || floorDetail?.layout_image,
        };
        const path =
          getLayoutImagePathFromRecord(exportRecord) ||
          payload?.layout_image_url ||
          payload?.layout_image ||
          getLayoutImagePathFromRecord(payload);

        if (!path || payload?.has_layout_image === false) {
          setLayoutImagePath('');
          setLayoutExportRecord(null);
          setResolvedFloorRef('');
          if (!payload?.ok && payload?.has_layout_image !== true) {
            setError('No layout image is available for this floor.');
          }
        } else {
          setLayoutImagePath(path);
          setLayoutExportRecord(exportRecord);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load floor layout.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadLayout();

    return () => {
      cancelled = true;
    };
  }, [isActive, centerId, floorValue]);

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

  useEffect(() => {
    setViewportReady(!shouldFocusSpace);
  }, [layoutImagePath, shouldFocusSpace]);

  useEffect(() => {
    if (!isActive || !imageProp || shouldFocusSpace) return undefined;

    const timerIds = [0, 150, 450].map((ms) =>
      window.setTimeout(() => {
        setRecenterToFitNonce((previous) => previous + 1);
      }, ms),
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [imageProp, isActive, shouldFocusSpace]);

  const handleViewportFocusApplied = useCallback(() => {
    setViewportReady(true);
  }, []);

  const handleDownloadLayout = useCallback(async () => {
    if (!layoutImagePath || !hasCoordinates || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadSpaceDetailLayoutImage({
        layoutImagePath,
        layoutExportRecord,
        layoutCoordinate: parsedCoordinate,
        spaceName,
        style: SPACE_HIGHLIGHT,
        centerId,
        floorRef: resolvedFloorRef,
        blockFloorId:
          layoutExportRecord?.block_floor_id || layoutExportRecord?.floor?.block_floor_id || '',
      });
      showSuccessToast('Layout download started.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to download layout image.' });
    } finally {
      setIsDownloading(false);
    }
  }, [
    centerId,
    hasCoordinates,
    isDownloading,
    layoutExportRecord,
    layoutImagePath,
    parsedCoordinate,
    resolvedFloorRef,
    spaceName,
  ]);

  const annotations = useMemo(() => (spaceAnnotation ? [spaceAnnotation] : []), [spaceAnnotation]);

  const maskShape = useMemo(() => {
    if (!imgEl || !imageProp?.width || !imageProp?.height || spotlightPointPairs.length < 3) {
      return null;
    }
    return (
      <SpaceLayoutSpotlightOverlay
        rasterImage={imgEl}
        imageWidth={imageProp.width}
        imageHeight={imageProp.height}
        spotlightPointPairs={spotlightPointPairs}
      />
    );
  }, [imgEl, imageProp?.width, imageProp?.height, spotlightPointPairs]);

  if (!isActive) return null;

  if (!centerId || !floorValue) {
    return (
      <div className='flex min-h-[320px] items-center justify-center px-6 py-10 text-paragraph-sm text-text-sub-600'>
        Assign a floor to this space to view its layout.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[320px] items-center justify-center px-6 py-10 text-paragraph-sm text-text-sub-600'>
        Loading floor layout…
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-[320px] items-center justify-center px-6 py-10 text-paragraph-sm text-text-sub-600'>
        {error}
      </div>
    );
  }

  if (!layoutImagePath) {
    return (
      <div className='flex min-h-[320px] items-center justify-center px-6 py-10 text-paragraph-sm text-text-sub-600'>
        No layout image is available for this floor.
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div className='flex min-h-[320px] items-center justify-center px-6 py-10 text-paragraph-sm text-text-sub-600'>
        Loading floor plan…
      </div>
    );
  }

  return (
    <div
      className='flex h-full min-h-0 flex-1 flex-col px-4 py-4'
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      {hasCoordinates ? (
        <div className='mb-3 flex items-center justify-end px-2'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                disabled={isDownloading}
                aria-label='Download layout with marked space'
                onClick={handleDownloadLayout}
              >
                <Button.Icon as={RiDownloadLine} />
                {isDownloading ? 'Preparing…' : 'Download layout'}
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Download floor layout with this space marked</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      ) : null}
      <div
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs transition-opacity duration-300 ${
          shouldFocusSpace && !viewportReady ? 'pointer-events-none opacity-0' : ''
        }`}
      >
        <FloorPlanEditor
          key={layoutImagePath}
          image={imageProp}
          annotations={annotations}
          onChange={() => {}}
          readOnly
          showSidebar={false}
          fitContentOnMount={!shouldFocusSpace}
          fillViewport
          fitContentPadding={32}
          focusAnnotationIdOnMount={shouldFocusSpace ? SPACE_ANNOTATION_ID : ''}
          onFocusViewportToAnnotationApplied={
            shouldFocusSpace ? handleViewportFocusApplied : undefined
          }
          focusViewportFitRatio={0.52}
          focusViewportPadding={56}
          focusViewportMaxScale={2.5}
          recenterToFitNonce={shouldFocusSpace ? 0 : recenterToFitNonce}
          activeToolId={activeTool}
          onActiveToolChange={setActiveTool}
          config={{ showGrid: false }}
          renderToolbar={() => null}
          maskShape={maskShape}
          maskReplacesBaseImage={hasCoordinates}
          resolveAnnotationStyle={() => SPACE_HIGHLIGHT}
          className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
        />
      </div>
      {!hasCoordinates ? (
        <p className='mt-3 px-2 text-paragraph-xs text-text-sub-600'>
          No layout coordinates are mapped for this space yet.
        </p>
      ) : null}
    </div>
  );
}
