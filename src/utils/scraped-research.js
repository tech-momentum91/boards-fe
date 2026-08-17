import { getStoredScrapedProfile } from '@/services/scraper-service';

/** Whether an account payload includes stored scrape/research JSON. */
export function hasScrapedResearchData(account) {
  const content = account?.scrapped_content;
  return Boolean(
    content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    Object.keys(content).length > 0,
  );
}

/** Merge scrape API result into an account/client object for immediate UI refresh. */
export function mergeScrapedContentIntoAccount(account, scrapeResult) {
  const profile = scrapeResult?.data;
  if (!account || !profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return account;
  }
  return { ...account, scrapped_content: profile };
}

/**
 * Load stored scrape profile from devx_ai and attach to an account payload.
 * Keeps scraper read logic out of devx APIs.
 */
export async function enrichWithScrapedProfile(account, entityId, entityDoctype = 'Customer') {
  if (!account || !entityId) return account;

  try {
    const profile = await getStoredScrapedProfile({ entityId, entityDoctype });
    if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
      return { ...account, scrapped_content: profile };
    }
  } catch {
    // No stored profile yet — keep account as-is with empty research payload.
  }

  return { ...account, scrapped_content: {} };
}

export const ACCOUNT_RESEARCH_SIDEBAR_ITEMS = [
  { key: 'company-foundation', label: 'Company Foundation' },
  { key: 'market-position-offerings', label: 'Market Position & Offering' },
  { key: 'digital-presence-signal', label: 'Digital Presence & Signal' },
  { key: 'financial-investment-performance', label: 'Financial Investment & Performance' },
];

export const ACCOUNT_RESEARCH_SIDEBAR_KEYS = ACCOUNT_RESEARCH_SIDEBAR_ITEMS.map((item) => item.key);
