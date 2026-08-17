/** Proposal builder route segment under `/crm/proposals/:proposalId/...` */
export const PROPOSAL_BUILDER_ROUTE_SEGMENT = 'build';

export const CRM_PROPOSALS_LIST_PATH = '/crm/proposals';

/** CRM + builder default template name. */
export const DEFAULT_PROPOSAL_TEMPLATE_KEY = 'Default template';

export const PROPOSAL_BUILDER_ID = 'Default';

export const TEMPLATE_DEFINITION_SCHEMA_VERSION = 2;

export const BUILDER_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  SAVING: 'saving',
  ERROR: 'error',
};

/**
 * @param {string} proposalId
 * @param {{ leadId?: string, readOnly?: boolean }} [options]
 */
export function buildProposalBuilderPath(proposalId, options = {}) {
  const id = encodeURIComponent(proposalId || '');
  const params = new URLSearchParams();
  if (options.leadId) params.set('lead', options.leadId);
  if (options.readOnly) params.set('mode', 'view');
  const query = params.toString();
  return `/crm/proposals/${id}/${PROPOSAL_BUILDER_ROUTE_SEGMENT}${query ? `?${query}` : ''}`;
}
