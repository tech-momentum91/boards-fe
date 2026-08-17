import { combineReducers, configureStore, type Action, type Reducer } from '@reduxjs/toolkit';
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

export type RootState = ReturnType<typeof appReducer>;

const rootReducer: Reducer<RootState | undefined, Action> = (state, action) => {
  if (action.type === logoutSuccess.type) {
    return appReducer(undefined, action);
  }

  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type AppDispatch = typeof store.dispatch;
