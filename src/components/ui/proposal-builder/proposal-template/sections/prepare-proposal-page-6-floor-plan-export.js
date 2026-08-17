import { loadProposalFloorPlanRenderData } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-floor-plan-layout-data';
import { renderProposalFloorPlanToDataUrl } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-floor-plan-canvas-renderer';

/**
 * Bake page 6 floor plan into a PNG data URL using the shared canvas renderer.
 *
 * @param {{
 *   content: object,
 *   inventoryRow?: unknown | null,
 *   inventory?: unknown[],
 *   embeddedLayoutDetail?: object | null,
 *   skipLiveLayoutFetch?: boolean,
 * }} params
 * @returns {Promise<object>} page 6 content with floorPlan.compositionImage updated when render succeeds
 */
export async function prepareProposalPage6FloorPlanForExport({
  content,
  inventoryRow = null,
  inventory = [],
  embeddedLayoutDetail = null,
  skipLiveLayoutFetch = false,
}) {
  if (!content || typeof content !== 'object') return content;
  const floorPlan =
    content.floorPlan && typeof content.floorPlan === 'object' ? content.floorPlan : {};
  const customAnnotations = Array.isArray(floorPlan.customAnnotations)
    ? floorPlan.customAnnotations
    : [];
  const customAnnotationMeta = floorPlan.customAnnotationMeta ?? null;
  const editorSettings = floorPlan.editorSettings ?? null;
  const fallbackSrc =
    floorPlan.compositionImage ||
    floorPlan.image ||
    '/proposal-template/page-6/floor-plan-composition.png';

  const inventoryRows = inventoryRow ? [inventoryRow] : inventory;
  if (!inventoryRows?.length) {
    return content;
  }

  const renderData = await loadProposalFloorPlanRenderData(
    inventoryRows,
    embeddedLayoutDetail,
    customAnnotations,
    customAnnotationMeta,
    editorSettings,
    { skipLiveLayoutFetch },
  );
  if (!renderData) {
    return content;
  }

  const dataUrl = renderProposalFloorPlanToDataUrl({
    image: renderData.image,
    annotations: renderData.annotations,
    viewport: renderData.viewport,
  });

  if (!dataUrl) {
    return content;
  }

  return {
    ...content,
    floorPlan: {
      ...floorPlan,
      compositionImage: dataUrl,
      image: dataUrl,
      _renderedFromLayout: renderData.layoutImagePath,
    },
  };
}
