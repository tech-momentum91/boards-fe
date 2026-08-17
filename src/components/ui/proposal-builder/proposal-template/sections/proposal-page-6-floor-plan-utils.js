import { LAYOUT_FILTER_ALL } from '@/constants/layout/center-filter-constants';
import {
  annotationMatchesLayoutCanvasFilters,
  buildParentSpaceMetaByRef,
  normalizeLayoutSpaceTypeFilters,
} from '@/utils/layout-annotation-filter-utils';
import { stageToWorld } from '@/components/floor-plan-editor/core/viewport';

export const PROPOSAL_CUSTOM_ANNOTATION_SOURCE = 'proposal-custom';

/** Page 6 floor plan frame (matches proposal-template.css). */
export const PROPOSAL_PAGE6_FRAME = {
  width: 2132,
  height: 724.9,
  padding: 24,
  maskOpacity: 0.88,
};

export const PROPOSAL_PAGE6_FRAME_ASPECT = PROPOSAL_PAGE6_FRAME.width / PROPOSAL_PAGE6_FRAME.height;

export const DEFAULT_PROPOSAL_FLOOR_PLAN_EDITOR_SETTINGS = {
  spaceTypes: [],
  spaceRef: '',
  excludedAnnotationIds: [],
  viewport: null,
};

/** Legacy `showCommonAreas` checkbox → space type multi-select value. */
const LEGACY_COMMON_AREA_SPACE_TYPE = 'common';

const CUSTOM_ANNOTATION_SHAPE_KEYS = [
  'id',
  'type',
  'x',
  'y',
  'width',
  'height',
  'radiusX',
  'radiusY',
  'points',
  'bezierPoints',
  'closed',
  'label',
  'visible',
];

/**
 * @param {object | null | undefined} viewport
 * @returns {{ x: number, y: number, w: number, h: number } | null}
 */
export function normalizeProposalFloorPlanViewport(viewport) {
  if (!viewport || typeof viewport !== 'object') return null;
  const x = Number(viewport.x);
  const y = Number(viewport.y);
  const w = Number(viewport.w);
  const h = Number(viewport.h);
  if (![x, y, w, h].every(Number.isFinite)) return null;
  if (w <= 0 || h <= 0) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    w: Math.max(0, Math.min(1, w)),
    h: Math.max(0, Math.min(1, h)),
  };
}

/**
 * @param {object | null | undefined} settings
 */
export function normalizeProposalFloorPlanEditorSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  let spaceTypes = Array.isArray(source.spaceTypes) ? [...source.spaceTypes] : [];

  // Migrate saved decks that used the removed "Common areas" checkbox.
  if (
    source.showCommonAreas !== false &&
    'showCommonAreas' in source &&
    !spaceTypes.includes(LEGACY_COMMON_AREA_SPACE_TYPE)
  ) {
    spaceTypes = [...spaceTypes, LEGACY_COMMON_AREA_SPACE_TYPE];
  }

  return {
    spaceTypes,
    spaceRef: String(source.spaceRef ?? '').trim(),
    excludedAnnotationIds: Array.isArray(source.excludedAnnotationIds)
      ? source.excludedAnnotationIds.map(String).filter(Boolean)
      : [],
    viewport: normalizeProposalFloorPlanViewport(source.viewport),
  };
}

/**
 * Select which system layout highlights appear on the proposal floor plan.
 *
 * @param {object[]} allAnnotations
 * @param {{ spaceRefs?: string[] } | null | undefined} floorGroup
 * @param {object | null | undefined} editorSettings
 */
