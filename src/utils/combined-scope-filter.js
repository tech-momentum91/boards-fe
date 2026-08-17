import {
  applyCenterScopeToFilterArray,
  deriveGlobalCenterIntent,
  GLOBAL_CENTER_STATUS,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

/**
 * Combined-scope filter contract.
 *
 * Some list views want their global centre header (a subset of doc names) to
 * be UNION'd with a curated set of toolbar dropdown filters instead of the
 * default AND. Concretely:
 *
 *   global header = { name: ['Capital 14', 'Capital 13'] }     // subset
 *   toolbar       = { zone: ['Zone 3'], status: ['Active'] }   // toolbar leg
 *
 * yields a backend payload that filters to:
 *
 *   name IN (header_subset ∪ docs_matching(zone='Zone 3' AND status='Active'))
 *
 * Differentiation rules (mirrors `devx.api.union_with_navbar`):
 *   - Header is "All"   → no header restriction. Toolbar fields fall back to
 *                         their normal AND-with-everything behaviour.
 *   - Header is "Subset" + toolbar leg present → UNION engaged.
 *   - Header is "Subset" + toolbar leg empty   → header subset wins (current
 *                                                 single-leg behaviour).
 *   - Header is "Empty" → entire scope is empty; the existing
 *                         `isExplicitlyEmptyIntent` short-circuit on the
 *                         page handles that ahead of this util.
 *
 * Field roles per module:
 *   - `unionFields`     – toolbar fields whose selections should UNION with
 *                          the global header (e.g. `zone`, `state`, `city`,
 *                          `status`, `micro_market` for Centers).
 *   - `intersectFields` – toolbar fields that *always* AND, even when the
 *                          union contract is engaged (e.g. `carpet_area`).
 *
 * Modules opt in by feeding their `appliedFilters` shape and field lists into
 * `partitionAppliedFiltersForUnion`. The shape of each emitted clause is the
 * usual frappe `[field, operator, value]` triple; the helpers below pick a
 * sensible default operator (single-value → `=`, multi-value → `in`).
 */

const isPopulatedArray = (value) => Array.isArray(value) && value.length > 0;

const isPopulatedScalar = (value) => value !== undefined && value !== null && value !== '';

const defaultBuildClause = (field, value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.length === 1) return [field, '=', value[0]];
    return [field, 'in', value];
  }
  if (!isPopulatedScalar(value)) return null;
  return [field, '=', value];
};

/**
 * Partition an `appliedFilters` object into the union/intersect legs the
 * Centers-style endpoints expect.
 *
 * @param {object} args
 * @param {object} args.appliedFilters
 *   The page's persisted filter state, e.g.
 *   `{ zone: ['Zone 1'], state: [], city: ['Mumbai'], carpet_area: 5000 }`.
 * @param {string[]} args.unionFields
 *   Fields whose populated values should UNION with the global header.
 * @param {string[]} [args.intersectFields=[]]
 *   Fields that should always be AND-ed regardless of the union contract.
 * @param {(field: string, value: any) => (Array | null)} [args.buildClause]
 *   Per-field clause builder. Defaults to single-value → `=`, multi → `in`,
 *   scalar → `=`. Override for things like `<=` on a numeric upper bound.
 *
 * @returns {{ unionFilters: Array<Array>, intersectFilters: Array<Array> }}
 */
export function partitionAppliedFiltersForUnion({
  appliedFilters,
  unionFields,
  intersectFields = [],
  buildClause = defaultBuildClause,
} = {}) {
  if (!appliedFilters || typeof appliedFilters !== 'object') {
    return { unionFilters: [], intersectFilters: [] };
  }

  const unionFilters = [];
  for (const field of unionFields || []) {
    const value = appliedFilters[field];
    const populated = Array.isArray(value) ? isPopulatedArray(value) : isPopulatedScalar(value);
    if (!populated) continue;
    const clause = buildClause(field, value);
    if (clause) unionFilters.push(clause);
  }

  const intersectFilters = [];
  for (const field of intersectFields) {
    const value = appliedFilters[field];
    const populated = Array.isArray(value) ? isPopulatedArray(value) : isPopulatedScalar(value);
    if (!populated) continue;
    const clause = buildClause(field, value);
    if (clause) intersectFilters.push(clause);
  }

  return { unionFilters, intersectFilters };
}

/**
 * Convenience predicate: should the calling page actually engage the union
 * contract on this render? Returns true only when (a) the global header is a
 * non-empty subset and (b) the user has selected at least one union-eligible
 * toolbar value. Pages can use this to decide between sending
 * `or_filters_with_navbar` or letting the backend take the AND path.
 *
 * @param {object} args
 * @param {object|null} args.navbarFilter   Built via `adaptGlobalCenterIntent.<module>`.
 * @param {Array} args.unionFilters         From `partitionAppliedFiltersForUnion`.
 * @param {string} [args.field='name']      Header field carrying the subset.
 */
