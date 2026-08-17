import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/use-socket';

/**
 * Contract with devx_tasks/devx_tasks/utils/realtime.py — the event name and the
 * channel prefix must stay in sync with TASK_COMMENTS_EVENT and
 * TASK_COMMENTS_CHANNEL_PREFIX there.
 *
 * The payload deliberately carries no comment content, only a signal that the
 * thread changed, so the refresh must go through the permission-checked
 * get_comments API rather than trusting anything in the event.
 */
const TASK_COMMENTS_EVENT = 'devx_task_comments';
const TASK_COMMENTS_CHANNEL_PREFIX = 'devx_task_comments';

// A single user action can emit several signals (a comment plus each of its
// attachments), and several users can post at once; one refetch covers them all.
const REFRESH_DEBOUNCE_MS = 300;

/**
 * Keep a task's comment thread in sync with other users in realtime.
 *
 * @param {string|null} taskId - Task whose comment thread is on screen
 * @param {Function} onCommentsChanged - Called when the thread should be refetched
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Set false when the thread is not owned by this component
 * @returns {{ isRealtimeConnected: boolean }} Whether realtime is currently live,
 *   so callers can fall back to polling when it is not.
 */
export function useTaskCommentsRealtime(taskId, onCommentsChanged, { enabled = true } = {}) {
  const { onEvent, subscribeChannel, onConnectionChange, getConnectionStatus } = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  // Held in a ref so an inline callback from the caller cannot tear down and
  // rebuild the subscription on every render.
  const handlerRef = useRef(onCommentsChanged);
  useEffect(() => {
    handlerRef.current = onCommentsChanged;
  }, [onCommentsChanged]);

  useEffect(() => {
    if (!enabled || !taskId) {
      setIsConnected(false);
      return undefined;
    }

    let debounceId = null;
    let cancelled = false;

    const scheduleRefresh = () => {
      if (cancelled) {
        return;
      }

      if (debounceId) {
        clearTimeout(debounceId);
      }

      debounceId = setTimeout(() => {
        debounceId = null;
        handlerRef.current?.();
      }, REFRESH_DEBOUNCE_MS);
    };

    const offEvent = onEvent(TASK_COMMENTS_EVENT, (payload) => {
      // The socket is shared app-wide, so a signal for a different task can
      // reach this listener; only the task on screen may trigger a refresh.
      if (!payload || String(payload.task ?? '') !== String(taskId)) {
        return;
      }

      scheduleRefresh();
    });

    const offChannel = subscribeChannel(`${TASK_COMMENTS_CHANNEL_PREFIX}:${taskId}`);

    const offConnectionChange = onConnectionChange((connected) => {
      setIsConnected(connected);

      // Signals published while the socket was down are gone for good, so the
      // thread has to be reconciled from the server once it is back.
      if (connected) {
        scheduleRefresh();
      }
    });

    // onConnectionChange only reports transitions, so pick up a connection that
    // was already established before this component mounted.
    setIsConnected(getConnectionStatus().isConnected);

    return () => {
      cancelled = true;
      if (debounceId) {
        clearTimeout(debounceId);
      }
      offEvent();
      offChannel();
      offConnectionChange();
    };
  }, [enabled, taskId, onEvent, subscribeChannel, onConnectionChange, getConnectionStatus]);

  return { isRealtimeConnected: isConnected };
}

export default useTaskCommentsRealtime;
