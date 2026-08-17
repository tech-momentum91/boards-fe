import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiInboxLine } from 'react-icons/ri';

import { useDispatch, useSelector } from 'react-redux';
import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import InboxStatusTabs from '@/components/inbox/inbox-status-tabs';
import InboxActivityList from '@/components/inbox/inbox-activity-list';
import {
  INBOX_TAB_TITLES,
  INBOX_FILTER_KEYS,
  INBOX_FILTER_SESSION_KEY,
  INBOX_APPLIED_FILTER_DEFAULTS,
  mergeStoredInboxFilters,
} from '@/components/inbox/inbox-constants';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import {
  filterGroupedSectionsForMentions,
  getInboxUserIdForMentions,
} from '@/utils/inbox-mention-filter';
import { inboxPayloadToSections } from '@/utils/inbox-timeframe-order';
import { fetchCenterAccess, selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  setSelectedTab,
  setNotificationItems,
  selectNotificationUi,
  fetchNotificationCountByTab,
} from '@/redux/notificationSlice';
import notificationService from '@/services/notification-service';
import inboxStaticData from '@/data/inbox-static-data.json';
import {
  GLOBAL_CENTER_STATUS,
  NO_CENTERS_EMPTY_STATE,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

const allPrimary = inboxStaticData.primary ?? [];
const allOther = inboxStaticData.other ?? [];
const allLater = inboxStaticData.later ?? [];

const Inbox = () => {
  const navigate = useNavigate();
  const notificationUi = useSelector(selectNotificationUi);
  const activeTab = notificationUi?.selectedTab ?? 'primary';
  const [persistedInboxFilters, setPersistedInboxFilters] = usePersistedFilters({
    storageKey: INBOX_FILTER_SESSION_KEY,
    defaultFilters: INBOX_APPLIED_FILTER_DEFAULTS,
    persistIncludeKeys: ['filters'],
    persistTrimStringArrays: true,
  });
  const appliedFilters = useMemo(
    () => mergeStoredInboxFilters(persistedInboxFilters),
    [persistedInboxFilters],
  );
  const setAppliedFilters = useCallback(
    (next) => {
      setPersistedInboxFilters((previous) => {
        const current = mergeStoredInboxFilters(previous);
        const resolved = typeof next === 'function' ? next(current) : next;
        const arr = Array.isArray(resolved) ? resolved : [];
        return { ...INBOX_APPLIED_FILTER_DEFAULTS, filters: arr };
      });
    },
    [setPersistedInboxFilters],
  );
  const [groupedSections, setGroupedSections] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [clearedIds, setClearedIds] = useState(new Set());
  const [unclearedIds, setUnclearedIds] = useState(new Set());
  const [readOverrides, setReadOverrides] = useState({});
  const centerAccess = useSelector(selectCenterAccess);
  const dispatch = useDispatch();

  // Shared global-centre filter intent. The Inbox follows the same contract as
  // every other module migrated under `@/utils/global-center-filter`:
  //   - Loading -> defer the fetch
  //   - All     -> omit the centres param (broad list)
  //   - Subset  -> send the explicit list
  //   - Empty   -> send `[]` so the backend returns 0 notifications
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);
  /** Centres payload for `notificationService` / `fetchNotificationCountByTab`. */
  const inboxCentersParam = useMemo(() => {
    if (centerAccessLoading) return undefined;
    if (globalCenterIntent.status === GLOBAL_CENTER_STATUS.All) return 'All';
    return globalCenterIntent.centers; // Subset -> [...], Empty -> []
  }, [centerAccessLoading, globalCenterIntent]);

  const isCleared = useCallback(
    (item) => (item?.clear === true || clearedIds.has(item.id)) && !unclearedIds.has(item.id),
    [clearedIds, unclearedIds],
  );

  const activeItems = useMemo(() => {
    const items = groupedSections.flatMap((s) => s.items || []);
    // Cleared tab: API returns only cleared items — show all. Other tabs: show only not-cleared.
    const filtered = activeTab === 'cleared' ? items : items.filter((item) => !isCleared(item));
    return filtered.map((item) => {
      const effectiveRead = readOverrides[item.id] ?? item.markAsRead;
      return {
        ...item,
        markAsRead: effectiveRead,
        count: effectiveRead ? 0 : item.count,
      };
    });
  }, [groupedSections, activeTab, readOverrides, isCleared]);

  const orderedItems = useMemo(
    () => groupedSections.flatMap((section) => section.items || []),
    [groupedSections],
  );

  const findItemById = useCallback(
    (id) => {
      for (const s of groupedSections) {
        const found = (s.items || []).find((i) => i.id === id);
        if (found) return found;
      }
      return (
        allPrimary.find((i) => i.id === id) ||
        allOther.find((i) => i.id === id) ||
        allLater.find((i) => i.id === id)
      );
    },
    [groupedSections],
  );

  const handleItemClick = useCallback(
    (id) => {
      navigate(`/inbox/notification-details/${encodeURIComponent(id)}`, {
        state: { orderedItems, inboxTab: activeTab },
      });
    },
    [navigate, orderedItems, activeTab],
  );

  const buildFromDoctypes = useCallback((raw) => {
    const from_doctypes = {};
    (raw?.activities || []).forEach((a) => {
      const doctype = a.from_doctype;
      const vid = a.version_id || a.name;
      if (!doctype || !vid) return;
      if (!from_doctypes[doctype]) from_doctypes[doctype] = { version_ids: [] };
      from_doctypes[doctype].version_ids.push(vid);
    });
    return from_doctypes;
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (inboxCentersParam === undefined) return; // wait for centerAccess
    setLoadingNotifications(true);
    try {
      const tabParameter = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      const filters = Array.isArray(appliedFilters) ? appliedFilters : [];
      const payload = await notificationService.getNotifications(
        undefined,
        tabParameter,
        filters,
        inboxCentersParam,
      );
      const data = payload?.message ?? payload ?? {};
      const sections = inboxPayloadToSections(data, tabParameter);
      const mentionUserId =
        filters.includes(INBOX_FILTER_KEYS.MENTIONS) && getInboxUserIdForMentions();
      const finalSections = mentionUserId
        ? filterGroupedSectionsForMentions(sections, mentionUserId)
        : sections;
      setGroupedSections(finalSections);
      const allItems = finalSections.flatMap((s) => s.items || []);
      dispatch(setNotificationItems(allItems));
      dispatch(fetchNotificationCountByTab({ centers: inboxCentersParam }));
    } catch {
      setGroupedSections([]);
    } finally {
      setLoadingNotifications(false);
    }
  }, [activeTab, appliedFilters, inboxCentersParam, dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleCenterSelectionChange = useCallback(
    (nextSelectedCenters) => {
      dispatch(setSelectedCenters(nextSelectedCenters));
      // The fetchNotifications effect depends on `inboxCentersParam` (derived
      // from centerAccess), so it will rerun automatically with the shared
      // contract — no need to fire a duplicate count fetch here.
    },
    [dispatch],
  );

  const handleMarkAsRead = useCallback(
    async (id) => {
      const item = findItemById(id);
      const raw = item?.raw;
      if (!raw?.doctype || !raw?.docname) return;

      const from_doctypes = buildFromDoctypes(raw);
      const effectiveRead = readOverrides[id] ?? item.markAsRead;
      const newRead = !effectiveRead;

      let readScope = 'primary';
      if (activeTab === 'later') readScope = 'later';
      else if (activeTab === 'cleared') readScope = 'cleared';
      try {
        await notificationService.markAsRead(
          raw.doctype,
          raw.docname,
          from_doctypes,
          newRead,
          undefined,
          readScope,
        );
        await fetchNotifications();
      } catch {
        // Optionally show error toast
      }
    },
    [findItemById, buildFromDoctypes, readOverrides, fetchNotifications, activeTab],
  );

  const handleSnooze = useCallback(
    async (id, optionValue) => {
      const item = findItemById(id);
      const raw = item?.raw;
      if (!raw?.doctype || !raw?.docname) return;
      const from_doctypes = buildFromDoctypes(raw);
      try {
        await notificationService.snooze(raw.doctype, raw.docname, from_doctypes, optionValue);
        await fetchNotifications();
      } catch {
        // Optionally show error toast
      }
    },
    [findItemById, buildFromDoctypes, fetchNotifications],
  );

  const handleUnsnooze = useCallback(
    async (id) => {
      const item = findItemById(id);
      const raw = item?.raw;
      if (!raw?.doctype || !raw?.docname) return;
      const from_doctypes = buildFromDoctypes(raw);
      try {
        await notificationService.unsnooze(raw.doctype, raw.docname, from_doctypes);
        await fetchNotifications();
      } catch {
        // Optionally show error toast
      }
    },
    [findItemById, buildFromDoctypes, fetchNotifications],
  );

  const handleClear = useCallback(
    async (id) => {
      const item = findItemById(id);
      const raw = item?.raw;
      if (!raw?.doctype || !raw?.docname) return;

      const from_doctypes = buildFromDoctypes(raw);
      const closed_activity_id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const now = new Date();
      const closed_time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      try {
        await notificationService.markAsClosed(raw.doctype, raw.docname, from_doctypes, true, {
          closed_time,
          closed_activity_id,
        });
        await fetchNotifications();
      } catch {
        // Optionally show error toast
      }
    },
    [findItemById, buildFromDoctypes, fetchNotifications],
  );

  const handleUnclear = useCallback(
    async (id) => {
      const item = findItemById(id);
      const raw = item?.raw;
      if (!raw?.doctype || !raw?.docname) return;

      const from_doctypes = buildFromDoctypes(raw);
      try {
        await notificationService.markAsClosed(raw.doctype, raw.docname, from_doctypes, false);
        await fetchNotifications();
      } catch {
        // Optionally show error toast
      }
    },
    [findItemById, buildFromDoctypes, fetchNotifications],
  );

  const handleClearAll = useCallback(async () => {
    // Clear All is only enabled for primary/other; clearable items = current tab's visible (not-cleared) items
    const itemsToClear = activeItems.filter((item) => item?.raw?.doctype && item?.raw?.docname);
    if (itemsToClear.length === 0) return;

    const now = new Date();
    const closedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const uuid = () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const updates = itemsToClear.map((item) => ({
      notification_id: item.id,
      doctype: item.raw.doctype,
      docname: item.raw.docname,
      from_doctypes: buildFromDoctypes(item.raw),
      closed: 1,
      closed_time: closedTime,
      closed_activity_id: uuid(),
    }));

    try {
      await notificationService.bulkUpdateNotificationActivity(updates);
      await fetchNotifications();
    } catch {
      // Optionally show error toast
    }
  }, [activeItems, buildFromDoctypes, fetchNotifications]);

  const handleUnclearAll = useCallback(async () => {
    if (activeTab !== 'cleared') return;
    const itemsToUnclear = activeItems.filter((item) => item?.raw?.doctype && item?.raw?.docname);
    if (itemsToUnclear.length === 0) return;

    const updates = itemsToUnclear.map((item) => ({
      notification_id: item.id,
      doctype: item.raw.doctype,
      docname: item.raw.docname,
      from_doctypes: buildFromDoctypes(item.raw),
      closed: 0,
    }));

    try {
      await notificationService.bulkUpdateNotificationActivity(updates);
      await fetchNotifications();
    } catch {
      // Optionally show error toast
    }
  }, [activeTab, activeItems, buildFromDoctypes, fetchNotifications]);

  let inboxListContent;
  if (noCenters) {
    // Match the contract used by every other module migrated under
    // `@/utils/global-center-filter`: when the user has explicitly deselected
    // every centre we render the shared "No centers selected" empty state
    // rather than streaming a noisy "no items" message per tab.
    inboxListContent = (
      <InboxActivityList
        title={INBOX_TAB_TITLES[activeTab]}
        items={[]}
        showHeader={false}
        onItemClick={handleItemClick}
        onMarkAsRead={handleMarkAsRead}
        onSnooze={handleSnooze}
        onUnsnooze={handleUnsnooze}
        onClear={handleClear}
        onUnclear={handleUnclear}
        isClearedTab={activeTab === 'cleared'}
        isLaterTab={activeTab === 'later'}
        emptyMessage={NO_CENTERS_EMPTY_STATE.description}
      />
    );
  } else if (activeTab === 'cleared') {
    inboxListContent = (
      <InboxActivityList
        title={INBOX_TAB_TITLES[activeTab]}
        items={activeItems}
        showHeader={false}
        onItemClick={handleItemClick}
        onMarkAsRead={handleMarkAsRead}
        onSnooze={handleSnooze}
        onUnsnooze={handleUnsnooze}
        onClear={handleClear}
        onUnclear={handleUnclear}
        isClearedTab={true}
        isLaterTab={false}
        emptyMessage='No items in this tab'
      />
    );
  } else if (groupedSections.length > 0) {
    inboxListContent = groupedSections.map(({ sectionKey, sectionLabel, items: sectionItems }) => (
      <InboxActivityList
        key={sectionKey}
        title={sectionLabel}
        items={sectionItems}
        onItemClick={handleItemClick}
        onMarkAsRead={handleMarkAsRead}
        onSnooze={handleSnooze}
        onUnsnooze={handleUnsnooze}
        onClear={handleClear}
        onUnclear={handleUnclear}
        isClearedTab={false}
        isLaterTab={activeTab === 'later'}
        emptyMessage='No items in this tab'
      />
    ));
  } else {
    inboxListContent = (
      <InboxActivityList
        title={INBOX_TAB_TITLES[activeTab]}
        items={[]}
        onItemClick={handleItemClick}
        onMarkAsRead={handleMarkAsRead}
        onSnooze={handleSnooze}
        onUnsnooze={handleUnsnooze}
        onClear={handleClear}
        onUnclear={handleUnclear}
        isClearedTab={false}
        isLaterTab={activeTab === 'later'}
        emptyMessage='No items in this tab'
      />
    );
  }

  return (
    <PageLayout
      pageTitle='Inbox'
      pageIcon={<RiInboxLine size={24} />}
      pageDescription='Manage all your Notifications From Here.'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex flex-col gap-6 px-8'>
        <InboxStatusTabs
          value={activeTab}
          onValueChange={(v) => dispatch(setSelectedTab(v))}
          appliedFilters={appliedFilters}
          onFiltersChange={setAppliedFilters}
          onClearAll={handleClearAll}
          onUnclearAll={handleUnclearAll}
          unclearCount={activeTab === 'cleared' ? activeItems.length : 0}
        />
        <div className='flex flex-col gap-5'>{inboxListContent}</div>
      </div>
    </PageLayout>
  );
};

export default Inbox;
