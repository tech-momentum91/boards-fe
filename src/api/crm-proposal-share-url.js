/**
 * Pure helpers for CRM proposal public share URLs (no axios — safe for Jest).
 */

export function buildPublicProposalSharePath(proposalName, token) {
  return `/public/proposal/${encodeURIComponent(proposalName)}?key=${encodeURIComponent(token)}`;
}

/**
 * Public share URLs must use the SPA origin (e.g. :5173), never the Frappe/API host.
 */
export function buildPublicProposalShareUrl(proposalName, token, origin) {
  const frontendOrigin = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (!frontendOrigin || !proposalName || !token) {
    return buildPublicProposalSharePath(proposalName || '', token || '');
  }
  return `${frontendOrigin.replace(/\/$/, '')}${buildPublicProposalSharePath(proposalName, token)}`;
}

/**
 * Resolve display/copy URL for a share-link API row (mirrors snag share behaviour).
 */
export function resolvePublicProposalShareUrl(shareLink, proposalName, origin) {
  if (!shareLink) return '';

  const frontendOrigin = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const token = String(shareLink.token || '').trim();
  const proposal = String(proposalName || shareLink.proposal || '').trim();

  if (frontendOrigin && token && proposal) {
    return buildPublicProposalShareUrl(proposal, token, frontendOrigin);
  }

  if (frontendOrigin && shareLink.path) {
    const path = String(shareLink.path).startsWith('/') ? shareLink.path : `/${shareLink.path}`;
    return `${frontendOrigin.replace(/\/$/, '')}${path}`;
  }

  return String(shareLink.url || '').trim();
}
