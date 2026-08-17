import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image, Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import {
  MapPin,
  MousePointer2,
  Pentagon,
  Spline,
  Square,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  PanelRightClose,
  PanelRightOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  Pencil,
  BadgeIndianRupee,
  Calendar,
  Building2,
  Tag,
  Armchair,
  Coins,
} from 'lucide-react';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import { useLayoutAnnotationState } from '@/hooks/use-layout-annotation-state';
import {
  polygonAreaFromNormalized,
  polygonCentroidNormalized,
  polylineLengthFromNormalized,
  polylineMidAnchorNormalized,
  rectangleAreaFromNormalized,
  rectangleCenterNormalized,
} from '@/utils/layout-annotation-geometry';
import { cn } from '@/utils/cn';

const CLOSE_DISTANCE_PX = 14;

const TOOLS = {
  select: { id: 'select', label: 'Select', Icon: MousePointer2 },
  polygon: { id: 'polygon', label: 'Polygon', Icon: Pentagon },
  polyline: { id: 'polyline', label: 'Polyline', Icon: Spline },
  rectangle: { id: 'rectangle', label: 'Rectangle', Icon: Square },
  point: { id: 'point', label: 'Dot', Icon: MapPin },
};

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function flatToKonvaPoints(flat, viewW, viewH) {
  const arr = [];
  for (let i = 0; i < flat.length; i += 2) {
    arr.push(flat[i] * viewW, flat[i + 1] * viewH);
  }
  return arr;
}

function getStageFromKonvaEvent(e) {
  const t = e?.target;
  if (t && typeof t.getStage === 'function') return t.getStage();
  return null;
}

function pointerToNormalizedFromKonvaEvent(e, viewW, viewH) {
  const stage = getStageFromKonvaEvent(e);
  if (!stage || !viewW || !viewH) return null;

  const pos = stage.getPointerPosition();
  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
    const nx = clamp01(pos.x / viewW);
    const ny = clamp01(pos.y / viewH);
    if (Number.isFinite(nx) && Number.isFinite(ny)) {
      return { x: nx, y: ny };
    }
  }

  const content = stage.content;
  const evt = e?.evt;
  if (!content || typeof content.getBoundingClientRect !== 'function' || !evt) {
    return null;
  }

  const rect = content.getBoundingClientRect();
  const scaleX = rect.width / (content.clientWidth || rect.width);
  const scaleY = rect.height / (content.clientHeight || rect.height);

  let clientX;
  let clientY;
  if (evt.touches && evt.touches.length > 0) {
    ({ clientX, clientY } = evt.touches[0]);
  } else if (evt.changedTouches && evt.changedTouches.length > 0) {
    ({ clientX, clientY } = evt.changedTouches[0]);
  } else {
    ({ clientX, clientY } = evt);
  }

  if (typeof clientX !== 'number' || typeof clientY !== 'number' || Number.isNaN(clientX)) {
    return null;
  }
  if (rect.width < 0.5 || rect.height < 0.5) {
    return null;
  }

  const x = (clientX - rect.left) / scaleX;
  const y = (clientY - rect.top) / scaleY;
  const nx = clamp01(x / viewW);
  const ny = clamp01(y / viewH);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
  return { x: nx, y: ny };
}

function isFloorPlanBackgroundTarget(e, imageNodeRef) {
  const t = e?.target;
  if (!t || typeof t.getType !== 'function') return false;
  const type = t.getType();

  if (type === 'Line' || type === 'Circle') return false;
  if (type === 'Rect') return false;
  if (type === 'Transformer' || type === 'Label' || type === 'Tag' || type === 'Text') return false;
  if (type === 'Image') return true;
  if (imageNodeRef?.current && t === imageNodeRef.current) return true;

  return type === 'Stage' || type === 'Layer';
}

function distanceNx(a, b, viewW, viewH) {
  const px = (a.x - b.x) * viewW;
  const py = (a.y - b.y) * viewH;
  return Math.hypot(px, py);
}

function clampNorm(v) {
  return Math.min(1, Math.max(0, v));
}

const PALETTE = [
  { stroke: '#2563eb', fill: 'rgba(37, 99, 235, 0.22)' },
  { stroke: '#16a34a', fill: 'rgba(22, 163, 74, 0.22)' },
  { stroke: '#c026d3', fill: 'rgba(192, 38, 211, 0.2)' },
  { stroke: '#ea580c', fill: 'rgba(234, 88, 12, 0.22)' },
  { stroke: '#0891b2', fill: 'rgba(8, 145, 178, 0.22)' },
  { stroke: '#ca8a04', fill: 'rgba(202, 138, 4, 0.24)' },
  { stroke: '#7c3aed', fill: 'rgba(124, 58, 237, 0.22)' },
  { stroke: '#be123c', fill: 'rgba(190, 18, 60, 0.2)' },
];

/**
 * Space type color palette — distinct from annotation palette so type chips
 * are visually differentiated from per-shape colors.
 */
const SPACE_TYPE_PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
    dot: 'bg-fuchsia-500',
  },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
];

function spaceTypePalette(index) {
  return SPACE_TYPE_PALETTE[index % SPACE_TYPE_PALETTE.length];
}

