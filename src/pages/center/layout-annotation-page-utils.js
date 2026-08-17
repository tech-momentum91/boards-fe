import { getLayoutImagePathFromRecord } from '@/utils/layout-image-path';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { DESK_COWORKER_MARKER, SERVER_SUBSPACE_PIN_SOURCE } from '@/utils/layout-annotation-space';
import {
  CENTER_SUBSPACE_MARKER,
  SUBSPACE_LAYOUT_PENDING_SOURCE,
} from '@/utils/layout-annotation-subspace';

export { toLayoutAssetUrl as toAssetUrl };

export { CENTER_SUBSPACE_MARKER };

export function stripEphemeralAnnotations(list) {
  return Array.isArray(list)
    ? list.filter(
        (a) =>
          a.source !== CENTER_SUBSPACE_MARKER &&
          a.source !== SERVER_SUBSPACE_PIN_SOURCE &&
          a.source !== DESK_COWORKER_MARKER &&
          a.source !== SUBSPACE_LAYOUT_PENDING_SOURCE,
      )
    : [];
}

export const COORD_KEYS = [
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
  'id',
  'label',
  'visible',
  'locked',
];

export function toCleanCoord(ann) {
  const result = {};
  for (const key of COORD_KEYS) {
    if (ann[key] !== undefined) result[key] = ann[key];
  }
  return result;
}

/** Image path from floor_detail (layout_image) or legacy Layout doc fields. */
export function getLayoutImagePath(record) {
  return getLayoutImagePathFromRecord(record);
}

/** Child row id (`name`) from get_layout_detail — must match route `floorRef`. */
export function getFloorRefFromDetail(layoutDetailData) {
  if (!layoutDetailData || typeof layoutDetailData !== 'object') return '';
  const fd = layoutDetailData.floor_detail;
  if (fd && fd.name != null) return String(fd.name).trim();
  const rec = layoutDetailData.layout ?? layoutDetailData;
  const name = rec?.name;
  return name != null ? String(name).trim() : '';
}

/** First numeric value that is finite and strictly positive; otherwise null. */
export function pickFirstFinitePositive(...values) {
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
