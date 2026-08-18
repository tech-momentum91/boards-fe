import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
  isLoggedIn: false,
  userInfo: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null,
  isLoading: false,
  error: null,
  status: null,

  emailSent: {
    isLoading: false,
    status: null,
    error: null,
  },
};

// export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
//   try {
//     console.log('in thunk email and password', email, password);
//     const response = await axios.post(
//       'https://bgs5j97c-8001.inc1.devtunnels.ms/api/method/login',
//       {
//         usr: email,
//         pwd: password
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         withCredentials: true
//       }
//     );

//     console.log('in thunk', response);

//     return response;
//   } catch (error) {
//     throw error;
//   }
// });

// export const logout = createAsyncThunk('auth/logout', async () => {
//   try {
//     const response = await axios.post('https://bgs5j97c-8001.inc1.devtunnels.ms/api/method/logout');
//     console.log('in thunk logout', response);
//     return response;
//   } catch (error) {
//     throw error;
//   }
// });

export const resetPasswordMail = createAsyncThunk(
  'auth/resetPasswordMail',
  async (email, { rejectWithValue }) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(
        `${apiUrl}/api/method/frappe.core.doctype.user.user.reset_password`,
        { user: email },
        { withCredentials: true },
      );

      return response.data; // good response
    } catch (error) {
      // Axios error structure:
      // error.response.data → contains the API JSON error
      if (error.response && error.response.data) {
        return rejectWithValue(error);
      }

      return rejectWithValue({ message: error });
    }
  },
);

export const createPasswordThunk = createAsyncThunk(
  'auth/createPasswordThunk',
  async (data, { rejectWithValue }) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(
        `${apiUrl}/api/method/frappe.core.doctype.user.user.update_password`,
        {
          new_password: data.new_password,
          key: data.key,
        },
        {
          withCredentials: true,
        },
      );
      return response;
    } catch (error) {
      return rejectWithValue(error.response);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload.message;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearEmailSentError: (state) => {
      state.emailSent.error = null;
    },
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.userInfo = action.payload;
      state.error = null;
      state.isLoading = false;
    },
    updateUserInfo: (state, action) => {
      state.userInfo = { ...state.userInfo, ...action.payload };
    },
    logoutSuccess: (state) => {
      state.isLoggedIn = false;
      state.userInfo = null;
      state.error = null;
      state.isLoading = false;
    },
  },

  extraReducers: (builder) => {
    //   builder.addCase(login.pending, (state) => {
    //     state.isLoading = true;
    //     state.error = null;
    //   });

    //   builder.addCase(login.fulfilled, (state, action) => {
    //     // console.log("in fulfilled", action.payload);
    //     state.isLoggedIn = true;
    //     state.userInfo = action.payload;
    //     state.error = null;
    //     state.isLoading = false;
    //     state.status = action.payload.status;
    //   });

    //   builder.addCase(login.rejected, (state, action) => {
    //     state.error = action.error.message;
    //     state.isLoading = false;
    //   });
    //   builder.addCase(logout.pending, (state) => {
    //     state.isLoading = true;
    //     state.error = null;
    //   });

    //   builder.addCase(logout.fulfilled, (state, action) => {
    //     state.isLoggedIn = false;
    //     state.userInfo = null;
    //   });

    //   builder.addCase(logout.rejected, (state, action) => {
    //     state.error = action.error.message;
    //     state.isLoading = false;
    //   });

    builder.addCase(resetPasswordMail.pending, (state) => {
      state.emailSent.isLoading = true;
      state.emailSent.error = null;
    });

    builder.addCase(resetPasswordMail.fulfilled, (state, _action) => {
      // console.log('action in fulfilled', action);
      state.emailSent.isLoading = false;
      state.emailSent.error = null;
      state.emailSent.status = 'success';
    });

    builder.addCase(resetPasswordMail.rejected, (state, action) => {
      // console.log('action in rejected', action);
      state.emailSent.isLoading = false;
      state.emailSent.error = action.payload?.response?.statusText;
      state.emailSent.status = action.payload?.response?.status;
    });

    builder.addCase(createPasswordThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });

    builder.addCase(createPasswordThunk.fulfilled, (state, _action) => {
      state.isLoading = false;
      state.error = null;
      state.status = 'success';
    });

    builder.addCase(createPasswordThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message;
      state.status = 'error';
    });
  },
});

export const {
  setLoading,
  setError,
  clearError,
  clearEmailSentError,
  logoutSuccess,
  loginSuccess,
  updateUserInfo,
} = authSlice.actions;
export default authSlice.reducer;
