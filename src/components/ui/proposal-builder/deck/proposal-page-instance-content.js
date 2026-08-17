import { resolveProposalTemplateContent } from '@/components/ui/proposal-builder/proposal-template/apply-city-center-template-content';
import {
  resolveCenterId,
  resolveCityKey,
  resolveInventoryCenter,
  resolveInventoryId,
} from '@/components/ui/proposal-builder/deck/inventory-center-utils';
import { buildInventoryHydrationContext } from '@/components/ui/proposal-builder/deck/hydrate-context';
import { flattenPagePlan } from '@/components/ui/proposal-builder/deck/proposal-page-plan';

const UNKNOWN_CITY_KEY = 'unknown-city';
const UNKNOWN_CENTER_KEY = 'unknown-center';
const BOUND_TEMPLATE_KEYS = new Set(['page3', 'page4', 'page5', 'page6']);

function resolveCityKeyFromRow(row) {
  const center = resolveInventoryCenter(row);
  return resolveCityKey(center, UNKNOWN_CITY_KEY);
}

function buildInstanceContext(instance, proposal, inventory, totalSeats) {
  if (!instance) {
    return buildInventoryHydrationContext(proposal, {}, { seats: totalSeats });
  }

  const rows = resolvePageInstanceInventory(instance, inventory);
  // Bound pages must use matched rows only — never fall back to inventory[0].
  const source = rows[0] ?? {};
  return buildInventoryHydrationContext(proposal, source, { seats: totalSeats });
}

function applyInstanceTemplateContent(baseContent, context) {
  return resolveProposalTemplateContent(baseContent, context, { hydrateTokens: true });
}

export function resolvePageInstanceInventory(instance, inventory = []) {
  if (!instance || !Array.isArray(inventory)) return [];
  const binding = instance.binding ?? {};

  if (instance.templateKey === 'page6') {
    return inventory.filter((row, index) => resolveInventoryId(row, index) === binding.inventoryId);
  }

  if (instance.templateKey === 'page4' || instance.templateKey === 'page5') {
    return inventory.filter((row) => resolveCenterId(row) === binding.centerId);
  }

  if (instance.templateKey === 'page3') {
    return inventory.filter((row) => resolveCityKeyFromRow(row) === binding.cityId);
  }

  return inventory;
}

export function buildPageInstanceContent(pagePlan, proposal, baseContent = null, options = {}) {
  const inventory = Array.isArray(proposal?.inventory) ? proposal.inventory : [];
  const totalSeats = inventory.reduce((sum, row) => sum + (Number(row?.lead_req_seats) || 0), 0);
  const contentByInstanceId = {};
  const warnings = [];

  const instances = flattenPagePlan(pagePlan);
  instances.forEach((instance) => {
    if (!instance?.id || !instance?.templateKey) return;
    const rows = resolvePageInstanceInventory(instance, inventory);
    if (
      options.includeWarnings &&
      instance?.id &&
      BOUND_TEMPLATE_KEYS.has(instance.templateKey) &&
      rows.length === 0
    ) {
      warnings.push({
        type: 'missing-inventory-binding',
        instanceId: instance.id,
        templateKey: instance.templateKey,
        binding: instance.binding ?? {},
      });
    }
    const context = buildInstanceContext(instance, proposal, inventory, totalSeats);
    const hydrated = applyInstanceTemplateContent(baseContent, context);
    if (hydrated?.[instance.templateKey]) {
      contentByInstanceId[instance.id] = hydrated[instance.templateKey];
    }
  });

  return options.includeWarnings ? { contentByInstanceId, warnings } : contentByInstanceId;
}
