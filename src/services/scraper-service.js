import apiClient from '@/api/axios';

function unwrapFrappeMessage(data) {
  return data?.message ?? data;
}

function scrapeSuccessMessage(result) {
  if (result?.source === 'cache') return 'Scraped data already exists';
  if (result?.source === 'scrape') return 'Scraped data stored successfully';
  return 'Data fetched and updated successfully';
}

/**
 * Fetch stored scrape profile for an account entity.
 * @param {{ entityId: string, entityDoctype?: string }} params
 */
export async function getStoredScrapedProfile({ entityId, entityDoctype = 'Customer' }) {
  const response = await apiClient.post('/method/devx_ai.scraper.api.get_client_scraped_profile', {
    client_id: entityId,
    entity_doctype: entityDoctype,
  });
  const result = unwrapFrappeMessage(response.data);
  if (result?.success === false) {
    return null;
  }
  return result?.data ?? null;
}

/**
 * Scrape account website via devx_ai scraper and store in Client Scrapped Data.
 * @param {{ entityId: string, entityDoctype?: string, forceRefresh?: boolean }} params
 */
export async function scrapeAndStoreAccountData({
  entityId,
  entityDoctype = 'Customer',
  forceRefresh = false,
}) {
  const response = await apiClient.post(
    '/method/devx_ai.scraper.api.scrape_and_store_client_data',
    {
      client_id: entityId,
      entity_doctype: entityDoctype,
      force_refresh: forceRefresh,
    },
  );
  const result = unwrapFrappeMessage(response.data);
  if (result?.success === false) {
    const error = new Error(result?.error || 'Failed to fetch data');
    error.serialized = result;
    throw error;
  }
  return { ...result, message: scrapeSuccessMessage(result) };
}
