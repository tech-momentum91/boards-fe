import { useEffect, useMemo, useRef, useState } from 'react';

import { getCenterFloorLayoutImage, postGetLayoutDetail } from '@/api/layoutCoordinates';
import { flattenLayoutShapesToAnnotations } from '@/utils/layout-annotation-space';
import { getLayoutImagePathFromRecord, pickLayoutFilePath } from '@/utils/layout-image-path';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { resolveFloorLayoutSource } from '@/utils/resolve-floor-ref';
import { loadProposalFloorPlanImage } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-floor-plan-canvas-renderer';
import {
  filterProposalSystemAnnotations,
  mergeProposalFloorPlanAnnotations,
  normalizeProposalFloorPlanEditorSettings,
  pickPrimaryProposalFloorGroup,
  proposalCustomAnnotationsMatchFloor,
} from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-utils';

/** Process-lifetime cache: floor identity → layout detail (avoids refetch on preview re-renders). */
const layoutDetailCache = new Map();
/** In-flight requests share one promise so Strict Mode / remounts do not double-fetch. */
const layoutDetailInflight = new Map();

/**
 * @param {string} floorGroupIdentity
 * @param {{ centerId: string, floorValue: string }} params
 */
async function loadLayoutDetailForFloorCached(floorGroupIdentity, { centerId, floorValue }) {
  if (layoutDetailCache.has(floorGroupIdentity)) {
    return {
      detail: layoutDetailCache.get(floorGroupIdentity),
      floorRef: '',
      layoutImagePath: resolveImagePathFromDetail(layoutDetailCache.get(floorGroupIdentity)),
    };
  }

  if (layoutDetailInflight.has(floorGroupIdentity)) {
    return layoutDetailInflight.get(floorGroupIdentity);
  }

  const request = loadLayoutDetailForFloor({ centerId, floorValue })
    .then((result) => {
      if (result?.detail && result?.layoutImagePath) {
        layoutDetailCache.set(floorGroupIdentity, result.detail);
      }
      layoutDetailInflight.delete(floorGroupIdentity);
      return result;
    })
    .catch((error) => {
      layoutDetailInflight.delete(floorGroupIdentity);
      throw error;
    });

  layoutDetailInflight.set(floorGroupIdentity, request);
  return request;
}

function buildInventoryIdentity(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) return '';
  return inventory
    .map((row) => {
      const center = String(row?.center_id || row?.center || '').trim();
      const floor = String(row?.floor || '').trim();
      const space = String(row?.space || row?.space_id || row?.name || '').trim();
      return `${center}|${floor}|${space}`;
    })
    .join(';');
}

function buildFloorGroupIdentity(floorGroup) {
  if (!floorGroup?.centerId || !floorGroup.floor) return '';
  const refs = Array.isArray(floorGroup.spaceRefs)
    ? [...floorGroup.spaceRefs].map(String).sort().join(',')
    : '';
  return `${floorGroup.centerId}::${floorGroup.floor}::${refs}`;
}

function buildImageOnlyLayoutDetail({ floorRef, layoutImagePath, floorRow = null }) {
  const path = String(layoutImagePath || '').trim();
  if (!path) return null;
  return {
    floor_detail: {
      ...(floorRow && typeof floorRow === 'object' ? floorRow : {}),
      name: floorRef || floorRow?.name || '',
      layout_image: path,
    },
    layout: null,
    shapes: [],
    spaces: [],
  };
}

function resolveImagePathFromDetail(detail) {
  if (!detail || typeof detail !== 'object') return '';
  return (
    getLayoutImagePathFromRecord(detail.floor_detail) ||
    getLayoutImagePathFromRecord(detail.layout) ||
    pickLayoutFilePath(detail.layout_image) ||
    pickLayoutFilePath(detail.layout_image_url)
  );
}

/**
 * Prefer annotated layout detail; if missing/unannotated, still use the floor plan raster
 * so the preview/editor can open on the real image instead of the template fallback.
 */
