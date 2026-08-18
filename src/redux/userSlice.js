import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';

const SEARCH_USERS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.user_.search_users';
const MENTION_USERS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.user_.get_users_for_tagging';

function formatUserOption(user) {
  const primaryRole =
    user.user_role || (Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : null);

  return {
    label: user.full_name || user.name || user.email || 'User',
    value: user.name || user.email,
    email: user.email,
    name: user.name,
    full_name: user.full_name,
    image: user.user_image,
    avatar: user.user_image,
    user_role: primaryRole,
    roles: user.roles || (primaryRole ? [primaryRole] : []),
  };
}

function unwrapSearchUsersMessage(message) {
  if (Array.isArray(message)) {
    return {
      users: message,
      hasMore: false,
      start: 0,
      limit: message.length,
    };
  }

  if (message && typeof message === 'object') {
    const users = Array.isArray(message.results) ? message.results : [];
    return {
      users,
      hasMore: Boolean(message.has_more),
      start: Number(message.start) || 0,
      limit: Number(message.limit) || users.length,
    };
  }

  return { users: [], hasMore: false, start: 0, limit: 0 };
}

// Search users for assignee / invite selection on the boards site.
export const searchUsers = createAsyncThunk(
  'user/searchUsers',
  async (
    {
      searchQuery,
      limit = 20,
      start = 0,
      append = false,
      includeAssignedUsers = [],
      names = [],
      updateSearchData = true,
      internal_only: internalOnly = false,
    },
    { rejectWithValue },
  ) => {
    try {
      const payload = {
        search_query: searchQuery || '',
        limit,
        start,
      };

      // If names are provided, pass them directly to the API
      if (names && names.length > 0) {
        payload.names = names;
      }

      if (internalOnly) {
        payload.internal_only = true;
      }

      const response = await apiClient.post(SEARCH_USERS_ENDPOINT, payload);
      const unwrapped = unwrapSearchUsersMessage(response?.data?.message);
      const formattedUsers = unwrapped.users.map(formatUserOption);

      // If we have assigned users that aren't in search results, add them
      if (includeAssignedUsers && includeAssignedUsers.length > 0) {
        const existingValues = new Set(formattedUsers.map((u) => u.value || u.name));

        // Extract assigned user values (could be strings or objects)
        const assignedValues = includeAssignedUsers.map((u) =>
          typeof u === 'string' ? u : u.value || u.email || u.name,
        );

        // Find assigned users that aren't in the current results
        const missingValues = assignedValues.filter((value) => {
          // Check if this value exists in formattedUsers
          return !formattedUsers.some(
            (u) => u.value === value || u.name === value || u.email === value,
          );
        });

        // If there are missing assigned users, fetch them
        if (missingValues.length > 0) {
          const assignedPayload = {
            names: missingValues,
            limit: missingValues.length,
            start: 0,
          };
          if (internalOnly) {
            assignedPayload.internal_only = true;
          }
          const assignedResponse = await apiClient.post(SEARCH_USERS_ENDPOINT, assignedPayload);
          const assignedUnwrapped = unwrapSearchUsersMessage(assignedResponse?.data?.message);

          assignedUnwrapped.users.forEach((user) => {
            const formatted = formatUserOption(user);
            const userValue = formatted.value;
            if (!existingValues.has(userValue)) {
              formattedUsers.push(formatted);
              existingValues.add(userValue);
            }
          });
        }
      }

      return {
        searchQuery: searchQuery || '',
        users: formattedUsers,
        hasMore: unwrapped.hasMore,
        start: unwrapped.start,
        limit: unwrapped.limit || limit,
        append: Boolean(append),
        updateSearchData, // Pass flag to reducer
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Search users for mentions
export const searchMentionUsers = createAsyncThunk(
  'user/searchMentionUsers',
  async ({ keyword = '', page = 1, page_size = 50 } = {}, { rejectWithValue }) => {
    try {
      const payload = keyword ? { keyword, page, page_size } : { page, page_size };
      const response = await apiClient.post(MENTION_USERS_ENDPOINT, payload);

      let data;
      if (response?.data?.message?.results) {
        data = response.data.message;
      } else if (response?.data?.results) {
        data = response.data;
      } else if (response?.data?.message?.data?.results) {
        data = response.data.message.data;
      } else {
        data = response?.data?.message || {};
      }
      const users = data.results || data.users || [];
      const hasMore =
        data.page && data.total_pages ? data.page < data.total_pages : data.has_more || false;

      const formattedUsers = users.map((user) => formatUserOption(user));

      return {
        keyword,
        page,
        page_size,
        hasMore,
        users: formattedUsers,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getUserFullName = (user, userNameMap = {}) => {
  // If already an object with full_name, use it
  if (typeof user === 'object' && user !== null && user.full_name) {
    return user.full_name;
  }

  // Extract identifier
  const id = typeof user === 'string' ? user : user.value || user.email || user.name || user;

  // Look up in userNameMap
  if (userNameMap[id]) {
    return userNameMap[id];
  }

  // Fallback to email/name
  return id;
};

const initialState = {
  userSearch: {
    data: [], // Array of user options from search
    status: 'idle',
    error: null,
    lastSearchQuery: '',
    hasMore: false,
    nextStart: 0,
    isLoadingMore: false,
  },
  userNameMap: {}, // Map of { [email/name]: "Full Name" }
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(searchUsers.pending, (state, action) => {
        if (action.meta.arg?.updateSearchData === false) {
          return;
        }
        if (action.meta.arg?.append) {
          state.userSearch.isLoadingMore = true;
          return;
        }
        state.userSearch.status = 'loading';
        state.userSearch.error = null;
        state.userSearch.isLoadingMore = false;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.userSearch.status = 'succeeded';
        state.userSearch.isLoadingMore = false;

        // Only update userSearch.data if updateSearchData is true
        // This prevents assignees fetch from overwriting the people list
        if (action.payload.updateSearchData !== false) {
          const incoming = action.payload.users || [];
          if (action.payload.append) {
            const existing = new Set(
              state.userSearch.data.map((user) => user.value || user.name),
            );
            const merged = [...state.userSearch.data];
            incoming.forEach((user) => {
              const key = user.value || user.name;
              if (!existing.has(key)) {
                merged.push(user);
                existing.add(key);
              }
            });
            state.userSearch.data = merged;
          } else {
            state.userSearch.data = incoming;
          }
          state.userSearch.lastSearchQuery = action.payload.searchQuery || '';
          state.userSearch.hasMore = Boolean(action.payload.hasMore);
          state.userSearch.nextStart =
            (Number(action.payload.start) || 0) + (incoming.length || 0);
        }

        // Always update userNameMap with all users from the response
        const users = action.payload.users || [];
        users.forEach((user) => {
          if (user.full_name && (user.email || user.name)) {
            // Map by email if available, otherwise by name
            const key = user.email || user.name;
            if (key) {
              state.userNameMap[key] = user.full_name;
            }
            // Also map by name if different from email
            if (user.name && user.name !== user.email) {
              state.userNameMap[user.name] = user.full_name;
            }
          }
        });
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.userSearch.status = 'failed';
        state.userSearch.isLoadingMore = false;
        state.userSearch.error = action.payload || action.error.message;
      })
      .addCase(searchMentionUsers.fulfilled, (state, action) => {
        // Update userNameMap with all users from the mention search response
        const users = action.payload.users || [];
        users.forEach((user) => {
          if (user.full_name && (user.email || user.name)) {
            const key = user.email || user.name;
            if (key) {
              state.userNameMap[key] = user.full_name;
            }
            if (user.name && user.name !== user.email) {
              state.userNameMap[user.name] = user.full_name;
            }
          }
        });
      });
  },
});

export const selectUserSearch = (state) => state.user.userSearch;
export const selectUserNameMap = (state) => state.user.userNameMap;

export default userSlice.reducer;