function paletteColors(annotationIndex) {
  return PALETTE[annotationIndex % PALETTE.length];
}

function annotationMetrics(annotation, nw, nh) {
  if (!nw || !nh || !annotation) return null;
  try {
    if (annotation.type === 'polygon') {
      const area = polygonAreaFromNormalized(annotation.points, nw, nh);
      return `area ~ ${Math.round(area)} px²`;
    }
    if (annotation.type === 'rectangle') {
      const area = rectangleAreaFromNormalized(
        annotation.x,
        annotation.y,
        annotation.width,
        annotation.height,
        nw,
        nh,
      );
      return `area ~ ${Math.round(area)} px²`;
    }
    if (annotation.type === 'polyline') {
      const len = polylineLengthFromNormalized(annotation.points, nw, nh);
      return `length ~ ${Math.round(len)} px`;
    }
    if (annotation.type === 'point') {
      return `x ${annotation.x?.toFixed(4)}, y ${annotation.y?.toFixed(4)} (norm)`;
    }
  } catch {
    return null;
  }
  return null;
}

function coordSummary(annotation) {
  if (!annotation) return '';
  if (annotation.type === 'point') {
    return `x ${annotation.x.toFixed(4)}, y ${annotation.y.toFixed(4)}`;
  }
  if (annotation.type === 'rectangle') {
    const c = rectangleCenterNormalized(
      annotation.x,
      annotation.y,
      annotation.width,
      annotation.height,
    );
    return `center ${c.x.toFixed(4)}, ${c.y.toFixed(4)}`;
  }
  if (annotation.type === 'polygon') {
    const c = polygonCentroidNormalized(annotation.points);
    return `centroid ${c.x.toFixed(4)}, ${c.y.toFixed(4)}`;
  }
  if (annotation.type === 'polyline') {
    const c = polylineMidAnchorNormalized(annotation.points);
    return `anchor ${c.x.toFixed(4)}, ${c.y.toFixed(4)}`;
  }
  return '';
}

function annotationMetricsExtended(annotation, nw, nh) {
  const c = coordSummary(annotation);
  const m = annotationMetrics(annotation, nw, nh);
  if (c && m) return `${c} · ${m}`;
  return c || m || '';
}

function formatMaybeDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

/**
 * Derive the primary space type label for an annotation.
 * Prefers coworking_inventory_type → inventory_type → 'Unknown'.
 */
function getSpaceType(annotation) {
  if (!annotation) return 'Unknown';
  return annotation?.space?.inventory_type || 'Unknown';
}

// ─────────────────────────────────────────────
// SpaceTypeFilterPanel
// ─────────────────────────────────────────────
/**
 * @param {{ annotations: object[], hiddenTypes: Set<string>, onToggleType: (type: string) => void, onToggleAll: (visible: boolean) => void }} props
 */
