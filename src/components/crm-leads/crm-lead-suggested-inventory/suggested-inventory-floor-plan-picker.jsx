import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { SpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-space-info-popover';
import {
  buildLayoutAnnotationsFromSpaces,
  normalizeLayoutListSpace,
  resolveLayoutListAnnotationStyle,
} from '@/utils/space-layout-list-utils';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { cn } from '@/utils/cn';

function mapPickerSpaceToLayoutSpace(row) {
  const normalized = normalizeLayoutListSpace({
    name: row.space_id,
    space_id: row.space_id,
    inventory_name: row.space_name,
    inventory_type: row.inventory_type,
    coworking_inventory_type: row.coworking_inventory_type,
    floor: row.floor,
    status: row.status,
    available_seats: row.avail_seats,
    expected_per_seat_rate: row.rate_per_seat,
    expected_per_seat_cost: row.rate_per_seat,
    layout_coordinate: row.layout_coordinate,
    has_layout_coordinate: row.has_layout_coordinate,
    details: row.details,
  });
  return normalized ? { ...normalized, _pickerRow: row } : null;
}

/**
 * Read-only floor plan picker — mirrors `space-layout-floor-plan.jsx` fit/recenter behavior.
 */
const SuggestedInventoryFloorPlanPicker = ({
  isActive = true,
  currentFloor,
  floorIndex = 0,
  selectedSpaceId,
  onSpaceSelected,
  className,
}) => {
  const [imgEl, setImgEl] = useState(null);
  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);

  const layoutImagePath = currentFloor?.layout_image ?? '';
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

  const layoutSpaces = useMemo(
    () => (currentFloor?.spaces ?? []).map(mapPickerSpaceToLayoutSpace).filter(Boolean),
    [currentFloor?.spaces],
  );

  const annotations = useMemo(() => {
    if (!imageProp?.width || !imageProp?.height) return [];
    return buildLayoutAnnotationsFromSpaces(layoutSpaces, imageProp.width, imageProp.height);
  }, [layoutSpaces, imageProp?.width, imageProp?.height]);

  useEffect(() => {
    if (!isActive || !imageProp) return undefined;

    const timerIds = [0, 150, 400].map((ms) =>
      window.setTimeout(() => {
        setRecenterToFitNonce((previous) => previous + 1);
      }, ms),
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [isActive, imageProp, layoutImagePath, floorIndex]);

  const handleAnnotationSelect = useCallback(
    (ann) => {
      const row = ann?.space?._pickerRow ?? ann?.space;
      const spaceId = row?.space_id ?? row?.name ?? row?.id;
      if (!spaceId) return;
      onSpaceSelected?.(row._pickerRow ?? row);
    },
    [onSpaceSelected],
  );

  const renderHoveredOverlay = useCallback((ann, _center, hoverSchedule) => {
    const space = ann?.space;
    if (!space) return null;
    const { _pickerRow: _ignored, ...popoverSpace } = space;
    return (
      <SpaceInfoCanvasHoverPopover
        space={popoverSpace}
        canManageSubSpaces={false}
        hoverOverlaySchedule={hoverSchedule}
      />
    );
  }, []);

  if (!isActive) return null;

  if (!layoutImagePath) {
    return (
      <div
        className={cn(
          'flex min-h-[280px] flex-1 items-center justify-center px-4 text-center text-paragraph-sm text-text-sub-500',
          className,
        )}
      >
        No layout image for this floor.
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div
        className={cn(
          'flex min-h-[280px] flex-1 items-center justify-center text-paragraph-sm text-text-sub-500',
          className,
        )}
      >
        Loading floor plan…
      </div>
    );
  }

  return (
    <div className={cn('relative flex h-full min-h-0 w-full flex-col', className)}>
      <FloorPlanEditor
        key={`${layoutImagePath}-${floorIndex}`}
        image={imageProp}
        annotations={annotations}
        onChange={() => {}}
        readOnly
        listenForAnnotationHits
        onAnnotationSelect={handleAnnotationSelect}
        showSidebar={false}
        fitContentOnMount
        fillViewport
        fitContentPadding={32}
        recenterToFitNonce={recenterToFitNonce}
        activeToolId={activeTool}
        onActiveToolChange={setActiveTool}
        renderToolbar={() => null}
        config={{ showGrid: false }}
        resolveAnnotationStyle={(ann) => {
          const base = resolveLayoutListAnnotationStyle(ann);
          const isSelected =
            selectedSpaceId &&
            (ann?.space?._pickerRow?.space_id === selectedSpaceId ||
              ann?.space_ref === selectedSpaceId);
          if (isSelected) {
            return { fill: 'rgba(34, 197, 94, 0.45)', stroke: '#15803d', strokeWidth: 2.5 };
          }
          return base ?? { fill: 'rgba(34, 197, 94, 0.28)', stroke: '#16a34a', strokeWidth: 2 };
        }}
        renderHoveredAnnotationOverlay={renderHoveredOverlay}
        hoverOverlayCloseDelayMs={900}
        canvasListening
        className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
      />
    </div>
  );
};

export default SuggestedInventoryFloorPlanPicker;
