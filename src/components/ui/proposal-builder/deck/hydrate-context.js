import { resolveInventoryCenter } from '@/components/ui/proposal-builder/deck/inventory-center-utils';
import { normalizeWebsiteUrl } from '@/utils/url-utils';

// Local title-case copy to keep deck helpers pure; `@/lib/utils` pulls `import.meta.env` in Jest.
function capitalizeEachWordFirstLetter(value) {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatProposalTitleCase(value) {
  const text = String(value ?? '').trim();
  return text ? capitalizeEachWordFirstLetter(text) : '';
}

/**
 * Maps CRM Proposal + inventory into placeholder vars for template hydration.
 * City from inventory → Center → city; center name/abbr from the same Center record.
 * @param {Object} proposal
 * @returns {Record<string, string|number>}
 */
export function buildInventoryHydrationContext(proposal, inventoryRow = {}, options = {}) {
  const center = resolveInventoryCenter(inventoryRow);
  const seats = options.seats ?? 0;
  const title = String(proposal?.proposal_title ?? '').trim();
  const client = title || String(proposal?.account ?? 'Client').trim();
  const clientBrandName = String(
    proposal?.account_name ?? proposal?.proposal_title ?? client,
  ).trim();

  const city = formatProposalTitleCase(center.city) || 'Bengaluru';
  const centerName = formatProposalTitleCase(center.center_name) || city;
  const centerAbbr = String(center.center_abbr || '')
    .trim()
    .toUpperCase();

  return {
    client,
    clientBrandName,
    proposal_title: title,
    city,
    city_name: city,
    center_abbr: centerAbbr,
    center: centerName,
    centerName,
    center_name: centerName,
    center_id: center.id || '',
    seats: seats || inventoryRow.lead_req_seats || '—',
    area: inventoryRow.area || '—',
    website: normalizeWebsiteUrl(proposal?.website_url) || '',
    color_theme: proposal?.color_theme ?? 'DevX',
    crm_lead: proposal?.crm_lead ?? '',
    account: proposal?.account ?? '',
    contact: proposal?.contact ?? '',
  };
}

export function buildHydrationContext(proposal) {
  const inventory = Array.isArray(proposal?.inventory) ? proposal.inventory : [];
  const first = inventory[0] ?? {};
  const seats = inventory.reduce((sum, row) => sum + (Number(row.lead_req_seats) || 0), 0);

  return buildInventoryHydrationContext(proposal, first, { seats });
}
