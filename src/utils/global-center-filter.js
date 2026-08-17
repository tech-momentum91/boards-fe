/**
 * Shared helpers for the legacy global centre header filter.
 *
 * Module list views now rely on their own local filter state. The shared header
 * centre selection is intentionally not used to scope list APIs because that
 * selection leaks across modules and narrows unrelated searches.
 *
 * Module endpoints differ in two trivial ways:
 *   1. The HTTP param name (`centers` vs `navbar_filter` vs a boolean flag in
 *      the filter slice for tickets).
 *   2. The DB column they ultimately filter on (`center` / `name`), expressed
 *      as a wrapper key around the centre list.
 *
 * Both deltas are isolated to the small `adaptGlobalCenterIntent` table at the
 * bottom of this file. Pages and slices import the high-level helpers and
 * stay free of the per-module branching.
 */

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

/**
 * Possible intents derived from the centerAccess slice. Use these constants
 * (rather than the raw strings) at call sites so renames are searchable.
 */
export const GLOBAL_CENTER_STATUS = Object.freeze({
  /** centerAccess hasn't finished loading; do not fire any list API yet. */
  Loading: 'loading',
  /** Every accessible centre is selected; omit the centre filter entirely. */
  All: 'all',
  /** @deprecated Global centre subsets are no longer applied to module APIs. */
  Subset: 'subset',
  /** @deprecated Global centre empty selections are no longer applied to module APIs. */
  Empty: 'empty',
});

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a centerAccess slice into a tagged intent.
 *
 * Important: this intentionally treats loaded centre access as `All` regardless
 * of `selectedCenters`. Module filters are local to each module; using the
 * shared header selection here causes a filter chosen in one module to affect
 * other modules and their search results.
 *
 * @param {object} centerAccess
 * @param {('idle'|'loading'|'succeeded'|'failed')} centerAccess.status
 * @param {Array<{value?: string, name?: string}> | undefined} centerAccess.data
 * @param {Array<string> | undefined} centerAccess.selectedCenters
 *
 * @returns {{ status: string, centers: string[] }}
 */
export function deriveGlobalCenterIntent(centerAccess) {
  if (!centerAccess || centerAccess.status !== 'succeeded') {
    return { status: GLOBAL_CENTER_STATUS.Loading, centers: [] };
  }

  const centers = Array.isArray(centerAccess.data)
    ? centerAccess.data
        .map((center) => center?.name ?? center?.value)
        .filter(Boolean)
        .map(String)
    : [];

  return { status: GLOBAL_CENTER_STATUS.All, centers };
}

/**
 * True when callers should suppress list/stats API calls and render the
 * "no centers selected" empty state instead.
 */
export function isExplicitlyEmptyIntent(intent) {
  return intent?.status === GLOBAL_CENTER_STATUS.Empty;
}

/**
 * True when the page should wait (centerAccess hasn't resolved yet).
 */
export function isLoadingIntent(intent) {
  return intent?.status === GLOBAL_CENTER_STATUS.Loading;
}

// ---------------------------------------------------------------------------
// Empty-state copy (table card)
// ---------------------------------------------------------------------------

/**
 * Drop-in entry for each module's `EMPTY_STATES` map under the `no_centers`
 * key. Keep the wording centralised so the UX stays consistent.
 */
export const NO_CENTERS_EMPTY_STATE = Object.freeze({
  title: 'No centers selected',
  description: 'Use this module filter to choose one or more centers.',
});

/**
 * Derive effective centre scope for list APIs that express centre via `filters`.
 *
 * @param {{ status: string, centers: string[] }} intent from `deriveGlobalCenterIntent`
 * @param {object} [options]
 * @param {string[]} [options.modalCenters] Per-tab toolbar centre chips (Visitors/Vendors).
 * @returns {undefined} loading — caller must not fetch
 * @returns {null} all centres in scope — omit centre clause
 * @returns {[]} explicit empty — caller must not fetch
 * @returns {string[]} subset to apply as `center` IN/= filter
 */
