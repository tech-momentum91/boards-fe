import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProfile } from '@/redux/profileSlice';
import { EVENT_STATUS_OPTIONS } from '@/components/event-management/constant';
import { getMicroExternalEventStatusEditOptions } from '@/components/event-management/event-micro-external-status-permissions';

/**
 * Loads current user via `getProfile` and returns micro/external status select options.
 * When `enabled` is false, returns full `EVENT_STATUS_OPTIONS` (caller should ignore for community).
 */
export function useMicroExternalEventStatusOptions(enabled, currentStatus = '') {
  const dispatch = useDispatch();
  const userInfo = useSelector((s) => s.auth?.userInfo);
  const email =
    userInfo?.email ||
    userInfo?.user_email ||
    userInfo?.username ||
    userInfo?.user ||
    userInfo?.name ||
    userInfo?.usr ||
    '';
  const [profilePayload, setProfilePayload] = useState(null);

  useEffect(() => {
    if (!enabled || !email) {
      setProfilePayload(null);
      return;
    }
    let cancelled = false;
    dispatch(getProfile(email)).then((action) => {
      if (cancelled) return;
      if (getProfile.fulfilled.match(action)) {
        setProfilePayload(action.payload);
      } else {
        setProfilePayload(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, email, enabled]);

  return useMemo(() => {
    const options = enabled
      ? getMicroExternalEventStatusEditOptions(profilePayload, currentStatus)
      : EVENT_STATUS_OPTIONS;
    return { options, profilePayload: enabled ? profilePayload : null };
  }, [enabled, profilePayload, currentStatus]);
}
