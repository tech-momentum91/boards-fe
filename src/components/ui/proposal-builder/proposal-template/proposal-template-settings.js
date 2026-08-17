import {
  PAGE2_COMPARISON_COLUMNS,
  PAGE2_COMPARISON_ROWS,
  PAGE3_STAT_ICONS,
  PAGE4_ICONS,
  PROPOSAL_TEMPLATE_PLACEHOLDERS,
  defaultProposalContent,
} from '@/components/ui/proposal-builder/proposal-template/proposal-content';

const EMPTY_REGISTRY = {};

let cachedSettings = null;
let loadPromise = null;

function normalizeSettingsPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const content =
    payload.content && typeof payload.content === 'object' ? payload.content : payload;
  const versionRaw = payload.version ?? content?.version ?? 1;
  const version = Number.isFinite(Number(versionRaw)) ? Number(versionRaw) : 1;
  return { content, version };
}

export async function ensureProposalTemplateSettingsLoaded() {
  if (cachedSettings) return cachedSettings;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { fetchProposalTemplateSettings } = await import('@/api/crmProposals');
    const payload = await fetchProposalTemplateSettings();
    cachedSettings = normalizeSettingsPayload(payload);
    return cachedSettings;
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export function setProposalTemplateSettingsForTests(contentOrPayload) {
  cachedSettings = contentOrPayload ? normalizeSettingsPayload(contentOrPayload) : null;
  loadPromise = null;
}

export function getProposalTemplateSettings() {
  return cachedSettings;
}

export function getProposalTemplateSettingsVersion() {
  return cachedSettings?.version ?? 1;
}

function getContent() {
  return cachedSettings?.content ?? null;
}

export function getProposalCityRegistry() {
  return getContent()?.cities ?? EMPTY_REGISTRY;
}

export function getProposalCenterRegistry() {
  return getContent()?.centers ?? EMPTY_REGISTRY;
}

export function getDefaultProposalContent() {
  return getContent()?.defaults ?? defaultProposalContent;
}

export function getProposalTemplatePlaceholders() {
  return getContent()?.placeholders ?? PROPOSAL_TEMPLATE_PLACEHOLDERS;
}

export function getProposalTemplateIcons() {
  return (
    getContent()?.icons ?? {
      page3StatIcons: PAGE3_STAT_ICONS,
      page4Icons: PAGE4_ICONS,
    }
  );
}

export function getProposalTemplatePage2Comparison() {
  return (
    getContent()?.page2Comparison ?? {
      columns: PAGE2_COMPARISON_COLUMNS,
      rows: PAGE2_COMPARISON_ROWS,
    }
  );
}
