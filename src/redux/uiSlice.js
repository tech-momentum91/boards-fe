import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: false,
  globalSearchOpen: false,
  devxAiChatOpen: false,
  theme: 'light',
  notifications: [],
  loadingStates: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setGlobalSearchOpen: (state, action) => {
      state.globalSearchOpen = action.payload;
    },
    toggleGlobalSearch: (state) => {
      state.globalSearchOpen = !state.globalSearchOpen;
    },
    setDevxAiChatOpen: (state, action) => {
      state.devxAiChatOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload,
      );
    },
    setLoadingState: (state, action) => {
      const { key, isLoading } = action.payload;
      state.loadingStates[key] = isLoading;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setGlobalSearchOpen,
  toggleGlobalSearch,
  setDevxAiChatOpen,
  setTheme,
  addNotification,
  removeNotification,
  setLoadingState,
} = uiSlice.actions;

export const selectGlobalSearchOpen = (state) => state.ui?.globalSearchOpen === true;

export const selectDevxAiChatOpen = (state) => state.ui?.devxAiChatOpen === true;

export default uiSlice.reducer;