export function filterProposalSystemAnnotations(allAnnotations, floorGroup, editorSettings) {
  const settings = normalizeProposalFloorPlanEditorSettings(editorSettings);
  const proposed = new Set(
    (Array.isArray(floorGroup?.spaceRefs) ? floorGroup.spaceRefs : [])
      .map((ref) => String(ref || '').trim())
      .filter(Boolean),
  );
  const excluded = new Set(settings.excludedAnnotationIds);
  const parentMeta = buildParentSpaceMetaByRef(allAnnotations);
  const spaceTypes = normalizeLayoutSpaceTypeFilters(settings.spaceTypes);
  const spaceRef = settings.spaceRef || LAYOUT_FILTER_ALL;
  const typeFilters = { spaceRef: LAYOUT_FILTER_ALL, spaceTypes };

  return (Array.isArray(allAnnotations) ? allAnnotations : []).filter((ann) => {
    if (!ann || typeof ann !== 'object') return false;
    if (excluded.has(ann.id)) return false;

    const ref = String(ann.space_ref || ann.space?.name || ann.space?.id || '').trim();

    if (spaceRef && spaceRef !== LAYOUT_FILTER_ALL) {
      return ref === spaceRef;
    }

    const isProposed = Boolean(ref && proposed.has(ref));
    let selected = false;

    if (isProposed) {
      selected = true;
    }

    if (
      spaceTypes.length > 0 &&
      annotationMatchesLayoutCanvasFilters(ann, typeFilters, parentMeta)
    ) {
      selected = true;
    }

    return selected;
  });
}

/**
 * Visible image region (normalized 0–1) from editor pan/zoom state.
 *
 * @param {{
 *   containerWidth: number,
 *   containerHeight: number,
 *   imageWidth: number,
 *   imageHeight: number,
 *   positionX: number,
 *   positionY: number,
 *   scale: number,
 * }} params
 * @returns {{ x: number, y: number, w: number, h: number } | null}
 */
export function computeVisibleImageViewportFromEditorTransform({
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
  positionX,
  positionY,
  scale,
}) {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight || !scale) {
    return null;
  }

  const world = { x: positionX, y: positionY, scale };
  const topLeft = stageToWorld(0, 0, world);
  const bottomRight = stageToWorld(containerWidth, containerHeight, world);

  const x1 = Math.max(0, Math.min(imageWidth, Math.min(topLeft.x, bottomRight.x)));
  const y1 = Math.max(0, Math.min(imageHeight, Math.min(topLeft.y, bottomRight.y)));
  const x2 = Math.max(0, Math.min(imageWidth, Math.max(topLeft.x, bottomRight.x)));
  const y2 = Math.max(0, Math.min(imageHeight, Math.max(topLeft.y, bottomRight.y)));

  const w = (x2 - x1) / imageWidth;
  const h = (y2 - y1) / imageHeight;
  if (w <= 0.001 || h <= 0.001) return null;

  return normalizeProposalFloorPlanViewport({
    x: x1 / imageWidth,
    y: y1 / imageHeight,
    w,
    h,
  });
}

/**
 * Proposal page 6 frame rect centered in the editor canvas (matches live proposal aspect ratio).
 *
 * @param {number} containerWidth
 * @param {number} containerHeight
 * @param {number} [margin]
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function computeProposalPage6FrameRect(containerWidth, containerHeight, margin = 24) {
  if (!containerWidth || !containerHeight) return null;

  const innerW = Math.max(containerWidth - margin * 2, 1);
  const innerH = Math.max(containerHeight - margin * 2, 1);
  let width;
  let height;

  if (innerW / innerH > PROPOSAL_PAGE6_FRAME_ASPECT) {
    height = innerH;
    width = height * PROPOSAL_PAGE6_FRAME_ASPECT;
  } else {
    width = innerW;
    height = width / PROPOSAL_PAGE6_FRAME_ASPECT;
  }

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

/**
 * Normalized image viewport visible inside a fixed proposal frame overlay.
 *
 * @param {{
 *   frameX: number,
 *   frameY: number,
 *   frameWidth: number,
 *   frameHeight: number,
 *   imageWidth: number,
 *   imageHeight: number,
 *   positionX: number,
 *   positionY: number,
 *   scale: number,
 * }} params
 * @returns {{ x: number, y: number, w: number, h: number } | null}
 */
