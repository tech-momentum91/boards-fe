import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddCircleLine, RiUserAddFill } from 'react-icons/ri';
import { useDispatch } from 'react-redux';

import { postRemoveCoworkerFromDesk } from '@/api/clientFloorLayout';
import ClientAssignCoworkerModal from '@/components/clients-management/client-detail-allocate/client-assign-coworker-modal';
import ClientAssignHotDeskCoworkerModal from '@/components/clients-management/client-detail-allocate/client-assign-hot-desk-coworker-modal';
import ClientDeskCoworkerSeatOverlay from '@/components/clients-management/client-detail-allocate/client-desk-coworker-seat-overlay';
import ClientSubspaceHoverPopover from '@/components/clients-management/client-detail-allocate/client-subspace-hover-popover';
import {
  CLIENT_MARKER_SOURCE,
  CLIENT_SPACE_REGION_SOURCE,
  CLIENT_SUBSPACE_HIGHLIGHT_SOURCE,
  CLIENT_SUBSPACE_SLOT_SOURCE,
} from '@/constants/layout/annotation-sources';
import { CLIENT_LAYOUT_SPACE_PALETTE } from '@/constants/layout/client-floor-constants';
import { fetchClientFloorLayoutCoordinatesThunk } from '@/redux/clientDetailSlice';
import { cn } from '@/utils/cn';
import {
  clientLayoutMarkersToAnnotations,
  loadClientLayoutMarkersFromStorage,
  saveClientLayoutMarkersToStorage,
} from '@/utils/client-layout-marker-storage';
import { isHotDeskSubSpaceAreaType } from '@/utils/client-floor-layout-annotations';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { isPointInAllocatedRegions } from '../core/region-guard.js';
import { TOOL_IDS } from '../types/index.js';
import { ClientMaskShape } from './shapes/client-mask-shape.jsx';
import { ClientFloorPlanToolbar } from './ui/client-toolbar.jsx';
import FloorPlanEditor from './floor-plan-editor.jsx';

/**
 * Client-facing floor plan viewer.
 * Wraps FloorPlanEditor with spotlight masking, restricted toolbar,
 * region-guarded dot placement, and localStorage marker persistence.
 *
 * @param {object} props
 * @param {{ url?: string, width?: number, height?: number, raster?: HTMLImageElement }} props.image
 * @param {object[]} props.spaceAnnotations - locked polygon annotations for allocated spaces (+ API seat pins)
 * @param {string} props.customerId - used to namespace localStorage key
 * @param {string} [props.centerId] - center ref for refetch after assigning a seat
 * @param {string} props.blockFloorId - used to namespace localStorage key
 * @param {React.Ref} [props.stageRef]
 * @param {boolean} [props.fitContentOnMount]
 * @param {string} [props.className]
 * @param {string} [props.layoutId]
 * @param {string} [props.highlightCoworkerRef]
 *   `client_coworker_ref` whose desk popover should auto-open (driven by the
 *   header coworker filter). Empty string = no highlight.
 * @param {boolean} [props.canWriteClientLayout]
 *   When false, desk assign / remove / marker actions on the layout are hidden.
 *   Users with only assigned desks visible still need read access to open the page.
 * @param {boolean} [props.filterActive]
 *   When `true`, the canvas dims everything except the currently-rendered
 *   sub-space polygons so only filter-matching areas pop. Mirrors the center
 *   layout filter spotlight pattern.
 */
