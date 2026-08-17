import { mergeProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import {
  resolveCenterRegistryKey,
  resolveCityRegistryKey,
} from '@/components/ui/proposal-builder/proposal-template/proposal-city-center-keys';
import {
  getProposalCenterRegistry,
  getProposalCityRegistry,
  getProposalTemplatePlaceholders,
} from '@/components/ui/proposal-builder/proposal-template/proposal-template-settings';

function getPlaceholderTokens() {
  const placeholders = getProposalTemplatePlaceholders();
  return placeholders && typeof placeholders === 'object' ? Object.values(placeholders) : [];
}

function deepMergePageContent(defaults, overlay) {
  if (!overlay) return defaults;
  const merged = { ...defaults, ...overlay };

  if (defaults?.aboutCity && overlay?.aboutCity) {
    merged.aboutCity = {
      ...defaults.aboutCity,
      ...overlay.aboutCity,
      stats: overlay.aboutCity.stats ?? defaults.aboutCity.stats,
    };
  }

  if (defaults?.neighbors && overlay?.neighbors) {
    merged.neighbors = {
      ...defaults.neighbors,
      ...overlay.neighbors,
      cards: overlay.neighbors.cards ?? defaults.neighbors.cards,
    };
  }

  if (defaults?.images && overlay?.images) {
    merged.images = { ...defaults.images, ...overlay.images };
  }

  if (Array.isArray(overlay?.assetStats)) {
    merged.assetStats = overlay.assetStats;
  }

  if (Array.isArray(overlay?.locationHighlights)) {
    merged.locationHighlights = overlay.locationHighlights;
  }

  if (overlay?.statsLayout) {
    merged.statsLayout = overlay.statsLayout;
  }

  return merged;
}

function deepMergePage5Content(defaults, overlay) {
  if (!overlay) return defaults;
  const merged = { ...defaults, ...overlay };

  if (defaults?.sections || overlay?.sections) {
    merged.sections = { ...defaults?.sections };
    for (const [sectionKey, sectionOverlay] of Object.entries(overlay.sections ?? {})) {
      merged.sections[sectionKey] = {
        ...defaults?.sections?.[sectionKey],
        ...sectionOverlay,
        images: sectionOverlay?.images
          ? { ...defaults?.sections?.[sectionKey]?.images, ...sectionOverlay.images }
          : defaults?.sections?.[sectionKey]?.images,
      };
    }
  }

  if (defaults?.images && overlay?.images) {
    merged.images = { ...defaults.images, ...overlay.images };
  }

  return merged;
}

function replacePlaceholderTokens(content, context) {
  const placeholders = getProposalTemplatePlaceholders();
  const clientBrandName = String(
    context.clientBrandName ?? context.client ?? context.proposal_title ?? 'Client',
  ).trim();
  const cityName = String(context.city ?? context.city_name ?? 'Bengaluru').trim();
  const centerName = String(
    context.center_name ?? context.centerName ?? context.center ?? cityName,
  ).trim();
  const replacements = [
    [placeholders?.CLIENT_BRAND, clientBrandName],
    [placeholders?.CLIENT_NAME, clientBrandName],
    [placeholders?.CITY_NAME, cityName],
    [placeholders?.CENTER_NAME, centerName],
    [placeholders?.ASSET_NAME, centerName],
  ];

  const walk = (node) => {
    if (typeof node === 'string') {
      let next = node;
      replacements.forEach(([from, to]) => {
        if (from && to) next = next.split(from).join(to);
      });
      return next;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([key, val]) => [key, walk(val)]));
    }
    return node;
  };

  return walk(content);
}

export function proposalTemplateNeedsPlaceholderHydration(content) {
  if (!content) return true;
  const json = JSON.stringify(content);
  const tokens = getPlaceholderTokens();
  return tokens.some((token) => token && json.includes(token));
}

/** Overlay page 3/4/5 from city/center registry using CRM inventory context. */
export function applyCityCenterTemplateContent(content, source = {}) {
  if (!content || typeof content !== 'object') return content;

  const cityRegistry = getProposalCityRegistry();
  const centerRegistry = getProposalCenterRegistry();
  const cityKey = resolveCityRegistryKey(source);
  const centerKey = resolveCenterRegistryKey(source);
  const cityEntry = cityKey ? cityRegistry?.[cityKey] : null;
  const centerEntry = centerKey ? centerRegistry?.[centerKey] : null;

  return {
    ...content,
    page3: cityEntry ? deepMergePageContent(content.page3, cityEntry.page3) : content.page3,
    page4: centerEntry ? deepMergePageContent(content.page4, centerEntry.page4) : content.page4,
    page5: centerEntry?.page5
      ? deepMergePage5Content(content.page5, centerEntry.page5)
      : content.page5,
  };
}

/**
 * Merge saved content with defaults, apply city/center registry, optionally replace Figma tokens.
 * @param {boolean|'auto'} [options.hydrateTokens] — true = always replace; 'auto' = only if tokens remain
 */
export function resolveProposalTemplateContent(
  saved = null,
  hydrationContext = null,
  { hydrateTokens = false } = {},
) {
  const merged = mergeProposalContent(saved);
  if (!hydrationContext || typeof hydrationContext !== 'object') {
    return merged;
  }

  let content = applyCityCenterTemplateContent(merged, hydrationContext);

  const shouldReplaceTokens =
    hydrateTokens === true ||
    (hydrateTokens === 'auto' && proposalTemplateNeedsPlaceholderHydration(content));

  if (shouldReplaceTokens) {
    content = replacePlaceholderTokens(content, hydrationContext);
  }

  return content;
}
