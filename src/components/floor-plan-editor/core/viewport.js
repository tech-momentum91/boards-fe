/**
 * Viewport math: world group (image pixel space) ↔ screen / stage space.
 */

import { clamp01 } from './geometry.js';

/**
 * @param {number} stageX
 * @param {number} stageY
 * @param {{ x: number, y: number, scale: number }} world
 * @returns {{ x: number, y: number }}
 */
export function stageToWorld(stageX, stageY, world) {
  return {
    x: (stageX - world.x) / world.scale,
    y: (stageY - world.y) / world.scale,
  };
}

/**
 * @param {number} worldX
 * @param {number} worldY
 * @param {{ x: number, y: number, scale: number }} world
 * @returns {{ x: number, y: number }}
 */
export function worldToStage(worldX, worldY, world) {
  return {
    x: world.x + worldX * world.scale,
    y: world.y + worldY * world.scale,
  };
}

/**
 * @param {number} worldX
 * @param {number} worldY
 * @param {number} imageW
 * @param {number} imageH
 * @returns {{ nx: number, ny: number }}
 */
export function worldToNormalized(worldX, worldY, imageW, imageH) {
  if (!imageW || !imageH) return { nx: 0, ny: 0 };
  return {
    nx: clamp01(worldX / imageW),
    ny: clamp01(worldY / imageH),
  };
}

/**
 * @param {number} nx
 * @param {number} ny
 * @param {number} imageW
 * @param {number} imageH
 */
export function normalizedToWorld(nx, ny, imageW, imageH) {
  return { x: nx * imageW, y: ny * imageH };
}

/**
 * Fit image into container with padding; returns world transform (top-left, scale).
 * @param {{ containerW: number, containerH: number, imageW: number, imageH: number, padding?: number }}
 */
export function fitImageToContainer({ containerW, containerH, imageW, imageH, padding = 24 }) {
  if (!containerW || !containerH || !imageW || !imageH) {
    return { x: 0, y: 0, scale: 1 };
  }
  const cw = Math.max(1, containerW - padding * 2);
  const ch = Math.max(1, containerH - padding * 2);
  const scale = Math.min(cw / imageW, ch / imageH);
  const x = (containerW - imageW * scale) / 2;
  const y = (containerH - imageH * scale) / 2;
  return { x, y, scale };
}

/**
 * Cover-fit image into container (fills viewport; may crop edges).
 * @param {{ containerW: number, containerH: number, imageW: number, imageH: number, padding?: number }}
 */
export function fitImageToContainerCover({ containerW, containerH, imageW, imageH, padding = 0 }) {
  if (!containerW || !containerH || !imageW || !imageH) {
    return { x: 0, y: 0, scale: 1 };
  }
  const cw = Math.max(1, containerW - padding * 2);
  const ch = Math.max(1, containerH - padding * 2);
  const scale = Math.max(cw / imageW, ch / imageH);
  const x = (containerW - imageW * scale) / 2;
  const y = (containerH - imageH * scale) / 2;
  return { x, y, scale };
}

/**
 * Zoom centered on a stage point (cursor).
 * @param {{ x: number, y: number, scale: number }} world
 * @param {number} stageX
 * @param {number} stageY
 * @param {number} newScale
 * @param {number} minScale
 * @param {number} maxScale
 */
export function zoomAtStagePoint(world, stageX, stageY, newScale, minScale, maxScale) {
  const scale = Math.min(maxScale, Math.max(minScale, newScale));
  const before = stageToWorld(stageX, stageY, world);
  return {
    x: stageX - before.x * scale,
    y: stageY - before.y * scale,
    scale,
  };
}