export function ClientViewFloorPlanEditor({
  image,
  spaceAnnotations,
  customerId,
  centerId = '',
  blockFloorId,
  stageRef,
  fitContentOnMount = true,
  className,
  layoutId = '',
  highlightCoworkerRef = '',
  canWriteClientLayout = false,
  filterActive = false,
}) {
  const dispatch = useDispatch();
  const [annotations, setAnnotations] = useState(() => {
    const saved = loadClientLayoutMarkersFromStorage(customerId, blockFloorId);
    return [...spaceAnnotations, ...clientLayoutMarkersToAnnotations(saved)];
  });

  const [activeTool, setActiveTool] = useState(TOOL_IDS.SELECT);
  const [standardAssignOpen, setStandardAssignOpen] = useState(false);
  const [hotDeskAssignOpen, setHotDeskAssignOpen] = useState(false);
  const [markerForAssociation, setMarkerForAssociation] = useState(null);
  const suppressedOptimisticDeskIdsRef = useRef(new Set());

  const clearDeskSlotAssignment = useCallback((deskId, { coworkerId, clientDeskStatus } = {}) => {
    const normalizedDeskId = String(deskId || '').trim();
    const normalizedCoworkerId = String(coworkerId || '').trim();
    if (!normalizedDeskId) return;

    setAnnotations((previous) =>
      previous.map((annotation) => {
        if (annotation.source !== CLIENT_SUBSPACE_SLOT_SOURCE) return annotation;
        if (String(annotation.desk_id || '').trim() !== normalizedDeskId) return annotation;

        const existing = Array.isArray(annotation.coworker_assignments)
          ? annotation.coworker_assignments
          : [];
        const nextAssignments = normalizedCoworkerId
          ? existing.filter(
              (row) =>
                String(row?.client_coworker_ref || row?.coworker_id || '').trim() !==
                normalizedCoworkerId,
            )
          : [];

        if (nextAssignments.length > 0) {
          const primary = nextAssignments.find((row) => row?.is_active_now) || nextAssignments[0];
          return {
            ...annotation,
            hasDeskAssignment: true,
            hasAssignedCoworker: true,
            coworker_assignments: nextAssignments,
            coworker_assignment_count: nextAssignments.length,
            client_desk_status:
              String(clientDeskStatus || annotation.client_desk_status || '').trim() || 'Available',
            client_coworker_ref: String(
              primary?.client_coworker_ref || primary?.coworker_id || '',
            ).trim(),
            coworker_details: primary
              ? {
                  full_name: primary.coworker_name || primary.full_name,
                  coworker_name: primary.coworker_name || primary.full_name,
                  image: primary.image ?? null,
                }
              : null,
            desk_assignment: primary || null,
          };
        }

        return {
          ...annotation,
          hasDeskAssignment: false,
          hasAssignedCoworker: false,
          client_coworker_ref: null,
          coworker_details: null,
          desk_assignment: null,
          coworker_assignments: [],
          coworker_assignment_count: 0,
          client_desk_status: String(clientDeskStatus || '').trim() || 'Available',
        };
      }),
    );
  }, []);

  const openAssignModalForMarker = useCallback(
    (ann, assignment = null) => {
      if (!canWriteClientLayout) return;
      setMarkerForAssociation(
        assignment
          ? {
              ...ann,
              client_coworker_ref:
                String(assignment.client_coworker_ref || assignment.coworker_id || '').trim() ||
                ann.client_coworker_ref,
              desk_assignment: assignment,
            }
          : ann,
      );
      if (isHotDeskSubSpaceAreaType(ann?.sub_space_area_type)) {
        setHotDeskAssignOpen(true);
      } else {
        setStandardAssignOpen(true);
      }
    },
    [canWriteClientLayout],
  );

  const closeAssignModals = useCallback(() => {
    setStandardAssignOpen(false);
    setHotDeskAssignOpen(false);
    setMarkerForAssociation(null);
  }, []);

  const handleDeskAssignmentSaved = useCallback(
    ({ deskId, coworkerId, coworkerName, deskAssignment = null, clientDeskStatus }) => {
      const normalizedDeskId = String(deskId || '').trim();
      const normalizedCoworkerId = String(coworkerId || '').trim();
      if (!normalizedDeskId || !normalizedCoworkerId) return;

      const label = String(coworkerName || normalizedCoworkerId).trim();
      const nameParts = label.split(/\s+/).filter(Boolean);
      const optimisticDetails = {
        full_name: label,
        coworker_name: label,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' '),
      };
      const assignmentRow = {
        ...(deskAssignment && typeof deskAssignment === 'object' ? deskAssignment : {}),
        client_coworker_ref: normalizedCoworkerId,
        coworker_name: label,
        is_active_now: deskAssignment?.is_active_now ?? true,
      };

      setAnnotations((previous) =>
        previous.map((annotation) => {
          if (annotation.source !== CLIENT_SUBSPACE_SLOT_SOURCE) return annotation;
          if (String(annotation.desk_id || '').trim() !== normalizedDeskId) return annotation;
          const existing = Array.isArray(annotation.coworker_assignments)
            ? annotation.coworker_assignments
            : [];
          const withoutSame = existing.filter(
            (row) =>
              String(row?.client_coworker_ref || row?.coworker_id || '').trim() !==
              normalizedCoworkerId,
          );
          const nextAssignments = [...withoutSame, assignmentRow];
          return {
            ...annotation,
            hasDeskAssignment: true,
            hasAssignedCoworker: true,
            client_coworker_ref: normalizedCoworkerId,
            coworker_details: annotation.coworker_details ?? optimisticDetails,
            desk_assignment: assignmentRow,
            coworker_assignments: nextAssignments,
            coworker_assignment_count: nextAssignments.length,
            client_desk_status:
              String(clientDeskStatus || annotation.client_desk_status || 'Occupied').trim() ||
              'Occupied',
          };
        }),
      );
    },
    [],
  );

  const handleRemoveCoworkerFromDesk = useCallback(
    async (ann, currentAssignment = null) => {
      const custId = String(customerId || '').trim();
      const center = String(centerId || '').trim();
      const floorId = String(blockFloorId || '').trim();
      const spaceId = String(ann?.space_id || '').trim();
      const subSpaceId = String(ann?.sub_space_id || '').trim();
      const deskId = String(ann?.desk_id || '').trim();
      const coworkerId = String(
        currentAssignment?.client_coworker_ref ||
          currentAssignment?.coworker_id ||
          ann?.client_coworker_ref ||
          '',
      ).trim();

      if (!custId || !center || !floorId || !spaceId || !subSpaceId || !deskId || !coworkerId) {
        showErrorToast(new Error('Missing assignment details. Reload the layout and try again.'));
        throw new Error('Missing assignment details');
      }

      suppressedOptimisticDeskIdsRef.current.add(deskId);

      try {
        const removeResult = await postRemoveCoworkerFromDesk({
          customer_id: custId,
          space_id: spaceId,
          sub_space_id: subSpaceId,
          desk_id: deskId,
          coworker_id: coworkerId,
          center_id: center,
        });
        showSuccessToast('Co-worker removed from desk');
        clearDeskSlotAssignment(deskId, {
          coworkerId,
          clientDeskStatus: removeResult?.client_desk_status,
        });
        await dispatch(
          fetchClientFloorLayoutCoordinatesThunk({
            center_id: center,
            customer_id: custId,
            block_floor_id: floorId,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to remove co-worker from desk' });
        suppressedOptimisticDeskIdsRef.current.delete(deskId);
        throw error;
      }
    },
    [blockFloorId, centerId, clearDeskSlotAssignment, customerId, dispatch],
  );

  const handleClientMarkerAssign = useCallback(({ markerId, coworkerId, coworkerName }) => {
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === markerId
          ? {
              ...a,
              coworker_id: coworkerId,
              coworker_name: coworkerName,
            }
          : a,
      ),
    );
    setMarkerForAssociation(null);
  }, []);

  // Re-merge when spaceAnnotations reference changes (e.g. fresh API load)
  useEffect(() => {
    setAnnotations((prev) => {
      const existingMarkers = prev.filter((a) => a.source === CLIENT_MARKER_SOURCE);
      const optimisticDeskSlots = new Map(
        prev
          .filter(
            (a) =>
              a.source === CLIENT_SUBSPACE_SLOT_SOURCE &&
              a.hasDeskAssignment &&
              String(a.client_coworker_ref || '').trim(),
          )
          .map((a) => [String(a.desk_id || '').trim(), a]),
      );

      const mergedSlots = spaceAnnotations.map((ann) => {
        if (ann.source !== CLIENT_SUBSPACE_SLOT_SOURCE) return ann;
        const deskId = String(ann.desk_id || '').trim();
        if (deskId && suppressedOptimisticDeskIdsRef.current.has(deskId)) {
          if (!ann.hasDeskAssignment && !String(ann.client_coworker_ref || '').trim()) {
            suppressedOptimisticDeskIdsRef.current.delete(deskId);
          }
          return ann;
        }
        const optimistic = deskId ? optimisticDeskSlots.get(deskId) : null;
        if (!optimistic || ann.hasDeskAssignment) return ann;
        return {
          ...ann,
          hasDeskAssignment: true,
          hasAssignedCoworker: true,
          client_coworker_ref: optimistic.client_coworker_ref,
          coworker_details: optimistic.coworker_details ?? ann.coworker_details,
          desk_assignment: optimistic.desk_assignment ?? ann.desk_assignment,
          coworker_assignments: optimistic.coworker_assignments ?? ann.coworker_assignments ?? [],
          coworker_assignment_count:
            optimistic.coworker_assignment_count ?? ann.coworker_assignment_count ?? 0,
          client_desk_status: optimistic.client_desk_status ?? ann.client_desk_status,
        };
      });

      return [...mergedSlots, ...existingMarkers];
    });
  }, [spaceAnnotations]);

  const isMountedRef = useRef(false);

  // Persist markers to localStorage whenever annotations change
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const markers = annotations
      .filter((a) => a.source === CLIENT_MARKER_SOURCE)
      .map((a) => ({
        id: a.id,
        nx: a.x,
        ny: a.y,
        createdAt: a.createdAt ?? new Date().toISOString(),
        ...(a.coworker_id ? { coworker_id: a.coworker_id, coworker_name: a.coworker_name } : {}),
      }));
    saveClientLayoutMarkersToStorage(customerId, blockFloorId, markers);
  }, [annotations, customerId, blockFloorId]);

  const polygonAnnotationsForGuard = useMemo(
    () =>
      spaceAnnotations.filter(
        (a) =>
          a.source === CLIENT_SPACE_REGION_SOURCE &&
          (a.type === 'polygon' || a.type === 'rectangle'),
      ),
    [spaceAnnotations],
  );

  const handleBeforeAnnotationAdd = useCallback(
    ({ type, nx, ny }) => {
      if (type !== 'point') return false;
      return isPointInAllocatedRegions(nx, ny, polygonAnnotationsForGuard);
    },
    [polygonAnnotationsForGuard],
  );

  const spaceColorMap = useMemo(() => {
    const map = new Map();
    let paletteIndex = 0;
    spaceAnnotations.forEach((ann) => {
      if (ann.source !== CLIENT_SPACE_REGION_SOURCE) return;
      map.set(
        ann.id,
        CLIENT_LAYOUT_SPACE_PALETTE[paletteIndex % CLIENT_LAYOUT_SPACE_PALETTE.length],
      );
      paletteIndex += 1;
    });
    return map;
  }, [spaceAnnotations]);

  const resolveAnnotationStyle = useCallback(
    (ann) => {
      if (ann.source === CLIENT_MARKER_SOURCE) return {};
      if (ann.source === CLIENT_SUBSPACE_HIGHLIGHT_SOURCE) {
        return {
          fill: ann.fill,
          stroke: ann.stroke,
          strokeWidth: ann.strokeWidth ?? 2,
        };
      }
      if (ann.source !== CLIENT_SPACE_REGION_SOURCE) return {};
      if (ann.type !== 'polygon' && ann.type !== 'rectangle' && ann.type !== 'pen') return {};
      const color = spaceColorMap.get(ann.id) ?? CLIENT_LAYOUT_SPACE_PALETTE[0];
      return {
        fill: color.fill,
        stroke: color.stroke,
        strokeWidth: 2,
      };
    },
    [spaceColorMap],
  );

  const handleAnnotationsChange = useCallback((next) => {
    setAnnotations(
      next.map((a) =>
        a.type === 'point' && !a.source ? { ...a, source: CLIENT_MARKER_SOURCE } : a,
      ),
    );
  }, []);

  const slotButtonClass =
    'pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-stroke-soft-300 bg-white/90 text-text-sub-600 shadow-sm hover:border-stroke-soft-400 hover:text-text-strong-950';

  const renderAnnotationOverlay = useCallback(
    (ann) => {
      if (ann.source === CLIENT_SUBSPACE_SLOT_SOURCE) {
        const matchesHighlight =
          Boolean(highlightCoworkerRef) &&
          (String(ann?.client_coworker_ref || '').trim() === highlightCoworkerRef ||
            (Array.isArray(ann?.coworker_assignments) &&
              ann.coworker_assignments.some(
                (row) =>
                  String(row?.client_coworker_ref || row?.coworker_id || '').trim() ===
                  highlightCoworkerRef,
              )));
        if (!canWriteClientLayout && !ann?.hasDeskAssignment) {
          return null;
        }
        return (
          <ClientDeskCoworkerSeatOverlay
            ann={ann}
            slotButtonClass={slotButtonClass}
            onAssign={canWriteClientLayout ? openAssignModalForMarker : undefined}
            onRemove={canWriteClientLayout ? handleRemoveCoworkerFromDesk : undefined}
            forcePopoverOpen={matchesHighlight}
          />
        );
      }
      if (ann.source !== CLIENT_MARKER_SOURCE) return null;
      if (!canWriteClientLayout) return null;
      return (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            openAssignModalForMarker(ann);
          }}
          className={slotButtonClass}
        >
          <RiAddCircleLine size={15} />
        </button>
      );
    },
    [
      slotButtonClass,
      openAssignModalForMarker,
      handleRemoveCoworkerFromDesk,
      highlightCoworkerRef,
      canWriteClientLayout,
    ],
  );

  const renderSelectedAnnotationOverlay = useCallback((ann) => {
    if (ann.source !== CLIENT_SUBSPACE_HIGHLIGHT_SOURCE) return null;
    return <ClientSubspaceHoverPopover annotation={ann} />;
  }, []);

  const maskImageWidth = image?.raster?.naturalWidth || image?.width || 0;
  const maskImageHeight = image?.raster?.naturalHeight || image?.height || 0;

  /**
   * Sub-space polygons used as spotlight "holes" when a header filter is active.
   * The annotations are already server-filtered, so every visible sub-space here
   * counts as a match.
   */
  const filterSpotlightShapes = useMemo(() => {
    if (!filterActive) return [];
    return spaceAnnotations.filter(
      (a) =>
        a?.source === CLIENT_SUBSPACE_HIGHLIGHT_SOURCE &&
        (a?.type === 'polygon' || a?.type === 'rectangle'),
    );
  }, [filterActive, spaceAnnotations]);

  const maskShape = useMemo(() => {
    if (!maskImageWidth || !maskImageHeight) return null;
    if (filterSpotlightShapes.length > 0) {
      return (
        <ClientMaskShape
          imageWidth={maskImageWidth}
          imageHeight={maskImageHeight}
          spaceAnnotations={filterSpotlightShapes}
          opacity={0.85}
        />
      );
    }
    return (
      <ClientMaskShape
        imageWidth={maskImageWidth}
        imageHeight={maskImageHeight}
        spaceAnnotations={polygonAnnotationsForGuard}
      />
    );
  }, [maskImageWidth, maskImageHeight, polygonAnnotationsForGuard, filterSpotlightShapes]);

  const renderToolbar = useCallback(
    (ctx) => (
      <ClientFloorPlanToolbar
        activeToolId={ctx.activeToolId}
        onToolChange={ctx.setActiveTool}
        zoomPercent={ctx.zoomPercent}
        onZoomIn={() => ctx.transformRef.current?.zoomIn()}
        onZoomOut={() => ctx.transformRef.current?.zoomOut()}
        onRecenter={() => ctx.transformRef.current?.centerView(undefined, 0)}
        canUndo={ctx.canUndo}
        onUndo={ctx.undo}
        canRedo={ctx.canRedo}
        onRedo={ctx.redo}
      />
    ),
    [],
  );

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <FloorPlanEditor
        image={image}
        annotations={annotations}
        onChange={handleAnnotationsChange}
        stageRef={stageRef}
        fitContentOnMount={fitContentOnMount}
        showSidebar
        readOnly={false}
        layoutId={layoutId}
        activeToolId={activeTool}
        onActiveToolChange={setActiveTool}
        onBeforeAnnotationAdd={handleBeforeAnnotationAdd}
        toolbarEnabledToolIds={[TOOL_IDS.SELECT]}
        listenForAnnotationHits
        resolveAnnotationStyle={resolveAnnotationStyle}
        renderAnnotationOverlay={renderAnnotationOverlay}
        renderSelectedAnnotationOverlay={renderSelectedAnnotationOverlay}
        hoverOverlayCloseDelayMs={900}
        maskShape={maskShape}
        renderToolbar={renderToolbar}
      />

      <ClientAssignCoworkerModal
        open={canWriteClientLayout && standardAssignOpen}
        onOpenChange={(open) => {
          if (!open) closeAssignModals();
          else setStandardAssignOpen(true);
        }}
        clientId={customerId}
        centerId={centerId}
        blockFloorId={blockFloorId}
        marker={markerForAssociation}
        onClientMarkerAssign={handleClientMarkerAssign}
        onDeskAssignmentSaved={handleDeskAssignmentSaved}
      />
      <ClientAssignHotDeskCoworkerModal
        open={canWriteClientLayout && hotDeskAssignOpen}
        onOpenChange={(open) => {
          if (!open) closeAssignModals();
          else setHotDeskAssignOpen(true);
        }}
        clientId={customerId}
        centerId={centerId}
        blockFloorId={blockFloorId}
        marker={markerForAssociation}
        onDeskAssignmentSaved={handleDeskAssignmentSaved}
      />
    </div>
  );
}
