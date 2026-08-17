import { getCenterFloorLayoutImage, postGetLayoutDetail } from '@/api/layoutCoordinates';
import { flattenLayoutShapesToAnnotations } from '@/utils/layout-annotation-space';
import { getLayoutImagePathFromRecord, pickLayoutFilePath } from '@/utils/layout-image-path';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { resolveFloorLayoutSource } from '@/utils/resolve-floor-ref';
import {
  filterProposalSystemAnnotations,
  mergeProposalFloorPlanAnnotations,
  normalizeProposalFloorPlanEditorSettings,
  pickPrimaryProposalFloorGroup,
  proposalCustomAnnotationsMatchFloor,
} from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-utils';
import { loadProposalFloorPlanImage } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-floor-plan-canvas-renderer';

/**
 * Resolve layout image + spotlight annotations for proposal page 6.
 *
 * @param {unknown[]} inventory
 * @param {object | null | undefined} [embeddedLayoutDetail]
 * @param {unknown[]} [customAnnotations]
 * @param {object | null | undefined} [customAnnotationMeta]
 * @param {object | null | undefined} [editorSettings]
 * @param {{ skipLiveLayoutFetch?: boolean }} [options]
 *   When true (public/guest), never call authenticated floor/layout APIs.
 * @returns {Promise<{ image: HTMLImageElement, annotations: object[], layoutImagePath: string, viewport: object | null } | null>}
 */
export async function loadProposalFloorPlanRenderData(
  inventory,
  embeddedLayoutDetail = null,
  customAnnotations = [],
  customAnnotationMeta = null,
  editorSettings = null,
  { skipLiveLayoutFetch = false } = {},
) {
  const floorGroup = pickPrimaryProposalFloorGroup(inventory);
  if (!floorGroup?.centerId || !floorGroup.floor) {
    return null;
  }

  let layoutDetail = embeddedLayoutDetail;
  let layoutImagePath = '';

  if (!layoutDetail) {
    if (skipLiveLayoutFetch) {
      return null;
    }

    const {
      floorRef,
      floorRow,
      layoutImagePath: listImagePath,
    } = await resolveFloorLayoutSource({
      centerId: floorGroup.centerId,
      floorValue: floorGroup.floor,
    });
    if (!floorRef) return null;

    try {
      layoutDetail = await postGetLayoutDetail({ floorRef });
    } catch {
      layoutDetail = null;
    }

    layoutImagePath =
      getLayoutImagePathFromRecord(layoutDetail?.floor_detail) ||
      getLayoutImagePathFromRecord(layoutDetail?.layout) ||
      listImagePath;

    if (!layoutImagePath) {
      try {
        const imagePayload = await getCenterFloorLayoutImage({
          center: floorGroup.centerId,
          floor_ref: floorRef,
        });
        layoutImagePath =
          getLayoutImagePathFromRecord(imagePayload?.floor_detail) ||
          pickLayoutFilePath(imagePayload?.layout_image) ||
          pickLayoutFilePath(imagePayload?.layout_image_url) ||
          '';
      } catch {
        layoutImagePath = '';
      }
    }

    if (!layoutDetail && layoutImagePath) {
      layoutDetail = {
        floor_detail: {
          ...(floorRow && typeof floorRow === 'object' ? floorRow : {}),
          name: floorRef,
          layout_image: layoutImagePath,
        },
        shapes: [],
        spaces: [],
      };
    } else if (
      layoutDetail &&
      layoutImagePath &&
      !getLayoutImagePathFromRecord(layoutDetail?.floor_detail)
    ) {
      layoutDetail = {
        ...layoutDetail,
        floor_detail: {
          ...(layoutDetail.floor_detail && typeof layoutDetail.floor_detail === 'object'
            ? layoutDetail.floor_detail
            : {}),
          layout_image: layoutImagePath,
        },
      };
    }
  }

  if (!layoutDetail || typeof layoutDetail !== 'object') return null;

  const floorRecord = layoutDetail.floor_detail ?? layoutDetail.layout ?? null;
  layoutImagePath =
    layoutImagePath ||
    getLayoutImagePathFromRecord(floorRecord) ||
    pickLayoutFilePath(layoutDetail.layout_image);
  const src = toLayoutAssetUrl(layoutImagePath);
  if (!src) return null;

  const image = await loadProposalFloorPlanImage(src);
  if (!image) return null;

  const effectiveCustomAnnotations = proposalCustomAnnotationsMatchFloor(
    customAnnotationMeta,
    floorGroup,
  )
    ? customAnnotations
    : [];

  const normalizedEditorSettings = normalizeProposalFloorPlanEditorSettings(editorSettings);
  const viewport = normalizedEditorSettings.viewport;

  const systemAnnotations = filterProposalSystemAnnotations(
    flattenLayoutShapesToAnnotations(layoutDetail).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    })),
    floorGroup,
    normalizedEditorSettings,
  );

  const annotations = mergeProposalFloorPlanAnnotations(
    systemAnnotations,
    effectiveCustomAnnotations,
  );

  // Keep the real floor image even when no inventory shapes are annotated.
  return { image, annotations, layoutImagePath, viewport };
}
