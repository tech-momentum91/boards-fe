/**
 * Session / persisted filter compaction: keep only meaningful dimensions so
 * sessionStorage stays small and defaults can be re-applied on read.
 *
 * @param {Record<string, unknown>} filters
 * @param {Record<string, unknown>} defaultFilters Shape + defaults for keys to evaluate
 * @param {{
 *   excludeKeys?: string[],
 *   includeKeys?: string[],
 *   truthyObjectKeys?: string[],
 *   numericKeys?: string[],
 *   positiveNumericKeys?: string[],
 *   positiveNumberStringKeys?: string[],
 *   scalarDiffKeys?: string[],
 *   trimStringArrayElements?: boolean,
 *   ignoreStringValuesByKey?: Record<string, string[]>,
 *   objectSubkeysTruthyKeys?: Record<string, string[]>,
 *   arrayOrStringDefaultEquivalence?: Record<string, string>,
 * }} [options]
 * @returns {Record<string, unknown>}
 */
export function compactFiltersForSessionStorage(filters, defaultFilters, options = {}) {
  if (!filters || typeof filters !== 'object') return {};
  if (!defaultFilters || typeof defaultFilters !== 'object') return {};

  const {
    excludeKeys = [],
    includeKeys,
    truthyObjectKeys = [],
    numericKeys = [],
    positiveNumericKeys = [],
    positiveNumberStringKeys = [],
    scalarDiffKeys = [],
    trimStringArrayElements = false,
    ignoreStringValuesByKey = {},
    objectSubkeysTruthyKeys = {},
    arrayOrStringDefaultEquivalence = {},
  } = options;

  const exclude = new Set(excludeKeys);
  const truthy = new Set(truthyObjectKeys);
  const numeric = new Set(numericKeys);
  const positiveNumeric = new Set(positiveNumericKeys);
  const positiveNumberString = new Set(positiveNumberStringKeys);
  const scalarDiff = new Set(scalarDiffKeys);
  const subkeysTruthy = objectSubkeysTruthyKeys;
  const arrayStringEquiv = arrayOrStringDefaultEquivalence;

  const keys =
    Array.isArray(includeKeys) && includeKeys.length > 0
      ? includeKeys
      : Object.keys(defaultFilters);

  const out = {};

  for (const key of keys) {
    if (exclude.has(key)) continue;

    const v = filters[key];
    const dv = defaultFilters[key];

    const defaultEq = arrayStringEquiv[key];
    if (defaultEq !== undefined) {
      const ds = String(defaultEq).toLowerCase();
      if (Array.isArray(v)) {
        let arr = v;
        if (trimStringArrayElements) {
          arr = v.map((x) => String(x).trim()).filter(Boolean);
        }
        const lowered = arr.map((s) => String(s).toLowerCase());
        const uniq = [...new Set(lowered)];
        const isDefault = uniq.length === 0 || (uniq.length === 1 && uniq[0] === ds);
        if (!isDefault) out[key] = arr;
        continue;
      }
      if (typeof v === 'string') {
        const t = v.trim();
        if (t === '') continue;
        const tl = t.toLowerCase();
        if (tl === 'all') continue;
        if (tl === ds) continue;
        out[key] = v;
        continue;
      }
      continue;
    }

    const subTruthy = subkeysTruthy[key];
    if (Array.isArray(subTruthy) && subTruthy.length > 0) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const any = subTruthy.some((sub) => {
          const part = v[sub];
          if (part == null) return false;
          if (part instanceof Date) return !Number.isNaN(part.getTime());
          if (typeof part === 'string') return part.trim() !== '';
          return true;
        });
        if (any) out[key] = v;
      }
      continue;
    }

    if (numeric.has(key)) {
      if (v === undefined || v === null || v === '') continue;
      const n = Number(v);
      if (!Number.isNaN(n)) out[key] = n;
      continue;
    }

    if (positiveNumeric.has(key)) {
      if (v === undefined || v === null || v === '') continue;
      const n = Number(v);
      if (!Number.isNaN(n) && n > 0) out[key] = n;
      continue;
    }

    if (positiveNumberString.has(key)) {
      if (v === undefined || v === null || v === '') continue;
      const s = String(v).trim();
      const n = Number(s);
      if (!Number.isNaN(n) && n > 0) out[key] = s;
      continue;
    }

    if (Array.isArray(v)) {
      let arr = v;
      if (trimStringArrayElements) {
        arr = v.map((x) => String(x).trim()).filter(Boolean);
      }
      if (arr.length > 0) out[key] = arr;
      continue;
    }

    if (typeof dv === 'boolean') {
      if (Boolean(v) !== Boolean(dv)) out[key] = v;
      continue;
    }

    if (scalarDiff.has(key)) {
      if (v === undefined || v === null) continue;
      if (String(v) !== String(dv)) out[key] = v;
      continue;
    }

    if (truthy.has(key)) {
      if (v === false) continue;
      if (v === null || v === undefined) continue;
      if (typeof v === 'string') {
        if (v.trim() === '') continue;
        const t = v.trim();
        const skipList = ignoreStringValuesByKey[key];
        if (Array.isArray(skipList) && skipList.includes(t)) continue;
        out[key] = v;
        continue;
      }
      if (typeof v === 'object' && !Array.isArray(v) && v) {
        out[key] = v;
      }
      continue;
    }

    if (v === null || v === undefined) {
      continue;
    }

    if (typeof v === 'string' && v.trim() !== '') {
      const t = v.trim();
      const skipList = ignoreStringValuesByKey[key];
      if (Array.isArray(skipList) && skipList.includes(t)) continue;
      out[key] = v;
    }
  }

  return out;
}