async function loadLayoutDetailForFloor({ centerId, floorValue }) {
  const {
    floorRef,
    floorRow,
    layoutImagePath: listImagePath,
  } = await resolveFloorLayoutSource({
    centerId,
    floorValue,
  });
  if (!floorRef) {
    return { detail: null, floorRef: '', layoutImagePath: '' };
  }

  let detail = null;
  try {
    detail = await postGetLayoutDetail({ floorRef });
  } catch {
    detail = null;
  }

  let layoutImagePath = resolveImagePathFromDetail(detail) || listImagePath;

  if (!layoutImagePath) {
    try {
      const imagePayload = await getCenterFloorLayoutImage({
        center: centerId,
        floor_ref: floorRef,
      });
      layoutImagePath =
        getLayoutImagePathFromRecord(imagePayload?.floor_detail) ||
        pickLayoutFilePath(imagePayload?.layout_image) ||
        pickLayoutFilePath(imagePayload?.layout_image_url) ||
        '';
    } catch {
      // keep empty — caller will fall back to template image
    }
  }

  if (detail && typeof detail === 'object') {
    if (!resolveImagePathFromDetail(detail) && layoutImagePath) {
      detail = {
        ...detail,
        floor_detail: {
          ...(detail.floor_detail && typeof detail.floor_detail === 'object'
            ? detail.floor_detail
            : {}),
          layout_image: layoutImagePath,
        },
      };
    }
    return {
      detail,
      floorRef,
      layoutImagePath: resolveImagePathFromDetail(detail) || layoutImagePath,
    };
  }

  if (layoutImagePath) {
    return {
      detail: buildImageOnlyLayoutDetail({ floorRef, layoutImagePath, floorRow }),
      floorRef,
      layoutImagePath,
    };
  }

  return { detail: null, floorRef, layoutImagePath: '' };
}

/**
 * Load floor layout detail for proposal page 6 — proposed spaces + common areas.
 *
 * Scroll/page-nav re-renders often pass a new `inventory` array reference with the same
 * content. Identity is derived from row fields so we do not clear the image or refetch.
 *
 * When the selected inventory has no annotated shapes but the floor still has a plan image,
 * we still load that image so preview/editor use it instead of the template fallback.
 *
 * @param {unknown[]} inventory
 * @param {object | null | undefined} [embeddedLayoutDetail]
 * @param {unknown[]} [customAnnotations]
 * @param {object | null | undefined} [customAnnotationMeta]
 * @param {object | null | undefined} [editorSettings]
 * @param {{ skipLiveLayoutFetch?: boolean }} [options]
 *   When true (public/guest), never call list_floor_details / get_layout_detail /
 *   get_center_floor_layout_image — only use embedded share-deck layout detail.
 */
