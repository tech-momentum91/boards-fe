import React, { memo, useMemo } from 'react';
import { Circle, Ellipse, Group, Line, Rect, Shape } from 'react-konva';

import { bezierPointsToWorld, buildBezierPath } from '../../core/bezier.js';
import {
  getNormalizedAnnotationBBox,
  scaleAnnotationToBBox,
} from '../../core/annotation-bounds.js';
import { clamp01, flatNormalizedToWorld } from '../../core/geometry.js';
import { TICKET_MARKER_SOURCE } from '@/constants/layout/annotation-sources';

/** Matches server-synced sub-space pins on the layout canvas. */
const SERVER_SUBSPACE_PIN_SOURCE = 'server-subspace-pin';

const DEFAULT_PALETTE = [
  { stroke: '#2563eb', fill: 'rgba(37, 99, 235, 0.22)' },
  { stroke: '#16a34a', fill: 'rgba(22, 163, 74, 0.22)' },
  { stroke: '#c026d3', fill: 'rgba(192, 38, 211, 0.2)' },
  { stroke: '#ea580c', fill: 'rgba(234, 88, 12, 0.22)' },
  { stroke: '#0891b2', fill: 'rgba(8, 145, 178, 0.22)' },
];

function paletteAt(index) {
  return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

function dragFlatPointsByDelta(flat, deltaXN, deltaYN) {
  return flat.map((v, i) => clamp01(v + (i % 2 === 0 ? deltaXN : deltaYN)));
}

function dragBezierPointsByDelta(bezierPoints, deltaXN, deltaYN) {
  return bezierPoints.map((pt) => ({
    ...pt,
    x: clamp01(pt.x + deltaXN),
    y: clamp01(pt.y + deltaYN),
    handleIn: pt.handleIn
      ? { x: clamp01(pt.handleIn.x + deltaXN), y: clamp01(pt.handleIn.y + deltaYN) }
      : null,
    handleOut: pt.handleOut
      ? { x: clamp01(pt.handleOut.x + deltaXN), y: clamp01(pt.handleOut.y + deltaYN) }
      : null,
  }));
}

function buildHitHandlers(ann, { onSelect, onHoverStart, onHoverEnd }) {
  return {
    onClick: (ev) => {
      ev.cancelBubble = true;
      onSelect(ann.id, ev);
    },
    onTap: (ev) => {
      ev.cancelBubble = true;
      onSelect(ann.id, ev);
    },
    onMouseEnter: (ev) => onHoverStart(ann.id, ev),
    onMouseLeave: () => onHoverEnd(),
  };
}

function BoundsTransformTarget({ ann, imageW, imageH, rectRef, onUpdate }) {
  const bbox = useMemo(() => getNormalizedAnnotationBBox(ann), [ann]);

  if (!bbox || bbox.width <= 0 || bbox.height <= 0) return null;

  const applyTransformToAnnotation = () => {
    const node = rectRef?.current;
    if (!node) return;

    const fromBBox = getNormalizedAnnotationBBox(ann);
    if (!fromBBox) return;

    const toBBox = {
      minX: node.x() / imageW,
      minY: node.y() / imageH,
      width: (node.width() * node.scaleX()) / imageW,
      height: (node.height() * node.scaleY()) / imageH,
    };

    node.scaleX(1);
    node.scaleY(1);
    node.width(toBBox.width * imageW);
    node.height(toBBox.height * imageH);

    onUpdate(ann.id, scaleAnnotationToBBox(ann, fromBBox, toBBox));
  };

  return (
    <Rect
      ref={rectRef}
      x={bbox.minX * imageW}
      y={bbox.minY * imageH}
      width={bbox.width * imageW}
      height={bbox.height * imageH}
      fill='transparent'
      stroke='transparent'
      listening={false}
      onTransformEnd={applyTransformToAnnotation}
    />
  );
}

/**
 * @param {object} props
 * @param {object} props.annotation
 * @param {number} props.imageW
 * @param {number} props.imageH
 * @param {boolean} props.isSelected
 * @param {boolean} props.isHovered
 * @param {number} props.paletteIndex
 * @param {boolean} props.selectMode
 * @param {boolean} [props.listenForHits] when set, controls hit targets for hover/click (drag still uses selectMode)
 * @param {(ann: object) => { fill?: string, stroke?: string, dash?: number[] } | undefined} [props.resolveStyle]
 * @param {(id: string, ev: object) => void} props.onSelect
 * @param {(id: string, ev: object) => void} props.onHoverStart
 * @param {() => void} props.onHoverEnd
 * @param {(id: string, patch: object) => void} props.onUpdate
 * @param {React.RefObject} [props.rectRef]
 * @param {boolean} [props.isDimmed]
 * @param {boolean} [props.allowLockedSubSpacePinDrag] when true, server sub-space pins can be dragged while still `locked`
 * @param {boolean} [props.suppressSelectionChrome] when true, skip selected stroke/fill emphasis (e.g. click popover overlay)
 */
export const AnnotationNode = memo(
  ({
    annotation: ann,
    imageW,
    imageH,
    isSelected,
    isHovered,
    paletteIndex,
    selectMode,
    listenForHits,
    resolveStyle,
    onSelect,
    onHoverStart,
    onHoverEnd,
    onUpdate,
    rectRef,
    isDimmed,
    allowLockedSubSpacePinDrag = false,
    suppressSelectionChrome = false,
  }) => {
    const hitListen = listenForHits ?? selectMode;
    const opacity = isDimmed ? 0.18 : 1;
    const hp = useMemo(
      () => buildHitHandlers(ann, { onSelect, onHoverStart, onHoverEnd }),
      [ann, onHoverEnd, onHoverStart, onSelect],
    );

    const custom = resolveStyle?.(ann);
    const base = paletteAt(paletteIndex);
    const strokeUnassociated = '#64748b';
    const fillUnassociated = 'rgba(148, 163, 184, 0.18)';
    const hasAssociation = Boolean(ann.associationId ?? ann.space_ref);
    const pinDragOk = allowLockedSubSpacePinDrag && ann.source === SERVER_SUBSPACE_PIN_SOURCE;
    const ticketMarkerDragOk =
      ann.type === 'point' && ann.source === TICKET_MARKER_SOURCE && !ann.locked;
    const draggablePrim = (selectMode && (!ann.locked || pinDragOk)) || ticketMarkerDragOk;
    const groupDraggable = draggablePrim && !(isSelected && rectRef);
    let stroke = custom?.stroke ?? base.stroke;
    let fill = custom?.fill ?? base.fill;
    let dash = custom?.dash;
    if (!hasAssociation) {
      stroke = custom?.stroke ?? strokeUnassociated;
      fill = custom?.fill ?? fillUnassociated;
      dash = custom?.dash ?? [8, 6];
    }
    if (isSelected && !suppressSelectionChrome) stroke = '#1e40af';
    if (isHovered && !isSelected) stroke = '#ea580c';
    const showSelectionChrome = isSelected && !suppressSelectionChrome;
    const fillActive = showSelectionChrome ? fill.replace(/0\.\d+\)/u, '0.38)') : fill;
    const baseStrokeWidth = custom?.strokeWidth ?? (showSelectionChrome ? 3.5 : 2);
    const commonStroke = {
      strokeWidth: showSelectionChrome
        ? Math.max(Number(custom?.strokeWidth) || 2, 3.5)
        : baseStrokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
    };

    const ptsWorld = useMemo(() => {
      if (ann.type !== 'polygon' && ann.type !== 'polyline' && ann.type !== 'pen') return [];
      return flatNormalizedToWorld(ann.points, imageW, imageH);
    }, [ann.points, ann.type, imageH, imageW]);
    const updatePointFromNode = (node) => {
      onUpdate(ann.id, {
        x: clamp01(node.x() / imageW),
        y: clamp01(node.y() / imageH),
      });
    };

    if (ann.type === 'polygon') {
      return (
        <>
          <Group
            key={ann.id}
            opacity={opacity}
            listening={hitListen}
            draggable={groupDraggable}
            onDragEnd={(e) => {
              const g = e.target;
              const deltaXN = g.x() / imageW;
              const deltaYN = g.y() / imageH;
              g.position({ x: 0, y: 0 });
              onUpdate(ann.id, { points: dragFlatPointsByDelta(ann.points, deltaXN, deltaYN) });
            }}
          >
            <Line
              points={ptsWorld}
              closed
              fill={fillActive}
              stroke={stroke}
              dash={dash}
              hitStrokeWidth={14}
              perfectDrawEnabled={false}
              {...commonStroke}
              {...hp}
            />
          </Group>
          {rectRef ? (
            <BoundsTransformTarget
              ann={ann}
              imageW={imageW}
              imageH={imageH}
              rectRef={rectRef}
              onUpdate={onUpdate}
            />
          ) : null}
        </>
      );
    }

    if (ann.type === 'polyline') {
      return (
        <Group
          key={ann.id}
          opacity={opacity}
          listening={hitListen}
          draggable={draggablePrim}
          onDragEnd={(e) => {
            const g = e.target;
            const deltaXN = g.x() / imageW;
            const deltaYN = g.y() / imageH;
            g.position({ x: 0, y: 0 });
            onUpdate(ann.id, { points: dragFlatPointsByDelta(ann.points, deltaXN, deltaYN) });
          }}
        >
          <Line
            points={ptsWorld}
            closed
            fill={fillActive}
            stroke={stroke}
            dash={dash}
            {...commonStroke}
            hitStrokeWidth={18}
            perfectDrawEnabled={false}
            {...hp}
          />
        </Group>
      );
    }

    if (ann.type === 'pen') {
      // Legacy flat-points pen → render as tension line (backward compat)
      if (!ann.bezierPoints) {
        return (
          <>
            <Group
              key={ann.id}
              opacity={opacity}
              listening={hitListen}
              draggable={groupDraggable}
              onDragEnd={(e) => {
                const g = e.target;
                const deltaXN = g.x() / imageW;
                const deltaYN = g.y() / imageH;
                g.position({ x: 0, y: 0 });
                onUpdate(ann.id, { points: dragFlatPointsByDelta(ann.points, deltaXN, deltaYN) });
              }}
            >
              <Line
                points={ptsWorld}
                tension={0.5}
                stroke={stroke}
                dash={dash}
                hitStrokeWidth={14}
                perfectDrawEnabled={false}
                {...commonStroke}
                {...hp}
              />
            </Group>
            {rectRef ? (
              <BoundsTransformTarget
                ann={ann}
                imageW={imageW}
                imageH={imageH}
                rectRef={rectRef}
                onUpdate={onUpdate}
              />
            ) : null}
          </>
        );
      }

      // New bezier pen → render as canvas2d Shape
      const worldBzPts = bezierPointsToWorld(ann.bezierPoints, imageW, imageH);
      return (
        <>
          <Group
            key={ann.id}
            opacity={opacity}
            listening={hitListen}
            draggable={groupDraggable}
            onDragEnd={(e) => {
              const g = e.target;
              const deltaXN = g.x() / imageW;
              const deltaYN = g.y() / imageH;
              g.position({ x: 0, y: 0 });
              onUpdate(ann.id, {
                bezierPoints: dragBezierPointsByDelta(ann.bezierPoints, deltaXN, deltaYN),
              });
            }}
          >
            <Shape
              sceneFunc={(ctx, shape) => {
                buildBezierPath(ctx, worldBzPts, ann.closed ?? false);
                ctx.fillStrokeShape(shape);
              }}
              fill={ann.closed ? fillActive : 'transparent'}
              stroke={stroke}
              dash={dash}
              hitStrokeWidth={14}
              perfectDrawEnabled={false}
              {...commonStroke}
              {...hp}
            />
          </Group>
          {rectRef ? (
            <BoundsTransformTarget
              ann={ann}
              imageW={imageW}
              imageH={imageH}
              rectRef={rectRef}
              onUpdate={onUpdate}
            />
          ) : null}
        </>
      );
    }

    if (ann.type === 'rectangle') {
      const x = ann.x * imageW;
      const y = ann.y * imageH;
      const rw = ann.width * imageW;
      const rh = ann.height * imageH;
      return (
        <>
          <Rect
            key={ann.id}
            x={x}
            y={y}
            width={rw}
            height={rh}
            fill={fillActive}
            stroke={stroke}
            dash={dash}
            strokeWidth={
              showSelectionChrome
                ? Math.max(Number(custom?.strokeWidth) || 2, 3.5)
                : (custom?.strokeWidth ?? 2)
            }
            opacity={opacity}
            listening={hitListen}
            perfectDrawEnabled={false}
            {...hp}
            draggable={draggablePrim}
            onDragEnd={(ev) => {
              const node = ev.target;
              onUpdate(ann.id, {
                x: node.x() / imageW,
                y: node.y() / imageH,
              });
            }}
          />
          {rectRef ? (
            <BoundsTransformTarget
              ann={ann}
              imageW={imageW}
              imageH={imageH}
              rectRef={rectRef}
              onUpdate={onUpdate}
            />
          ) : null}
        </>
      );
    }

    if (ann.type === 'circle') {
      const cx = ann.x * imageW;
      const cy = ann.y * imageH;
      const rx = ann.radiusX * imageW;
      const ry = ann.radiusY * imageH;
      return (
        <>
          <Ellipse
            key={ann.id}
            x={cx}
            y={cy}
            radiusX={rx}
            radiusY={ry}
            fill={fillActive}
            stroke={stroke}
            dash={dash}
            strokeWidth={
              showSelectionChrome
                ? Math.max(Number(custom?.strokeWidth) || 2, 3.5)
                : (custom?.strokeWidth ?? 2)
            }
            opacity={opacity}
            listening={hitListen}
            perfectDrawEnabled={false}
            {...hp}
            draggable={draggablePrim}
            onDragEnd={(ev) => {
              const node = ev.target;
              onUpdate(ann.id, {
                x: node.x() / imageW,
                y: node.y() / imageH,
              });
            }}
          />
          {rectRef ? (
            <BoundsTransformTarget
              ann={ann}
              imageW={imageW}
              imageH={imageH}
              rectRef={rectRef}
              onUpdate={onUpdate}
            />
          ) : null}
        </>
      );
    }

    if (ann.type === 'point') {
      if (ann.suppressCanvasShape) {
        const cx = ann.x * imageW;
        const cy = ann.y * imageH;
        const hitRadius = Math.max(14, Number(ann.hitRadius) || 18);
        return (
          <Circle
            key={`${ann.id}-hit`}
            x={cx}
            y={cy}
            radius={hitRadius}
            fill='rgba(0,0,0,0.002)'
            strokeWidth={0}
            opacity={opacity}
            listening={hitListen}
            perfectDrawEnabled={false}
            {...hp}
            draggable={draggablePrim}
            onDragMove={(e) => {
              updatePointFromNode(e.target);
            }}
            onDragEnd={(e) => {
              updatePointFromNode(e.target);
            }}
          />
        );
      }
      const cx = ann.x * imageW;
      const cy = ann.y * imageH;
      let pointRadius = ann.marker ? 10 : 7;
      if (showSelectionChrome) pointRadius = ann.marker ? 12 : 10;
      else if (isHovered) pointRadius = ann.marker ? 11 : 9;
      const pointFill = custom?.stroke ?? stroke;
      return (
        <Circle
          key={ann.id}
          x={cx}
          y={cy}
          radius={pointRadius}
          fill={pointFill}
          stroke='#fff'
          strokeWidth={2}
          opacity={opacity}
          listening={hitListen}
          perfectDrawEnabled={false}
          {...hp}
          draggable={draggablePrim}
          onDragMove={(e) => {
            updatePointFromNode(e.target);
          }}
          onDragEnd={(e) => {
            updatePointFromNode(e.target);
          }}
        />
      );
    }

    return null;
  },
);
AnnotationNode.displayName = 'AnnotationNode';
