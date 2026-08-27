import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/use-socket';

/** Keep in sync with inbox_realtime.py INBOX_EVENT / INBOX_CHANNEL_PREFIX. */
const INBOX_EVENT = 'devx_inbox';
const INBOX_CHANNEL_PREFIX = 'devx_inbox';
const REFRESH_DEBOUNCE_MS = 250;

function normalizeUserId(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Subscribe to the current user's inbox realtime channel.
 *
 * @param {string|null} userId - Frappe user name (usually email)
 * @param {Function} onInboxChanged - Called when inbox should refresh
 * @param {{ enabled?: boolean }} [options]
 */
export function useInboxRealtime(userId, onInboxChanged, { enabled = true } = {}) {
  const { onEvent, subscribeChannel, onConnectionChange, getConnectionStatus, socket } =
    useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const handlerRef = useRef(onInboxChanged);
  const userIdRef = useRef(userId);

  useEffect(() => {
    handlerRef.current = onInboxChanged;
  }, [onInboxChanged]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId || !socket) {
      setIsConnected(false);
      return undefined;
    }

    let debounceId = null;
    let cancelled = false;

    const scheduleRefresh = () => {
      if (cancelled) return;
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        handlerRef.current?.();
      }, REFRESH_DEBOUNCE_MS);
    };

    const offEvent = onEvent(INBOX_EVENT, (payload) => {
      // Private room is already per-user. Only drop events clearly meant for
      // someone else (defensive). Missing user → still refresh.
      const eventUser = normalizeUserId(payload?.user);
      const self = normalizeUserId(userIdRef.current);
      if (eventUser && self && eventUser !== self) {
        return;
      }
      scheduleRefresh();
    });

    const offChannel = subscribeChannel(`${INBOX_CHANNEL_PREFIX}:${userId}`);

    const offConnectionChange = onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) scheduleRefresh();
    });

    setIsConnected(Boolean(getConnectionStatus().isConnected));

    return () => {
      cancelled = true;
      if (debounceId) clearTimeout(debounceId);
      offEvent();
      offChannel();
      offConnectionChange();
    };
  }, [
    enabled,
    userId,
    socket,
    onEvent,
    subscribeChannel,
    onConnectionChange,
    getConnectionStatus,
  ]);

  return { isRealtimeConnected: isConnected };
}

export default useInboxRealtime;
