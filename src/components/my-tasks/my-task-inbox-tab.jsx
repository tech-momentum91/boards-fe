/**
 * MyTaskInboxTab
 * Renders the Primary inbox notification list inside the My Tasks page.
 * Only shows Primary tab content (no Later / Cleared status tabs).
 * Reuses the same InboxActivityList component and notification-service
 * logic used in the main Inbox page.
 */
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import InboxActivityList from '@/components/inbox/inbox-activity-list';
import { INBOX_TAB_TITLES, INBOX_FILTER_KEYS } from '@/components/inbox/inbox-constants';
import {
  filterGroupedSectionsForMentions,
  getInboxUserIdForMentions,
} from '@/utils/inbox-mention-filter';
import { inboxPayloadToSections } from '@/utils/inbox-timeframe-order';
import { selectCenterAccess } from '@/redux/centerSlice';
import { setNotificationItems, fetchNotificationCountByTab } from '@/redux/notificationSlice';
import notificationService from '@/services/notification-service';
import { MY_TASK_URL_TAB } from '@/components/my-tasks/my-task-constants';
import {
  GLOBAL_CENTER_STATUS,
  NO_CENTERS_EMPTY_STATE,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

const MyTaskInboxTab = forwardRef(({ onClearMetaChange, appliedFilters = [] }, ref) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);

  const [groupedSections, setGroupedSections] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [readOverrides] = useState({});

  // Shared global-centre filter intent (mirrors the Inbox page contract).
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);
  /** Centres payload for `notificationService` / `fetchNotificationCountByTab`. */
  const inboxCentersParam = useMemo(() => {
    if (centerAccessLoading) return undefined;
    if (globalCenterIntent.status === GLOBAL_CENTER_STATUS.All) return 'All';
    return globalCenterIntent.centers; // Subset -> [...], Empty -> []
  }, [centerAccessLoading, globalCenterIntent]);

  const orderedItems = useMemo(
    () => groupedSections.flatMap((s) => s.items || []),
    [groupedSections],
  );

  const activeItems = useMemo(() => {
    const items = orderedItems;
    return items.map((item) => {
      const effectiveRead = readOverrides[item.id] ?? item.markAsRead;
      return {
        ...item,
        markAsRead: effectiveRead,
        count: effectiveRead ? 0 : item.count,
      };
    });
  }, [orderedItems, readOverrides]);

  const findItemById = useCallback(
    (id) => {
      for (const s of groupedSections) {
        const found = (s.items || []).find((i) => i.id === id);
        if (found) return found;
      }
      return null;
    },
    [groupedSections],
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
      const filters = Array.isArray(appliedFilters) ? appliedFilters : [];
      const payload = await notificationService.getNotifications(
        undefined,
        'Primary',
        filters,
        inboxCentersParam,
      );
      const data = payload?.message ?? payload ?? {};
      const sections = inboxPayloadToSections(data, 'Primary');
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
  }, [appliedFilters, inboxCentersParam, dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleItemClick = useCallback(
    (id) => {
      navigate(
        `/inbox/notification-details/${encodeURIComponent(id)}?from=my-task&tab=${MY_TASK_URL_TAB.TASK_INBOX}`,
        {
          state: { orderedItems, inboxTab: 'primary' },
        },
      );
    },
    [navigate, orderedItems],
  );

  const handleMarkAsRead = useCallback(
    async (id) => {
      const item = findItemById(id);
      const raw = item?.raw;
      if (!raw?.doctype || !raw?.docname) return;
      const from_doctypes = buildFromDoctypes(raw);
      const effectiveRead = readOverrides[id] ?? item.markAsRead;
      const newRead = !effectiveRead;
      try {
        await notificationService.markAsRead(
          raw.doctype,
          raw.docname,
          from_doctypes,
          newRead,
          undefined,
          'primary',
        );
        await fetchNotifications();
      } catch {
        // silent
      }
    },
    [findItemById, buildFromDoctypes, readOverrides, fetchNotifications],
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
        // silent
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
        // silent
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
        // silent
      }
    },
    [findItemById, buildFromDoctypes, fetchNotifications],
  );

  const handleClearAll = useCallback(async () => {
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
      // silent
    }
  }, [activeItems, buildFromDoctypes, fetchNotifications]);

  // Expose clearAll and state so the toolbar can render the Clear All button
  useImperativeHandle(
    ref,
    () => ({
      clearAll: handleClearAll,
      hasItems: activeItems.length > 0,
      isLoading: loadingNotifications,
    }),
    [handleClearAll, activeItems.length, loadingNotifications],
  );

  // Notify parent so it can enable/disable the Clear All button.
  // Important: changing `ref.current` alone does NOT trigger re-render.
  useEffect(() => {
    onClearMetaChange?.({
      hasItems: activeItems.length > 0,
      isLoading: loadingNotifications,
    });
  }, [onClearMetaChange, activeItems.length, loadingNotifications]);

  const inboxListContent = useMemo(() => {
    if (noCenters) {
      // Match the shared global-centre filter contract used everywhere else:
      // when every centre is deselected, show the "No centers selected" copy
      // instead of the generic "No notifications" message.
      return (
        <InboxActivityList
          title={INBOX_TAB_TITLES.primary}
          items={[]}
          onItemClick={handleItemClick}
          onMarkAsRead={handleMarkAsRead}
          onSnooze={handleSnooze}
          onUnsnooze={handleUnsnooze}
          onClear={handleClear}
          onUnclear={() => {}}
          isClearedTab={false}
          isLaterTab={false}
          emptyMessage={NO_CENTERS_EMPTY_STATE.description}
        />
      );
    }
    if (groupedSections.length > 0) {
      return groupedSections.map(({ sectionKey, sectionLabel, items: sectionItems }) => (
        <InboxActivityList
          key={sectionKey}
          title={sectionLabel}
          items={sectionItems}
          onItemClick={handleItemClick}
          onMarkAsRead={handleMarkAsRead}
          onSnooze={handleSnooze}
          onUnsnooze={handleUnsnooze}
          onClear={handleClear}
          onUnclear={() => {}}
          isClearedTab={false}
          isLaterTab={false}
          emptyMessage='No items in this tab'
        />
      ));
    }
    return (
      <InboxActivityList
        title={INBOX_TAB_TITLES.primary}
        items={[]}
        onItemClick={handleItemClick}
        onMarkAsRead={handleMarkAsRead}
        onSnooze={handleSnooze}
        onUnsnooze={handleUnsnooze}
        onClear={handleClear}
        onUnclear={() => {}}
        isClearedTab={false}
        isLaterTab={false}
        emptyMessage='No notifications'
      />
    );
  }, [
    noCenters,
    groupedSections,
    handleItemClick,
    handleMarkAsRead,
    handleSnooze,
    handleUnsnooze,
    handleClear,
  ]);

  return <div className='flex flex-col gap-4'>{inboxListContent}</div>;
});

MyTaskInboxTab.displayName = 'MyTaskInboxTab';

export default MyTaskInboxTab;
