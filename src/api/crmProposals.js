import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import { getProposalPresentationThemeAi, getProposalThemeFromWebsiteAi } from '@/api/crmProposalAi';
import {
  buildDeckSavePayload,
  buildInitialDeckState,
  stripLegacyDeckFields,
} from '@/components/ui/proposal-builder/deck/build-initial-deck-state';
import { buildHydrationContext } from '@/components/ui/proposal-builder/deck/hydrate-context';
import { proposalTemplateNeedsPlaceholderHydration } from '@/components/ui/proposal-builder/proposal-template/apply-city-center-template-content';
import { deriveProposalValidityStatus } from '@/components/crm-proposals/constants';
import {
  buildCombinedPaletteScheme,
  buildDevxCombinedScheme,
  buildDevxPalette,
  DEVX_BRAND_ANCHORS,
  normHex,
} from '@/components/ui/proposal-builder/theme/theme-contrast';

/** CRM Proposal record + media APIs (devx). */
export const CRM_PROPOSAL_API = {
  templates: '/method/devx.devx_crm.api.crm_proposal.get_crm_proposal_templates',
  template: '/method/devx.devx_crm.api.crm_proposal.get_crm_proposal_template',
  settings: '/method/devx.devx_crm.api.crm_proposal.get_proposal_template_settings',
  get: '/method/devx.devx_crm.api.crm_proposal.get_crm_proposal',
  create: '/method/devx.devx_crm.api.crm_proposal.create_crm_proposal',
  saveDeck: '/method/devx.devx_crm.api.crm_proposal.save_crm_proposal_deck',
  listVersions: '/method/devx.devx_crm.api.crm_proposal.list_crm_proposal_versions',
  getVersion: '/method/devx.devx_crm.api.crm_proposal.get_crm_proposal_version',
  restoreVersion: '/method/devx.devx_crm.api.crm_proposal.restore_crm_proposal_version',
  proposalImage: '/method/devx.devx_crm.api.crm_proposal.get_proposal_image',
  listSummary: '/method/devx.devx_crm.api.crm_proposal.list_crm_proposals_summary',
};

export { CRM_PROPOSAL_AI_API } from '@/api/crmProposalAi';
export { chatEditProposal } from '@/api/crmProposalAi';

function unwrap(response) {
  const result = response?.data;
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
  return result?.message ?? result;
}

/** Original remote URL when given a proxied logo URL or raw candidate URL. */
export function resolveRemoteLogoUrl(rawOrProxied) {
  if (!rawOrProxied || rawOrProxied.startsWith('data:')) return rawOrProxied;
  try {
    const parsed = new URL(rawOrProxied, window.location.origin);
    const embedded = parsed.searchParams.get('url');
    if (embedded) return embedded;
  } catch {
    /* ignore */
  }
  return rawOrProxied;
}

/** Unwrap legacy proxied logo URLs; scraped logos use the remote https URL directly in UI. */
export function logoDisplaySrc(rawOrProxied) {
  if (!rawOrProxied) return null;
  if (rawOrProxied.startsWith('data:')) return rawOrProxied;
  return resolveRemoteLogoUrl(rawOrProxied) || rawOrProxied;
}