export function computeVisibleImageViewportFromEditorFrame({
  frameX,
  frameY,
  frameWidth,
  frameHeight,
  imageWidth,
  imageHeight,
  positionX,
  positionY,
  scale,
}) {
  if (!frameWidth || !frameHeight || !imageWidth || !imageHeight || !scale) {
    return null;
  }

  const world = { x: positionX, y: positionY, scale };
  const topLeft = stageToWorld(frameX, frameY, world);
  const bottomRight = stageToWorld(frameX + frameWidth, frameY + frameHeight, world);

  const x1 = Math.max(0, Math.min(imageWidth, Math.min(topLeft.x, bottomRight.x)));
  const y1 = Math.max(0, Math.min(imageHeight, Math.min(topLeft.y, bottomRight.y)));
  const x2 = Math.max(0, Math.min(imageWidth, Math.max(topLeft.x, bottomRight.x)));
  const y2 = Math.max(0, Math.min(imageHeight, Math.max(topLeft.y, bottomRight.y)));

  const w = (x2 - x1) / imageWidth;
  const h = (y2 - y1) / imageHeight;
  if (w <= 0.001 || h <= 0.001) return null;

  return normalizeProposalFloorPlanViewport({
    x: x1 / imageWidth,
    y: y1 / imageHeight,
    w,
    h,
  });
}

/**
 * Editor pan/zoom so a saved viewport region fills the proposal frame overlay.
 *
 * @param {{
 *   containerWidth: number,
 *   containerHeight: number,
 *   imageWidth: number,
 *   imageHeight: number,
 *   viewport: object | null | undefined,
 *   margin?: number,
 * }} params
 * @returns {{ x: number, y: number, scale: number, frameRect: object } | null}
 */
export function computeEditorTransformForViewportInProposalFrame({
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
  viewport,
  margin = 24,
}) {
  const frameRect = computeProposalPage6FrameRect(containerWidth, containerHeight, margin);
  const vp = normalizeProposalFloorPlanViewport(viewport);
  if (!frameRect || !vp || !imageWidth || !imageHeight) {
    return null;
  }

  const regionW = vp.w * imageWidth;
  const regionH = vp.h * imageHeight;
  const regionCx = (vp.x + vp.w / 2) * imageWidth;
  const regionCy = (vp.y + vp.h / 2) * imageHeight;
  const scale = Math.min(frameRect.width / regionW, frameRect.height / regionH);

  return {
    x: frameRect.x + frameRect.width / 2 - regionCx * scale,
    y: frameRect.y + frameRect.height / 2 - regionCy * scale,
    scale,
    frameRect,
  };
}

/**
 * Fit the full floor image inside the proposal frame overlay (initial viewport-adjust view).
 *
 * @param {{
 *   containerWidth: number,
 *   containerHeight: number,
 *   imageWidth: number,
 *   imageHeight: number,
 *   margin?: number,
 * }} params
 * @returns {{ x: number, y: number, scale: number, frameRect: object } | null}
 */
export function computeEditorTransformToFitImageInProposalFrame({
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
  margin = 24,
}) {
  const frameRect = computeProposalPage6FrameRect(containerWidth, containerHeight, margin);
  if (!frameRect || !imageWidth || !imageHeight) {
    return null;
  }

  const scale = Math.min(frameRect.width / imageWidth, frameRect.height / imageHeight);
  const drawW = imageWidth * scale;
  const drawH = imageHeight * scale;

  return {
    x: frameRect.x + (frameRect.width - drawW) / 2,
    y: frameRect.y + (frameRect.height - drawH) / 2,
    scale,
    frameRect,
  };
}

/**
 * Editor transform that shows a saved normalized viewport region.
 *
 * @param {{
 *   containerWidth: number,
 *   containerHeight: number,
 *   imageWidth: number,
 *   imageHeight: number,
 *   viewport: object | null | undefined,
 *   padding?: number,
 * }} params
 * @returns {{ x: number, y: number, scale: number } | null}
 */
