import {
  buildTemplateDefinition,
  parseTemplateDefinition,
} from '@/components/ui/proposal-builder/deck/proposal-template-definition';

export const proposalBuilderCapabilities = Object.freeze({
  chat: false,
  pptxExport: true,
  pdfExport: true,
  presentationMode: true,
  dragReorder: true,
  aiGenerate: false,
  templateBuilder: false,
});

export function loadProposalDefinition(templateJson = null) {
  if (templateJson) {
    return parseTemplateDefinition(templateJson);
  }
  return buildTemplateDefinition();
}

export { PROPOSAL_BUILDER_ID } from '@/components/ui/proposal-builder/deck/constants';
