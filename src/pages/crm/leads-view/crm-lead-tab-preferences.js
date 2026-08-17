/**
 * Normalize and apply CRM lead pipeline/stage tab preferences.
 *
 * Preference bucket shape: { order: string[], pinned: string[], hidden: string[] }
 * - `order` covers actionable tabs only (excludes locked ids like stage "all")
 * - `pinned` stay visible and are rendered left (after locked tabs)
 * - `hidden` appear only under the More menu
 */

export function emptyTabBucket() {
  return { order: [], pinned: [], hidden: [] };
}

function uniqueIds(values) {
  const seen = new Set();
  const out = [];
  (Array.isArray(values) ? values : []).forEach((value) => {
    const id = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  });
  return out;
}

/**
 * Merge saved prefs with currently available actionable tab ids.
 * New tabs are appended to `order` and shown by default.
 */
export function normalizeTabBucket(availableIds, prefs = {}, { lockedIds = [] } = {}) {
  const lockedSet = new Set(uniqueIds(lockedIds));
  const actionable = uniqueIds(availableIds).filter((id) => !lockedSet.has(id));
  const actionableSet = new Set(actionable);

  const rawOrder = uniqueIds(prefs?.order);
  const order = [];
  const seen = new Set();

  rawOrder.forEach((id) => {
    if (!actionableSet.has(id) || seen.has(id)) return;
    seen.add(id);
    order.push(id);
  });

  actionable.forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
  });

  const orderSet = new Set(order);
  const pinned = uniqueIds(prefs?.pinned).filter((id) => orderSet.has(id));
  const pinnedSet = new Set(pinned);
  const hidden = uniqueIds(prefs?.hidden).filter((id) => orderSet.has(id) && !pinnedSet.has(id));

  return { order, pinned, hidden };
}

/**
 * For pipelines (no locked tabs): ensure at least one tab remains visible.
 * Unhides the last ordered tab if everything was hidden.
 */
export function ensureAtLeastOneVisible(bucket) {
  const next = {
    order: [...(bucket?.order ?? [])],
    pinned: [...(bucket?.pinned ?? [])],
    hidden: [...(bucket?.hidden ?? [])],
  };

  if (next.order.length === 0) return next;

  const hiddenSet = new Set(next.hidden);
  const visible = next.order.filter((id) => !hiddenSet.has(id));
  if (visible.length > 0) return next;

  const restoreId = next.order[next.order.length - 1];
  next.hidden = next.hidden.filter((id) => id !== restoreId);
  return next;
}

export function buildDisplayTabs(tabs, prefs, { lockedIds = [] } = {}) {
  const list = Array.isArray(tabs) ? tabs : [];
  const byValue = new Map(list.map((tab) => [tab.value, tab]));
  const locked = uniqueIds(lockedIds);
  const lockedSet = new Set(locked);
  const pinnedSet = new Set(prefs?.pinned ?? []);
  const hiddenSet = new Set(prefs?.hidden ?? []);
  const order = Array.isArray(prefs?.order) ? prefs.order : [];

  const lockedTabs = locked.map((id) => byValue.get(id)).filter(Boolean);

  const pinnedTabs = [];
  const unpinnedTabs = [];
  const placed = new Set();

  order.forEach((id) => {
    if (lockedSet.has(id) || hiddenSet.has(id)) return;
    const tab = byValue.get(id);
    if (!tab) return;
    placed.add(id);
    if (pinnedSet.has(id)) pinnedTabs.push(tab);
    else unpinnedTabs.push(tab);
  });

  // Prefs.order can lag (e.g. empty until syncStageAvailable, or wiped by a
  // pipeline-only save response). Still show available tabs by default.
  list.forEach((tab) => {
    const id = tab?.value;
    if (!id || lockedSet.has(id) || hiddenSet.has(id) || placed.has(id)) return;
    placed.add(id);
    if (pinnedSet.has(id)) pinnedTabs.push(tab);
    else unpinnedTabs.push(tab);
  });

  const visible = [...lockedTabs, ...pinnedTabs, ...unpinnedTabs];
  const hidden = uniqueIds(prefs?.hidden)
    .map((id) => byValue.get(id))
    .filter(Boolean);

  return { visible, hidden };
}

