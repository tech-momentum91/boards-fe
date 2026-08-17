import { PROPOSAL_TEMPLATE_PAGES } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

export const DEFAULT_TEMPLATE_PAGE_IDS = PROPOSAL_TEMPLATE_PAGES.map((page) => page.id);

export function buildDefaultPagesState() {
  return Object.fromEntries(DEFAULT_TEMPLATE_PAGE_IDS.map((id) => [id, true]));
}

export function normalizePageOrder(order, pageIds = DEFAULT_TEMPLATE_PAGE_IDS) {
  const canonical = [...pageIds];
  const seen = new Set();
  const normalized = [];

  (Array.isArray(order) ? order : []).forEach((rawId) => {
    const id = Number(rawId);
    if (!canonical.includes(id) || seen.has(id)) return;
    normalized.push(id);
    seen.add(id);
  });

  canonical.forEach((id) => {
    if (!seen.has(id)) normalized.push(id);
  });

  return normalized;
}

export function reorderPages(pageOrder, draggedId, targetId) {
  const dragged = Number(draggedId);
  const target = Number(targetId);
  if (!dragged || !target || dragged === target) return pageOrder;

  const next = pageOrder.filter((id) => id !== dragged);
  const targetIndex = next.indexOf(target);
  if (targetIndex < 0) return pageOrder;

  next.splice(targetIndex, 0, dragged);
  return next;
}

export function sortPagesByOrder(pages, pageOrder) {
  const rank = Object.fromEntries(pageOrder.map((id, index) => [id, index]));
  return [...pages].sort((a, b) => (rank[a.id] ?? 1e9) - (rank[b.id] ?? 1e9));
}

export function getEnabledPagesInOrder(pagesState = {}, pageOrder = DEFAULT_TEMPLATE_PAGE_IDS) {
  return pageOrder.filter((id) => pagesState[id]);
}
