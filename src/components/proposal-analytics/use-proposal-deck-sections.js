import { useEffect, useState } from 'react';

import { getCrmProposal } from '@/api/crmProposals';
import { resolvePublicProposalDeck } from '@/components/ui/proposal-builder/deck/public-proposal-deck';
import { PROPOSAL_TEMPLATE_PAGES } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

const PAGE_KEY_TO_LABEL = Object.fromEntries(PROPOSAL_TEMPLATE_PAGES.map((p) => [p.key, p.label]));
const PAGE_ID_TO_LABEL = Object.fromEntries(
  PROPOSAL_TEMPLATE_PAGES.map((p) => [String(p.id), p.label]),
);

/**
 * Fetch the CRM Proposal's deck_json and return an ordered list of
 * `{ section_name }` objects for each enabled page in the deck.
 *
 * Used to scaffold the Sections chart with deck-defined pages even before
 * any section_enter events have been recorded for the proposal.
 */
export function useProposalDeckSections(proposalId) {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const id = String(proposalId || '').trim();
    if (!id) {
      setSections([]);
      return undefined;
    }

    let cancelled = false;

    getCrmProposal(id)
      .then((doc) => {
        if (cancelled || !doc) return;
        const resolved = resolvePublicProposalDeck(doc.deck_json);

        let names = [];
        if (resolved.mode === 'instance') {
          names = (resolved.pageInstances ?? []).map((page) => {
            // Prefer the actual deck label ("National Presence - Ahmedabad",
            // "Floor Plan - The First - Floor A…") so the analytics section chart
            // mirrors the labels the viewer sees in the proposal.
            const baseKey = String(page.templateKey || '').replace(/_\d+$/, '');
            return (
              page.label || PAGE_KEY_TO_LABEL[baseKey] || PAGE_KEY_TO_LABEL[page.templateKey] || ''
            );
          });
        } else {
          names = (resolved.enabledPageIds ?? []).map(
            (pageId) => PAGE_ID_TO_LABEL[String(pageId)] || '',
          );
        }

        setSections(names.filter(Boolean).map((section_name) => ({ section_name })));
      })
      .catch(() => {
        // Non-critical: silently ignore – deck sections are a display scaffold only.
      });

    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  return sections;
}
