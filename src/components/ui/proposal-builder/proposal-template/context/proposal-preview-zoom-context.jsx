import { createContext, useContext } from 'react';

/**
 * Stable deck context — pages subscribe here.
 * Must NOT change on zoom %, scroll, or current-page updates, or the whole
 * proposal deck re-renders (and floor-plan hooks re-fetch).
 */
export const ProposalPreviewDeckContext = createContext(null);

/**
 * Volatile chrome context — zoom bar / page indicator only.
 */
export const ProposalPreviewChromeContext = createContext(null);

/** @deprecated Prefer ProposalPreviewDeckContext for page content. */
export const ProposalPreviewZoomContext = ProposalPreviewDeckContext;

export function useProposalPreviewDeckContext() {
  return useContext(ProposalPreviewDeckContext);
}

export function useProposalPreviewChromeContext() {
  return useContext(ProposalPreviewChromeContext);
}

/** Pages should use this (deck-only). Kept for existing imports. */
export function useProposalPreviewZoomContext() {
  return useContext(ProposalPreviewDeckContext);
}
