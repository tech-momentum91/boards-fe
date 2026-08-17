import { City } from 'country-state-city';

const SEP = '\x1F';

/** Typing filter avoids mounting ~150k Radix Select items (browser freeze). */
const MIN_SEARCH_LEN = 2;
const MAX_SEARCH_RESULTS = 200;
/** Fallback scan cap when bigram bucket is missing (edge locales). */
const MAX_LINEAR_SCAN = 12000;

let cachedRows = null;
/** Map "ab" (first two letters of lowercased city name) → City rows — avoids scanning all ~150k rows each keystroke. */
let citiesByNameBigram = null;

function getCachedCityRows() {
  if (!cachedRows) {
    cachedRows = City.getAllCities();
  }
  return cachedRows;
}

function getCitiesByNameBigram() {
  if (!citiesByNameBigram) {
    citiesByNameBigram = new Map();
    const rows = getCachedCityRows();
    for (const row of rows) {
      const n = row.name.toLowerCase();
      if (n.length < 2) continue;
      const bg = n.slice(0, 2);
      let arr = citiesByNameBigram.get(bg);
      if (!arr) {
        arr = [];
        citiesByNameBigram.set(bg, arr);
      }
      arr.push(row);
    }
  }
  return citiesByNameBigram;
}

function rowToOption(c) {
  return {
    value: `${c.name}${SEP}${c.countryCode}${SEP}${c.stateCode}`,
    label: `${c.name}, ${c.stateCode}, ${c.countryCode}`,
  };
}

/**
 * Resolve a stored `city` field (composite or legacy plain text) to a select option.
 * @param {string} storedValue
 * @returns {{ value: string, label: string } | undefined}
 */
export function getKnowledgeCenterCityOptionForValue(storedValue) {
  if (!storedValue || typeof storedValue !== 'string') return undefined;
  const trimmed = storedValue.trim();
  if (!trimmed) return undefined;

  const rows = getCachedCityRows();
  const parts = trimmed.split(SEP);

  if (parts.length === 3) {
    const [name, countryCode, stateCode] = parts;
    const row = rows.find(
      (r) => r.name === name && r.countryCode === countryCode && r.stateCode === stateCode,
    );
    if (row) return rowToOption(row);
    return {
      value: trimmed,
      label: `${name}, ${stateCode}, ${countryCode}`,
    };
  }

  const lower = trimmed.toLowerCase();
  const row = rows.find((r) => r.name.toLowerCase() === lower);
  if (row) return rowToOption(row);
  return { value: trimmed, label: trimmed };
}

function collectMatchesFromRows(rows, q, out, seen) {
  const ql = q.toLowerCase();
  for (let i = 0; i < rows.length && out.length < MAX_SEARCH_RESULTS; i += 1) {
    const c = rows[i];
    const label = `${c.name}, ${c.stateCode}, ${c.countryCode}`;
    const opt = rowToOption(c);
    if (seen.has(opt.value)) continue;
    if (c.name.toLowerCase().includes(ql) || label.toLowerCase().includes(ql)) {
      seen.add(opt.value);
      out.push(opt);
    }
  }
}

/**
 * Options for the city dropdown: capped search over full dataset (never returns full world list).
 * @param {string} query
 * @param {string} [currentValue] — kept visible when query is too short / empty.
 */
export function searchKnowledgeCenterCityOptions(query, currentValue) {
  const qRaw = query.trim();
  const q = qRaw.toLowerCase();
  const currentOpt = getKnowledgeCenterCityOptionForValue(currentValue);

  if (qRaw.length === 0) {
    return currentOpt ? [currentOpt] : [];
  }

  if (qRaw.length < MIN_SEARCH_LEN) {
    return [];
  }

  const out = [];
  const seen = new Set();

  if (currentOpt) {
    seen.add(currentOpt.value);
    out.push(currentOpt);
  }

  const bigram = q.slice(0, 2);
  const bucket = getCitiesByNameBigram().get(bigram);

  if (bucket && bucket.length > 0) {
    collectMatchesFromRows(bucket, q, out, seen);
  } else {
    const rows = getCachedCityRows();
    const slice = rows.length > MAX_LINEAR_SCAN ? rows.slice(0, MAX_LINEAR_SCAN) : rows;
    collectMatchesFromRows(slice, q, out, seen);
  }

  return out;
}

export const KNOWLEDGE_CENTER_CITY_MIN_SEARCH_LEN = MIN_SEARCH_LEN;
