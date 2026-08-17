import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

/** devx_ai proposal LLM APIs */
export const CRM_PROPOSAL_AI_API = {
  themeFromWebsite: '/method/devx_ai.proposal.api.get_proposal_theme_from_website',
  presentationTheme: '/method/devx_ai.proposal.api.get_proposal_presentation_theme',
  chat: '/method/devx_ai.proposal.api.chat_edit_proposal',
};

function unwrap(response) {
  const result = response?.data;
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
  return result?.message ?? result;
}

export async function getProposalThemeFromWebsiteAi(websiteUrl) {
  const { data } = await apiClient.get(CRM_PROPOSAL_AI_API.themeFromWebsite, {
    params: { website: websiteUrl },
  });
  return unwrap({ data });
}

export async function getProposalPresentationThemeAi(payload) {
  const { data } = await apiClient.post(CRM_PROPOSAL_AI_API.presentationTheme, {
    payload: JSON.stringify(payload),
  });
  return unwrap({ data });
}

export async function chatEditProposal(payload) {
  const { data } = await apiClient.post(CRM_PROPOSAL_AI_API.chat, {
    payload: JSON.stringify(payload),
  });
  return unwrap({ data });
}
