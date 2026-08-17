import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';

// Search users for assignee selection restricted by the current user's center access
export const searchUsers = createAsyncThunk(
  'user/searchUsers',
  async (
    {
      searchQuery,
      limit = 50,
      includeAssignedUsers = [],
      names = [],
      updateSearchData = true,
      internal_only: internalOnly = false,
    },
    { rejectWithValue },
  ) => {
    try {
      // Use custom DevX API that restricts users to the centers the current user can access
      const payload = {
        search_query: searchQuery || '',
        limit,
      };

      // If names are provided, pass them directly to the API
      if (names && names.length > 0) {
        payload.names = names;
      }

      if (internalOnly) {
        payload.internal_only = true;
      }

      const response = await apiClient.post(
        '/method/devx.api.core.search_users_by_center',
        payload,
      );

      const users = response?.data?.message || [];

      // Format users for the frontend
      const formattedUsers = users.map((user) => ({
        label: user.full_name || user.name || user.email || 'User',
        value: user.name || user.email,
        email: user.email,
        name: user.name,
        full_name: user.full_name,
        image: user.user_image,
        avatar: user.user_image,
        user_role: user.user_role || null,
        roles: user.roles || (user.user_role ? [user.user_role] : []), // Support both formats
      }));

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

        // If there are missing assigned users, fetch them (still restricted by center access)
        if (missingValues.length > 0) {
          const assignedPayload = {
            names: missingValues,
            limit: missingValues.length,
          };
          if (internalOnly) {
            assignedPayload.internal_only = true;
          }
          const assignedResponse = await apiClient.post(
            '/method/devx.api.core.search_users_by_center',
            assignedPayload,
          );

          const assignedUsers = assignedResponse?.data?.message || [];
          assignedUsers.forEach((user) => {
            const userValue = user.name || user.email;
            if (!existingValues.has(userValue)) {
              formattedUsers.push({
                label: user.full_name || user.name || user.email || 'User',
                value: user.name || user.email,
                email: user.email,
                name: user.name,
                full_name: user.full_name,
                image: user.user_image,
                avatar: user.user_image,
                user_role: user.user_role || null,
                roles: user.roles || (user.user_role ? [user.user_role] : []), // Support both formats
              });
              existingValues.add(userValue);
            }
          });
        }
      }

      return {
        searchQuery: searchQuery || '',
        users: formattedUsers,
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
      const response = await apiClient.post('/method/devx.api.user.get_users_for_tagging', payload);

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

      const formattedUsers = users.map((user) => ({
        label: user.full_name || user.name || user.email || 'User',
        value: user.name || user.email,
        email: user.email,
        name: user.name,
        full_name: user.full_name,
        image: user.user_image,
        avatar: user.user_image,
        user_role: user.user_role || null,
        roles: user.roles || (user.user_role ? [user.user_role] : []),
      }));

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
        state.userSearch.status = 'loading';
        state.userSearch.error = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.userSearch.status = 'succeeded';

        // Only update userSearch.data if updateSearchData is true
        // This prevents assignees fetch from overwriting the people list
        if (action.payload.updateSearchData !== false) {
          state.userSearch.data = action.payload.users || [];
          state.userSearch.lastSearchQuery = action.payload.searchQuery || '';
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
