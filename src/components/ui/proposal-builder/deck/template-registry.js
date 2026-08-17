import {
  DEFAULT_PROPOSAL_TEMPLATE_KEY,
  PROPOSAL_BUILDER_ID,
} from '@/components/ui/proposal-builder/deck/constants';
import { buildHydrationContext } from '@/components/ui/proposal-builder/deck/hydrate-context';
import {
  loadProposalDefinition,
  proposalBuilderCapabilities,
} from '@/components/ui/proposal-builder/deck/proposal-builder-plugin';

export { PROPOSAL_BUILDER_ID, loadProposalDefinition, buildHydrationContext };

/**
 * All CRM template names resolve to the same page-based builder.
 * Layout comes from the static 9-page template in proposal-content.js.
 */
export function resolveTemplate(templateId) {
  const key = normalizeProposalTemplateKey(templateId);
  if (!key) return null;
  return {
    id: key,
    label: key,
    loadDefinition: loadProposalDefinition,
    buildHydrationContext,
    capabilities: proposalBuilderCapabilities,
  };
}

export function normalizeProposalTemplateKey(templateId) {
  const key = String(templateId || '').trim();
  if (!key) return DEFAULT_PROPOSAL_TEMPLATE_KEY;
  if (key === 'Default') return DEFAULT_PROPOSAL_TEMPLATE_KEY;
  return key;
}

/**
 * Dropdown options from CRM template list.
 * @param {Array<{ value: string, label: string, is_default?: boolean }>} apiTemplates
 */
export function buildTemplateSelectOptions(apiTemplates = []) {
  const seen = new Set();
  const options = [];

  const pushOption = (value, label) => {
    const key = normalizeProposalTemplateKey(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({
      value: key,
      label: label || key,
      pluginId: PROPOSAL_BUILDER_ID,
    });
  };

  (apiTemplates ?? []).forEach((row) => {
    if (row?.value) pushOption(row.value, row.label || row.value);
  });

  if (!seen.has(DEFAULT_PROPOSAL_TEMPLATE_KEY)) {
    pushOption(DEFAULT_PROPOSAL_TEMPLATE_KEY, DEFAULT_PROPOSAL_TEMPLATE_KEY);
  }

  return options;
}

export function listRegisteredTemplateIds(apiTemplates = []) {
  return buildTemplateSelectOptions(apiTemplates).map((option) => option.value);
}

export { DEFAULT_PROPOSAL_TEMPLATE_KEY };
