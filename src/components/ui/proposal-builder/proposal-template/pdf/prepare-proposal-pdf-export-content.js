import { prepareTemplateContentForPdf } from '@/components/ui/proposal-builder/proposal-template/pdf/prepare-template-content-for-pdf';
import { prepareProposalPage6FloorPlanForExport } from '@/components/ui/proposal-builder/proposal-template/sections/prepare-proposal-page-6-floor-plan-export';
import { resolvePageInstanceInventory } from '@/components/ui/proposal-builder/deck/proposal-page-instance-content';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

/**
 * Pick embedded guest layout for inventory rows without importing floor-plan utils
 * (those pull Vite `import.meta` via axios and break Jest).
 */
function resolveEmbeddedLayoutDetailForInventory(
  inventory,
  primaryDetail = null,
  detailsByKey = null,
) {
  const rows = Array.isArray(inventory) ? inventory : [];
  if (detailsByKey && typeof detailsByKey === 'object') {
    for (const row of rows) {
      const centerId = String(row?.center_id || row?.center || '').trim();
      const floor = String(row?.floor || '').trim();
      if (!centerId || !floor) continue;
      const matched = detailsByKey[`${centerId}::${floor}`];
      if (matched && typeof matched === 'object') return matched;
    }
  }
  return primaryDetail && typeof primaryDetail === 'object' ? primaryDetail : null;
}

/**
 * Resolve template content for react-pdf export/preview (floor plan + image baking).
 */
export async function prepareProposalPdfExportContent({
  content = defaultProposalContent,
  contentByInstanceId = null,
  pageInstances = null,
  primaryColor,
  clientAiTheme = false,
  visiblePages = null,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
  layoutInventory = [],
  embeddedPage6LayoutDetail = null,
  page6LayoutDetailsByKey = null,
  inventory = null,
  skipLiveLayoutFetch = false,
} = {}) {
  const isInstanceMode = Array.isArray(pageInstances);
  const instanceInventory = Array.isArray(inventory) ? inventory : layoutInventory;

  if (isInstanceMode) {
    const instanceContent =
      contentByInstanceId && typeof contentByInstanceId === 'object' ? contentByInstanceId : {};
    const templateKeyById = new Map(
      (pageInstances ?? []).map((instance) => [instance?.id, instance?.templateKey]),
    );

    const updatedContent = { ...instanceContent };
    for (const instance of pageInstances ?? []) {
      if (!instance?.id || instance?.templateKey !== 'page6') continue;
      const [boundRow] = resolvePageInstanceInventory(instance, instanceInventory);
      if (!boundRow) continue;
      const instancePageContent = instanceContent[instance.id] ?? {};
      const inventoryRows = [boundRow];
      updatedContent[instance.id] = await prepareProposalPage6FloorPlanForExport({
        content: instancePageContent,
        inventoryRow: boundRow,
        embeddedLayoutDetail: resolveEmbeddedLayoutDetailForInventory(
          inventoryRows,
          embeddedPage6LayoutDetail,
          page6LayoutDetailsByKey,
        ),
        skipLiveLayoutFetch,
      });
    }

    const preparedEntries = await Promise.all(
      Object.entries(updatedContent).map(async ([instanceId, instancePageContent]) => {
        const templateKey = templateKeyById.get(instanceId);
        if (!templateKey) return [instanceId, instancePageContent];
        const wrapped = { [templateKey]: instancePageContent };
        const prepared = await prepareTemplateContentForPdf(wrapped, origin, {
          clientAiTheme,
          primaryColor,
        });
        return [instanceId, prepared?.[templateKey] ?? instancePageContent];
      }),
    );

    return {
      content,
      contentByInstanceId: Object.fromEntries(preparedEntries),
    };
  }

  const pageNumbers = visiblePages ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const needsFloorPlan = pageNumbers.includes(6);

  let resolvedContent = content;
  if (needsFloorPlan && layoutInventory?.length) {
    const page6 = content?.page6 && typeof content.page6 === 'object' ? content.page6 : {};
    const updatedPage6 = await prepareProposalPage6FloorPlanForExport({
      content: page6,
      inventory: layoutInventory,
      embeddedLayoutDetail: resolveEmbeddedLayoutDetailForInventory(
        layoutInventory,
        embeddedPage6LayoutDetail,
        page6LayoutDetailsByKey,
      ),
      skipLiveLayoutFetch,
    });
    resolvedContent = {
      ...content,
      page6: updatedPage6,
    };
  }

  return {
    content: await prepareTemplateContentForPdf(resolvedContent, origin, {
      clientAiTheme,
      primaryColor,
    }),
  };
}
