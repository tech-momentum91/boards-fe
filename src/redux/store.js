import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer, { logoutSuccess } from '@/redux/authSlice';
import profileReducer from '@/redux/profileSlice';
import settingReducer from '@/redux/settingSlice';
import userReducer from '@/redux/userSlice';

const appReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  setting: settingReducer,
  user: userReducer,
});

const rootReducer = (state, action) => {
  if (action.type === logoutSuccess.type) {
    return appReducer(undefined, action);
  }

  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});