export function centerScopeFromIntent(intent, { modalCenters = [] } = {}) {
  if (!intent || intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
  if (intent.status === GLOBAL_CENTER_STATUS.Empty) return [];

  const modal = Array.isArray(modalCenters) ? modalCenters.filter(Boolean).map(String) : [];

  if (intent.status === GLOBAL_CENTER_STATUS.All) {
    return modal.length > 0 ? modal : null;
  }

  const headerCenters = intent.centers;
  const merged =
    modal.length > 0 ? modal.filter((id) => headerCenters.includes(id)) : headerCenters;
  return merged.length === 0 ? [] : merged;
}

/**
 * True when `centerScopeFromIntent` resolved to an explicit empty selection.
 */
export function isEmptyCenterScope(scope) {
  return Array.isArray(scope) && scope.length === 0;
}

/**
 * Remove existing `field` clauses and append centre scope when non-null.
 * Callers must gate on `undefined` / `[]` scope before fetching.
 */
export function applyCenterScopeToFilterArray(filters, scope, field = 'center') {
  const base = (Array.isArray(filters) ? filters : []).filter(
    (f) => !(Array.isArray(f) && f.length > 0 && f[0] === field),
  );
  if (scope === null || scope === undefined) return base;
  if (!Array.isArray(scope) || scope.length === 0) return base;
  if (scope.length === 1) return [...base, [field, '=', scope[0]]];
  return [...base, [field, 'in', scope]];
}

// ---------------------------------------------------------------------------
// Per-module adapters
// ---------------------------------------------------------------------------

/**
 * Adapters convert the shared intent into the exact shape each module's slice
 * expects. Add a new entry here when wiring a new module.
 *
 * Convention:
 *   * Returning `undefined` means "wait — caller should not fire its API".
 *   * Returning `null`      means "no centre filter — omit the param".
 *   * Anything else is the value to pass into the slice/thunk.
 */
export const adaptGlobalCenterIntent = Object.freeze({
  /**
   * Landlord list view (`get_landlord_list_view`).
   * - sends a flat array of centre IDs (or `null` to omit).
   */
  landlord(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return intent.centers; // [] for Empty -> backend honours as "match nothing"
  },

  /**
   * Center list view (`get_center_listview`). Header scope is normally applied
   * via `filters` (`name` IN …) using `buildCenterListRequestScope`; the
   * union path is the only case that still sends `navbar_filter`.
   */
  center(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return { name: intent.centers };
  },

  /**
   * Space list view (`get_space_listview`).
   * - sends `{ center: [...] }` matching the Space doctype's link field.
   */
  space(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return { center: intent.centers };
  },

  /**
   * Client list view (`client_list_view`).
   * - sends `{ center: [...] }`.
   */
  client(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return { center: intent.centers };
  },

  /**
   * Ticket list view (`get_ticket_list_paginated`).
   *
   * Tickets carry the centre filter inside the page-level filter state (not as
   * a separate thunk param), so we return a partial-filter patch the page can
   * spread into `setTicketFilters`. The backend recognises
   * `custom_center: ['in', []]` as the "match nothing" signal.
   */
  ticket(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.Empty) {
      return { center: [], centerExplicitlyEmpty: true };
    }
    if (intent.status === GLOBAL_CENTER_STATUS.All) {
      return { center: [], centerExplicitlyEmpty: false };
    }
    return { center: intent.centers, centerExplicitlyEmpty: false };
  },

  /**
   * Agreement list view (`get_agreement_listview`) and calendar view
   * (`get_agreement_calendar_view`). Both backends accept a `navbar_filter`
   * dict with a `center` key.
   */
  agreement(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return { center: intent.centers };
  },

  /**
   * VMS list views (`get_visitor_entries_listview`, `..._grouped`). Centre
   * scope is applied via `filters` (`center` column) using
   * `centerScopeFromIntent` + `applyCenterScopeToFilterArray`.
   */
  vms(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return { center: intent.centers };
  },

  /**
   * Team Management list views (`team_member_listview` for CENTER / CORE_TEAM /
   * SUPPORT_TEAM). Backend merges `navbar_filter` into list filters as `center`.
   */
  teamMember(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return { center: intent.centers };
  },

  /**
   * CP Account list (`get_cp_accounts_list`). Backend accepts a flat `centers`
   * array. Returns the array (incl. `[]` for explicit empty) or `null` to omit.
   */
  cpAccount(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return intent.centers;
  },

  /**
   * CP Contact list (`get_cp_contacts_list`). Same shape as CP Account.
   */
  cpContact(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return intent.centers;
  },

  /**
   * My Task aggregator (`get_my_tasks`, `get_my_tasks_counts`).
   *
   * Multi-source endpoint; backend currently treats `centers='All'` as "no
   * restriction". Migration flips the contract: `[]` (explicit empty) means
   * "match nothing" (frontend will short-circuit before calling). All-selected
   * still uses `'All'` so the backend's existing fast path keeps working.
   */
  myTask(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return 'All';
    return intent.centers; // [] for Empty; pages should gate on isExplicitlyEmptyIntent.
  },

  /**
   * Inbox aggregator (`get_notifications`, `get_notification_unread_counts`).
   * Same backend shape as My Task — flat array or `'All'` sentinel.
   */
  inbox(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return 'All';
    return intent.centers;
  },

  /**
   * Partner list (`get_partner_list_view`).
   *
   * The Partner doctype itself has no centre Link field, so subset/all both
   * collapse to "no centre restriction" on the backend. The contract still
   * distinguishes "explicit empty" so we can short-circuit to 0 partners +
   * zeroed stage counts (matches the global UX every other module uses).
   *
   *   - Loading -> undefined (gate the fetch)
   *   - Empty   -> []        (backend returns 0 results)
   *   - All     -> null      (omit the param)
   *   - Subset  -> [...]     (passed for future use; currently no-op server-side)
   */
  partner(intent) {
    if (intent.status === GLOBAL_CENTER_STATUS.Loading) return undefined;
    if (intent.status === GLOBAL_CENTER_STATUS.All) return null;
    return intent.centers;
  },
});
