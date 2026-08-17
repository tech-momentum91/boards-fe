import apiClient from '@/api/axios';

/**
 * Posts a message to the DevX AI chatbot orchestrator (chat / update agents).
 * Chart building is handled by the Chatbot module via chatbot-chart-service.js;
 * this is used for general Q&A and update confirmations.
 *
 * @param {{ query: string, sessionId?: string | null, confirmToken?: string | null }} params
 * @returns {Promise<object>} Parsed `message` payload from Frappe (`session_id`, `response`, etc.)
 */
export async function postDevxAiChat({ query, sessionId = null, confirmToken = null }) {
  const form = new FormData();
  form.append('query', query);
  if (sessionId) {
    form.append('session_id', sessionId);
  }
  if (confirmToken) {
    form.append('confirm_token', confirmToken);
  }

  const { data } = await apiClient.post('/method/devx_ai.chatbot.api.endpoints.chat', form);
  return data?.message ?? data;
}