export function computeEditorTransformForViewport({
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
  viewport,
  padding = 32,
}) {
  const vp = normalizeProposalFloorPlanViewport(viewport);
  if (!vp || !containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return null;
  }

  const regionW = vp.w * imageWidth;
  const regionH = vp.h * imageHeight;
  const regionCx = (vp.x + vp.w / 2) * imageWidth;
  const regionCy = (vp.y + vp.h / 2) * imageHeight;

  const innerW = Math.max(containerWidth - padding * 2, 1);
  const innerH = Math.max(containerHeight - padding * 2, 1);
  const scale = Math.min(innerW / regionW, innerH / regionH);

  return {
    x: containerWidth / 2 - regionCx * scale,
    y: containerHeight / 2 - regionCy * scale,
    scale,
  };
}

/**
 * @param {object | null | undefined} row
 */
export function normalizeProposalLayoutInventoryRow(row) {
  if (!row || typeof row !== 'object') return null;
  const spaceRef = String(row.space || row.space_id || '').trim();
  const centerId = String(row.center || row.center_id || '').trim();
  const floor = String(row.floor || '').trim();
  const inventoryType = String(row.inventory_type || row.space_type || '').trim();
  if (!spaceRef && !centerId && !floor) return null;
  return { spaceRef, centerId, floor, inventoryType };
}

/**
 * Pick the center + floor with the most proposed spaces (for single floor-plan frame).
 *
 * @param {unknown[]} inventory
 * @returns {{ centerId: string, floor: string, spaceRefs: string[] } | null}
 */
export function pickPrimaryProposalFloorGroup(inventory) {
  const groups = new Map();

  for (const raw of Array.isArray(inventory) ? inventory : []) {
    const row = normalizeProposalLayoutInventoryRow(raw);
    if (!row?.centerId || !row.floor) continue;
    const key = `${row.centerId}::${row.floor}`;
    const current = groups.get(key) ?? {
      centerId: row.centerId,
      floor: row.floor,
      spaceRefs: [],
    };
    if (row.spaceRef && !current.spaceRefs.includes(row.spaceRef)) {
      current.spaceRefs.push(row.spaceRef);
    }
    groups.set(key, current);
  }

  let best = null;
  for (const group of groups.values()) {
    if (!best || group.spaceRefs.length > best.spaceRefs.length) {
      best = group;
    }
  }
  return best;
}

/**
 * Pick embedded guest layout for an inventory set (public share / PDF).
 * Prefers per-floor map from the public API; falls back to primary detail.
 *
 * @param {unknown[]} inventory
 * @param {object | null | undefined} primaryDetail
 * @param {Record<string, object> | null | undefined} detailsByKey
 * @returns {object | null}
 */
export function resolveEmbeddedLayoutDetailForInventory(
  inventory,
  primaryDetail = null,
  detailsByKey = null,
) {
  const group = pickPrimaryProposalFloorGroup(inventory);
  if (group && detailsByKey && typeof detailsByKey === 'object') {
    const key = `${group.centerId}::${group.floor}`;
    const matched = detailsByKey[key];
    if (matched && typeof matched === 'object') return matched;
  }
  return primaryDetail && typeof primaryDetail === 'object' ? primaryDetail : null;
}

/**
 * @param {object | null | undefined} space
 */
export function isCommonAreaLayoutSpace(space) {
  const type = String(space?.inventory_type || space?.spaceType || '')
    .trim()
    .toLowerCase();
  return type.includes('common');
}

/**
 * Keep proposed inventory spaces plus all common areas on the floor.
 *
 * @param {object[]} annotations
 * @param {string[]} proposedSpaceRefs
 */
export function filterProposalFloorPlanAnnotations(annotations, proposedSpaceRefs) {
  const proposed = new Set(
    (Array.isArray(proposedSpaceRefs) ? proposedSpaceRefs : [])
      .map((ref) => String(ref || '').trim())
      .filter(Boolean),
  );

  return (Array.isArray(annotations) ? annotations : []).filter((ann) => {
    if (!ann || typeof ann !== 'object') return false;
    const ref = String(ann.space_ref || ann.space?.name || ann.space?.id || '').trim();
    if (ref && proposed.has(ref)) return true;
    return isCommonAreaLayoutSpace(ann.space);
  });
}

