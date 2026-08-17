import { TEMPLATE_DEFINITION_SCHEMA_VERSION } from '@/components/ui/proposal-builder/deck/constants';

export { TEMPLATE_DEFINITION_SCHEMA_VERSION };

/**
 * Page-based proposal builder definition (static 9-page template).
 */
export function buildTemplateDefinition(overrides = {}) {
  return {
    schemaVersion: overrides.schemaVersion ?? TEMPLATE_DEFINITION_SCHEMA_VERSION,
  };
}

/** @param {object|null} raw – persisted template_json from CRM Proposal Template DocType */
export function parseTemplateDefinition(raw) {
  if (!raw || typeof raw !== 'object') {
    return buildTemplateDefinition();
  }

  return buildTemplateDefinition({
    schemaVersion:
      raw.schemaVersion ?? raw.deck_schema_version ?? TEMPLATE_DEFINITION_SCHEMA_VERSION,
  });
}