/** Parse brand_json from CRM Proposal API response. */
export function parseProposalBrandJson(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/** Map builder theme source to CRM Proposal.color_theme select value. */
export function themeSourceToColorTheme(themeSource) {
  return themeSource === 'client' ? 'Client(ai)' : 'DevX';
}

/** Snapshot brand + theme choice for CRM Proposal.brand_json and deck. */
export function buildProposalBrandJson({
  websiteUrl,
  themeSource,
  websitePalette,
  websiteCombinedScheme,
  logoCandidates,
  clientLogoUrl,
  themeColor,
}) {
  if (themeSource === 'devx') {
    const palette = buildDevxPalette();
    const primary = palette.includes(normHex(themeColor)) ? normHex(themeColor) : palette[0];
    return {
      themeSource: 'devx',
      website: websiteUrl || '',
      theme_scraped: false,
      palette,
      combinedScheme: buildDevxCombinedScheme(primary),
      logoCandidates: [],
      selectedLogoUrl: null,
      themeColor: primary,
    };
  }

  if (themeSource === 'client') {
    const palette = (websitePalette ?? []).map(normHex).filter(Boolean).slice(0, 4);
    return {
      themeSource: 'client',
      website: websiteUrl || '',
      theme_scraped: palette.length > 0,
      palette,
      combinedScheme:
        websiteCombinedScheme ?? (palette.length > 0 ? buildCombinedPaletteScheme(palette) : null),
      logoCandidates: Array.isArray(logoCandidates) ? logoCandidates : [],
      selectedLogoUrl: clientLogoUrl ?? null,
      themeColor: themeColor ?? palette[0] ?? null,
    };
  }

  return null;
}

export function hasPersistedProposalBrand(brand, websiteUrl) {
  const parsed = parseProposalBrandJson(brand);
  if (parsed?.themeSource === 'devx') return false;
  if (!parsed?.theme_scraped || !parsed.palette?.length) return false;
  const saved = String(parsed.website || '')
    .trim()
    .replace(/\/$/, '');
  const current = String(websiteUrl || '')
    .trim()
    .replace(/\/$/, '');
  if (!saved || !current) return false;
  return (
    saved === current || saved.replace(/^https?:\/\//, '') === current.replace(/^https?:\/\//, '')
  );
}

export async function saveCrmProposalBrand(name, brandJson) {
  if (!name || !brandJson) return null;
  const { data } = await apiClient.post(CRM_PROPOSAL_API.saveDeck, {
    proposal: name,
    brand_json: JSON.stringify(brandJson),
  });
  return unwrap({ data });
}

function normalizeTheme(data) {
  const palette = Array.isArray(data?.palette) ? data.palette : [];
  const primary = palette[0] || data?.color || data?.primary;
  const logo_candidates = Array.isArray(data?.logo_candidates)
    ? data.logo_candidates.filter((c) => c && c.url)
    : [];
  const clientLogoUrl = logo_candidates[0]?.url ?? data?.logo_url ?? null;
  return {
    ...data,
    palette,
    primary,
    color: data?.color ?? primary,
    theme_scraped: Boolean(data?.theme_scraped),
    logo_candidates,
    clientLogoUrl,
  };
}

export async function getCrmProposalTemplates() {
  const { data } = await apiClient.get(CRM_PROPOSAL_API.templates);
  const result = data?.message ?? data;
  return Array.isArray(result) ? result : [];
}

export async function getCrmProposalTemplate(templateName) {
  const { data } = await apiClient.get(CRM_PROPOSAL_API.template, {
    params: { template: templateName },
  });
  return unwrap({ data });
}

export async function fetchProposalTemplateSettings() {
  const { data } = await apiClient.get(CRM_PROPOSAL_API.settings);
  return unwrap({ data });
}

export async function createCrmProposal(payload) {
  const { data } = await apiClient.post(CRM_PROPOSAL_API.create, {
    payload: JSON.stringify(payload),
  });
  return unwrap({ data });
}

export async function listCrmProposals(options = {}) {
  const { crm_lead: crmLead, limit = 50, offset = 0 } = options;
  const params = { limit, offset };
  if (crmLead) params.crm_lead = crmLead;
  const { data } = await apiClient.get(CRM_PROPOSAL_API.listSummary, { params });
  const result = unwrap({ data });
  return Array.isArray(result) ? result : [];
}

export function getProposalFormatLabel(format) {
  return format === 'multi' ? 'Multipage' : 'Single Page';
}

export function normalizeCrmProposalListRow(row) {
  const proposalFormat = row.proposal_format ?? row.format ?? 'single';
  const salesOwnerRaw = row.sales_owner_name ?? row.sales_owner;
  const salesOwnerName =
    typeof salesOwnerRaw === 'object' && salesOwnerRaw !== null
      ? salesOwnerRaw.name || salesOwnerRaw.email || ''
      : salesOwnerRaw || '';
  return {
    id: row.name,
    proposal_title: row.proposal_title ?? '',
    crm_lead: row.crm_lead ?? '',
    lead_name: row.lead_name ?? '',
    lead_display_name: row.lead_display_name ?? row.lead_name ?? '',
    contact_name: row.contact_name ?? '',
    account: row.account ?? '',
    account_name: row.account_name ?? row.account ?? '',
    contact: row.contact ?? '',
    proposal_template: row.proposal_template ?? '',
    color_theme: row.color_theme ?? 'DevX',
    status: row.status ?? 'Draft',
    modified: row.modified ?? row.creation ?? '',
    creation: row.creation ?? '',
    proposal_date: row.proposal_date ?? '',
    valid_till: row.valid_till ?? '',
    proposal_format: proposalFormat,
    format_label: getProposalFormatLabel(proposalFormat),
    lead_req_seats: row.lead_req_seats ?? null,
    spaces: Array.isArray(row.spaces) ? row.spaces : [],
    inventory_count: row.inventory_count ?? (Array.isArray(row.spaces) ? row.spaces.length : 0),
    pipeline: row.pipeline ?? '',
    pipeline_label: row.pipeline_label ?? '',
    pipeline_color: row.pipeline_color ?? '',
    lifecycle_stage: row.lifecycle_stage ?? '',
    lifecycle_stage_label: row.lifecycle_stage_label ?? '',
    lifecycle_stage_color: row.lifecycle_stage_color ?? '',
    life_cycle_stage_status: row.life_cycle_stage_status ?? '',
    life_cycle_stage_status_label: row.life_cycle_stage_status_label ?? '',
    life_cycle_stage_status_color: row.life_cycle_stage_status_color ?? '',
    sales_owner_name: salesOwnerName,
    proposal_amount: row.proposal_amount ?? null,
    validity_status: row.validity_status ?? deriveProposalValidityStatus(row.valid_till),
  };
}

export async function deleteCrmProposal(name) {
  if (!name) throw new Error('Proposal id is required.');
  const { data } = await apiClient.delete(`/resource/CRM Proposal/${encodeURIComponent(name)}`);
  return data?.data ?? data;
}

export async function getCrmProposal(name) {
  if (!name) return null;
  try {
    const { data } = await apiClient.get(CRM_PROPOSAL_API.get, {
      params: { proposal: name },
    });
    const doc = unwrap({ data });
    return doc ? normalizeCrmProposalDocument(doc) : null;
  } catch {
    const { data } = await apiClient.get(`/resource/CRM Proposal/${encodeURIComponent(name)}`);
    const doc = data?.data ?? data;
    return doc ? normalizeCrmProposalDocument(doc) : null;
  }
}

export async function updateCrmProposal(name, fields) {
  const { data } = await apiClient.put(
    `/resource/CRM Proposal/${encodeURIComponent(name)}`,
    fields,
  );
  const doc = data?.data ?? data;
  return doc ? normalizeCrmProposalDocument(doc) : null;
}

export async function saveCrmProposalDeck(name, deckPayload, meta = {}) {
  const proposalFields = {};
  if (meta.proposal_template) proposalFields.proposal_template = meta.proposal_template;
  if (meta.color_theme) proposalFields.color_theme = meta.color_theme;
  if (meta.website_url !== undefined) proposalFields.website_url = meta.website_url;
  if (Object.keys(proposalFields).length > 0) {
    await updateCrmProposal(name, proposalFields);
  }
  const { data } = await apiClient.post(CRM_PROPOSAL_API.saveDeck, {
    proposal: name,
    deck_json: typeof deckPayload === 'string' ? deckPayload : JSON.stringify(deckPayload),
    deck_schema_version: deckPayload?.deck_schema_version ?? 1,
    ...(meta.color_theme ? { color_theme: meta.color_theme } : {}),
    ...(meta.brand_json !== undefined
      ? { brand_json: meta.brand_json ? JSON.stringify(meta.brand_json) : null }
      : {}),
  });
  return unwrap({ data });
}

export async function listCrmProposalVersions(proposalName) {
  if (!proposalName) return [];
  const { data } = await apiClient.get(CRM_PROPOSAL_API.listVersions, {
    params: { proposal: proposalName },
  });
  const result = unwrap({ data });
  return Array.isArray(result) ? result : [];
}

export async function getCrmProposalVersion(versionName) {
  if (!versionName) return null;
  const { data } = await apiClient.get(CRM_PROPOSAL_API.getVersion, {
    params: { version: versionName },
  });
  return unwrap({ data });
}

export async function restoreCrmProposalVersion(proposalName, versionName) {
  if (!proposalName || !versionName) return null;
  const { data } = await apiClient.post(CRM_PROPOSAL_API.restoreVersion, {
    proposal: proposalName,
    version: versionName,
  });
  return unwrap({ data });
}

export async function prefetchClientBrandFromWebsite(websiteUrl) {
  const themeData = normalizeTheme(await getProposalThemeFromWebsiteAi(websiteUrl));
  const palette = themeData.palette.map(normHex).filter(Boolean).slice(0, 4);
  if (!themeData.theme_scraped || palette.length === 0) {
    return {
      website: websiteUrl,
      theme_scraped: false,
      palette: [],
      primary: null,
      combinedScheme: null,
      clientLogoUrl: null,
    };
  }
  let combinedScheme = buildCombinedPaletteScheme(palette);
  try {
    const pres = await getProposalPresentationThemeAi({ anchors: palette });
    combinedScheme = pres?.combined_scheme || pres?.combinedScheme || combinedScheme;
  } catch {
    /* use local fallback */
  }
  return {
    website: websiteUrl,
    theme_scraped: true,
    palette,
    primary: palette[0],
    combinedScheme,
    clientLogoUrl: themeData.clientLogoUrl,
    logoCandidates: themeData.logo_candidates,
  };
}

function applyCoverBrandToDeck(deck, brand) {
  if (!brand) return null;

  if (brand.palette?.length) deck.brandPalette = brand.palette;
  if (brand.combinedScheme) deck.brandCombinedScheme = brand.combinedScheme;

  return buildProposalBrandJson({
    websiteUrl: brand.website,
    themeSource: 'client',
    websitePalette: brand.palette,
    websiteCombinedScheme: brand.combinedScheme,
    logoCandidates: brand.logoCandidates,
    clientLogoUrl: brand.clientLogoUrl,
    themeColor: brand.primary,
  });
}

export async function applyClientBrandToProposalDeck(proposalName, brand) {
  if (!proposalName || !brand) return null;
  const doc = await getCrmProposal(proposalName);
  if (!doc) throw new Error('Proposal not found.');
  const deck = buildInitialDeckState(stripLegacyDeckFields(doc.deck_json));
  const brandJson = applyCoverBrandToDeck(deck, brand);
  if (!brandJson) return null;
  await saveCrmProposalDeck(proposalName, buildDeckSavePayload(deck), { brand_json: brandJson });
  return deck;
}

export async function getProposalThemeFromWebsite(websiteUrl) {
  return normalizeTheme(await getProposalThemeFromWebsiteAi(websiteUrl));
}

export async function getProposalPresentationTheme(payload) {
  const anchors = payload?.anchors ?? payload?.palette ?? [];
  return getProposalPresentationThemeAi({ anchors });
}

export function normalizeCrmProposalDocument(doc) {
  const inventory = Array.isArray(doc.inventory)
    ? doc.inventory
    : Array.isArray(doc.items)
      ? doc.items
      : [];
  let deckJson = doc.deck_json ?? null;
  if (typeof deckJson === 'string' && deckJson.trim()) {
    try {
      deckJson = JSON.parse(deckJson);
    } catch {
      deckJson = null;
    }
  }
  const brandJson = parseProposalBrandJson(doc.brand_json);
  return {
    name: doc.name,
    proposal_title: doc.proposal_title ?? '',
    description: doc.description ?? '',
    crm_lead: doc.crm_lead ?? '',
    account: doc.account ?? '',
    account_name: doc.account_name ?? '',
    contact: doc.contact ?? '',
    proposal_date: doc.proposal_date ?? '',
    valid_till: doc.valid_till ?? '',
    proposal_template: doc.proposal_template ?? '',
    color_theme: doc.color_theme ?? 'DevX',
    website_url: doc.website_url ?? '',
    status: doc.status ?? 'Draft',
    deck_json: deckJson,
    deck_schema_version: doc.deck_schema_version ?? 1,
    brand_json: brandJson,
    inventory,
  };
}
