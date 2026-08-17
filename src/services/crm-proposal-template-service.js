import apiClient from '@/api/axios';

import { loadProposalDefinition } from '@/components/ui/proposal-builder/deck/proposal-builder-plugin';
import {
  normalizeProposalTemplateKey,
  resolveTemplate,
} from '@/components/ui/proposal-builder/deck/template-registry';

/** CRM JSON fields may arrive as a string over the API. */
export function parseCrmTemplateJson(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Fetch CRM Proposal Template row (template_json lives on the DocType). */
export async function fetchCrmProposalTemplate(templateKey) {
  const key = normalizeProposalTemplateKey(templateKey);
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_proposal.get_crm_proposal_template',
    { params: { template: key } },
  );
  return data?.message ?? data;
}

/** Load builder definition from CRM Proposal Template template_json. */
export async function loadTemplateDefinitionFromCrm(proposalTemplateKey) {
  const key = normalizeProposalTemplateKey(proposalTemplateKey);
  const template = resolveTemplate(key);
  if (!template) return null;

  try {
    const row = await fetchCrmProposalTemplate(key);
    const raw = parseCrmTemplateJson(row?.template_json);
    if (raw && Object.keys(raw).length > 0) {
      return template.loadDefinition(raw);
    }
  } catch {
    // Fall back to empty bundled structure when CRM template is unavailable.
  }

  return loadProposalDefinition();
}
