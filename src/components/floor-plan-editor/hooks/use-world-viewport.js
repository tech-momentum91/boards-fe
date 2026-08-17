import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_EDITOR_CONFIG } from '../types/index.js';
import { fitImageToContainer, zoomAtStagePoint } from '../core/viewport.js';

/**
 * Pan/zoom world transform for a fixed-size stage; image drawn in pixel space inside a scaled Group.
 *
 * @param {object} options
 * @param {number} options.imageWidth
 * @param {number} options.imageHeight
 * @param {{ width: number, height: number }} options.containerSize
 * @param {object} [options.config]
 * @param {{ x: number, y: number, scale: number } | undefined} options.viewState
 * @param {{ x: number, y: number, scale: number }} [options.defaultViewState]
 * @param {(next: object) => void} [options.onViewStateChange]
 * @param {string | number} [options.fitToken] when this changes, refit image to container (e.g. layout id)
 */
export function useWorldViewport({
  imageWidth,
  imageHeight,
  containerSize,
  config: configIn,
  viewState: controlledValue,
  defaultViewState,
  onViewStateChange,
  fitToken,
}) {
  const config = useMemo(() => ({ ...DEFAULT_EDITOR_CONFIG, ...configIn }), [configIn]);

  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState(() => defaultViewState ?? { x: 0, y: 0, scale: 1 });

  const world = isControlled ? controlledValue : internal;

  const setWorld = useCallback(
    (next) => {
      const resolved =
        typeof next === 'function' ? next(isControlled ? controlledValue : internal) : next;
      if (!isControlled) {
        setInternal(resolved);
      }
      onViewStateChange?.(resolved);
    },
    [controlledValue, internal, isControlled, onViewStateChange],
  );

  const worldRef = useRef(world);
  worldRef.current = world;

  const lastFitKey = useRef(null);

  /** Refit when layout/image identity changes or container first becomes measurable */
  /* eslint-disable react-hooks/exhaustive-deps -- intentionally refit only when fit identity or container gains size */
  useEffect(() => {
    const { width: cw, height: ch } = containerSize;
    if (!cw || !ch || !imageWidth || !imageHeight) return;
    const key = `${fitToken ?? 'default'}|${imageWidth}x${imageHeight}|${cw}x${ch}`;
    if (lastFitKey.current === key) return;
    lastFitKey.current = key;
    const fitted = fitImageToContainer({
      containerW: cw,
      containerH: ch,
      imageW: imageWidth,
      imageH: imageHeight,
    });
    setWorld(fitted);
  }, [fitToken, imageWidth, imageHeight, containerSize.width, containerSize.height, setWorld]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const zoomByFactorAtStagePoint = useCallback(
    (stageX, stageY, factor) => {
      const w = worldRef.current;
      const nextScale = w.scale * factor;
      const scaled = zoomAtStagePoint(w, stageX, stageY, nextScale, config.minZoom, config.maxZoom);
      setWorld(scaled);
    },
    [config.maxZoom, config.minZoom, setWorld],
  );

  const panBy = useCallback(
    (dx, dy) => {
      setWorld((w) => ({ ...w, x: w.x + dx, y: w.y + dy }));
    },
    [setWorld],
  );

  const recenter = useCallback(() => {
    const { width: cw, height: ch } = containerSize;
    if (!cw || !ch || !imageWidth || !imageHeight) return;
    lastFitKey.current = null;
    setWorld(
      fitImageToContainer({
        containerW: cw,
        containerH: ch,
        imageW: imageWidth,
        imageH: imageHeight,
      }),
    );
  }, [containerSize, imageHeight, imageWidth, setWorld]);

  return {
    world,
    setWorld,
    zoomByFactorAtStagePoint,
    panBy,
    recenter,
    config,
  };
}
