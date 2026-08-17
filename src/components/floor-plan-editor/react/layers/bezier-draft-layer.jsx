import React, { useMemo } from 'react';
import { Circle, Layer, Line, Rect, Shape } from 'react-konva';

import { bezierPointsToWorld, buildBezierPath } from '../../core/bezier.js';

const ANCHOR_SIZE = 8;
const HANDLE_RADIUS = 4;
const DRAFT_STROKE = 'rgba(234, 88, 12, 0.95)';
const HANDLE_STROKE = 'rgba(234, 88, 12, 0.7)';

/**
 * Non-interactive Konva layer rendering the in-progress bezier pen draft.
 * Shows the committed path, live segment to cursor, and handle UI during drag.
 *
 * @param {{ draftState: object, imageW: number, imageH: number }} props
 */
export function BezierDraftLayer({ draftState, imageW, imageH }) {
  const { points, dragStart, isDragging, livePos } = draftState;

  const worldPoints = useMemo(
    () => bezierPointsToWorld(points, imageW, imageH),
    [points, imageW, imageH],
  );

  // The point currently being placed via click+drag
  const previewPoint = useMemo(() => {
    if (!dragStart || !livePos) return null;
    const ax = dragStart.nx * imageW;
    const ay = dragStart.ny * imageH;
    if (isDragging) {
      const lx = livePos.nx * imageW;
      const ly = livePos.ny * imageH;
      return {
        anchor: { x: ax, y: ay },
        handleOut: { x: lx, y: ly },
        handleIn: { x: 2 * ax - lx, y: 2 * ay - ly },
      };
    }
    return { anchor: { x: ax, y: ay }, handleOut: null, handleIn: null };
  }, [dragStart, livePos, isDragging, imageW, imageH]);

  // Committed points + in-progress drag point for path preview
  const previewWorldPoints = useMemo(() => {
    if (!previewPoint) return worldPoints;
    return [
      ...worldPoints,
      {
        x: previewPoint.anchor.x,
        y: previewPoint.anchor.y,
        handleIn: previewPoint.handleIn,
        handleOut: previewPoint.handleOut,
        pointType: isDragging ? 'curve' : 'corner',
      },
    ];
  }, [worldPoints, previewPoint, isDragging]);

  // Dashed line from last committed anchor to cursor when hovering (not dragging)
  const liveSegmentPoints = useMemo(() => {
    if (!livePos || isDragging || previewPoint || worldPoints.length === 0) return null;
    const last = worldPoints[worldPoints.length - 1];
    return [last.x, last.y, livePos.nx * imageW, livePos.ny * imageH];
  }, [livePos, isDragging, previewPoint, worldPoints, imageW, imageH]);

  // Show close-ring around first anchor when cursor is near
  const showCloseRing = useMemo(() => {
    if (worldPoints.length < 2 || !livePos) return false;
    const first = worldPoints[0];
    return Math.hypot(livePos.nx * imageW - first.x, livePos.ny * imageH - first.y) <= 12;
  }, [worldPoints, livePos, imageW, imageH]);

  return (
    <Layer listening={false}>
      {/* Committed + preview path */}
      {previewWorldPoints.length >= 2 && (
        <Shape
          sceneFunc={(ctx, shape) => {
            buildBezierPath(ctx, previewWorldPoints, false);
            ctx.fillStrokeShape(shape);
          }}
          stroke={DRAFT_STROKE}
          strokeWidth={2}
          fill='transparent'
          dash={isDragging ? undefined : [6, 4]}
          listening={false}
        />
      )}

      {/* Live dashed segment to cursor (hovering, not dragging) */}
      {liveSegmentPoints && (
        <Line
          points={liveSegmentPoints}
          stroke={DRAFT_STROKE}
          strokeWidth={1.5}
          dash={[5, 4]}
          listening={false}
        />
      )}

      {/* Handle lines + circles when dragging */}
      {previewPoint?.handleOut && (
        <>
          <Line
            points={[
              previewPoint.handleIn.x,
              previewPoint.handleIn.y,
              previewPoint.anchor.x,
              previewPoint.anchor.y,
              previewPoint.handleOut.x,
              previewPoint.handleOut.y,
            ]}
            stroke={HANDLE_STROKE}
            strokeWidth={1}
            listening={false}
          />
          <Circle
            x={previewPoint.handleOut.x}
            y={previewPoint.handleOut.y}
            radius={HANDLE_RADIUS}
            fill={DRAFT_STROKE}
            stroke='#fff'
            strokeWidth={1}
            listening={false}
          />
          <Circle
            x={previewPoint.handleIn.x}
            y={previewPoint.handleIn.y}
            radius={HANDLE_RADIUS}
            fill={DRAFT_STROKE}
            stroke='#fff'
            strokeWidth={1}
            listening={false}
          />
        </>
      )}

      {/* Anchor squares at committed points */}
      {worldPoints.map((wp, i) => (
        <Rect
          key={i}
          x={wp.x - ANCHOR_SIZE / 2}
          y={wp.y - ANCHOR_SIZE / 2}
          width={ANCHOR_SIZE}
          height={ANCHOR_SIZE}
          fill='#fff'
          stroke={DRAFT_STROKE}
          strokeWidth={1.5}
          listening={false}
        />
      ))}

      {/* Close-path ring on first anchor */}
      {showCloseRing && (
        <Circle
          x={worldPoints[0].x}
          y={worldPoints[0].y}
          radius={6}
          fill='transparent'
          stroke={DRAFT_STROKE}
          strokeWidth={2}
          listening={false}
        />
      )}
    </Layer>
  );
}
