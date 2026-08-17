import { stripLegacyDeckFields } from '@/components/ui/proposal-builder/deck/build-initial-deck-state';
import { getEnabledPagesInOrder } from '@/components/ui/proposal-builder/deck/proposal-page-order';
import { flattenPagePlan } from '@/components/ui/proposal-builder/deck/proposal-page-plan';

function hasPagePlan(deck) {
  return Boolean(deck?.pagePlan && typeof deck.pagePlan === 'object');
}

function hasInstanceContent(deck) {
  return Boolean(deck?.contentByInstanceId && typeof deck.contentByInstanceId === 'object');
}

export function resolvePublicProposalDeck(deckJson) {
  const deck = stripLegacyDeckFields(deckJson) ?? {};

  // Require both pagePlan and contentByInstanceId for instance mode. A partial
  // schema-v3 payload falls back to legacy rendering instead of blank pages.
  if (hasPagePlan(deck) && hasInstanceContent(deck)) {
    return {
      mode: 'instance',
      pageInstances: flattenPagePlan(deck.pagePlan, { enabledOnly: true }),
      contentByInstanceId: deck.contentByInstanceId,
    };
  }

  return {
    mode: 'legacy',
    enabledPageIds: getEnabledPagesInOrder(deck.pagesState, deck.pageOrder),
  };
}
