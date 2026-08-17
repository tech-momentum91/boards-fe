import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiStackLine } from 'react-icons/ri';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import {
  buildLayoutAnnotationsFromSpaces,
  resolveLayoutListAnnotationStyle,
} from '@/utils/space-layout-list-utils';

function mapSpacesForEditor(spaces = []) {
  return (spaces ?? []).map((space) => ({
    name: space.value,
    inventory_name: space.label,
    layout_coordinate: space.layout_coordinate,
    inventory_type: space.inventory_type || '',
  }));
}

function SelectSpaceOnClick({ spaceId, onSelectArea }) {
  useEffect(() => {
    if (spaceId) onSelectArea?.(spaceId);
  }, [spaceId, onSelectArea]);

  return null;
}

export default function AssetInFloorLayoutPicker({
  floorLabel = '',
  layoutImageUrl = '',
  spaces = [],
  selectedArea = '',
  onSelectArea,
  isLoading = false,
  loadError = '',
}) {
  const [imgEl, setImgEl] = useState(null);
  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);

  const imageSrc = layoutImageUrl ? toLayoutAssetUrl(layoutImageUrl) : '';
  const editorSpaces = useMemo(() => mapSpacesForEditor(spaces), [spaces]);

  useEffect(() => {
    if (!imageSrc) {
      setImgEl(null);
      return undefined;
    }

    const img = new window.Image();
    const onLoad = () => setImgEl(img);
    const onError = () => setImgEl(null);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = imageSrc;

    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [imageSrc]);

  const imageProp = useMemo(() => {
    if (!imgEl) return null;
    return {
      url: imageSrc,
      raster: imgEl,
      width: imgEl.naturalWidth,
      height: imgEl.naturalHeight,
    };
  }, [imgEl, imageSrc]);

  const annotations = useMemo(() => {
    if (!imageProp?.width || !imageProp?.height) return [];
    return buildLayoutAnnotationsFromSpaces(editorSpaces, imageProp.width, imageProp.height);
  }, [editorSpaces, imageProp?.width, imageProp?.height]);

  useEffect(() => {
    if (!imageProp) return undefined;
    const timerIds = [0, 120, 320].map((ms) =>
      window.setTimeout(() => {
        setRecenterToFitNonce((previous) => previous + 1);
      }, ms),
    );
    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [imageProp, layoutImageUrl]);

  const renderHoveredAnnotationOverlay = useCallback((ann) => {
    const label =
      ann?.space?.inventory_name || ann?.space?.name || ann?.label || ann?.space_ref || '';
    if (!label) return null;
    return (
      <div className='pointer-events-none rounded bg-bg-strong-950 px-2 py-1 text-paragraph-xs text-text-white-0 shadow-tooltip whitespace-nowrap'>
        {label}
      </div>
    );
  }, []);

  const renderSelectedAnnotationOverlay = useCallback(
    (ann) => {
      const spaceId = ann?.space?.name || ann?.space_ref || '';
      if (!spaceId) return null;
      return <SelectSpaceOnClick spaceId={spaceId} onSelectArea={onSelectArea} />;
    },
    [onSelectArea],
  );

  return (
    <div className='flex w-[min(549px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
      <div
        className='relative h-[380px] overflow-hidden bg-bg-weak-100 p-2'
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(226,228,233,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,228,233,0.35) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {isLoading ? (
          <div className='flex h-full items-center justify-center text-label-sm text-text-sub-500'>
            Loading floor layout...
          </div>
        ) : loadError ? (
          <div className='flex h-full items-center justify-center px-4 text-center text-label-sm text-error-base'>
            {loadError}
          </div>
        ) : !imageSrc ? (
          <div className='flex h-full items-center justify-center px-4 text-center text-label-sm text-text-sub-500'>
            No floor layout image uploaded for this floor.
          </div>
        ) : !imageProp ? (
          <div className='flex h-full items-center justify-center text-label-sm text-text-sub-500'>
            Loading floor plan...
          </div>
        ) : (
          <div className='h-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0'>
            <FloorPlanEditor
              key={layoutImageUrl}
              image={imageProp}
              annotations={annotations}
              onChange={() => {}}
              readOnly
              listenForAnnotationHits
              showSidebar={false}
              fitContentOnMount
              fillViewport
              fitContentPadding={24}
              recenterToFitNonce={recenterToFitNonce}
              activeToolId={activeTool}
              onActiveToolChange={setActiveTool}
              toolbarEnabledToolIds={[TOOL_IDS.HAND]}
              toolbarShowUndoRedoDelete={false}
              config={{ showGrid: false }}
              resolveAnnotationStyle={resolveLayoutListAnnotationStyle}
              renderHoveredAnnotationOverlay={renderHoveredAnnotationOverlay}
              renderSelectedAnnotationOverlay={renderSelectedAnnotationOverlay}
              hoverOverlayCloseDelayMs={900}
              canvasListening
              className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
            />
          </div>
        )}
      </div>

      <div className='flex items-center gap-1.5 border-t border-stroke-soft-200 px-3 py-2.5'>
        <RiStackLine className='size-3.5 shrink-0 text-text-sub-600' />
        <span className='truncate text-label-xs font-medium text-text-strong-950'>
          {floorLabel || 'Floor layout'}
        </span>
        <span className='truncate text-label-xs text-text-sub-500'>Click on area to select</span>
      </div>
    </div>
  );
}
