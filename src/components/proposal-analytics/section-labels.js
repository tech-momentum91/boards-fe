import { PROPOSAL_TEMPLATE_PAGES } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

/** Canonical proposal section labels in deck order (1-based display numbers). */
export const PROPOSAL_SECTION_LABELS = PROPOSAL_TEMPLATE_PAGES.map((page) => page.label);

const LABEL_BY_PAGE_ID = Object.fromEntries(
  PROPOSAL_TEMPLATE_PAGES.map((page) => [String(page.id), page.label]),
);
const LABEL_BY_PAGE_KEY = Object.fromEntries(
  PROPOSAL_TEMPLATE_PAGES.map((page) => [String(page.key).toLowerCase(), page.label]),
);
const INDEX_BY_LABEL = Object.fromEntries(
  PROPOSAL_SECTION_LABELS.map((label, index) => [label.toLowerCase(), index]),
);

/**
 * Resolve any tracked section token (page id, page key, or label) to canonical label.
 * @param {string | number | null | undefined} raw
 */
export function resolveProposalSectionLabel(raw) {
  if (raw == null) return '';
  const text = String(raw).trim();
  if (!text) return '';

  const lower = text.toLowerCase();
  if (INDEX_BY_LABEL[lower] != null) {
    return PROPOSAL_SECTION_LABELS[INDEX_BY_LABEL[lower]];
  }

  if (LABEL_BY_PAGE_ID[text]) return LABEL_BY_PAGE_ID[text];
  if (LABEL_BY_PAGE_KEY[lower]) return LABEL_BY_PAGE_KEY[lower];

  // Patterns: page1, page_2, section-3
  const pageMatch = lower.match(/(?:page|section)[\s_-]*(\d+)$/);
  if (pageMatch) {
    const id = pageMatch[1];
    if (LABEL_BY_PAGE_ID[id]) return LABEL_BY_PAGE_ID[id];
  }

  // Pure digits: treat as 1-based page id first, then 0-based index.
  if (/^\d+$/.test(text)) {
    const asPageId = LABEL_BY_PAGE_ID[String(Number(text))];
    if (asPageId) return asPageId;
    const zeroBased = PROPOSAL_SECTION_LABELS[Number(text)];
    if (zeroBased) return zeroBased;
  }

  return text;
}

/** "1 Cover", "2 Why DevX", … */
export function formatNumberedSectionLabel(raw) {
  const label = resolveProposalSectionLabel(raw);
  if (!label) return '';
  const index = INDEX_BY_LABEL[label.toLowerCase()];
  if (index == null) return label;
  return `${index + 1} ${label}`;
}

/**
 * Sort index for a section label.
 * Canonical labels ("Cover", "Floor Plan") map directly by index.
 * Rich labels ("Floor Plan - The First - Floor A…") are matched by canonical prefix
 * so multi-center pages keep their expected deck position.
 */
export function getProposalSectionSortIndex(raw) {
  const label = resolveProposalSectionLabel(raw);
  const index = INDEX_BY_LABEL[label.toLowerCase()];
  if (index != null) return index;

  // Rich deck label — find canonical prefix ("Floor Plan" inside "Floor Plan - The First - …").
  const lower = String(raw || '').toLowerCase();
  for (let i = 0; i < PROPOSAL_SECTION_LABELS.length; i++) {
    if (lower.startsWith(PROPOSAL_SECTION_LABELS[i].toLowerCase())) return i;
  }

  return 999;
}
