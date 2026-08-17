/**
 * Proposal Builder — public API
 *
 * Folder layout:
 *   shell/              Builder chrome (header, controls, preview host)
 *   deck/               Deck state, templates, hydration
 *   proposal-template/  Static 9-page template (web preview + react-pdf export)
 *   theme/              Colors, accents, CSS variable generation
 *   hooks/              React hooks
 *   styles/             CSS bundles
 *
 * Usage:
 *   import * as ProposalBuilder from '@/components/ui/proposal-builder';
 *   <ProposalBuilder.Root proposalId={id} onExit={handleExit} />
 */

export { default as Root } from '@/components/ui/proposal-builder/shell/proposal-builder-root';
export { default as Shell } from '@/components/ui/proposal-builder/shell/proposal-builder-shell';
export { default as Header } from '@/components/ui/proposal-builder/shell/proposal-builder-header';
export { default as ControlsPanel } from '@/components/ui/proposal-builder/shell/proposal-builder-controls-panel';
export { default as AiPanel } from '@/components/ui/proposal-builder/shell/proposal-builder-ai-panel';
export {
  BUILDER_STATUS,
  CRM_PROPOSALS_LIST_PATH,
  DEFAULT_PROPOSAL_TEMPLATE_KEY,
  PROPOSAL_BUILDER_ID,
  PROPOSAL_BUILDER_ROUTE_SEGMENT,
  TEMPLATE_DEFINITION_SCHEMA_VERSION,
  buildProposalBuilderPath,
} from '@/components/ui/proposal-builder/deck/constants';
export { CRM_PROPOSAL_AI_API } from '@/api/crmProposalAi';
export {
  resolveTemplate,
  listRegisteredTemplateIds,
  buildTemplateSelectOptions,
  normalizeProposalTemplateKey,
} from '@/components/ui/proposal-builder/deck/template-registry';
export {
  buildTemplateDefinition,
  parseTemplateDefinition,
} from '@/components/ui/proposal-builder/deck/proposal-template-definition';
export { loadProposalDefinition } from '@/components/ui/proposal-builder/deck/proposal-builder-plugin';
export { buildHydrationContext } from '@/components/ui/proposal-builder/deck/hydrate-context';
export { buildHydrationContext as buildProposalHydrationContext } from '@/components/ui/proposal-builder/deck/hydrate-context';
export { selectBuilderDeckLocked } from '@/redux/crmProposalBuilderSlice';
