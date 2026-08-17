import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import {
  buildPublicProposalSharePath,
  buildPublicProposalShareUrl,
  resolvePublicProposalShareUrl,
} from '@/api/crm-proposal-share-url';

export const CRM_PROPOSAL_SHARE_API = {
  create: '/method/devx.devx_crm.api.crm_proposal_share.create_proposal_share_link',
  list: '/method/devx.devx_crm.api.crm_proposal_share.list_proposal_share_links',
  disable: '/method/devx.devx_crm.api.crm_proposal_share.disable_proposal_share_link',
  updateExpiry: '/method/devx.devx_crm.api.crm_proposal_share.update_proposal_share_link_expiry',
  publicDeck: '/method/devx.devx_crm.api.crm_proposal_share.get_public_proposal_deck',
};

function unwrap({ data }) {
  return data?.message ?? data;
}

export async function createProposalShareLink(
  proposalName,
  { expiresOn = null, proposalVersion = null } = {},
) {
  const { data } = await apiClient.post(CRM_PROPOSAL_SHARE_API.create, {
    proposal: proposalName,
    ...(expiresOn ? { expires_on: expiresOn } : {}),
    ...(proposalVersion ? { proposal_version: proposalVersion } : {}),
  });
  return unwrap({ data });
}

export async function listProposalShareLinks(proposalName) {
  const { data } = await apiClient.get(CRM_PROPOSAL_SHARE_API.list, {
    params: { proposal: proposalName },
  });
  const result = unwrap({ data });
  return Array.isArray(result) ? result : [];
}

export async function disableProposalShareLink(linkName) {
  const { data } = await apiClient.post(CRM_PROPOSAL_SHARE_API.disable, { link: linkName });
  return unwrap({ data });
}

export async function updateProposalShareLinkExpiry(linkName, expiresOn = null) {
  const { data } = await apiClient.post(CRM_PROPOSAL_SHARE_API.updateExpiry, {
    link: linkName,
    expires_on: expiresOn,
  });
  return unwrap({ data });
}

export async function getPublicProposalDeck(proposalName, token) {
  const { data } = await apiClient.get(CRM_PROPOSAL_SHARE_API.publicDeck, {
    params: { proposal: proposalName, token },
  });
  return unwrap({ data });
}

export { buildPublicProposalSharePath, buildPublicProposalShareUrl, resolvePublicProposalShareUrl };

export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function formatShareLinkError(error) {
  return extractErrorMessage(error, 'Could not complete share link request.');
}