export function useProposalFloorPlanLayout(
  inventory,
  embeddedLayoutDetail = null,
  customAnnotations = [],
  customAnnotationMeta = null,
  editorSettings = null,
  { skipLiveLayoutFetch = false } = {},
) {
  const inventoryIdentity = useMemo(() => buildInventoryIdentity(inventory), [inventory]);

  const floorGroup = useMemo(
    () => pickPrimaryProposalFloorGroup(inventory),
    // Content-stable: ignore new array references with the same rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inventoryIdentity encodes inventory
    [inventoryIdentity],
  );

  const floorGroupIdentity = useMemo(() => buildFloorGroupIdentity(floorGroup), [floorGroup]);

  const [layoutDetail, setLayoutDetail] = useState(embeddedLayoutDetail ?? null);
  const [status, setStatus] = useState(embeddedLayoutDetail ? 'ready' : 'idle');
  const [imgEl, setImgEl] = useState(null);
  const loadedFloorKeyRef = useRef('');

  useEffect(() => {
    if (embeddedLayoutDetail) {
      setLayoutDetail(embeddedLayoutDetail);
      setStatus('ready');
      loadedFloorKeyRef.current = floorGroupIdentity || 'embedded';
      return undefined;
    }

    // Public/guest: never hit authenticated floor/layout APIs.
    if (skipLiveLayoutFetch) {
      loadedFloorKeyRef.current = '';
      setLayoutDetail(null);
      setStatus('empty');
      return undefined;
    }

    if (!floorGroupIdentity || !floorGroup?.centerId || !floorGroup.floor) {
      loadedFloorKeyRef.current = '';
      setLayoutDetail(null);
      setStatus('empty');
      return undefined;
    }

    // Same floor as already loaded — keep canvas; do not flash fallback or refetch.
    if (loadedFloorKeyRef.current === floorGroupIdentity && layoutDetail) {
      setStatus('ready');
      return undefined;
    }

    const cached = layoutDetailCache.get(floorGroupIdentity);
    if (cached) {
      loadedFloorKeyRef.current = floorGroupIdentity;
      setLayoutDetail(cached);
      setStatus('ready');
      return undefined;
    }

    let cancelled = false;
    if (loadedFloorKeyRef.current !== floorGroupIdentity) {
      setStatus('loading');
      // Keep previous image while loading a new floor — avoids fallback flash on remount.
      // Only clear when switching floors.
      if (!layoutDetailCache.has(floorGroupIdentity)) {
        setLayoutDetail(null);
      }
    }

    (async () => {
      try {
        const { detail, layoutImagePath } = await loadLayoutDetailForFloorCached(
          floorGroupIdentity,
          {
            centerId: floorGroup.centerId,
            floorValue: floorGroup.floor,
          },
        );
        if (cancelled) return;

        if (!detail || !layoutImagePath) {
          setLayoutDetail(null);
          setStatus('empty');
          return;
        }

        loadedFloorKeyRef.current = floorGroupIdentity;
        setLayoutDetail(detail);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setLayoutDetail(null);
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // layoutDetail intentionally omitted — used only as a gate for the same-key early return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    embeddedLayoutDetail,
    floorGroupIdentity,
    floorGroup?.centerId,
    floorGroup?.floor,
    skipLiveLayoutFetch,
  ]);

  const floorRecord = layoutDetail?.floor_detail ?? layoutDetail?.layout ?? null;
  const layoutImagePath = useMemo(
    () => resolveImagePathFromDetail(layoutDetail) || getLayoutImagePathFromRecord(floorRecord),
    [layoutDetail, floorRecord],
  );
  const src = useMemo(() => toLayoutAssetUrl(layoutImagePath), [layoutImagePath]);

  useEffect(() => {
    if (!src) {
      setImgEl(null);
      return undefined;
    }

    let cancelled = false;
    loadProposalFloorPlanImage(src).then((img) => {
      if (!cancelled) setImgEl(img);
    });

    return () => {
      cancelled = true;
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

  const effectiveCustomAnnotations = useMemo(() => {
    if (!proposalCustomAnnotationsMatchFloor(customAnnotationMeta, floorGroup)) return [];
    return Array.isArray(customAnnotations) ? customAnnotations : [];
  }, [customAnnotationMeta, customAnnotations, floorGroup]);

  const normalizedEditorSettings = useMemo(
    () => normalizeProposalFloorPlanEditorSettings(editorSettings),
    [editorSettings],
  );

  const systemAnnotations = useMemo(() => {
    if (!layoutDetail || !floorGroup) return [];
    const all = flattenLayoutShapesToAnnotations(layoutDetail).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    }));
    return filterProposalSystemAnnotations(all, floorGroup, normalizedEditorSettings);
  }, [floorGroup, layoutDetail, normalizedEditorSettings]);

  const annotations = useMemo(
    () => mergeProposalFloorPlanAnnotations(systemAnnotations, effectiveCustomAnnotations),
    [effectiveCustomAnnotations, systemAnnotations],
  );

  const viewport = normalizedEditorSettings.viewport;

  // Image alone is enough — empty annotations still render the real floor plan (and open editor).
  const hasFloorImage = status === 'ready' && Boolean(imageProp?.raster);
  const canRender = hasFloorImage;

  return {
    status,
    canRender,
    hasFloorImage,
    imageProp,
    annotations,
    viewport,
    layoutDetail,
    floorGroup,
    layoutImagePath,
  };
}