function SpaceTypeFilterPanel({ annotations, hiddenTypes, onToggleType, onToggleAll }) {
  const [collapsed, setCollapsed] = useState(false);

  // Build per-type counts from all annotations (regardless of individual visibility)
  const typeStats = useMemo(() => {
    const map = new Map(); // type → { total, visible }
    annotations.forEach((ann) => {
      const t = getSpaceType(ann);
      if (!map.has(t)) map.set(t, { total: 0, visible: 0 });
      const entry = map.get(t);
      entry.total += 1;
      if (ann.visible && !hiddenTypes.has(t)) entry.visible += 1;
    });
    return [...map.entries()].map(([type, counts], i) => ({
      type,
      ...counts,
      palette: spaceTypePalette(i),
    }));
  }, [annotations, hiddenTypes]);

  const allVisible = typeStats.every((s) => !hiddenTypes.has(s.type));
  const noneVisible = typeStats.every((s) => hiddenTypes.has(s.type));

  if (typeStats.length === 0) return null;

  return (
    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 overflow-hidden'>
      {/* Header row */}
      <button
        type='button'
        className='flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-bg-weak-50 transition-colors'
        onClick={() => setCollapsed((c) => !c)}
      >
        <Layers className='size-3.5 shrink-0 text-text-sub-600' aria-hidden />
        <span className='flex-1 text-label-sm font-medium text-text-strong-950'>Space Types</span>
        {/* Summary chips when collapsed */}
        {collapsed && (
          <span className='text-paragraph-xs text-text-sub-500'>
            {typeStats.length} type{typeStats.length !== 1 ? 's' : ''}
          </span>
        )}
        {collapsed ? (
          <ChevronRight className='size-3.5 text-text-sub-500' aria-hidden />
        ) : (
          <ChevronDown className='size-3.5 text-text-sub-500' aria-hidden />
        )}
      </button>

      {!collapsed && (
        <div className='border-t border-stroke-soft-200 px-3 py-2 flex flex-col gap-1.5'>
          {/* All / None toggles */}
          <div className='flex items-center gap-1.5 mb-1'>
            <button
              type='button'
              disabled={allVisible}
              className={cn(
                'text-paragraph-xs px-2 py-0.5 rounded-md border transition-colors',
                allVisible
                  ? 'border-stroke-soft-200 text-text-disabled-300 cursor-not-allowed bg-bg-weak-50'
                  : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
              )}
              onClick={() => onToggleAll(true)}
            >
              Show all
            </button>
            <button
              type='button'
              disabled={noneVisible}
              className={cn(
                'text-paragraph-xs px-2 py-0.5 rounded-md border transition-colors',
                noneVisible
                  ? 'border-stroke-soft-200 text-text-disabled-300 cursor-not-allowed bg-bg-weak-50'
                  : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
              )}
              onClick={() => onToggleAll(false)}
            >
              Hide all
            </button>
            <span className='ml-auto text-paragraph-xs text-text-sub-500 tabular-nums'>
              {annotations.filter((a) => a.visible && !hiddenTypes.has(getSpaceType(a))).length}/
              {annotations.length} shown
            </span>
          </div>

          {/* Per-type rows */}
          {typeStats.map(({ type, total, palette }) => {
            const isHidden = hiddenTypes.has(type);
            return (
              <button
                key={type}
                type='button'
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all',
                  isHidden
                    ? 'border-stroke-soft-200 bg-bg-weak-50 opacity-60'
                    : `border ${palette.border} ${palette.bg}`,
                )}
                onClick={() => onToggleType(type)}
                title={isHidden ? `Show ${type}` : `Hide ${type}`}
              >
                {/* Color dot */}
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full transition-opacity',
                    isHidden ? 'bg-stroke-soft-200' : palette.dot,
                  )}
                  aria-hidden
                />

                {/* Type label */}
                <span
                  className={cn(
                    'flex-1 truncate text-paragraph-xs font-medium transition-colors',
                    isHidden ? 'text-text-sub-500' : palette.text,
                  )}
                >
                  {type}
                </span>

                {/* Count badge */}
                <span
                  className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-paragraph-xs tabular-nums font-medium transition-colors',
                    isHidden
                      ? 'bg-stroke-soft-200 text-text-sub-500'
                      : `${palette.bg} ${palette.text}`,
                  )}
                >
                  {total}
                </span>

                {/* Eye icon */}
                <span
                  className={cn(
                    'shrink-0 transition-opacity',
                    isHidden ? 'text-text-sub-400' : palette.text,
                  )}
                >
                  {isHidden ? (
                    <EyeOff className='size-3.5' aria-hidden />
                  ) : (
                    <Eye className='size-3.5' aria-hidden />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main LayoutAnnotationEditor
// ─────────────────────────────────────────────
const LayoutAnnotationEditor = ({
  image,
  imageUrl,
  className,
  onAnnotationsChange,
  externalHoveredId,
  onAnnotationSelect,
  allocationClients = [],
  onAllocateClient,
  initialAnnotations = [],
  onRequestSaveSelected,
  onRequestDeleteSelected,
  isSavingSelected = false,
  enableRightSidebarCollapse = false,
}) => {
  const imageNodeRef = useRef(null);
  const rectRef = useRef(null);
  const transformerRef = useRef(null);
  const lastPointerDownRef = useRef(0);

  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    toggleVisibility,
    replacePresentWithoutHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useLayoutAnnotationState();

  useLayoutEffect(() => {
    replacePresentWithoutHistory(Array.isArray(initialAnnotations) ? initialAnnotations : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tool, setTool] = useState('polygon');
  const [selectedId, setSelectedId] = useState(null);
  const [internalHoverId, setInternalHoverId] = useState(null);
  const hoveredId = externalHoveredId ?? internalHoverId;

  const [draftPoints, setDraftPoints] = useState([]);
  const [draftKind, setDraftKind] = useState(null);

  const [rectDrag, setRectDrag] = useState(null);

  const [viewZoom, setViewZoom] = useState(1);
  const [hoverSpacePopover, setHoverSpacePopover] = useState(null);
  const hoverSpaceCloseTimer = useRef(null);
  const canvasScrollRef = useRef(null);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  /**
   * hiddenTypes: Set of space-type strings that are toggled off via the
   * SpaceTypeFilterPanel. Shapes whose type is in this set are hidden on
   * the canvas (even if their individual ann.visible is true).
   */
  const [hiddenTypes, setHiddenTypes] = useState(new Set());

  const handleToggleType = useCallback((type) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleToggleAllTypes = useCallback(
    (visible) => {
      if (visible) {
        setHiddenTypes(new Set());
      } else {
        const allTypes = new Set(annotations.map(getSpaceType));
        setHiddenTypes(allTypes);
      }
    },
    [annotations],
  );

  /**
   * Effective visibility = ann.visible AND type not hidden
   */
  const isEffectivelyVisible = useCallback(
    (ann) => ann.visible && !hiddenTypes.has(getSpaceType(ann)),
    [hiddenTypes],
  );

  const selectedAnnotation = useMemo(
    () => annotations.find((a) => a.id === selectedId) || null,
    [annotations, selectedId],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedAnnotation) return;
    if (onRequestDeleteSelected) {
      const handledExternally = onRequestDeleteSelected(selectedAnnotation);
      if (handledExternally) return;
    }
    removeAnnotation(selectedAnnotation.id);
    setSelectedId(null);
  }, [onRequestDeleteSelected, removeAnnotation, selectedAnnotation]);

  const naturalWidth = image?.naturalWidth ?? 0;
  const naturalHeight = image?.naturalHeight ?? 0;

  const viewW = Math.max(1, Math.round(naturalWidth * viewZoom));
  const viewH = Math.max(1, Math.round(naturalHeight * viewZoom));

  useEffect(() => {
    onAnnotationsChange?.(annotations);
  }, [annotations, onAnnotationsChange]);

  useEffect(() => {
    const selected = annotations.find((a) => a.id === selectedId);
    if (selected?.type === 'rectangle' && rectRef.current && transformerRef.current) {
      transformerRef.current.nodes([rectRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedId, annotations, viewW, viewH]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDraftPoints([]);
        setDraftKind(null);
        setRectDrag(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDeleteSelected();
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'Z')) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, handleDeleteSelected, undo, redo]);

  useEffect(() => {
    const el = canvasScrollRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const dy = e.deltaY;
      setViewZoom((z) => {
        const next = z * (1 - dy * 0.0015);
        return Math.min(8, Math.max(0.05, next));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const finishPolygon = useCallback(() => {
    if (draftKind !== 'polygon' || draftPoints.length < 6) return;
    addAnnotation({ type: 'polygon', points: [...draftPoints] });
    setDraftPoints([]);
    setDraftKind(null);
  }, [draftKind, draftPoints, addAnnotation]);

  const finishPolyline = useCallback(() => {
    if (draftKind !== 'polyline' || draftPoints.length < 4) return;
    addAnnotation({ type: 'polyline', points: [...draftPoints] });
    setDraftPoints([]);
    setDraftKind(null);
  }, [draftKind, draftPoints, addAnnotation]);

  const handleStagePointerDown = useCallback(
    (e) => {
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      const sinceLast = now - lastPointerDownRef.current;
      if (sinceLast < 45) return;
      lastPointerDownRef.current = now;

      if (!isFloorPlanBackgroundTarget(e, imageNodeRef)) return;

      const n = pointerToNormalizedFromKonvaEvent(e, viewW, viewH);
      if (!n) return;

      if (tool === 'select') {
        setSelectedId(null);
        return;
      }
      if (tool === 'point') {
        addAnnotation({ type: 'point', x: n.x, y: n.y });
        return;
      }
      if (tool === 'rectangle') {
        setRectDrag({ ax: n.x, ay: n.y, bx: n.x, by: n.y });
        return;
      }
      if (tool === 'polygon' || tool === 'polyline') {
        if (draftKind && draftKind !== tool) setDraftPoints([]);
        setDraftKind(tool);
        setDraftPoints((prev) => [...prev, n.x, n.y]);
      }
    },
    [tool, viewW, viewH, addAnnotation, draftKind],
  );

  const handlePointerMove = useCallback(
    (e) => {
      const n = pointerToNormalizedFromKonvaEvent(e, viewW, viewH);
      if (!n) return;
      if (rectDrag) {
        setRectDrag((r) => (r ? { ...r, bx: n.x, by: n.y } : null));
      }
    },
    [rectDrag, viewW, viewH],
  );

  const commitRectDrag = useCallback(
    (drag) => {
      if (!drag) return;
      const { ax, ay, bx, by } = drag;
      const x = Math.min(ax, bx);
      const y = Math.min(ay, by);
      const width = Math.abs(bx - ax);
      const height = Math.abs(by - ay);
      if (width < 0.005 || height < 0.005) return;
      addAnnotation({ type: 'rectangle', x, y, width, height });
    },
    [addAnnotation],
  );

  const handlePointerUp = useCallback(() => {
    if (!rectDrag) return;
    const drag = rectDrag;
    setRectDrag(null);
    commitRectDrag(drag);
  }, [rectDrag, commitRectDrag]);

  const handleDblClick = useCallback(
    (e) => {
      if (!isFloorPlanBackgroundTarget(e, imageNodeRef)) return;
      if (tool !== 'polygon' || draftPoints.length < 6) return;
      const n = pointerToNormalizedFromKonvaEvent(e, viewW, viewH);
      if (!n || draftPoints.length < 2) return;
      const first = { x: draftPoints[0], y: draftPoints[1] };
      if (distanceNx(n, first, viewW, viewH) < CLOSE_DISTANCE_PX) {
        e.cancelBubble = true;
        finishPolygon();
      }
    },
    [tool, draftPoints, viewW, viewH, finishPolygon],
  );

  const cancelHoverSpaceClose = useCallback(() => {
    if (hoverSpaceCloseTimer.current) {
      window.clearTimeout(hoverSpaceCloseTimer.current);
      hoverSpaceCloseTimer.current = null;
    }
  }, []);

  const scheduleHoverSpaceClose = useCallback(() => {
    cancelHoverSpaceClose();
    hoverSpaceCloseTimer.current = window.setTimeout(() => {
      setHoverSpacePopover(null);
    }, 220);
  }, [cancelHoverSpaceClose]);

  const hitProps = useCallback(
    (ann) => ({
      onClick: (ev) => {
        ev.cancelBubble = true;
        setSelectedId(ann.id);
        onAnnotationSelect?.(ann.id);
      },
      onMouseEnter: (ev) => {
        cancelHoverSpaceClose();
        setInternalHoverId(ann.id);
        const evt = ev?.evt;
        if (ann?.space && evt && typeof evt.clientX === 'number') {
          setHoverSpacePopover({ id: ann.id, x: evt.clientX, y: evt.clientY, space: ann.space });
        }
      },
      onMouseMove: (ev) => {
        const evt = ev?.evt;
        if (ann?.space && evt && typeof evt.clientX === 'number') {
          setHoverSpacePopover((p) =>
            p?.id === ann.id ? { id: ann.id, x: evt.clientX, y: evt.clientY, space: ann.space } : p,
          );
        }
      },
      onMouseLeave: () => {
        setInternalHoverId(null);
        scheduleHoverSpaceClose();
      },
    }),
    [cancelHoverSpaceClose, onAnnotationSelect, scheduleHoverSpaceClose],
  );

  const renderAnnotations = () =>
    annotations.map((ann) => {
      // Respect both individual visibility AND space-type visibility
      if (!isEffectivelyVisible(ann)) return null;

      const pi = annotations.indexOf(ann);
      const { stroke, fill } = paletteColors(Math.max(0, pi));
      const isSel = ann.id === selectedId;
      const isHov = ann.id === hoveredId;
      const strokeActive = isSel ? '#1e40af' : isHov ? '#ea580c' : stroke;
      const fillActive = isSel ? fill.replace(/0\.\d+\)/u, '0.38)') : fill;
      const hp = hitProps(ann);
      const commonStroke = { strokeWidth: isSel ? 3.5 : 2, lineCap: 'round', lineJoin: 'round' };

      const dragLinePoints = (deltaXN, deltaYN) =>
        ann.points.map((v, i) => clampNorm(v + (i % 2 === 0 ? deltaXN : deltaYN)));

      if (ann.type === 'polygon') {
        const pts = flatToKonvaPoints(ann.points, viewW, viewH);
        return (
          <Group
            key={ann.id}
            listening={tool === 'select'}
            draggable={tool === 'select'}
            onDragEnd={(e) => {
              const g = e.target;
              const dxN = g.x() / viewW;
              const dyN = g.y() / viewH;
              g.position({ x: 0, y: 0 });
              updateAnnotation(ann.id, { points: dragLinePoints(dxN, dyN) });
            }}
          >
            <Line
              points={pts}
              closed
              fill={fillActive}
              stroke={strokeActive}
              hitStrokeWidth={14}
              {...commonStroke}
              {...hp}
            />
          </Group>
        );
      }
      if (ann.type === 'polyline') {
        const pts = flatToKonvaPoints(ann.points, viewW, viewH);
        return (
          <Group
            key={ann.id}
            listening={tool === 'select'}
            draggable={tool === 'select'}
            onDragEnd={(e) => {
              const g = e.target;
              const dxN = g.x() / viewW;
              const dyN = g.y() / viewH;
              g.position({ x: 0, y: 0 });
              updateAnnotation(ann.id, { points: dragLinePoints(dxN, dyN) });
            }}
          >
            <Line
              points={pts}
              closed
              fill={fillActive}
              stroke={strokeActive}
              {...commonStroke}
              hitStrokeWidth={18}
              {...hp}
            />
          </Group>
        );
      }
      if (ann.type === 'rectangle') {
        const x = ann.x * viewW;
        const y = ann.y * viewH;
        const rw = ann.width * viewW;
        const rh = ann.height * viewH;
        const isRectangleSelected = ann.id === selectedId;
        return (
          <Rect
            key={ann.id}
            ref={isRectangleSelected ? rectRef : null}
            x={x}
            y={y}
            width={rw}
            height={rh}
            fill={fillActive}
            stroke={strokeActive}
            strokeWidth={isRectangleSelected ? 3.5 : 2}
            listening={tool === 'select'}
            {...hp}
            draggable={tool === 'select'}
            onDragEnd={(ev) => {
              const node = ev.target;
              const nx = node.x() / viewW;
              const ny = node.y() / viewH;
              const nw = (node.width() * node.scaleX()) / viewW;
              const nh = (node.height() * node.scaleY()) / viewH;
              node.scaleX(1);
              node.scaleY(1);
              updateAnnotation(ann.id, { x: nx, y: ny, width: nw, height: nh });
            }}
            onTransformEnd={() => {
              const node = rectRef.current;
              if (!node) return;
              const nx = node.x() / viewW;
              const ny = node.y() / viewH;
              const nw = (node.width() * node.scaleX()) / viewW;
              const nh = (node.height() * node.scaleY()) / viewH;
              node.scaleX(1);
              node.scaleY(1);
              updateAnnotation(ann.id, { x: nx, y: ny, width: nw, height: nh });
            }}
          />
        );
      }
      if (ann.type === 'point') {
        const cx = ann.x * viewW;
        const cy = ann.y * viewH;
        return (
          <Circle
            key={ann.id}
            x={cx}
            y={cy}
            radius={isSel ? 10 : isHov ? 9 : 7}
            fill={strokeActive}
            stroke='#fff'
            strokeWidth={2}
            listening={tool === 'select'}
            {...hp}
            draggable={tool === 'select'}
            onDragEnd={(e) => {
              const node = e.target;
              updateAnnotation(ann.id, {
                x: clampNorm(node.x() / viewW),
                y: clampNorm(node.y() / viewH),
              });
            }}
          />
        );
      }
      return null;
    });

  const draftLine = useMemo(() => {
    if (!draftKind || draftPoints.length < 2) return null;
    const pts = flatToKonvaPoints(draftPoints, viewW, viewH);
    return (
      <Line
        points={pts}
        closed={draftKind === 'polygon'}
        stroke='rgba(234, 88, 12, 0.95)'
        strokeWidth={2}
        dash={[6, 6]}
        listening={false}
      />
    );
  }, [draftKind, draftPoints, viewW, viewH]);

  const draftVertices = useMemo(() => {
    if (!draftKind || draftPoints.length === 0) return null;
    const nodes = [];
    for (let i = 0; i < draftPoints.length; i += 2) {
      nodes.push(
        <Circle
          key={`d-${i}`}
          x={draftPoints[i] * viewW}
          y={draftPoints[i + 1] * viewH}
          radius={4}
          fill='#ea580c'
          stroke='#fff'
          strokeWidth={1}
          listening={false}
        />,
      );
    }
    return nodes;
  }, [draftKind, draftPoints, viewW, viewH]);

  const previewRect = useMemo(() => {
    if (!rectDrag) return null;
    const { ax, ay, bx, by } = rectDrag;
    const x = Math.min(ax, bx) * viewW;
    const y = Math.min(ay, by) * viewH;
    const w = Math.abs(bx - ax) * viewW;
    const h = Math.abs(by - ay) * viewH;
    return (
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke='rgba(234, 88, 12, 0.9)'
        strokeWidth={2}
        dash={[4, 4]}
        fill='rgba(234, 88, 12, 0.08)'
        listening={false}
      />
    );
  }, [rectDrag, viewW, viewH]);

  const isRectangleSelected =
    Boolean(selectedId) && annotations.some((a) => a.id === selectedId && a.type === 'rectangle');

  if (!image || !viewW || !viewH) {
    return (
      <div
        className={cn(
          'flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600',
          className,
        )}
      >
        Load an image preview to annotate.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* ── Toolbar ── */}
      <div className='flex flex-wrap items-center gap-2 border-b border-stroke-soft-200 pb-3'>
        {Object.values(TOOLS).map(({ id, label, Icon }) => (
          <Button.Root
            key={id}
            type='button'
            size='small'
            variant={tool === id ? 'primary' : 'neutral'}
            mode={tool === id ? 'filled' : 'stroke'}
            className='gap-1.5'
            onClick={() => {
              setTool(id);
              if (id !== 'polygon' && id !== 'polyline') {
                setDraftPoints([]);
                setDraftKind(null);
              }
            }}
          >
            <Icon className='size-4' aria-hidden />
            {label}
          </Button.Root>
        ))}
        <div className='mx-2 h-6 w-px bg-stroke-soft-200' aria-hidden />
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          disabled={!canUndo}
          onClick={() => undo()}
        >
          <Undo2 className='size-4' aria-hidden />
          Undo
        </Button.Root>
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          disabled={!canRedo}
          onClick={() => redo()}
        >
          <Redo2 className='size-4' aria-hidden />
          Redo
        </Button.Root>
        <Button.Root
          type='button'
          size='small'
          variant='error'
          mode='stroke'
          disabled={!selectedId}
          onClick={handleDeleteSelected}
        >
          <Trash2 className='size-4' aria-hidden />
          Delete
        </Button.Root>
        {selectedAnnotation && tool === 'select' ? (
          <>
            <Button.Root
              type='button'
              size='small'
              variant='primary'
              mode={selectedAnnotation?.space_ref ? 'stroke' : 'filled'}
              disabled={isSavingSelected}
              onClick={() => onRequestSaveSelected?.(selectedAnnotation)}
              className={
                selectedAnnotation?.space_ref ? 'text-primary-base border-primary-lighter' : ''
              }
            >
              {selectedAnnotation?.space_ref ? <Pencil className='size-4' aria-hidden /> : null}
              {isSavingSelected
                ? 'Saving...'
                : selectedAnnotation?.space_ref
                  ? 'Edit'
                  : 'Associate Space'}
            </Button.Root>
            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              disabled={isSavingSelected}
              onClick={() => setSelectedId(null)}
            >
              Cancel
            </Button.Root>
          </>
        ) : null}
        {(draftKind === 'polygon' && draftPoints.length >= 6) || draftKind === 'polyline' ? (
          <>
            {draftKind === 'polygon' ? (
              <Button.Root
                type='button'
                size='small'
                variant='primary'
                mode='filled'
                onClick={finishPolygon}
              >
                Close polygon
              </Button.Root>
            ) : (
              <Button.Root
                type='button'
                size='small'
                variant='primary'
                mode='filled'
                onClick={finishPolyline}
                disabled={draftPoints.length < 4}
              >
                Finish path
              </Button.Root>
            )}
            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              onClick={() => {
                setDraftPoints([]);
                setDraftKind(null);
              }}
            >
              Cancel draw
            </Button.Root>
          </>
        ) : null}
      </div>

      {/* ── Zoom bar ── */}
      <div className='flex flex-wrap items-center gap-2 border-b border-stroke-soft-200 pb-3 text-paragraph-xs text-text-sub-600'>
        <span className='font-medium text-text-strong-950'>Canvas zoom</span>
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          className='gap-1'
          onClick={() => setViewZoom((z) => Math.max(0.05, z / 1.15))}
          aria-label='Zoom out'
        >
          <ZoomOut className='size-4' aria-hidden />
        </Button.Root>
        <span className='min-w-[4rem] tabular-nums'>{Math.round(viewZoom * 100)}%</span>
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          className='gap-1'
          onClick={() => setViewZoom((z) => Math.min(8, z * 1.15))}
          aria-label='Zoom in'
        >
          <ZoomIn className='size-4' aria-hidden />
        </Button.Root>
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          onClick={() => setViewZoom(1)}
        >
          Reset 100%
        </Button.Root>
      </div>

      {/* ── Canvas + sidebar ── */}
      <div className='flex flex-col gap-3 lg:flex-row'>
        {/* Canvas */}
        <div
          ref={canvasScrollRef}
          className={cn(
            'pointer-events-auto max-h-[100vh] w-full min-w-0 overflow-auto rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-2 touch-manipulation [&_.konvajs-content]:!outline-none',
            enableRightSidebarCollapse && isRightSidebarCollapsed ? 'lg:flex-1' : '',
          )}
        >
          <Stage
            width={viewW}
            height={viewH}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <Layer>
              <Image
                ref={imageNodeRef}
                image={image}
                width={viewW}
                height={viewH}
                onMouseDown={handleStagePointerDown}
                onTouchStart={handleStagePointerDown}
                onDblClick={handleDblClick}
              />
              {renderAnnotations()}
              {previewRect}
              {draftLine}
              {draftVertices}
              {isRectangleSelected ? (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  borderStroke='#2563eb'
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 8 || newBox.height < 8) return oldBox;
                    return newBox;
                  }}
                />
              ) : null}
            </Layer>
          </Stage>
        </div>

        {/* Collapsed sidebar toggle */}
        {enableRightSidebarCollapse && isRightSidebarCollapsed ? (
          <div className='hidden lg:flex items-start'>
            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              className='gap-1'
              onClick={() => setIsRightSidebarCollapsed(false)}
              aria-label='Expand right sidebar'
            >
              <PanelRightOpen className='size-4' aria-hidden />
              Sidebar
            </Button.Root>
          </div>
        ) : null}

        {/* ── Right sidebar ── */}
        {!enableRightSidebarCollapse || !isRightSidebarCollapsed ? (
          <aside className='flex w-full min-w-[220px] max-w-sm flex-col gap-3 lg:max-w-xs'>
            {/* ── Space Type Filter Panel ── */}
            <SpaceTypeFilterPanel
              annotations={annotations}
              hiddenTypes={hiddenTypes}
              onToggleType={handleToggleType}
              onToggleAll={handleToggleAllTypes}
            />

            {/* ── Annotations list ── */}
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-label-sm font-medium text-text-strong-950'>Annotations</p>
                {enableRightSidebarCollapse ? (
                  <Button.Root
                    type='button'
                    size='xsmall'
                    variant='neutral'
                    mode='stroke'
                    className='gap-1'
                    onClick={() => setIsRightSidebarCollapsed(true)}
                    aria-label='Collapse right sidebar'
                  >
                    <PanelRightClose className='size-3.5' aria-hidden />
                  </Button.Root>
                ) : null}
              </div>
              <p className='text-paragraph-xs text-text-sub-600'>
                Click items to highlight on the canvas. Toggle the eye to hide a layer. Coordinates
                are normalized (0–1) relative to the image.
              </p>
              <ul className='flex max-h-[280px] flex-col gap-1 overflow-y-auto pr-1'>
                {annotations.length === 0 ? (
                  <li className='text-paragraph-xs text-text-sub-500'>No marks yet.</li>
                ) : (
                  annotations.map((ann) => {
                    const spaceType = getSpaceType(ann);
                    const typeHidden = hiddenTypes.has(spaceType);
                    const effectivelyHidden = !ann.visible || typeHidden;

                    return (
                      <li key={ann.id}>
                        <div
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left text-paragraph-xs transition-colors',
                            selectedId === ann.id
                              ? 'border-primary-base bg-primary-base/10'
                              : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50',
                            effectivelyHidden && 'opacity-50',
                          )}
                        >
                          {/* Individual eye toggle */}
                          <button
                            type='button'
                            className='flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-text-sub-600 hover:bg-bg-weak-100'
                            onClick={() => toggleVisibility(ann.id)}
                            title={ann.visible ? 'Hide this shape' : 'Show this shape'}
                          >
                            {ann.visible ? (
                              <Eye className='size-4' />
                            ) : (
                              <EyeOff className='size-4 opacity-60' />
                            )}
                          </button>

                          {/* Label + metrics */}
                          <button
                            type='button'
                            className='min-w-0 flex-1 text-left'
                            onClick={() => {
                              setSelectedId(ann.id);
                              onAnnotationSelect?.(ann.id);
                            }}
                            onMouseEnter={() => setInternalHoverId(ann.id)}
                            onMouseLeave={() => setInternalHoverId(null)}
                          >
                            <span className='block truncate font-medium text-text-strong-950'>
                              {ann.label}
                            </span>
                            <span className='text-text-sub-600'>
                              {annotationMetricsExtended(ann, naturalWidth, naturalHeight)}
                              {ann.allocatedClientLabel ? (
                                <span className='mt-0.5 block text-primary-base'>
                                  Client: {ann.allocatedClientLabel}
                                </span>
                              ) : null}
                            </span>
                          </button>

                          {/* Space type chip — indicates why shape may be hidden by type filter */}
                          {spaceType && spaceType !== 'Unknown' ? (
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
                                typeHidden
                                  ? 'bg-stroke-soft-200 text-text-sub-500'
                                  : 'bg-bg-weak-100 text-text-sub-600',
                              )}
                              title={`Space type: ${spaceType}${typeHidden ? ' (hidden by type filter)' : ''}`}
                            >
                              {spaceType}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>

      {imageUrl ? <p className='text-paragraph-xs text-text-sub-500'>Source: {imageUrl}</p> : null}

      {/* Space details popover on hover */}
      {hoverSpacePopover?.space ? (
        <Popover.Root open={Boolean(hoverSpacePopover?.space)}>
          <Popover.Anchor asChild>
            <div
              className='fixed pointer-events-none h-0 w-0'
              style={{ left: hoverSpacePopover.x, top: hoverSpacePopover.y }}
            />
          </Popover.Anchor>
          <Popover.Content
            side='top'
            align='start'
            showArrow={false}
            className='z-[200] rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200'
            onMouseEnter={cancelHoverSpaceClose}
            onMouseLeave={scheduleHoverSpaceClose}
          >
            <span className='title-h5 pb-2 font-bold text-text-strong-950'>
              {hoverSpacePopover.space.inventory_name || hoverSpacePopover.space.name || 'Space'}
            </span>
            <div className='overflow-hidden rounded-xl border border-stroke-soft-200'>
              <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] divide-x divide-stroke-soft-200'>
                <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <Tag className='size-4 text-text-sub-600' aria-hidden />
                  Status
                </div>
                <div className='border-b border-stroke-soft-200 px-4 py-3'>
                  <Badge.Root size='small' variant='light' color='gray'>
                    {hoverSpacePopover.space.status || '-'}
                  </Badge.Root>
                </div>

                <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <Tag className='size-4 text-text-sub-600' aria-hidden />
                  Type
                </div>
                <div className='border-b border-stroke-soft-200 px-4 py-3'>
                  <span className='rounded-full bg-bg-weak-100 px-3 py-1 text-label-sm font-semibold uppercase tracking-wide text-text-sub-700'>
                    {hoverSpacePopover.space.inventory_type || '-'}
                  </span>
                </div>

                <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <Building2 className='size-4 text-text-sub-600' aria-hidden />
                  Managed Office Type
                </div>
                <div className='border-b border-stroke-soft-200 px-4 py-3 text-paragraph-md text-text-strong-950'>
                  {hoverSpacePopover.space.managed_office_type ||
                    hoverSpacePopover.space.coworking_inventory_type ||
                    '-'}
                </div>

                <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <Armchair className='size-4 text-text-sub-600' aria-hidden />
                  Seats
                </div>
                <div className='border-b border-stroke-soft-200 px-4 py-3 text-paragraph-md text-text-strong-950'>
                  {hoverSpacePopover.space.total_seats ||
                    hoverSpacePopover.space.no_of_seats ||
                    hoverSpacePopover.space.total_sellable_seats ||
                    0}
                </div>

                <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <BadgeIndianRupee className='size-4 text-text-sub-600' aria-hidden />
                  Rate/Seat
                </div>
                <div className='border-b border-stroke-soft-200 px-4 py-3 text-paragraph-md text-text-strong-950'>
                  ₹
                  {Number(
                    hoverSpacePopover.space.expected_per_seat_rate ||
                      hoverSpacePopover.space.expected_per_seat_cost ||
                      0,
                  ).toLocaleString('en-IN')}
                </div>

                <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <Coins className='size-4 text-text-sub-600' aria-hidden />
                  Credit Per Seat
                </div>
                <div className='border-b border-stroke-soft-200 px-4 py-3 text-paragraph-md text-text-strong-950'>
                  {hoverSpacePopover.space.credit_per_seat || '-'}
                </div>

                <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <Calendar className='size-4 text-text-sub-600' aria-hidden />
                  Lease Start Date
                </div>
                <div className='border-b border-stroke-soft-200 px-4 py-3 text-paragraph-md text-text-strong-950'>
                  {formatMaybeDate(
                    hoverSpacePopover.space.lease_start_date || hoverSpacePopover.space.creation,
                  )}
                </div>

                <div className='flex items-center gap-2 px-4 py-3 text-paragraph-sm text-text-strong-950'>
                  <Calendar className='size-4 text-text-sub-600' aria-hidden />
                  Lease End Date
                </div>
                <div className='px-4 py-3 text-paragraph-md text-text-strong-950'>
                  {formatMaybeDate(
                    hoverSpacePopover.space.lease_end_date || hoverSpacePopover.space.modified,
                  )}
                </div>
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>
      ) : null}
    </div>
  );
};

export default LayoutAnnotationEditor;