export function shouldEngageUnionWithNavbar({ navbarFilter, unionFilters, field = 'name' } = {}) {
  if (!Array.isArray(unionFilters) || unionFilters.length === 0) return false;
  if (!navbarFilter || typeof navbarFilter !== 'object') return false;
  const subset = navbarFilter[field];
  return Array.isArray(subset) && subset.length > 0;
}

/**
 * Direct id-list union for modules whose local toolbar filter and global
 * navbar header share the SAME field with the SAME value space (e.g. Team
 * Management's "center" filter, where both legs emit Center document ids).
 *
 * Mirrors `devx.api.union_with_navbar.merge_navbar_into_local_filters`:
 *
 *   navbar={center:[A,B]}, local={center:[C], status:['Active']}
 *     → { center: ['A','B','C'], status: ['Active'] }
 *
 *   navbar={center:[]}, local={center:[C]}
 *     → { center: [] }   // navbar explicitly empty wins
 *
 *   navbar={}, local={center:[C]}
 *     → { center: ['C'] }  // unchanged
 *
 * Useful client-side when a page wants to preview the effective scope (e.g.
 * to show a badge like "Showing 5 centres") without round-tripping the
 * backend. Backend listview endpoints should still call the python helper
 * so the canonical merge happens server-side.
 *
 * @param {object} args
 * @param {object} [args.localFilters={}]   The toolbar's `appliedFilters` shape.
 * @param {object|null} [args.navbarFilter] Built via `adaptGlobalCenterIntent.<module>`.
 * @param {string[]} [args.unionFields=['center']]
 *   Fields to merge as id-list unions. Other navbar fields overwrite the
 *   local value (legacy behaviour) so callers can mount this safely.
 * @returns {object} A new merged filter object; inputs are never mutated.
 */
export function mergeNavbarIntoLocalFilters({
  localFilters = {},
  navbarFilter,
  unionFields = ['center'],
} = {}) {
  const merged =
    localFilters && typeof localFilters === 'object' && !Array.isArray(localFilters)
      ? { ...localFilters }
      : {};

  if (!navbarFilter || typeof navbarFilter !== 'object' || Array.isArray(navbarFilter)) {
    return merged;
  }

  const unionSet = new Set((unionFields || []).map((f) => String(f)));

  for (const [field, rawNavValue] of Object.entries(navbarFilter)) {
    if (unionSet.has(field)) {
      const navIsExplicitEmpty = Array.isArray(rawNavValue) && rawNavValue.length === 0;
      const navList = toCleanList(rawNavValue);
      const localList = toCleanList(merged[field]);

      if (navList.length > 0 && localList.length > 0) {
        const unionValues = new Set([...navList.map(String), ...localList.map(String)]);
        merged[field] = [...unionValues].sort();
        continue;
      }

      if (navIsExplicitEmpty) {
        merged[field] = [];
        continue;
      }

      if (navList.length > 0) {
        merged[field] = navList;
        continue;
      }

      // navbar key present but blank — leave local intact.
      continue;
    }

    merged[field] = rawNavValue;
  }

  return merged;
}

function toCleanList(value) {
  if (value === undefined || value === null) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.filter((v) => v !== undefined && v !== null && v !== '');
}

/**
 * Build the Centers listview request scope from global header + toolbar legs.
 *
 * Non-union requests express the header subset as `filters` (`name` IN …) and
 * omit `navbar_filter`. When the union contract engages (header subset + union-
 * eligible toolbar values), the backend still requires `navbar_filter` for
 * `apply_union_with_navbar` — that is the only case we send it.
 *
 * @returns {{ shouldFetch: boolean, filters?: Array, or_filters_with_navbar?: Array|null, navbar_filter?: object|null, unionEngaged?: boolean }}
 */
export function buildCenterListRequestScope(
  centerAccess,
  intersectFilters = [],
  unionFilters = [],
) {
  const intent = deriveGlobalCenterIntent(centerAccess);
  if (isLoadingIntent(intent)) {
    return { shouldFetch: false };
  }
  if (isExplicitlyEmptyIntent(intent)) {
    return { shouldFetch: false };
  }

  const intersect = Array.isArray(intersectFilters) ? intersectFilters : [];
  const union = Array.isArray(unionFilters) ? unionFilters : [];
  // `All` → null (omit). `Subset` → centre id list. `Empty` gated above.
  const resolvedNameScope = intent.status === GLOBAL_CENTER_STATUS.Subset ? intent.centers : null;

  const headerFilter =
    resolvedNameScope === null
      ? null
      : resolvedNameScope.length > 0
        ? { name: resolvedNameScope }
        : { name: [] };

  const unionEngaged = shouldEngageUnionWithNavbar({
    navbarFilter: headerFilter,
    unionFilters: union,
    field: 'name',
  });

  if (unionEngaged) {
    return {
      shouldFetch: true,
      filters: intersect,
      or_filters_with_navbar: union.length > 0 ? union : null,
      navbar_filter: headerFilter,
      unionEngaged: true,
    };
  }

  return {
    shouldFetch: true,
    filters: applyCenterScopeToFilterArray(intersect, resolvedNameScope, 'name'),
    or_filters_with_navbar: union.length > 0 ? union : null,
    navbar_filter: null,
    unionEngaged: false,
  };
}
