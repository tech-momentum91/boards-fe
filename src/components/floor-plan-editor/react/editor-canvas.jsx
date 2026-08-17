/* eslint-disable react-refresh/only-export-components -- pointer helpers share this module with the canvas */
import React, { useEffect, useMemo } from 'react';
import { Circle, Ellipse, Image, Layer, Line, Rect, Stage, Transformer } from 'react-konva';

import {
  CLIENT_SUBSPACE_SLOT_SOURCE,
  DESK_COWORKER_MARKER,
  SERVER_SUBSPACE_PIN_SOURCE,
} from '@/constants/layout/annotation-sources';

import { clamp01 } from '../core/geometry.js';
import { BezierDraftLayer } from './layers/bezier-draft-layer.jsx';
import { BezierHandleEditor } from './shapes/bezier-handle-editor.jsx';
import { GridLayer } from './layers/grid-layer.jsx';
import { isBoundsTransformableAnnotation } from '../core/annotation-bounds.js';
import { AnnotationNode } from './shapes/annotation-node.jsx';
import { TOOL_IDS } from '../types/index.js';

export const CLOSE_DISTANCE_PX = 14;

function getStageFromKonvaEvent(e) {
  const t = e?.target;
  if (t && typeof t.getStage === 'function') return t.getStage();
  return null;
}

function clientPointFromKonvaEvent(evt) {
  if (!evt) return null;
  if (evt.touches?.[0]) {
    return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
  }
  if (evt.changedTouches?.[0]) {
    return { x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY };
  }
  if (typeof evt.clientX === 'number' && typeof evt.clientY === 'number') {
    return { x: evt.clientX, y: evt.clientY };
  }
  return null;
}

/**
 * Pointer → normalized image coords. Uses container rect so coords stay correct when the stage
 * is inside a CSS-transformed zoom/pan wrapper (react-zoom-pan-pinch).
 */
export function pointerToNormalizedFromEvent(e, imageW, imageH) {
  const stage = getStageFromKonvaEvent(e);
  if (!stage || !imageW || !imageH) return null;
  const container = stage.container();
  if (!container) return null;
  const rect = container.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const evt = e?.evt;
  const client = clientPointFromKonvaEvent(evt);
  let wx;
  let wy;
  if (client) {
    wx = (client.x - rect.left) * (imageW / rect.width);
    wy = (client.y - rect.top) * (imageH / rect.height);
  } else {
    const pos = stage.getPointerPosition();
    if (!pos || !Number.isFinite(pos.x)) return null;
    wx = pos.x;
    wy = pos.y;
  }
  return {
    nx: clamp01(wx / imageW),
    ny: clamp01(wy / imageH),
    wx,
    wy,
  };
}

export function isCanvasBackgroundTarget(e, imageNodeRef) {
  const t = e?.target;
  if (!t || typeof t.getType !== 'function') return false;
  const type = t.getType();
  if (type === 'Line' || type === 'Circle' || type === 'Ellipse') return false;
  if (type === 'Rect') return false;
  if (type === 'Transformer' || type === 'Label' || type === 'Tag' || type === 'Text') return false;
  if (type === 'Image') return true;
  if (imageNodeRef?.current && t === imageNodeRef.current) return true;
  return type === 'Stage' || type === 'Layer';
}

const SHAPE_DRAW_SURFACE_TYPES = new Set(['Rect', 'Ellipse', 'Line', 'Shape', 'Circle']);

/**
 * Drawing tools (rect/circle/pen/polygon) must start on the floor image *or* on top of an
 * existing filled region — e.g. sub-space zoom inside a parent Managed Office boundary.
 */
export function isShapeDrawingSurfaceTarget(e, imageNodeRef, activeToolId) {
  if (isCanvasBackgroundTarget(e, imageNodeRef)) return true;
  const drawTools = new Set([
    TOOL_IDS.RECTANGLE,
    TOOL_IDS.CIRCLE,
    TOOL_IDS.PEN,
    TOOL_IDS.POLYGON,
    TOOL_IDS.POLYLINE,
  ]);
  if (!drawTools.has(activeToolId)) return false;
  const t = e?.target;
  if (!t || typeof t.getType !== 'function') return false;
  const type = t.getType();
  if (type === 'Transformer') return false;
  return SHAPE_DRAW_SURFACE_TYPES.has(type);
}

/**
 * @param {object} props
 */
