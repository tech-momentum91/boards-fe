/**
 * Resolve page 3 city and page 4 center registry keys from CRM hydration context.
 * City keys match `normalizeRegistryKey(CRM city name)` — no aliases.
 */

import {
  getProposalCenterRegistry,
  getProposalCityRegistry,
} from '@/components/ui/proposal-builder/proposal-template/proposal-template-settings';

let lastCityRegistry = null;
let cachedCityKeys = null;
let lastCenterRegistry = null;
let cachedCenterAbbrs = null;

function knownCityKeys() {
  const registry = getProposalCityRegistry();
  if (registry !== lastCityRegistry) {
    lastCityRegistry = registry;
    cachedCityKeys = new Set(Object.keys(registry ?? {}));
  }
  return cachedCityKeys ?? new Set();
}

function knownCenterAbbrs() {
  const registry = getProposalCenterRegistry();
  if (registry !== lastCenterRegistry) {
    lastCenterRegistry = registry;
    cachedCenterAbbrs = new Set(Object.keys(registry ?? {}));
  }
  return cachedCenterAbbrs ?? new Set();
}

const CITY_CANDIDATE_FIELDS = ['city', 'city_name', 'cityName'];

export function normalizeRegistryKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('&', 'and')
    .replaceAll(/[^\da-z]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function normalizeCenterAbbr(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function pickCandidates(source, fields) {
  return fields
    .map((field) => ({
      field,
      raw: source[field],
      normalized: normalizeRegistryKey(source[field]),
    }))
    .filter(({ raw }) => String(raw ?? '').trim());
}

function resolveCityMatch(source = {}) {
  const candidates = pickCandidates(source, CITY_CANDIDATE_FIELDS);
  const keys = knownCityKeys();

  for (const candidate of candidates) {
    if (keys.has(candidate.normalized)) {
      return candidate.normalized;
    }
  }

  return null;
}

function resolveCenterMatch(source = {}) {
  const abbr = normalizeCenterAbbr(source.center_abbr);
  const keys = knownCenterAbbrs();
  return abbr && keys.has(abbr) ? abbr : null;
}

export function resolveCityRegistryKey(source = {}) {
  return resolveCityMatch(source);
}

export function resolveCenterRegistryKey(source = {}) {
  return resolveCenterMatch(source);
}
