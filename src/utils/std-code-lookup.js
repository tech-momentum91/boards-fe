/**
 * STD codes from `std-codes.json`, filtered by center state + city (India names).
 */

import { State } from 'country-state-city';

const LIMIT = 50;
const MAX_ALL_STD_OPTIONS = 4000;

const INDIAN_STATE_NAME_TO_ISO = new Map(
  State.getStatesOfCountry('IN').map((state) => [
    String(state?.name || '')
      .trim()
      .toLowerCase(),
    state?.isoCode,
  ]),
);

const LEGACY_STATE_NAME_TO_ISO = {
  orissa: 'OD',
  pondicherry: 'PY',
  uttaranchal: 'UK',
};

/**
 * Only states where telecom circle is NOT a direct ISO match.
 * For all others, default is [ISO] (e.g. GJ -> ['GJ']).
 */
const ISO_TELECOM_CODE_OVERRIDES = {
  AR: ['NE'],
  CH: ['PB', 'HA'],
  CT: ['MP'],
  DH: ['GJ'],
  DL: ['ND'],
  GA: ['MH'],
  HR: ['HA'],
  JH: ['BR'],
  KA: ['KT'],
  LA: ['JK'],
  LD: ['KL'],
  MH: ['MH', 'BY'],
  ML: ['NE'],
  MN: ['NE'],
  MZ: ['NE'],
  NL: ['NE'],
  OD: ['OR'],
  PY: ['TN'],
  SK: ['WB'],
  TN: ['TN', 'TN CHENGALPATTU'],
  TG: ['AP'],
  TR: ['NE'],
  UP: ['UPE', 'UPW'],
  UK: ['UPW'],
};

const UP_CITY_STD_OVERRIDES = {
  'GAUTAM BUDDHA NAGAR': [{ city: 'GAUTAM BUDDHA NAGAR', std: '120' }],
  'GAUTAM BUDH NAGAR': [{ city: 'GAUTAM BUDH NAGAR', std: '120' }],
  'GB NAGAR': [{ city: 'GAUTAM BUDDHA NAGAR', std: '120' }],
  NOIDA: [{ city: 'NOIDA', std: '120' }],
  'GREATER NOIDA': [{ city: 'GREATER NOIDA', std: '120' }],
  DADRI: [{ city: 'DADRI', std: '120' }],
  JEWAR: [{ city: 'JEWAR', std: '5738' }],
};

function norm(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .toUpperCase()
    .replaceAll(/[^\dA-Z]+/g, ' ')
    .trim();
}

function telecomCodesForState(stateName) {
  const key = String(stateName || '')
    .trim()
    .toLowerCase();
  if (!key) return [];
  const stateIso = INDIAN_STATE_NAME_TO_ISO.get(key) || LEGACY_STATE_NAME_TO_ISO[key];
  if (!stateIso) return [];
  return ISO_TELECOM_CODE_OVERRIDES[stateIso] || [stateIso];
}

/** Higher = closer match (full city substring > word hits). */
function cityMatchStrength(cityNorm, record) {
  const sdca = norm(record.sdca_name);
  const hay = `${norm(record.sdca_name)} ${norm(record.ldca_name)}`;
  if (!hay || !cityNorm) return 0;
  if (sdca === cityNorm) return 5;
  if (sdca.includes(cityNorm)) return 4;
  if (hay.includes(cityNorm)) return 3;
  let best = 0;
  for (const w of cityNorm.split(/\s+/)) {
    if (w.length >= 4 && hay.includes(w)) best = Math.max(best, 2);
    else if (w.length >= 3 && hay.includes(w)) best = Math.max(best, 1);
  }
  return best;
}