export function canHideTab(tabId, { prefs, lockedIds = [], requireOneVisible = false } = {}) {
  const id = String(tabId ?? '').trim();
  if (!id) return false;
  if (uniqueIds(lockedIds).includes(id)) return false;
  if ((prefs?.pinned ?? []).includes(id)) return false;

  if (!requireOneVisible) return true;

  const hiddenSet = new Set(prefs?.hidden ?? []);
  const lockedSet = new Set(uniqueIds(lockedIds));
  const visibleActionable = (prefs?.order ?? []).filter(
    (orderId) => !hiddenSet.has(orderId) && !lockedSet.has(orderId),
  );
  if (visibleActionable.length <= 1 && visibleActionable.includes(id)) {
    return false;
  }
  return true;
}

/** Tab to select after hiding `activeId` from the current visible list. */
export function getTabAfterHide(visibleIds, activeId) {
  const list = Array.isArray(visibleIds) ? visibleIds : [];
  const index = list.indexOf(activeId);
  if (index < 0) return list[0] ?? null;
  if (index > 0) return list[index - 1] ?? null;
  // No left neighbor — fall through to the next visible tab.
  return list[index + 1] ?? null;
}

/**
 * Reorder only among visible unpinned tabs, preserving hidden/pinned positions.
 */
export function reorderVisibleTabOrder(order, hiddenIds, pinnedIds, activeId, overId) {
  const hiddenSet = new Set(hiddenIds ?? []);
  const pinnedSet = new Set(pinnedIds ?? []);
  const fullOrder = Array.isArray(order) ? [...order] : [];
  const reorderable = fullOrder.filter((id) => !hiddenSet.has(id) && !pinnedSet.has(id));
  const oldIndex = reorderable.indexOf(activeId);
  const newIndex = reorderable.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return fullOrder;
  }

  const nextReorderable = [...reorderable];
  const [moved] = nextReorderable.splice(oldIndex, 1);
  nextReorderable.splice(newIndex, 0, moved);

  let reorderableIndex = 0;
  return fullOrder.map((id) => {
    if (hiddenSet.has(id) || pinnedSet.has(id)) return id;
    return nextReorderable[reorderableIndex++];
  });
}

export function togglePinnedInBucket(bucket, tabId) {
  const id = String(tabId ?? '').trim();
  if (!id || !(bucket?.order ?? []).includes(id)) return bucket;

  const pinned = new Set(bucket.pinned ?? []);
  if (pinned.has(id)) {
    pinned.delete(id);
  } else {
    pinned.add(id);
  }

  const nextPinned = [...pinned];
  const pinnedSet = new Set(nextPinned);
  // Pinned tabs cannot stay hidden.
  const nextHidden = (bucket.hidden ?? []).filter((hiddenId) => !pinnedSet.has(hiddenId));

  return {
    order: [...bucket.order],
    pinned: nextPinned,
    hidden: nextHidden,
  };
}

export function hideTabInBucket(bucket, tabId, { lockedIds = [], requireOneVisible = false } = {}) {
  if (!canHideTab(tabId, { prefs: bucket, lockedIds, requireOneVisible })) {
    return bucket;
  }
  const id = String(tabId).trim();
  const hidden = new Set(bucket.hidden ?? []);
  hidden.add(id);
  return {
    order: [...(bucket.order ?? [])],
    pinned: [...(bucket.pinned ?? [])],
    hidden: [...hidden],
  };
}

export function unhideTabInBucket(bucket, tabId) {
  const id = String(tabId ?? '').trim();
  if (!id) return bucket;
  return {
    order: [...(bucket.order ?? [])],
    pinned: [...(bucket.pinned ?? [])],
    hidden: (bucket.hidden ?? []).filter((hiddenId) => hiddenId !== id),
  };
}
