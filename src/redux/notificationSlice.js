import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationService from '@/services/notification-service';

const serializeError = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return error?.message || 'Something went wrong while fetching notifications';
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async ({ user, tab = 'Primary' }, { rejectWithValue }) => {
    try {
      // Debug: fetch start
      // eslint-disable-next-line no-console
      // console.log('[notificationSlice] fetchNotifications START', { user, tab });
      const payload = await notificationService.getNotifications(user, tab);
      // Normalize payload: some endpoints return { message: { ...timeframes } }
      const data = payload?.message ?? payload;
      // Debug: raw payload keys and sample
      // eslint-disable-next-line no-console
      // console.log('[notificationSlice] raw payload keys', Object.keys(data || {}), {
      //   sample: Object.keys(data || {})[0],
      // });
      const flatten = () => {
        const flat = [];
        // Preserve the timeframe key as provided by the backend on each item.
        Object.keys(payload || {}).forEach((tf) => {
          const docs = payload[tf] || [];
          docs.forEach((document_) => {
            const activities = document_.activities || [];
            const a = activities[0] || {};
            const primaryText =
              a.content ||
              (Array.isArray(a.changes) && a.changes[0] && a.changes[0].message) ||
              `${document_.doctype} ${document_.docname}`;
            const owner = a.owner || (a.user && (a.user.full_name || a.user.name)) || '';
            const initials = owner
              ? owner
                  .split(' ')
                  .map((s) => (s ? s[0] : ''))
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : '';
            flat.push({
              id: document_.notification_id || `${document_.doctype}_${document_.docname}`,
              triggerType: document_.doctype,
              primaryText,
              secondaryText: owner,
              assigneeInitials: initials,
              count: 0,
              markAsRead: Boolean(document_.read),
              clear: Boolean(document_.closed),
              createdAt: a.creation,
              timeframe: tf,
            });
          });
        });
        // Debug: flattened counts
        // eslint-disable-next-line no-console
        // console.log('[notificationSlice] flattened counts', {
        //   total: flat.length,
        //   by_timeframe: Object.keys(data || {}).reduce((accumulator, k) => {
        //     accumulator[k] = (data[k] || []).length;
        //     return accumulator;
        //   }, {}),
        // });
        return flat;
      };

      return { tab, items: flatten() };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Fetch unread notification counts by tab. Uses getState() for user and centers when not passed.
 * @param {Object} [payload] - Optional { user, centers } to override; otherwise read from state
 */
export const fetchNotificationCountByTab = createAsyncThunk(
  'notifications/fetchCountByTab',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const state = getState?.() ?? {};
      // console.log('state', state);
      const userInfo = state.auth?.userInfo ?? null;
      // console.log('userInfo', userInfo);
      const user =
        payload?.user ??
        userInfo?.email ??
        userInfo?.user_email ??
        userInfo?.username ??
        userInfo?.user ??
        userInfo?.name ??
        userInfo?.full_name ??
        undefined;
      // Centre header: prefer the explicit payload, otherwise fall back to the
      // current centerAccess selection. Empty `[]` is now passed through as
      // explicit-empty (per the shared global-centre filter contract); the
      // service layer JSON-encodes it so the backend short-circuits to 0.
      const centers =
        payload?.centers === undefined
          ? state.center?.centerAccess?.selectedCenters
          : payload.centers;
      const data = await notificationService.getCountBasedOnTab(user, centers);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const initialState = {
  lists: {
    primary: [],
    other: [],
    later: [],
    cleared: [],
  },
  /** Cache of full notification items (with raw.activities) by id for detail page / hard refresh */
  notificationItemsById: {},
  ui: {
    loading: false,
    error: null,
    selectedTab: 'primary',
  },
  detailModal: {
    isOpen: false,
    isLoading: false,
    item: null,
    error: null,
  },
  /** Counts by tab for sidebar badge: { primary: number, other: number, ... } */
  tabCounts: {
    primary: 0,
    other: 0,
    later: 0,
    cleared: 0,
  },
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setSelectedTab(state, action) {
      state.ui.selectedTab = action.payload;
    },
    setNotifications(state, action) {
      const { tab, items } = action.payload || {};
      const tn = String(tab || '').toLowerCase();
      if (tn === 'primary') state.lists.primary = items || [];
      else if (tn === 'later') state.lists.later = items || [];
      else if (tn === 'cleared') state.lists.cleared = items || [];
      else if (tn === 'other') state.lists.other = items || [];
    },
    addNotification(state, action) {
      const item = action.payload;
      if (!item) return;
      state.lists.primary.unshift(item);
    },
    updateNotification(state, action) {
      const item = action.payload;
      if (!item || !item.id) return;
      const lists = Object.values(state.lists);
      for (const list of lists) {
        const index = list.findIndex((i) => i.id === item.id);
        if (index !== -1) {
          list[index] = { ...list[index], ...item };
          break;
        }
      }
    },
    removeNotification(state, action) {
      const id = action.payload;
      if (!id) return;
      for (const key of Object.keys(state.lists)) {
        state.lists[key] = state.lists[key].filter((i) => i.id !== id);
      }
    },
    setDetailModal(state, action) {
      if (typeof action.payload === 'boolean') {
        state.detailModal.isOpen = action.payload;
        if (!action.payload) {
          state.detailModal.item = null;
          state.detailModal.error = null;
        }
      } else if (typeof action.payload === 'object' && action.payload !== null) {
        state.detailModal.isOpen = action.payload.isOpen ?? true;
        state.detailModal.item = action.payload.item ?? null;
        if (!action.payload.isOpen) {
          state.detailModal.item = null;
          state.detailModal.error = null;
        }
      } else {
        state.detailModal.isOpen = !state.detailModal.isOpen;
        if (!state.detailModal.isOpen) {
          state.detailModal.item = null;
          state.detailModal.error = null;
        }
      }
    },
    /** Cache full notification items (with raw) so detail page can use get_notifications data without separate API */
    setNotificationItems(state, action) {
      const items = action.payload;
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        if (item && item.id) {
          state.notificationItemsById[item.id] = item;
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.ui.loading = true;
        state.ui.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.ui.loading = false;
        const { tab, items } = action.payload || {};
        const tn = String(tab || '').toLowerCase();
        if (tn === 'primary') state.lists.primary = items || [];
        else if (tn === 'later') state.lists.later = items || [];
        else if (tn === 'cleared') state.lists.cleared = items || [];
        else if (tn === 'other') state.lists.other = items || [];
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.ui.loading = false;
        state.ui.error = action.payload || action.error?.message || 'Failed to fetch';
      })
      .addCase(fetchNotificationCountByTab.fulfilled, (state, action) => {
        const list = action.payload || [];
        const next = { primary: 0, other: 0, later: 0, cleared: 0 };
        list.forEach(({ tab, count }) => {
          const key = String(tab || '').toLowerCase();
          if (Object.prototype.hasOwnProperty.call(next, key)) {
            next[key] = Number(count) || 0;
          }
        });
        state.tabCounts = next;
      });
  },
});

export const {
  setSelectedTab,
  setNotifications,
  setNotificationItems,
  addNotification,
  updateNotification,
  removeNotification,
  setDetailModal,
} = notificationSlice.actions;

/* --------------------------- SELECTORS --------------------------- */
export const selectNotificationsState = (state) => state.notification || initialState;
export const selectPrimaryNotifications = (state) => selectNotificationsState(state).lists.primary;
export const selectOtherNotifications = (state) => selectNotificationsState(state).lists.other;
export const selectLaterNotifications = (state) => selectNotificationsState(state).lists.later;
export const selectClearedNotifications = (state) => selectNotificationsState(state).lists.cleared;
export const selectNotificationsLoading = (state) => selectNotificationsState(state).ui.loading;
export const selectNotificationUi = (state) => selectNotificationsState(state).ui;
export const selectNotificationDetailModal = (state) => selectNotificationsState(state).detailModal;

/** Get a single notification by id from cache (from get_notifications); used by detail page to avoid separate API */
export const selectNotificationById = (id) => (state) =>
  id ? (selectNotificationsState(state).notificationItemsById || {})[id] : null;

/** Primary tab count for sidebar inbox badge */
export const selectPrimaryNotificationCount = (state) =>
  (selectNotificationsState(state).tabCounts || {}).primary ?? 0;

/** All tab counts for inbox status tabs (primary, other, later, cleared) */
export const selectNotificationTabCounts = (state) =>
  selectNotificationsState(state).tabCounts || {
    primary: 0,
    other: 0,
    later: 0,
    cleared: 0,
  };

export default notificationSlice.reducer;