function toOption(record) {
  const stdDigits = String(record.std_code || '').replaceAll(/\D/g, '');
  if (!stdDigits) return null;
  const isMobile = Number(record?.is_mobile || 0) === 1;
  const area = isMobile
    ? [record.sdca_name || 'Mobile', record.ldca_name || 'All India'].join(' · ')
    : [record.sdca_name, record.ldca_name].filter(Boolean).join(' · ') || 'Area';
  return {
    optionKey: String(record.sl_no),
    std_code: stdDigits,
    label: `${isMobile ? `+${stdDigits}` : stdDigits} — ${area}`,
    sdca_name: record.sdca_name || '',
    ldca_name: record.ldca_name || '',
    state_code: record.state_code,
    is_mobile: isMobile ? 1 : 0,
  };
}

function inTelecomCircle(record, codes) {
  return codes.includes(record.state_code);
}

function uniqueStdOptions(options) {
  const map = new Map();
  for (const option of options) {
    if (!option?.std_code) continue;
    const key = option.is_mobile ? `mobile:${option.std_code}` : option.std_code;
    if (!map.has(key)) map.set(key, option);
  }
  return [...map.values()];
}

function buildUpCityOverrideOptions(cityNorm, telecomCodes) {
  if (!telecomCodes.includes('UPW')) return [];
  return (UP_CITY_STD_OVERRIDES[cityNorm] || []).map((entry) => ({
    optionKey: `up-override-${entry.std}-${norm(entry.city).replaceAll(' ', '-')}`,
    std_code: entry.std,
    label: `${entry.std} — ${entry.city} · GHAZIABAD`,
    sdca_name: entry.city,
    ldca_name: 'GHAZIABAD',
    state_code: 'UPW',
    is_mobile: 0,
  }));
}

/**
 * STD dropdown rows for a center’s state + city.
 * @returns {{ options: Array, telecomCodes: string[] }}
 */
export function buildStdCodeOptionsForLocation(records, stateName, cityName) {
  const rows = Array.isArray(records) ? records : [];
  const telecomCodes = telecomCodesForState(stateName);
  const cityNorm = norm((cityName || '').trim());
  const mobileOptions = rows
    .filter((r) => Number(r?.is_mobile || 0) === 1)
    .map(toOption)
    .filter(Boolean);

  if (telecomCodes.length === 0) {
    return { options: mobileOptions, telecomCodes };
  }

  const scored = [];
  if (cityNorm) {
    for (const record of rows) {
      if (!inTelecomCircle(record, telecomCodes)) continue;
      const strength = cityMatchStrength(cityNorm, record);
      if (!strength) continue;
      const opt = toOption(record);
      if (opt) scored.push({ opt, strength });
    }
  }

  scored.sort((a, b) =>
    b.strength !== a.strength
      ? b.strength - a.strength
      : norm(a.opt.sdca_name).localeCompare(norm(b.opt.sdca_name)),
  );

  const overridePicks = buildUpCityOverrideOptions(cityNorm, telecomCodes);
  const overrideCodes = new Set(overridePicks.map((option) => option.std_code));
  const cityPicks = scored
    .map((x) => x.opt)
    .filter((option) => !overrideCodes.has(option.std_code));
  const pickedKeys = new Set(cityPicks.map((option) => option.optionKey));
  const stateMatches = rows
    .filter((r) => inTelecomCircle(r, telecomCodes))
    .map(toOption)
    .filter((option) => option && !pickedKeys.has(option.optionKey))
    .sort((a, b) => norm(a.sdca_name).localeCompare(norm(b.sdca_name)));
  const includeAllStateCodes = telecomCodes.includes('UPW');
  const statePicks =
    includeAllStateCodes || (overridePicks.length === 0 && cityPicks.length === 0)
      ? stateMatches.slice(0, includeAllStateCodes ? stateMatches.length : LIMIT)
      : [];

  return {
    options: uniqueStdOptions([...mobileOptions, ...overridePicks, ...cityPicks, ...statePicks]),
    telecomCodes,
  };
}

/** Full STD list for dropdowns without a center location (e.g. Settings). */
export function buildAllStdCodeOptions(records) {
  const rows = Array.isArray(records) ? records : [];
  const options = [];
  for (const record of rows) {
    const opt = toOption(record);
    if (opt) options.push(opt);
    if (options.length >= MAX_ALL_STD_OPTIONS) break;
  }
  return options;
}