export function EditorCanvas({
  width,
  height,
  rasterImage,
  imageWidth,
  imageHeight,
  showGrid,
  gridSize,
  annotations,
  selectedIds,
  hoveredId,
  focusedAnnotationId,
  selectMode,
  listenForAnnotationHits = false,
  canvasListening,
  resolveAnnotationStyle,
  draftPoints,
  draftKind,
  draftClosed,
  draftLivePos,
  rectDrag,
  activeToolId,
  readOnly,
  imageNodeRef,
  rectRef,
  transformerRef,
  onStageMouseDown,
  onStageMouseMove,
  onStageMouseUp,
  onStageDblClick,
  onSelect,
  onHoverStart,
  onHoverEnd,
  onUpdateAnnotation,
  stageRef,
  bezierDraft,
  bezierHandleAnnotation,
  maskShape,
  maskReplacesBaseImage = false,
  pendingLayerAnnotations = [],
  pendingAnnotationSource = null,
  focusDimAnnotationId = null,
  focusDimBrightIds = null,
  allowSubSpacePinTransform = false,
  selectionChromeHiddenId = null,
}) {
  const iw = imageWidth;
  const ih = imageHeight;

  const { mainAnnotations, subSpacePins, deskCoworkerMarkers } = useMemo(() => {
    const main = [];
    const pins = [];
    const desks = [];
    if (!Array.isArray(annotations)) {
      return { mainAnnotations: main, subSpacePins: pins, deskCoworkerMarkers: desks };
    }
    for (const a of annotations) {
      if (a == null) continue;
      if (a.source === SERVER_SUBSPACE_PIN_SOURCE) pins.push(a);
      else if (a.source === DESK_COWORKER_MARKER || a.source === CLIENT_SUBSPACE_SLOT_SOURCE) {
        desks.push(a);
      } else main.push(a);
    }
    return { mainAnnotations: main, subSpacePins: pins, deskCoworkerMarkers: desks };
  }, [annotations]);

  const selectedRectangleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selectedAnn = selectedRectangleId
    ? [
        ...mainAnnotations,
        ...subSpacePins,
        ...deskCoworkerMarkers,
        ...pendingLayerAnnotations,
      ].find((a) => a.id === selectedRectangleId)
    : null;
  const pinTransformable =
    allowSubSpacePinTransform &&
    selectedAnn?.source === SERVER_SUBSPACE_PIN_SOURCE &&
    isBoundsTransformableAnnotation(selectedAnn, { allowLockedSubSpacePin: true });
  const transformerAttached = Boolean(
    selectMode &&
    selectedAnn &&
    selectedAnn?.id !== selectionChromeHiddenId &&
    (isBoundsTransformableAnnotation(selectedAnn, {
      allowLockedSubSpacePin: allowSubSpacePinTransform,
    }) ||
      pinTransformable) &&
    (!selectedAnn?.locked || pinTransformable),
  );

  useEffect(() => {
    const tr = transformerRef?.current;
    if (!tr) return;
    try {
      if (transformerAttached && rectRef?.current) {
        tr.nodes([rectRef.current]);
        tr.getLayer()?.batchDraw();
      } else {
        tr.nodes([]);
      }
    } catch {
      // Stage/layer can be torn down mid-update when drawer/tab unmounts.
    }
  }, [transformerAttached, transformerRef, rectRef]);

  const draftLine = useMemo(() => {
    if (!draftKind || draftPoints.length < 2) return null;
    const pts = [];
    for (let i = 0; i < draftPoints.length; i += 2) {
      pts.push(draftPoints[i] * iw, draftPoints[i + 1] * ih);
    }
    return (
      <Line
        points={pts}
        closed={draftKind === 'polygon' || draftClosed}
        tension={draftKind === 'pen' ? 0.5 : 0}
        stroke='rgba(234, 88, 12, 0.95)'
        strokeWidth={2}
        dash={[6, 6]}
        listening={false}
      />
    );
  }, [draftKind, draftClosed, draftPoints, iw, ih]);

  const draftVertices = useMemo(() => {
    if (!draftKind || draftPoints.length === 0) return null;
    const nodes = [];
    for (let i = 0; i < draftPoints.length; i += 2) {
      nodes.push(
        <Circle
          key={`d-${i}`}
          x={draftPoints[i] * iw}
          y={draftPoints[i + 1] * ih}
          radius={4}
          fill='#ea580c'
          stroke='#fff'
          strokeWidth={1}
          listening={false}
        />,
      );
    }
    return nodes;
  }, [draftKind, draftPoints, iw, ih]);

  const draftLiveLine = useMemo(() => {
    if (!draftLivePos || !draftKind || draftKind === 'pen' || draftPoints.length < 2) return null;
    const lastX = draftPoints[draftPoints.length - 2] * iw;
    const lastY = draftPoints[draftPoints.length - 1] * ih;
    return (
      <Line
        points={[lastX, lastY, draftLivePos.nx * iw, draftLivePos.ny * ih]}
        stroke='rgba(234, 88, 12, 0.55)'
        strokeWidth={1.5}
        dash={[4, 6]}
        listening={false}
      />
    );
  }, [draftLivePos, draftKind, draftPoints, iw, ih]);

  const previewRect = useMemo(() => {
    if (!rectDrag) return null;
    const { ax, ay, bx, by } = rectDrag;
    const x = Math.min(ax, bx) * iw;
    const y = Math.min(ay, by) * ih;
    const w = Math.abs(bx - ax) * iw;
    const h = Math.abs(by - ay) * ih;
    if (activeToolId === TOOL_IDS.CIRCLE) {
      return (
        <Ellipse
          x={x + w / 2}
          y={y + h / 2}
          radiusX={w / 2}
          radiusY={h / 2}
          stroke='rgba(234, 88, 12, 0.9)'
          strokeWidth={2}
          dash={[4, 4]}
          fill='rgba(234, 88, 12, 0.08)'
          listening={false}
        />
      );
    }
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
  }, [rectDrag, iw, ih, activeToolId]);

  const listening = canvasListening === undefined ? !readOnly : canvasListening;

  const annotationListenForHits =
    listening && (Boolean(selectMode) || Boolean(listenForAnnotationHits));

  const dimFocusId = focusDimAnnotationId ?? focusedAnnotationId ?? null;
  const brightIdSet = useMemo(() => {
    if (!Array.isArray(focusDimBrightIds) || focusDimBrightIds.length === 0) return null;
    return new Set(focusDimBrightIds);
  }, [focusDimBrightIds]);

  const dimForAnnotation = (annId, ann) => {
    if (pendingAnnotationSource && ann?.source === pendingAnnotationSource) return false;
    if (brightIdSet?.has(annId)) return false;
    // Sub-space draw session: new strokes have no `space_ref` yet; don't dim them to ~0 or they
    // look like they vanished before `source` is set to the pending tag.
    if (
      pendingAnnotationSource &&
      ann?.source !== SERVER_SUBSPACE_PIN_SOURCE &&
      !String(ann?.space_ref ?? '').trim()
    ) {
      return false;
    }
    return Boolean(dimFocusId && annId !== dimFocusId && !selectedIds.includes(annId));
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      listening={listening}
      onMouseDown={onStageMouseDown}
      onMouseMove={onStageMouseMove}
      onMouseUp={onStageMouseUp}
      onTouchStart={onStageMouseDown}
      onTouchMove={onStageMouseMove}
      onTouchEnd={onStageMouseUp}
      onDblClick={onStageDblClick}
      className='[&_.konvajs-content]:!outline-none'
      style={listening === false ? { pointerEvents: 'none' } : undefined}
    >
      <Layer listening={listening}>
        {showGrid ? <GridLayer width={iw} height={ih} gridSize={gridSize} /> : null}
        {maskReplacesBaseImage ? (
          <Image
            ref={imageNodeRef}
            image={rasterImage}
            width={iw}
            height={ih}
            opacity={0}
            listening={false}
          />
        ) : (
          <Image
            ref={imageNodeRef}
            image={rasterImage}
            width={iw}
            height={ih}
            listening={listening && !readOnly}
          />
        )}
        {maskShape ?? null}
        {mainAnnotations.map((ann, index) => {
          if (ann.visible === false) return null;
          return (
            <AnnotationNode
              key={ann.id}
              annotation={ann}
              imageW={iw}
              imageH={ih}
              isSelected={selectedIds.includes(ann.id)}
              isHovered={hoveredId === ann.id}
              isDimmed={dimForAnnotation(ann.id, ann)}
              paletteIndex={index}
              selectMode={selectMode && listening}
              listenForHits={annotationListenForHits}
              resolveStyle={resolveAnnotationStyle}
              onSelect={onSelect}
              onHoverStart={onHoverStart}
              onHoverEnd={onHoverEnd}
              onUpdate={onUpdateAnnotation}
              rectRef={
                isBoundsTransformableAnnotation(ann, {
                  allowLockedSubSpacePin: allowSubSpacePinTransform,
                }) &&
                selectedIds.length === 1 &&
                selectedIds[0] === ann.id
                  ? rectRef
                  : undefined
              }
              suppressSelectionChrome={ann.id === selectionChromeHiddenId}
            />
          );
        })}
        {previewRect}
        {draftLine}
        {draftLiveLine}
        {draftVertices}
        {transformerAttached ? (
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={selectedAnn?.type === 'circle'}
            enabledAnchors={[
              'top-left',
              'top-center',
              'top-right',
              'middle-left',
              'middle-right',
              'bottom-left',
              'bottom-center',
              'bottom-right',
            ]}
            anchorSize={9}
            anchorStroke='#2563eb'
            anchorFill='#ffffff'
            anchorCornerRadius={2}
            borderStroke='#2563eb'
            borderStrokeWidth={1.5}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 8 || newBox.height < 8) return oldBox;
              return newBox;
            }}
          />
        ) : null}
      </Layer>
      {subSpacePins.length > 0 ? (
        <Layer listening={listening} name='server-sub-space-shapes'>
          {subSpacePins.map((ann, index) => {
            if (ann.visible === false) return null;
            return (
              <AnnotationNode
                key={ann.id}
                annotation={ann}
                imageW={iw}
                imageH={ih}
                isSelected={selectedIds.includes(ann.id)}
                isHovered={hoveredId === ann.id}
                isDimmed={dimForAnnotation(ann.id, ann)}
                paletteIndex={mainAnnotations.length + index}
                selectMode={selectMode && listening}
                listenForHits={annotationListenForHits}
                resolveStyle={resolveAnnotationStyle}
                onSelect={onSelect}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
                onUpdate={onUpdateAnnotation}
                rectRef={
                  isBoundsTransformableAnnotation(ann, {
                    allowLockedSubSpacePin: allowSubSpacePinTransform,
                  }) &&
                  selectedIds.length === 1 &&
                  selectedIds[0] === ann.id
                    ? rectRef
                    : undefined
                }
                allowLockedSubSpacePinDrag={allowSubSpacePinTransform}
                suppressSelectionChrome={ann.id === selectionChromeHiddenId}
              />
            );
          })}
        </Layer>
      ) : null}
      {deskCoworkerMarkers.length > 0 ? (
        <Layer listening={listening} name='desk-coworker-markers'>
          {deskCoworkerMarkers.map((ann, index) => {
            if (ann.visible === false) return null;
            return (
              <AnnotationNode
                key={ann.id}
                annotation={ann}
                imageW={iw}
                imageH={ih}
                isSelected={selectedIds.includes(ann.id)}
                isHovered={hoveredId === ann.id}
                isDimmed={dimForAnnotation(ann.id, ann)}
                paletteIndex={mainAnnotations.length + subSpacePins.length + index}
                selectMode={selectMode && listening}
                listenForHits={annotationListenForHits}
                resolveStyle={resolveAnnotationStyle}
                onSelect={onSelect}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
                onUpdate={onUpdateAnnotation}
                suppressSelectionChrome={ann.id === selectionChromeHiddenId}
              />
            );
          })}
        </Layer>
      ) : null}
      {pendingLayerAnnotations.length > 0 ? (
        <Layer listening={listening} name='sub-space-pending'>
          {pendingLayerAnnotations.map((ann, index) => {
            if (ann.visible === false) return null;
            const pendingTransformable = isBoundsTransformableAnnotation(ann);
            return (
              <AnnotationNode
                key={`pending-subspace-${ann.id}`}
                annotation={ann}
                imageW={iw}
                imageH={ih}
                isSelected={selectedIds.includes(ann.id)}
                isHovered={hoveredId === ann.id}
                isDimmed={dimForAnnotation(ann.id, ann)}
                paletteIndex={index}
                selectMode={selectMode && listening}
                listenForHits={annotationListenForHits}
                resolveStyle={resolveAnnotationStyle}
                onSelect={onSelect}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
                onUpdate={onUpdateAnnotation}
                rectRef={
                  pendingTransformable && selectedIds.length === 1 && selectedIds[0] === ann.id
                    ? rectRef
                    : undefined
                }
                suppressSelectionChrome={ann.id === selectionChromeHiddenId}
              />
            );
          })}
        </Layer>
      ) : null}
      {bezierDraft ? <BezierDraftLayer draftState={bezierDraft} imageW={iw} imageH={ih} /> : null}
      {bezierHandleAnnotation ? (
        <BezierHandleEditor
          annotation={bezierHandleAnnotation}
          imageW={iw}
          imageH={ih}
          onUpdate={onUpdateAnnotation}
        />
      ) : null}
    </Stage>
  );
}

export { distanceNormPx } from '../core/geometry.js';
export { getStageFromKonvaEvent };
