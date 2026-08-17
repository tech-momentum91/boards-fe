import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

/**
 * AI layout analysis — inventory summary for a saved Layout document.
 * @param {{ layout: string, signal?: AbortSignal }} params
 * @returns {Promise<object>} Parsed `message` payload from the API
 */
export async function analyzeLayout({ layout, signal }) {
  try {
    const response = await apiClient.post(
      '/method/devx.layouts.api.api_layout_analyze.layout_analyze',
      { layout },
      signal ? { signal } : undefined,
    );
    return response?.data?.message ?? response?.data;
  } catch (error) {
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      throw error;
    }
    const msg = extractErrorMessage(error, 'Failed to analyze layout');
    throw new Error(msg);
  }
}