/**
 * Match layout annotation editor palette (no labels on canvas).
 *
 * @param {object | null | undefined} ann
 */
export function resolveProposalFloorPlanAnnotationStyle(ann) {
  const space = ann?.space;
  if (!space) return undefined;

  const type = String(space.inventory_type || space.spaceType || '')
    .trim()
    .toLowerCase();

  if (type === 'managed office') {
    return { fill: 'rgba(147, 51, 234, 0.2)', stroke: '#9333ea', strokeWidth: 2 };
  }
  if (type.includes('co-work') || type.includes('cowork')) {
    return { fill: 'rgba(234, 88, 12, 0.22)', stroke: '#ea580c', strokeWidth: 2 };
  }
  if (type.includes('resource')) {
    return { fill: 'rgba(236, 72, 153, 0.22)', stroke: '#db2777', strokeWidth: 2 };
  }
  if (type.includes('pure rental')) {
    return { fill: 'rgba(37, 99, 235, 0.22)', stroke: '#2563eb', strokeWidth: 2 };
  }
  if (type.includes('common')) {
    return { fill: 'rgba(220, 38, 38, 0.22)', stroke: '#dc2626', strokeWidth: 2 };
  }

  return { fill: 'rgba(37, 99, 235, 0.22)', stroke: '#2563eb', strokeWidth: 2 };
}

/**
 * @param {object | null | undefined} ann
 */
export function serializeProposalCustomAnnotation(ann) {
  if (!ann || typeof ann !== 'object') return null;
  const row = { source: PROPOSAL_CUSTOM_ANNOTATION_SOURCE };
  for (const key of CUSTOM_ANNOTATION_SHAPE_KEYS) {
    if (ann[key] !== undefined) row[key] = ann[key];
  }
  if (!row.id || !row.type) return null;
  return row;
}

/**
 * @param {unknown[]} annotations
 * @returns {object[]}
 */
export function serializeProposalCustomAnnotations(annotations) {
  return (Array.isArray(annotations) ? annotations : [])
    .map(serializeProposalCustomAnnotation)
    .filter(Boolean);
}

/**
 * @param {unknown[]} annotations
 * @returns {object[]}
 */
export function hydrateProposalCustomAnnotations(annotations) {
  return serializeProposalCustomAnnotations(annotations).map((ann) => ({
    ...ann,
    locked: false,
    visible: ann.visible !== false,
  }));
}

/**
 * Highlight style for user-drawn proposal regions.
 */
export function resolveProposalCustomAnnotationStyle() {
  return { fill: 'rgba(34, 197, 94, 0.45)', stroke: '#15803d', strokeWidth: 2.5 };
}

/**
 * @param {object | null | undefined} ann
 */
export function resolveProposalFloorPlanMergedAnnotationStyle(ann) {
  if (ann?.source === PROPOSAL_CUSTOM_ANNOTATION_SOURCE) {
    return resolveProposalCustomAnnotationStyle();
  }
  return resolveProposalFloorPlanAnnotationStyle(ann);
}

/**
 * Merge system highlights with user-drawn proposal regions.
 *
 * @param {object[]} systemAnnotations
 * @param {unknown[]} customAnnotations
 */
export function mergeProposalFloorPlanAnnotations(systemAnnotations, customAnnotations) {
  const system = Array.isArray(systemAnnotations) ? systemAnnotations : [];
  const custom = hydrateProposalCustomAnnotations(customAnnotations);
  return [...system, ...custom];
}

/**
 * @param {object | null | undefined} meta
 * @param {{ centerId?: string, floor?: string } | null | undefined} floorGroup
 */
export function proposalCustomAnnotationsMatchFloor(meta, floorGroup) {
  if (!meta || !floorGroup?.centerId || !floorGroup?.floor) return true;
  return (
    String(meta.centerId || '') === String(floorGroup.centerId || '') &&
    String(meta.floor || '') === String(floorGroup.floor || '')
  );
}
