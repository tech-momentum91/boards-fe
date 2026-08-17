import {
  buildDefaultPagesState,
  DEFAULT_TEMPLATE_PAGE_IDS,
  normalizePageOrder,
} from '@/components/ui/proposal-builder/deck/proposal-page-order';
import { flattenPagePlan } from '@/components/ui/proposal-builder/deck/proposal-page-plan';
import { buildPageInstanceContent } from '@/components/ui/proposal-builder/deck/proposal-page-instance-content';
import { resolveProposalTemplateContent } from '@/components/ui/proposal-builder/proposal-template/apply-city-center-template-content';

/** Legacy deck keys dropped on load/save (old slide/block builder). */
const LEGACY_DECK_KEYS = new Set([
  'sectionsState',
  'deckSlideOrder',
  'sectionGroupOrder',
  'customContent',
  'addedSlides',
  'activeTab',
  'activeSlideId',
  'presentationOpen',
]);

const DECK_SCHEMA_VERSION_V2 = 2;
const DECK_SCHEMA_VERSION_V3 = 3;

function isSchemaV3Deck(savedDeck) {
  if (!savedDeck || typeof savedDeck !== 'object') return false;
  const version = Number(savedDeck.deck_schema_version ?? 0);
  // Do not treat a string activePageId alone as v3 — legacy decks may store "2".
  return (
    version >= DECK_SCHEMA_VERSION_V3 ||
    Boolean(savedDeck.pagePlan) ||
    Boolean(savedDeck.contentByInstanceId)
  );
}

function assertSchemaV3Deck(savedDeck) {
  const version = Number(savedDeck.deck_schema_version ?? 0);
  if (version < DECK_SCHEMA_VERSION_V3) {
    throw new Error('Invalid deck_json: missing schema v3 version');
  }
  if (!savedDeck.pagePlan || typeof savedDeck.pagePlan !== 'object') {
    throw new Error('Invalid deck_json: missing pagePlan');
  }
  if (!savedDeck.contentByInstanceId || typeof savedDeck.contentByInstanceId !== 'object') {
    throw new Error('Invalid deck_json: missing contentByInstanceId');
  }
  if (typeof savedDeck.activePageId !== 'string' || !savedDeck.activePageId) {
    throw new Error('Invalid deck_json: missing activePageId');
  }
}

function isEmptyInstanceContent(content) {
  return (
    content == null ||
    (typeof content === 'object' && !Array.isArray(content) && Object.keys(content).length === 0)
  );
}

/**
 * Rebuild missing/empty per-instance content (city/center overlays + token hydration).
 * Preserves any non-empty saved instance content the user already edited.
 */
function resolveContentByInstanceId(pagePlan, proposal, savedContent, baseContent) {
  const saved = savedContent && typeof savedContent === 'object' ? savedContent : {};
  const instances = flattenPagePlan(pagePlan);
  const needsRebuild =
    Boolean(proposal) &&
    instances.some((instance) => instance?.id && isEmptyInstanceContent(saved[instance.id]));

  if (!needsRebuild) {
    return { contentByInstanceId: saved, warnings: [] };
  }

  const { contentByInstanceId: built, warnings } = buildPageInstanceContent(
    pagePlan,
    proposal,
    baseContent,
    { includeWarnings: true },
  );

  const contentByInstanceId = { ...built };
  Object.entries(saved).forEach(([instanceId, content]) => {
    if (!isEmptyInstanceContent(content)) {
      contentByInstanceId[instanceId] = content;
    }
  });

  return { contentByInstanceId, warnings };
}

/**
 * Load a persisted deck into builder state.
 * Schema-v3 `pagePlan` is built only on the backend at create time.
 *
 * @param {Object|null} savedDeck
 * @param {{
 *   hydrationContext?: Record<string, unknown>,
 *   forceHydrate?: boolean,
 *   proposal?: Record<string, unknown>
 * }|null} options
 */
export function buildInitialDeckState(savedDeck = null, options = {}) {
  const pagesState = {
    ...buildDefaultPagesState(),
    ...savedDeck?.pagesState,
  };

  const pageOrder = normalizePageOrder(savedDeck?.pageOrder ?? DEFAULT_TEMPLATE_PAGE_IDS);

  const legacyActivePageId =
    savedDeck?.activePageId ??
    pageOrder.find((id) => pagesState[id]) ??
    DEFAULT_TEMPLATE_PAGE_IDS[0] ??
    1;

  const templateContent = resolveProposalTemplateContent(
    savedDeck?.templateContent,
    options.hydrationContext,
    {
      hydrateTokens: options.hydrationContext ? (options.forceHydrate ? true : 'auto') : false,
    },
  );

  const baseState = {
    deck_schema_version: savedDeck?.deck_schema_version ?? DECK_SCHEMA_VERSION_V2,
    pagesState,
    pageOrder,
    templateContent,
    brandPalette: savedDeck?.brandPalette ?? [],
    brandCombinedScheme: savedDeck?.brandCombinedScheme ?? null,
    activePageId: legacyActivePageId,
    previewMode: savedDeck?.previewMode ?? 'web',
    deckLocked: Boolean(savedDeck?.deckLocked),
    warnings: savedDeck?.warnings ?? [],
  };

  if (isSchemaV3Deck(savedDeck)) {
    assertSchemaV3Deck(savedDeck);
    const { contentByInstanceId, warnings } = resolveContentByInstanceId(
      savedDeck.pagePlan,
      options.proposal,
      savedDeck.contentByInstanceId,
      savedDeck.templateContent ?? null,
    );
    return {
      ...baseState,
      deck_schema_version: Number(savedDeck.deck_schema_version),
      pagePlan: savedDeck.pagePlan,
      contentByInstanceId,
      activePageId: savedDeck.activePageId,
      warnings: warnings.length > 0 ? warnings : baseState.warnings,
    };
  }

  return baseState;
}

export function buildDeckSavePayload(deckState) {
  const schemaVersion = deckState.deck_schema_version ?? DECK_SCHEMA_VERSION_V2;
  const hasValidSchemaV3Markers =
    Boolean(deckState.pagePlan) &&
    Boolean(deckState.contentByInstanceId) &&
    typeof deckState.activePageId === 'string' &&
    deckState.activePageId;
  const payload = {
    deck_schema_version: schemaVersion,
    pagesState: deckState.pagesState,
    pageOrder: deckState.pageOrder,
    templateContent: deckState.templateContent,
    brandPalette: deckState.brandPalette,
    brandCombinedScheme: deckState.brandCombinedScheme,
    activePageId: deckState.activePageId,
    previewMode: deckState.previewMode,
    deckLocked: deckState.deckLocked,
  };

  if (schemaVersion >= DECK_SCHEMA_VERSION_V3 || hasValidSchemaV3Markers) {
    payload.pagePlan = deckState.pagePlan;
    payload.contentByInstanceId = deckState.contentByInstanceId;
  }

  return payload;
}

/** Strip legacy slide/block fields from persisted deck_json before hydration. */
export function stripLegacyDeckFields(savedDeck = null) {
  if (!savedDeck || typeof savedDeck !== 'object') return savedDeck;
  const next = { ...savedDeck };
  LEGACY_DECK_KEYS.forEach((key) => {
    delete next[key];
  });
  return next;
}
